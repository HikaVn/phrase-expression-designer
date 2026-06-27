# Phrase Expression Designer — 設計仕様（ネイティブ・キャリブレーション方針）

> 本書はマルチエージェント分析（現状監査 ＋ ネイティブ・プラグインホスト設計 ＋ 敵対的レビュー）で
> 詰めた設計判断を確定記録するもの。実装着手時の単一の参照点とする。

## 1. 目的

素のフレーズを **入力 OR インポート** し、**生演奏のような連続表情**をつけ、
使うプラグイン音源ごとに異なる **キースイッチ / CC を「整理」し「キャリブレーション」** する。

- 整理 = 奏法↔キースイッチ、内部パラメータ↔CC のマッピングを音源ごとに管理する。
- キャリブレーション = 同じ内部パラメータ（例 `intensity` 0..1）を、音源ごとに実際の鳴り方が
  揃うよう CC カーブ／レンジ／応答特性に補正する。

## 2. 確定した設計判断（ロック済み）

| 論点 | 決定 |
|---|---|
| 全面再構築するか | **No。** `core.js` のデータモデルと2層ブレンドは温存。**3シーム＋UIシェルのみ作り直す** |
| `core.js` の C++ 移植 | **しない。** JS のまま残す（テスト済み資産の毀損と二重保守を回避） |
| 「音源に最も近い」方針 | 採用。実プラグインの実音を測ってキャリブする方向で進める |
| 自動測定（B-full）の位置づけ | **Phase 0 ゲート通過を必須とする上振れ層**。最初の単一支柱にはしない |
| 価値の底 | **B-lite（人手アンカー＋PCHIP単調補間）** を必達として先に据える |
| 測定基盤 | **外部ハーネス（pluginval / Reaper バッチレンダ）流用を先に評価**し、WAV解析だけ内製。規模を桁下げできるか Phase 0 で判定。自前 JUCE 内製はそれが不可のときの選択肢 |
| Logic 内蔵音源（Studio Strings 等） | 外部ホストでロード不可の公算が高い → **自動対象から降格。手動 B-lite で対応**（Phase 0 で実機確証） |
| 半自動の受容 | **最終確定は常に人の耳**。完全自動検出（奏法判別・KS割当・Learn確定）は必達要件にしない |

## 3. 現状診断（`core.js` / `app.js`）

### 残す価値のある資産
- `createNote`（`core.js:195`）のリッチなオフセット群（`localStart/End/DurationOffsetMs`,
  `phraseOffsetMs`, `humanizeMs`, `frozenPerformanceTick`, `expression`, `expressionInfluence`）。
- `expressionCurves`（tick折れ線, パラメータ別）＋2層ブレンド
  `effectiveExpression()=phrase+(note-phrase)*influence`（`core.js:633`）。
- `tempoMap` ＋ `tickToMs/msToTick`（`core.js:278-299`）、`computePerformanceNotes`（`core.js:797`）、
  `noteNaming` 抽象（`core.js:310-321`）、`validateProfile`（`core.js:966-1003`）。
- `tests/core.test.js`（567行）。

### 決定的に欠けているもの（ネイティブ有無と無関係な JS ソフト層の欠落）
1. **キャリブレーション完全未配線**：`calibration[]` / `calibrationCurveId`（`core.js:60,100,130,152`）は
   一度も読まれず、`dynamic_default` の実体テーブルも無い。CC値は `effectiveExpression*127`
   （`core.js:869`）の素の線形のみ。
2. **連続CC出力が無い**：`generateCcEvents`（`core.js:860-877`）はノート起点1値しか出さない。
   ビブラートLFO無し、hairpin メタ（`curveType`/`timbreFollowsDynamics` 等 `core.js:704-720`）は未消費。
3. **Profile 二重管理**：`getProfile`（`core.js:271`）が `BUILT_IN_PROFILES` のみ参照し、
   `app.js` のランタイム `profiles`（`app.js:55`）の custom を見られない。
4. **インポートの劣化**：`importMidi` は articulation を全て `"sustain"` に潰し（`core.js:1159`）、
   CC を固定 `defaultMap`（CC1/11/21/70, `core.js:1178-1183`）で割当て、選択中 Profile の整理データを無視。

## 4. アーキテクチャ

```
┌─ Renderer (Chromium) ── 既存UIを移植 ───────────────────────┐
│  Expression Kernel = core.js を温存（JSのまま）               │
│   ・データモデル / 2層ブレンド / tempo変換 / validateProfile   │
│   ・【新】連続CCレンダラ（ノート内/間スイープ＋ビブLFO＋hairpin）│
│   ・【新】applyCalibration（inverseLUT写像, 空ならidentity線形） │
└──────────────────── contextBridge ───────────────────────────┘
        │  (nodeIntegration:false / contextIsolation:true)
┌─ Main (Electron / Node) ── ProfileStore統合・測定ジョブ管理 ──┐
└──── 長さ前置きJSON ＋ ハートビート ＋ タイムアウトkill/再起動 ──┘
        │  ※ Phase 0 通過時のみ追加するオプション層
┌─ 測定サイドカー（外部ハーネス流用 or 自前JUCEヘッドレス）────┐
│   音源1ロード = 1プロセス（クラッシュ隔離）                    │
│   state復元 → testEvents掃引 → オフラインレンダ → WAV返却       │
│   音声解析（LUFS / スペクトル重心 / アタック）は JS純粋関数       │
└──────────────────────────────────────────────────────────────┘
```

### コンポーネントの処遇

| コンポーネント | 技術 | 責務 | 処遇 |
|---|---|---|---|
| Expression Kernel | JS（core.js） | データモデル・2層ブレンド・tempo・validate | **keep** |
| 連続CCレンダラ | JS純粋関数 | ノート内/間サンプル＋ビブLFO＋hairpin消費＋間引き | **build** |
| applyCalibration | JS純粋関数 | inverseLUT写像、空ならidentity、`measurementStatus`区別 | **build** |
| ProfileStore | JS | BUILT_IN＋custom を単一ストアに統合、`getProfile(project,store)` | **rebuild** |
| UIシェル | Electron 2プロセス | Renderer/Main/contextBridge | **build/port** |
| 構造化Wizard | JS | 自由テキスト廃止→行編集＋型セレクタ＋カーブエディタ | **rebuild** |
| 測定サイドカー | 外部ハーネス or JUCE | ロード→掃引→オフラインレンダ→WAV | **build（Phase 0通過後）** |
| 音声解析 | JS（重ければ後でC++） | LUFS/重心/アタック/逆写像LUT生成 | **build** |

設計原則：**生成は常に JS、解析は WAV 入力の純粋関数、ホストは差し替え可能なアダプタ**にする。
試聴は初版「サイドカーがプリレンダした WAV を再生」に割り切り、Node を実時間オーディオパスに置かない。

## 5. データモデル変更

`calibration[]` を空配列から実構造へ。**14パラメータを一律1次元LUTで測る前提は撤回**し、
`measurementMethod` で3分類：

- `continuous`：dynamics/volume/timbre/brightness 等の連続CC（逆写像LUT対象）
- `discrete`：conSordino 等オン/オフ（キースイッチ/PC、逆写像対象外）
- `coupled`：bowPosition/fingerPosition 等の多軸干渉（1次元分解不能、当面は手動分類）

```jsonc
// Profile.calibration[] の要素
{
  "id": "…",
  "articulationId": "…",
  "internalParameter": "intensity",
  "sweptCC": 1,
  "measurementMethod": "continuous",          // continuous | discrete | coupled
  "source": "measured",                        // manual | measured
  "measurementStatus": "measured",             // unmeasured | measured | failed | low_confidence
  "fingerprint": { "pluginUid": "…", "pluginVersion": "…", "patchHash": "…",
                   "sampleRate": 48000, "blockSize": 512, "hostBuild": "…", "deterministic": true },
  "measurement": { "velocity": 96, "midiNote": 60, "sustainMs": 2000, "tailMs": 1500,
                   "rrCount": 4, "repetitions": 3 },
  "metric": { "kind": "LUFS", "unit": "LUFS" }, // LUFS|spectralCentroidHz|attackMs|integratedEnergy|peakLUFS|vibratoHz|vibratoCents|noiseFloorDb
  "forwardCurve": { "type": "pchip", "points": [ { "cc": 0, "value": -60, "iqr": 0.8 }, … ] },
  "inverseLUT":   { "type": "pchip", "domain": "perceptual01",
                    "points": [ { "x": 0.0, "cc": 12 }, … ], "effectiveCcRange": [12, 118] },
  "perceptualMapping": { "metricMin": -60, "metricMax": -6, "axis": "log" },
  "confidence": { "iqrMax": 1.2, "nonMonotonic": false }
}
```

補足：
- `measurementStatus` で `failed`/`unmeasured` を「キャリブ済」と区別し、**identity線形フォールバックに
  無言で落ちない**よう UI で明示。IQR は表示だけでなく LUT 有効性判定にも使う（ばらつき過大セルは
  `low_confidence` → 線形フォールバック）。
- `calibrationCurveId`（`core.js:152` の未読 `'dynamic_default'`）を `calibration[].id` への実体参照へ。
  粒度は `(articulation × internalParameter)` で別ID（既存 control は奏法非依存なので拡張＝要決定）。
- `testEvents[]` を実データへ：`{ id, kind:sweep|point, pitch, velocity, articulationId, durationMs,
  sweep:{cc,from,to,steps}, settleMs }`。`createTestProject`（`core.js:1044`）と統合。
- `trigger` 型拡張（channel/latching/momentary/PC）と `target` 型拡張（hostAutomation正式化）。
  Profile に `hostBinaryRef`（AU/VST3識別子＋version）と測定プラットフォーム、プラグイン state blob を
  JSON 外に opaque blob＋`pluginStateHash` で別保持。
- ポリフォニーは trigger/channel 型だけ先に用意し導入は段階判断（`resolveNoteOverlaps` `core.js:1258`
  の単旋律強制は「編集データ」と「出力割当」に分離してから）。

## 6. キャリブレーション2系統（同一スキーマ）

### B-lite（人手アンカー・必達・実音不要・Phase 1で完成）
ユーザーが DAW で実音を聴きながら各 `(articulation × parameter)` について確定点を数点入力
（例「CC20で弱い／CC90で十分fff」）→ **PCHIP単調補間で inverseLUT 生成** → `applyCalibration` が消費。
Bプロセス／IPC／iLok認証／無音ガード／Notarization が一切不要で、目的の相当部分に到達する。
**これが B-full 自動測定の「価値の基準線」**であり、B-full はこれを上回って初めて構築正当化される。

### B-full（自動測定・上振れ・Phase 0通過時のみ）
半自動ループ。`cell = {articulation, parameterUnderTest, ccValue掃引, velocity, midiNote, rrSeed}`。
手順：対象CCを lookAhead 分先送り定常化 → KS/PC で奏法選択 → noteOn → **ウォームアップ捨てレンダ**
（音源依存・固定値にせず実機チューニング）→ 本番固定長レンダ → noteOff → tail レンダ。
指標→内部パラメータ：`continuous` のみ LUFS/重心/アタックで逆写像、short奏法は積分エネルギー/
ピークLUFSへ切替（BS.1770 の400ms積分前提を外れる不安定領域として明記）。
逆写像：複数RR反復 → 中央値＋IQR → PCHIP順応答 → 数値反転 → 知覚軸写像 → 制御点LUT、
飽和端クリップ、非単調域は警告（必要なら PAVA 単調回帰）。

### B-full の妥当性ガード（これが崩れたら静的測定方針を縮退）
1. 完全無音だけでなく **「それらしく鳴る誤音」**（部分発音/別サンプル/アタック欠落/I/O律速の音量低下）を検出。
2. `setNonRealtime(true)` に音源が従うかを Phase 0 で実測。従わない音源は自動対象外。
3. タイムアウト発火＝測定無効として `failed` マーク、曲線に反映しない。
4. 静的LUTが連続CC演奏でずれる問題（内部スムージング/ヒステリシス/非LTI）を Phase 0 で
   ステップ応答／上り下り差／クロスフェード非単調として実測。足りなければ静的逆写像方針自体を縮退。

### DAW転用
`fingerprint` 一致は「不一致の検知」であって「同一挙動の保証」ではない。基準セルの A/B 照合に
**定量合否**（自前測定値と Logic 実測が何 dB／何 Hz 以内なら転用可）を定義し、Pan Law／channel strip
gain／AUレンダパス差を既知オフセットとして補正、超過時は当該 patch を転用不可マーク。

## 7. ロードマップ（最小垂直スライス起点）

### Phase 0 — 設計凍結ゲート（数日〜2週・単独スパイク）
重装備に着工する前に、自動測定の技術可否と正味価値を**数値合否**で確定する。
1つでも kill 条件に当たれば 3プロセス/IPC/state blob/C層スキーマ膨張をコミットせず縮退版へ分岐。

成果物：
- 最小スパイク：**pluginval or Reaper バッチレンダ or 自前JUCE試作**のいずれかで Opus(EastWest)
  または Kontakt(8Dio) を「外部ホストで1回ロードし1パラメータを1掃引して WAV を得る」。
- **kill 条件（数値・先に明文化）**：
  - 外部ロード不可
  - iLok/NKS がヘッドレスでも・一度GUIでも通らない
  - オフライン非実時間レンダでアタック欠落が捨てレンダで解消しない
  - 音源が `setNonRealtime` を無視
  - 静的LUTが動的スイープと閾値超でずれる
  → いずれかで **B-full 凍結**
- Logic 内蔵 Studio Strings の外部AUロード可否を実機確認（公算は不可＝確定なら3本柱から正式降格）。
- 測定基盤の **内製 vs 外部ハーネス流用** の比較評価で規模を桁下げできるか判定。
- B-lite で目的の何割に到達するかの定量見積り＝B-full 価値の基準線確定。

### Phase 1 — A層（Expression Kernel）＋ B-lite をブラウザのまま完成（価値の底・独立出荷可）
ネイティブ無し・実音不要で、現状の素線形 `*127` から決定論的に到達できる価値を全て出し切る。
- 連続CCレンダラを `core.js` に純粋関数追加（ノート内/間スイープ＋間引き）、`generateCcEvents` 拡張。
- ビブラートLFO（位相ノート跨ぎ連続）、hairpin メタ消費（`curveType`/`timbreFollowsDynamics`/`vibratoAmount`）。
- `applyCalibration`（読む側）：inverseLUT を引く、空なら identity 線形、`measurementStatus` で状態区別。
- B-lite：人手アンカー入力UI → PCHIP → inverseLUT 生成 → A が消費。
- インポート復元：固定 defaultMap → Profile.controls 逆引き、KS → articulation 逆引き＋人手確認UI。
- 単一 ProfileStore 統合（`getProfile` 二重管理解消）、新規純粋関数のテスト追加。

### Phase 2 — Electron化（2プロセス）＋ C層データモデル拡張
- Electron シェル（Renderer/Main/contextBridge）へ既存UI移植。
- `calibration[]`/`testEvents` 実スキーマ配線・参照解決。
- 構造化 Wizard（自由テキスト parse 廃止 → 行編集＋型セレクタ＋noteNamingピッカー、自動値/要人手確認を色分け）。
- IPC プロトコル（長さ前置きJSON＋ハートビート＋タイムアウト＋再起動）をモック実装、試聴＝プリレンダWAV再生の仮実装。
- プラグイン state blob 同梱機構と fingerprint/hostBinaryRef 記録。
- 注意：`render()` 全再描画はライブ反映でボトルネック化する隣接リスクとして書き換え工数を計上。

### Phase 3 — B-full 最小垂直スライス（Phase 0 通過が前提条件）
「1音源を1回ホストして1パラメータを測って鳴らす」を最小で通す。最初からフルキャリブは狙わない。
- 外部ハーネス（or JUCE）ヘッドレス：1音源ロード→state復元→1掃引→オフラインレンダ→WAV返却の1往復。
- 音声解析（JS純粋関数）：LUFS(BS.1770)/RMSエンベロープ/対数軸スペクトル重心/PCHIP順応答/数値反転LUT、
  誤音ガード（無音＋それらしく鳴る誤音）。
- measuredCurve を `calibration[]` へ書戻し → A が LUT 消費。`failed`/`low_confidence` は線形フォールバックと明示区別。
- 4ステップ半自動ウィザード（スキャン→スイープ→人レビュー/微調整→保存）。
- **正味価値ベンチ（完了条件）**：複数奏法×複数音源で「measured LUT vs 素線形 vs B-lite手入力」を盲検A/B。
  正味プラスでないセル比率を測る。プラスでなければ中核主張を見直す。
- 基準セル再測定 testEvents 生成＋DAW転用の A/B 定量合否。

### Phase 4 — 拡張（需要・実証確認後のみ）
掃引組合せ爆発対策の実測再見積り、velocity/音域依存補正、short奏法の指標安定化、実時間ライブ試聴
（Node を音声パスから外す）、ビブラート検出、ポリフォニー/運弓/portamento、Windows/VST3対応
（別製品扱い・Logic音源非対応かつ mac AU と fingerprint 不一致で転用前提が崩れる点を明示）、
音声解析の C++ 降ろし、IQR信頼度UI・転用不可警告。一度に着工しない。

## 8. 正直な注意点（隠さない）

- Opus/Kontakt の外部ホストロード、iLok/NKS のヘッドレス認証、オフライン非実時間レンダのアタック欠落、
  `setNonRealtime` 尊重は **全て実機未検証（conditional/unknown）**。Phase 0 の数値合否で確定する。
- Logic 内蔵 AU 音源は第三者ホストでロード不可の公算が高い（**infeasible 寄り**）。覆らなければ主要3カテゴリの
  1本は自動キャリブ対象外で手動据え置き。DLSMusicDevice は汎用GM音源で救済にならない。
- 自動キャリブの妥当性に根幹レベルの未解決点：(1)「何を揃えるか」を物理量1次元に還元すると音楽的目標
  （複合知覚量としての強弱）と乖離しうる、(2)dynamics CC が音量＋音色＋層クロスフェードを一体で動かす音源では
  1次元 LUFS 逆写像が破綻、(3)静的測定が連続演奏で内部スムージング/ヒステリシスにより外れうる。
  **Phase 3 の盲検ベンチで素線形に対する正味価値を実証するまで、自動測定が価値を出すと断定しない。**
- DAW 転用前提（同一バイナリ・同 patch・同 SR・素 channel strip）は、ホスト外側の差（Pan Law/サミング gain/
  AUレンダパス/CC補間/オーバーサンプリング/バージョン差/内部RR）で部分的に崩れる。最良ケースでも自動測定の
  出力は「下書きCC値」で、連続演奏では実機再校正を要しうる。
- クロスプラットフォーム：AU は mac 限定。Windows 版は Kontakt/Opus の VST3 のみ、mac の AU とは別バイナリ＝
  fingerprint 不一致で転用前提が崩れ、**実質「別製品」**。
- プラグイン state blob の完全性は音源依存。Kontakt は nki の参照解決（サンプルライブラリのパス/Native Access
  登録）に依存し state にサンプル実体は入らないため、別マシン/別ホストでライブラリ未登録なら復元失敗。
- 規模の現実：個人/小規模で C++/JUCE ホスト＋音声解析＋Electron＋mac署名/Notarization＋将来Windowsを同時に
  立ち上げ維持するのは頓挫リスクそのもの。本仕様は B-full 着工を Phase 0 通過とベンチ正味プラスにゲートし、
  それ抜きでも価値が立つ B-lite を底に据えることで構造的にリスクを下げている。ゲートを甘くすれば即再燃する。

## 9. 残っている決定事項

- `calibration` の粒度を `(articulation × internalParameter)` で別IDに拡張する（既存 control は奏法非依存）ことの最終確認。
- 組込み Profile を読取専用テンプレとするか編集可とするか（ProfileStore 統合時の保存先分裂防止）。
- 当面ユーザー専用ツールとして進めるか、将来配布製品を視野に入れるか（EULA/JUCE/VST3 SDK ライセンス評価と
  Windows 対応＝実質別製品の判断が変わる）。
- 連続CC のサンプル間隔の既定値と `Profile.timing` での持たせ方、CC変化閾値での間引き基準。
- ビブラート LFO の出力先（CC音量/音色変調か、対応音源ではピッチベンドも使うか＝Profile に持たせるか）。
