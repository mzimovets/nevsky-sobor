#!/bin/bash
# Запускается НА СЕРВЕРЕ (в консоли Jino): забирает код из git, собирает и обновляет сайт.
# Копию репозитория держит в /home/sobor-src; базу и загрузки (/home/sobor/server/database.db, uploads) не трогает.
set -e
REPO="https://github.com/mzimovets/nevsky-sobor.git"
SRC="/home/sobor-src"
DEST="/home/sobor"

[ -d "$SRC/.git" ] || git clone "$REPO" "$SRC"
cd "$SRC"
git pull --ff-only
npm ci --silent
npm run build

rm -rf "$DEST/server/build"
cp -a build "$DEST/server/build"
tar -C server --exclude=node_modules --exclude=database.db --exclude=uploads --exclude=build -cf - . | tar -C "$DEST/server" -xf -

cd "$DEST/server"
npm install --omit=dev --silent
systemctl restart sobor
sleep 1
systemctl is-active sobor
echo "Готово: https://nevsky-sobor.ru"
