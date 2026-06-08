# チュートリアル — Phrase Expression Designer

このツールは **CCエディタではありません**。「演奏意図（どこで膨らむか、終わりで抜くか
など）」を描くと、**音源ごとの違いを吸収して**正しい MIDI CC・キースイッチへ変換します。
意図はオフライン（CLI）でもDAW内リアルタイム（プラグイン）でも同じ仕組みで効きます。

所要：CLI 一周で約5分。プラグイン体験まで含めて約20分。

---

## 0. 用語ミニ辞典（最初の1回だけ）

- **CC（Control Change）**: 音量・音色・ビブラート等を 0–127 で送る MIDI の連続値。
- **Velocity**: 1音ごとの打鍵の強さ（1–127）。短い奏法はこれが主役。
- **Keyswitch（キースイッチ）**: 音域外のノートで音源の奏法を切り替える方式（例 C0=Legato）。
- **Articulation（奏法）**: legato / spiccato / pizzicato など。内部IDで保持し、出力時に変換。
- **Instrument Profile**: 音源ごとの奏法・CC割当・正規化カーブ・音域をまとめた JSON。
- **Calibration Curve**: 意図値 0.0–1.0 を、その音源で“ちょうど良い” CC 0–127 に写す非線形カーブ。
- **intent（演奏意図）**: intensity / timbre / vibratoDepth … を 0.0–1.0 で表した正規化値。**これが主役**。

---

## 1. インストール

Python 3.10 以上が必要です。

```bash
cd "/path/to/ExpressionDesigner"
python -m pip install -e ".[dev]"   # コア + CLI + 開発ツール
ped --help                          # コマンド一覧が出れば成功
```

`ped` が「コマンドが無い」と言われる場合は `python -m ped.cli.main --help` でも動きます。

---

## 2. 5分クイックスタート（CLIで一周）

付属のサンプルで「MIDI読込 → 表情付け → CC/キースイッチ付きで書き出し」を体験します。

```bash
# (1) MIDI の中身を確認
ped inspect-midi examples/midi/benchmark_phrase.mid

# (2) MIDI → プロジェクトJSON（プロファイルIDを紐付け）
ped import-midi examples/midi/benchmark_phrase.mid \
    --profile example_kontakt_strings_vln1 -o my.project.json

# (3) フレーズに表情テンプレートを適用（小節:拍で範囲指定）
ped apply-template natural_swell --project my.project.json \
    --track "Strings" --start-pos 1:1 --end-pos 5:1

# (4) CC + キースイッチ付きで書き出し（--perform で奏法ルールも適用）
ped export-midi --project my.project.json \
    --profile examples/profiles/example_kontakt_strings_vln1.json \
    -o my.out.mid --perform

# (5) 結果を確認
ped inspect-midi my.out.mid
```

ポイント：`export-midi` は**元の音符のタイミングを壊しません**。CC とキースイッチを
“足す”だけです。出力名は入力と別にしてください（上書きガードが働きます）。

> 補足：手順(4)で「0 keyswitch」と出るのは正常です。`import-midi` した素の MIDI には
> 奏法タグが無いため（MIDI 自体は articulation を保持できません）。**キースイッチを出すには
> 音符が奏法タグを持つ必要があり**、それを保持するのが §7 の companion プロジェクト JSON です。
> 試すなら：
> `ped export-midi --project examples/projects/benchmark_phrase.project.json --profile examples/profiles/example_kontakt_strings_vln1.json -o /tmp/ks.mid --perform`
> （legato キースイッチ note 24 が出力されます）

---

## 2.5 音符をテキストで入力する（Sibelius風）

MIDI が無くても、フレーズを**テキストで打ち込め**ます。記譜ソフトの
*アルファベティック入力*と同じ発想：音価を決め、`A`〜`G` を打つと**直前の音に最も近い
オクターブ**で置かれ、カーソルが進みます。

```bash
ped enter-notes "4 C D E F  2 G | 4 A G F E  1 C" --track "Lead" -o lead.mid
```

記法：
- 音価（sticky）：`1`=全 `2`=2分 `4`=4分 `8`=8分 `16`=16分（`.`付点、例 `4.`）。変更まで継続。
- 音名：`C` `F#` `Bb`。省略時は直前の音に最も近いオクターブ。明示は `C5`（科学的表記 C4=60）。
  `+`/`-` でオクターブ移動、`8C` のように音価を頭に付けてもOK。
- `r`=休符、`|`=小節線（無視）。

出力は拡張子で判定（`.mid`=MIDI、`.json`=プロジェクト）。`--into existing.json --track 名前`
で既存トラックの末尾に**追記**もできます（入力を守るため、`-o 別名` か `--in-place` の指定が必要）。
`--articulation legato` で全音符に奏法タグ付け。

---

## 3. プロファイルを理解する

プロファイルは「この音源に何をどう送るか」の定義です。中身を検証してみましょう。

```bash
ped validate-profile examples/profiles/example_kontakt_strings_vln1.json
```

`OK` が出れば妥当。検証はこんな間違いを見つけます：
キースイッチの重複、キースイッチが実音域に衝突、未割当CC、CC範囲外、
`noteName` と `note` の食い違い（**C3=60 / C4=60 問題**）。

最小構成のイメージ（抜粋）:

```json
{
  "id": "my_strings", "engine": "Kontakt", "noteNaming": "C3=60",
  "playableRange": { "low": 55, "high": 103 },
  "articulations": [
    { "id": "legato", "name": "Legato", "type": "long",
      "trigger": { "type": "keyswitch", "note": 24, "noteName": "C0", "mode": "latch" } }
  ],
  "ccMappings": [
    { "internalParameter": "intensity", "target": { "type": "cc", "cc": 1 },
      "curveId": "dyn", "smoothingMs": 40, "inputCc": 1 }
  ],
  "calibrationCurves": [
    { "id": "dyn", "interpolation": "monotonic",
      "points": [ {"input":0.0,"output":8}, {"input":0.5,"output":68}, {"input":1.0,"output":120} ] }
  ]
}
```

別音源に移るときは**この JSON を差し替えるだけ**。演奏意図データは作り直しません。
形式の詳細は [DATA_FORMAT.md](DATA_FORMAT.md)、Kontakt のコツは [KONTAKT_PROFILE.md](KONTAKT_PROFILE.md)。

`library` 欄に何と書けばいいか分からないときは、インストール済みの音源プラグインを一覧できます：

```bash
ped list-instruments                 # AU(auval) + VST3 を一覧
ped list-instruments --format au --json   # 機械可読（type/subtype/manufacturer 付き）
```

取れるのは**プラグイン名まで**（例：`Kontakt 8`）。その中の**パッチ名**は音源固有なので、
`patch` 欄は手で記入します（DAW/サンプラーの仕様上、自動取得はできません）。

ゼロから書く代わりに、**雛形を生成**するのが手早いです（legato/sustain/staccato＋
CC1/11/21＋キャリブレーション3種入りの“動く”プロファイルが出ます）：

```bash
ped new-profile --from-instrument "Kontakt 8" --library "My Strings" \
    --patch "Violin 1" -o my_strings.json
ped validate-profile my_strings.json     # 生成直後から OK
```

生成後は `library` / `patch` / キースイッチのノート番号を実機に合わせて直し、
`ped calibrate` で効きを合わせれば完成です。

対話で作るなら `-i`：インストール済み音源を**番号で選ぶ**だけで、残りの項目も順に質問されます。

```bash
ped new-profile -i -o my_strings.json
```

既存プロファイルの**編集**も対話でできます（メタ情報・奏法・CCマッピング・キャリブレーションの
追加/削除）。保存前に検証し、エラーがあれば書き込みません：

```bash
ped edit-profile my_strings.json
```

---

## 4. 表情をつける3つの方法

```bash
# A) テンプレート: 1パラメータの定番カーブ
ped apply-template phrase_arch --project my.project.json --track "Strings"
#   使えるもの: natural_swell / decrescendo / phrase_arch / soft_entry /
#               breath_ending / delayed_vibrato

# B) マクロ: 複数パラメータを一括（intensity+vibrato+timbre 等）
ped apply-macro cinematic_rise --project my.project.json --track "Strings"
#   例: emotional_swell / soft_entry / strong_attack / breath_ending /
#       cinematic_rise / classical_restrained / anime_strings /
#       pop_strings_support / trailer_tension

# C) Phrase Painter: 1本の intensity 線から volume/vibrato/timbre を自動展開
ped paint-phrase --project my.project.json --track "Strings" --source intensity
```

範囲は `--start-pos 2:1 --end-pos 4:3`（小節:拍）か、`--start/--end`（tick）で指定。

---

## 5. キャリブレーション（音源の“効き”を合わせる）

同じ intensity=0.5 でも音源ごとに鳴り方が違います。これを吸収するのがキャリブレーションです。

```bash
# A) 手入力: ppp..fff で「ちょうど良いCC値」を登録 → カーブ化（プロファイルに追加）
ped calibrate --id dyn --levels "ppp=8,p=35,mf=68,ff=110,fff=120" \
    --profile examples/profiles/example_kontakt_strings_vln1.json

# B) 測定の反転: 各CCで測った音量を渡すと、知覚的に均等な intent→CC カーブを生成
ped calibrate-auto --id dyn \
    --measure "0=-60,32=-40,64=-28,96=-18,127=-10"

# C) 対話: ppp..fff を1つずつ聞かれて入力（空欄でスキップ）
ped calibrate --interactive --profile examples/profiles/example_kontakt_strings_vln1.json
```

`--profile` を付けると曲線をプロファイルに保存、付けないと JSON を標準出力（`-o` でファイル）。
（オーディオから自動測定する部分は将来対応。今は測定値の手入力までです）

---

## 6. 書き出し（DAW へ渡す）

```bash
# CC/キースイッチ付き MIDI（Logic/Cubase に読み戻す）
ped export-midi --project my.project.json \
    --profile examples/profiles/example_kontakt_strings_vln1.json -o my.out.mid --perform

# DAW の奏法マップ（取り込みの出発点）
ped export-articulations --profile examples/profiles/example_kontakt_strings_vln1.json \
    --format logic  -o "MySet.plist"          # Logic Articulation Set
ped export-articulations --profile examples/profiles/example_kontakt_strings_vln1.json \
    --format cubase -o "MyMap.expressionmap"  # Cubase Expression Map
```

Logic ワークフローの詳細は [LOGIC_INTEGRATION.md](LOGIC_INTEGRATION.md)。

---

## 7. ベンチマークフレーズ

`examples/midi/benchmark_phrase.mid` は検証用の4小節レガート弦フレーズです：
9音（legato）＋ legato キースイッチ（note 24）＋ **生CC1のアーチ強弱**。
意図を保持した companion もあります：`examples/projects/benchmark_phrase.project.json`
（音符ごとの `articulationId="legato"` と intensity アーチカーブ入り。`ped validate-project` で検証可）。

```bash
ped validate-project examples/projects/benchmark_phrase.project.json \
    --profile examples/profiles/example_kontakt_strings_vln1.json
```

---

## 8. プラグインで試す（AU / VST3）

リアルタイム版。普段のコントローラ1本（例：モジュレーションホイール=CC1）で意図を入力し、
プロファイル経由で音源用CCへその場で変換します。

### ビルド & インストール（macOS / 初回）

```bash
python -m pip install cmake ninja            # 無ければ
cmake -S plugin -B plugin/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build plugin/build --target PhraseExpressionDesigner_AU
ctest --test-dir plugin/build                # 動作テスト（任意）
auval -v aumi Ped1 Hkvn                       # 期待: AU VALIDATION SUCCEEDED
```

ビルドすると AU/VST3 が `~/Library/Audio/Plug-Ins` に**自動コピー**されます。
詳細・制限は [PLUGIN.md](PLUGIN.md)。

### Logic での使い方

1. **ソフトウェア音源トラック**を作成（MIDI FX はこの種類にだけ挿せます）。
2. チャンネルストリップの **MIDI FX** スロット → Audio Units → **HikaVn → Phrase Expression Designer**。
3. プラグイン画面の **Load Profile…** でプロファイル JSON を選択（編集後は **Reload**）。
4. 演奏：
   - **モジュレーションホイール（CC1）** を動かす → 生CC1を消費し、カーブ変換後のCC1を音源へ。
   - **Intensity / Timbre / Vibrato** ノブ（または DAW オートメーション）でも入力可。
   - **Articulation #** を変えると、その奏法のキースイッチ/CC/プログラムチェンジを発火。

> 注意：このプラグインは**音符を編集しません**（音符は Logic のピアノロールで）。
> 役割は「意図 → 音源ごとの正しいCC・奏法切替」への変換です。

### 反映ルール（再起動の要否）

- **プロファイルJSONを編集** → 再起動不要。**Reload** を押すだけ。
- **C++を再ビルド** → ホストはバイナリを常駐保持しているので **Logic を再起動**。速く回すなら
  **Standalone .app** を使う（同じエンジン・別プロセス）。

---

## 9. よくある質問

- **音符は作れる？** いいえ。音符はDAWのピアノロール。本ツールは表情・奏法の変換専門。
- **別の音源に変えたら作り直し？** いいえ。プロファイルを差し替えるだけ。意図データは再利用。
- **lookAhead はプラグインで効く？** いいえ（未来は読めない＝因果性）。オフライン書き出しのみ。
  リアルタイムは `smoothingMs` のスムージングで対応。

---

## 10. 次のステップ

- 自分の音源用にプロファイルを1つ作る（[KONTAKT_PROFILE.md](KONTAKT_PROFILE.md) を参考に）。
- `calibrate` で ppp..fff を登録して効きを合わせる。
- ベンチマークフレーズを自分の曲のフレーズに置き換えて往復ワークフローを試す。

全体像は [README](../README.md) / [ARCHITECTURE.md](ARCHITECTURE.md)、未実装事項は [TODO.md](../TODO.md)。
