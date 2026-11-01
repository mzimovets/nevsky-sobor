// Одноразово: ужать загруженные картинки до WebP и поправить ссылки в базе.
// Запускать при ОСТАНОВЛЕННОМ сервисе: node migrate-images.mjs
import fs from "fs";
import sharp from "sharp";
import Datastore from "nedb";
import { dirname } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const up = dir + "/uploads";
const map = {};
for (const f of fs.readdirSync(up)) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  const out = f.replace(/\.[a-z0-9]+$/i, "") + ".webp";
  const before = fs.statSync(`${up}/${f}`).size;
  await sharp(`${up}/${f}`).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(`${up}/${out}`);
  console.log(f, Math.round(before / 1024) + " KB →", Math.round(fs.statSync(`${up}/${out}`).size / 1024) + " KB");
  map[f] = out;
}
const db = new Datastore({ filename: dir + "/database.db", autoload: true });
db.find({}, (err, docs) => {
  let changed = 0;
  for (const d of docs) {
    let s = JSON.stringify(d);
    const orig = s;
    for (const [a, b] of Object.entries(map)) s = s.split(`/uploads/${a}`).join(`/uploads/${b}`);
    if (s !== orig) {
      db.update({ _id: d._id }, JSON.parse(s), {}, () => {});
      changed++;
    }
  }
  setTimeout(() => {
    // старые файлы удаляем только если на них больше нет ссылок
    for (const f of Object.keys(map)) fs.unlinkSync(`${up}/${f}`);
    console.log("документов обновлено:", changed, "· файлов сжато:", Object.keys(map).length);
  }, 800);
});
