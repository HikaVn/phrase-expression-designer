#!/bin/bash
# Phrase Expression Designer — double-click launcher (macOS).
# In Finder, double-click this file (or right-click → 開く the first time).
# It updates, opens Audio MIDI Setup + Chrome, and starts the local server.
cd "$(dirname "$0")" || exit 1

echo "==> 最新版に更新中..."
git pull origin claude/admiring-mayer-nu1gws || true

echo "==> Audio MIDI設定を開きます（IACドライバをオンラインに）..."
open -a "Audio MIDI Setup" 2>/dev/null || true

echo "==> ローカルサーバを起動します（この窓は閉じないでください）..."
npm start &
SERVER_PID=$!

sleep 2
echo "==> ブラウザで開きます..."
open -a "Google Chrome" "http://127.0.0.1:4273" 2>/dev/null \
  || open -a "Microsoft Edge" "http://127.0.0.1:4273" 2>/dev/null \
  || open "http://127.0.0.1:4273"

wait "$SERVER_PID"
