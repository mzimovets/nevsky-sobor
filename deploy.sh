#!/usr/bin/env bash
# Выкладка сайта собора на VPS: сборка → rsync → перезапуск сервиса.
# БД и загруженные картинки на сервере НЕ трогаем (--exclude).
set -euo pipefail
cd "$(dirname "$0")"
HOST="root@4678e4d48708.vps.myjino.ru"
SSH="ssh -p 49190"
DEST="/home/sobor"

npm run build
RSYNC="rsync -az --delete -e '$SSH'"
eval $RSYNC build/ "$HOST:$DEST/server/build/"
eval $RSYNC --exclude node_modules --exclude database.db --exclude uploads \
  --exclude build server/ "$HOST:$DEST/server/"
$SSH "$HOST" "cd $DEST/server && npm install --omit=dev --silent && systemctl restart sobor && sleep 1 && systemctl is-active sobor"
echo "Готово: https://nevsky-sobor.ru"
