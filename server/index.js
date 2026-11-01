import express from "express";
import Datastore from "nedb";
import * as cheerio from "cheerio";
import multer from "multer";
import sharp from "sharp";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

// путь к БД — рядом с этим файлом, чтобы npm-скрипты из корня работали одинаково
const database = new Datastore(__dirname + "/database.db");
database.loadDatabase();

app.use(
  express.static(__dirname + "/build", {
    redirect: false, // /about — это и роут SPA, и папка с фото: без редиректа на /about/
    setHeaders: (res, filePath) => {
      if (/[\\/]assets[\\/]/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (/(index\.html)$/.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

// Картинки объявлений — на диск рядом с сервером (как /uploads в
// a_nevsky_react), не в NeDB: там хранится только путь.
const uploadsDir = __dirname + "/uploads";
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || [""])[0];
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
});
app.use("/uploads", express.static(uploadsDir, { maxAge: "30d", immutable: true }));

// Загруженные картинки приходят как есть (PNG по 7 МБ с телефона) — это главная
// причина медленных страниц. Ужимаем до 1600 px по длинной стороне и
// отдаём WebP; исходник удаляем.
async function optimizeUpload(file) {
  const outName = file.filename.replace(/\.[a-zA-Z0-9]+$/, "") + ".webp";
  await sharp(file.path)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(uploadsDir + "/" + outName);
  if (outName !== file.filename) fs.unlink(file.path, () => {});
  return outName;
}
const uploadHandler = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не получен" });
  try {
    res.json({ url: `/uploads/${await optimizeUpload(req.file)}` });
  } catch {
    // не картинка / битый файл — отдаём как загрузили
    res.json({ url: `/uploads/${req.file.filename}` });
  }
};

// Расписание берём с публичного сайта-редактора и кэшируем в NeDB: если
// источник недоступен, отдаём последнюю сохранённую копию, а не ошибку —
// расписание на сайте должно быть видно всегда.
const SCHEDULE_SOURCE = process.env.SCHEDULE_SOURCE_URL || "https://schedule.nevsky-sobor.ru/schedule";

// Клиенты поллят /api/schedule раз в 20с (см. useLiveSchedule.js) — чтобы
// несколько открытых вкладок не долбили апстрим одновременно, отдаём один
// и тот же ответ не чаще, чем раз в MIN_FETCH_INTERVAL.
const MIN_FETCH_INTERVAL = 8000;
let lastFetch = { at: 0, promise: null };

async function getUpstream() {
  const now = Date.now();
  if (lastFetch.promise && now - lastFetch.at < MIN_FETCH_INTERVAL) return lastFetch.promise;
  lastFetch.at = now;
  lastFetch.promise = (async () => {
    const upstream = await fetch(SCHEDULE_SOURCE, { signal: AbortSignal.timeout(5000) });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    return upstream.json();
  })();
  return lastFetch.promise;
}

// Расписание отдаём МГНОВЕННО из базы, а свежую копию подтягиваем с источника
// в фоне (по запросу и раз в 30 с) — посетитель не ждёт чужой сайт. Если в базе
// ещё ничего нет (самый первый запуск) — ждём источник.
let scheduleRefresh = null;
function refreshSchedule() {
  if (scheduleRefresh) return scheduleRefresh;
  scheduleRefresh = getUpstream()
    .then((doc) => {
      if (!doc || !doc.data) return null;
      database.update(
        { _id: "schedule" },
        { $set: { data: doc.data, meta: doc.meta, updatedAt: doc.updatedAt, cachedAt: Date.now() } },
        { upsert: true },
        () => {}
      );
      return doc;
    })
    .catch(() => null)
    .finally(() => {
      scheduleRefresh = null;
    });
  return scheduleRefresh;
}

app.get("/api/schedule", (req, res) => {
  database.findOne({ _id: "schedule" }, async (err, cached) => {
    if (cached) {
      refreshSchedule();
      return res.json({ data: cached.data, meta: cached.meta, updatedAt: cached.updatedAt, stale: false });
    }
    const doc = await refreshSchedule();
    if (doc) return res.json({ ...doc, stale: false });
    res.status(503).json({ error: "Расписание недоступно" });
  });
});

// Редактор расписания (schedule.nevsky-sobor.ru) по кнопке «Опубликовать»
// присылает расписание сюда. Принимаем только с верным ключом PUBLISH_KEY.
app.post("/api/schedule-publish", express.json({ limit: "5mb" }), (req, res) => {
  const key = process.env.PUBLISH_KEY;
  if (!key || req.get("x-publish-key") !== key) return res.status(401).json({ error: "forbidden" });
  const { data, meta, updatedAt } = req.body || {};
  if (!Array.isArray(data)) return res.status(400).json({ error: "bad data" });
  database.update(
    { _id: "schedule" },
    { $set: { data, meta, updatedAt, cachedAt: Date.now() } },
    { upsert: true },
    (err) => {
      if (err) return res.status(500).json({ error: "save failed" });
      res.json({ status: "ok" });
      warmDayInfo();
    }
  );
});

// ── День церковного календаря (страница /day/:date) ──────────────────────
// Святые, неделя/пост и ссылки на чтения берём с Азбуки Веры (JSON
// https://azbyka.ru/days/api/day/ДАТА.json), а ТЕКСТ чтений собираем сами:
// по каждой ссылке (Лк.9:12-18) тянем страницу Библии на Азбуке (синодальный
// перевод), выбираем из неё нужные стихи. Готовый день кэшируется в NeDB —
// Азбуку не дёргаем при каждом заходе; если хоть один текст не подтянулся
// (обычно временный 429), день не кэшируем, чтобы собрать заново.
const AZBYKA_DAY = "https://azbyka.ru/days/api/day";
const AZBYKA_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchWithRetry(url, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": AZBYKA_UA }, signal: AbortSignal.timeout(9000) });
      if (res.ok) return res;
      lastErr = new Error(`upstream ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw lastErr;
}

const GOSPEL_BOOKS = new Set(["Mt", "Mk", "Lk", "Jn"]);
const APOSTLE_BOOKS = new Set([
  "Act", "Jac", "Jam", "Hebr", "Apok", "1Thes", "2Thes", "1Pet", "2Pet", "1Jn", "2Jn", "3Jn", "Jud", "Jude", "Rom", "1Cor", "2Cor", "Gal", "Eph",
  "Phil", "Php", "Col", "1Thess", "2Thess", "1Thes", "2Thes", "1Tim", "2Tim", "Tit", "Phlm", "Philem", "Heb", "Rev",
]);

function readingKind(ref) {
  const book = ref.split(".")[0];
  if (GOSPEL_BOOKS.has(book)) return "Евангелие";
  if (APOSTLE_BOOKS.has(book)) return "Апостол";
  return "Ветхий Завет";
}

// "Lk.9:12-18" / "Mt.4:25-5:13" / "Lk.1:39-49,56" / "Lk.10:38-42,11:27-28" →
// книга и список отрезков [{c1,v1,c2,v2}] (после запятой — стих той же главы
// или «глава:стих»).
function parseRef(ref) {
  const head = ref.match(/^([A-Za-z0-9]+)\.(.+)$/);
  if (!head) return null;
  const ranges = [];
  let lastChapter = null;
  for (const part of head[2].split(",")) {
    const m = part.trim().match(/^(?:(\d+):)?(\d+)(?:-(?:(\d+):)?(\d+))?$/);
    if (!m) return null;
    const c1 = m[1] ? Number(m[1]) : lastChapter;
    if (c1 == null) return null;
    const v1 = Number(m[2]);
    const c2 = m[3] ? Number(m[3]) : c1;
    const v2 = m[4] ? Number(m[4]) : v1;
    ranges.push({ c1, v1, c2, v2 });
    lastChapter = c2;
  }
  return { book: head[1], ranges };
}
const inRanges = (ranges, c, v) =>
  ranges.some((r) => (c > r.c1 || (c === r.c1 && v >= r.v1)) && (c < r.c2 || (c === r.c2 && v <= r.v2)));

// Церковнославянский на Азбуке бывает в «настоящей» кириллице (ꙋ, ѧ, ѻ,
// титла) и в гражданском начертании (&cs). Просим гражданский — он читается
// любым шрифтом; если Азбука отдала только юникодную версию, приводим её к
// гражданскому начертанию сами.
const CS_TO_CIVIL = { "ꙋ": "у", "Ꙋ": "У", "ѧ": "я", "Ѧ": "Я", "ѻ": "о", "Ѻ": "О", "ѡ": "о", "Ѡ": "О", "ꙗ": "я", "Ꙗ": "Я", "ѿ": "от", "є": "е", "Є": "Е", "ѕ": "з", "Ѕ": "З", "ѵ": "и", "Ѵ": "И", "ѳ": "ф", "Ѳ": "Ф", "ѱ": "пс", "ѯ": "кс", "ї": "и", "ѣ": "ѣ" };
function toCivil(text) {
  return text
    .replace(/[\u2DE0-\u2DFF\u0482-\u0489]/g, "")
    .replace(/[\u0485\u0486\u0487]/g, "")
    .replace(/./gu, (ch) => CS_TO_CIVIL[ch] ?? ch)
    .normalize("NFC");
}

const biblePageCache = new Map();
function biblePage(url) {
  let promise = biblePageCache.get(url);
  if (!promise) {
    promise = fetchWithRetry(url).then((r) => r.text());
    biblePageCache.set(url, promise);
    promise.catch(() => biblePageCache.delete(url));
  }
  return promise;
}

function extractVerses($, langs, range) {
  const out = [];
  for (const lang of langs) {
    $(`div.verse.lang-${lang}[data-verse]`).each((_, el) => {
      const m = ($(el).attr("data-verse") || "").match(/^.+\.(\d+):(\d+)$/);
      if (!m) return;
      const c = Number(m[1]);
      const v = Number(m[2]);
      if (!inRanges(range.ranges, c, v)) return;
      const node = $(el).clone();
      node.find(".checkbox, .icon-check, .zachala").remove();
      node.find(".christ-speech").each((__, sp) => {
        $(sp).replaceWith(`<em class="christ">${$(sp).text()}</em>`);
      });
      node.find("a, .cyn, span").each((__, sp) => {
        $(sp).replaceWith($(sp).text());
      });
      let text = node.html().replace(/\[[^\]]*\]\s*/g, "").replace(/\s+/g, " ").trim();
      if (lang === "utfcs") text = toCivil(text);
      if (text) out.push({ c, n: v, html: text });
    });
    if (out.length) break;
  }
  const seen = new Set();
  return out.filter((v) => (seen.has(`${v.c}:${v.n}`) ? false : seen.add(`${v.c}:${v.n}`)));
}

// Текст чтения: русский (синодальный) и церковнославянский рядом по стихам.
async function fetchReadingText(ref) {
  const range = parseRef(ref);
  if (!range) return null;
  const chapters = [...new Set(range.ranges.flatMap((r) => {
    const list = [];
    for (let c = r.c1; c <= r.c2; c++) list.push(c);
    return list;
  }))];
  const urls = (suffix) =>
    chapters.map((c, i) => (i === 0 ? `https://azbyka.ru/biblia/?${ref}${suffix}` : `https://azbyka.ru/biblia/?${range.book}.${c}:1${suffix}`));
  const gather = async (suffix, langs) => {
    const all = [];
    let title = null;
    for (const url of urls(suffix)) {
      const $ = cheerio.load(await biblePage(url));
      title = title || $("h1 .title__chapters-selector").first().text().split(",")[0].replace(/\s+/g, " ").trim() || null;
      all.push(...extractVerses($, langs, range));
    }
    return { title, verses: all };
  };
  const ru = await gather("", ["r"]);
  let cs = { verses: [] };
  try {
    cs = await gather("&cs", ["cs", "utfcs"]);
  } catch {
    cs = { verses: [] };
  }
  const csMap = new Map(cs.verses.map((v) => [`${v.c}:${v.n}`, v.html]));
  const verses = ru.verses.map((v) => ({ c: v.c, n: v.n, ru: v.html, cs: csMap.get(`${v.c}:${v.n}`) || null }));
  return { bookTitle: ru.title, verses, hasCs: verses.some((v) => v.cs) };
}

const stripTags = (html) => cheerio.load(`<div>${html || ""}</div>`)("div").text().replace(/\s+/g, " ").trim();

// Что можно есть в этот день — берём из таблицы «Календарь постов» на Азбуке
// (https://azbyka.ru/days/p-kalendar-postov-i-trapez): строка — период поста,
// 7 ячеек — дни недели Пн…Вс («сухоядение», «без масла», «с маслом», «рыба»,
// «пост» для среды/пятницы вне многодневных постов).
let foodTable = null;
let foodTableAt = 0;
async function getFoodTable() {
  if (!foodTable || Date.now() - foodTableAt > 24 * 3600 * 1000) {
    foodTableAt = Date.now();
    foodTable = fetchWithRetry("https://azbyka.ru/days/p-kalendar-postov-i-trapez")
      .then((r) => r.text())
      .then((html) => {
        const $ = cheerio.load(html);
        const rows = [];
        $("table tr").each((_, tr) => {
          const cells = $(tr)
            .children("td,th")
            .map((__, c) => $(c).text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim())
            .get();
          if (cells.length >= 8 && !/период/i.test(cells[0])) rows.push({ label: cells[0], cells: cells.slice(1, 8) });
        });
        if (!rows.length) throw new Error("food table empty");
        return rows;
      });
    foodTable.catch(() => {
      foodTable = null;
    });
  }
  return foodTable;
}

const FOOD_TEXT = {
  "сухоядение": "Сухоядение — хлеб, вода, овощи, фрукты, компоты",
  "без масла": "Горячая пища без масла",
  "с маслом": "Пища с растительным маслом",
  "рыба": "Разрешается рыба",
  "пост": "Постный день — мясное, молочное и яйца не вкушаются",
};

async function foodFor(date, fastName, seasonText) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay(); // 0 = вс
  const col = (weekday + 6) % 7; // Пн…Вс
  const rows = await getFoodTable();
  const name = (fastName || "").toLowerCase();
  let row = null;
  if (name.includes("великий")) row = rows.find((r) => /великий/i.test(r.label));
  else if (name.includes("апостольск")) row = rows.find((r) => /апостольск/i.test(r.label));
  else if (name.includes("успенск")) row = rows.find((r) => /успенск/i.test(r.label) && r.cells.some(Boolean));
  else if (name.includes("рождествен")) {
    const key = (m === 11 || (m === 12 && d <= 19)) ? "28 ноя" : (m === 12 || (m === 1 && d === 1)) ? "20 дек" : "2";
    row = rows.find((r) => r.label.startsWith(key) && /(?:ноя|дек|янв)/i.test(r.label));
  } else if (!name && (weekday === 3 || weekday === 5) && !/сплошн|святки|мытаря и фарисея|сырная|масленичн|светлая седмица|пасхальная седмица|троицкая/i.test(seasonText)) {
    row = rows.find((r) => /мясоед/i.test(r.label));
  }
  const cell = row?.cells[col]?.replace(/\*/g, "").trim().toLowerCase();
  if (!cell) return null;
  return { rule: cell, text: FOOD_TEXT[cell] || cell };
}

// ── Чтения по службам с pravoslavie.ru ───────────────────────────────────
// На https://days.pravoslavie.ru/Days/ГГГГММДД.html (дата — по СТАРОМУ стилю)
// в блоке «Евангельские Чтения» они разложены по службам: «Утр. -», «Лит. -
// Ап.:», «Ряд.:», «Свт.:»… Берём ссылки оттуда, а текст подтягиваем
// fetchReadingText (Азбука) по тому же отрывку.
const PRAV_BOOKS = {
  "Мф": "Mt", "Мк": "Mk", "Лк": "Lk", "Ин": "Jn", "Деян": "Act", "Иак": "Jac", "1 Пет": "1Pet", "2 Пет": "2Pet",
  "1 Ин": "1Jn", "2 Ин": "2Jn", "3 Ин": "3Jn", "Иуд": "Jud", "Рим": "Rom", "1 Кор": "1Cor", "2 Кор": "2Cor",
  "Гал": "Gal", "Еф": "Eph", "Флп": "Phil", "Кол": "Col", "1 Сол": "1Thes", "2 Сол": "2Thes", "1 Фес": "1Thes",
  "2 Фес": "2Thes", "1 Тим": "1Tim", "2 Тим": "2Tim", "Тит": "Tit", "Флм": "Phlm", "Евр": "Hebr", "Откр": "Apok",
};
const ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100 };
function romanToInt(r) {
  let total = 0;
  for (let i = 0; i < r.length; i++) {
    const v = ROMAN_VALUES[r[i]];
    const next = ROMAN_VALUES[r[i + 1]] || 0;
    total += v < next ? -v : v;
  }
  return total;
}
const PRAV_GROUPS = {
  "Утр": "Утреня",
  "Лит": "Литургия",
  "Ряд": "Рядовое чтение",
  "Свт": "Святителю",
  "Прп": "Преподобному",
  "Мч": "Мученику",
  "Мцц": "Мученикам",
  "Прор": "Пророку",
  "Ап": "Апостолу",
  "Прав": "Праведному",
  "Блж": "Блаженному",
  "Бог": "Богородице",
  "Мц": "Мученице",
};

// «Кол., 260 зач. (от полу́), IV, 5-9, 14, 18.» → {ref: "Col.4:5-9,14,18", ...}
function parsePravReading(text, href) {
  const clean = text.replace(/\u00a0/g, " ").replace(/\u0301/g, "").replace(/\s+/g, " ").trim().replace(/[).\s]+$/, "");
  const m = clean.match(/^((?:\d\s)?[А-Яа-я]+)\.,\s*(\d+(?:-\d+)?)\s*зач\.(?:\s*\(([^)]*)\))?,\s*(.+)$/);
  if (!m) return null;
  const code = PRAV_BOOKS[m[1]];
  const zachalo = m[2];
  const zNote = m[3] || null;
  const verses = m[4]
    .replace(/([IVXLC]+),\s*/g, (_, r) => `${romanToInt(r)}:`)
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*[;,]\s*/g, ",");
  const bookRu = m[1];
  return {
    ref: code ? `${code}.${verses}` : null,
    label: `${bookRu}. ${verses.replace(/,/g, ", ").replace(/-/g, "–")}`,
    zachalo,
    zachaloNote: zNote,
    href,
    kind: code ? readingKind(`${code}.x`) : "Евангелие",
  };
}

async function loadPravReadings(date) {
  const [y, mo, d] = date.split("-").map(Number);
  const os = new Date(Date.UTC(y, mo - 1, d - 13)); // старый стиль (1900–2099)
  const stamp = `${os.getUTCFullYear()}${String(os.getUTCMonth() + 1).padStart(2, "0")}${String(os.getUTCDate()).padStart(2, "0")}`;
  const html = await (await fetchWithRetry(`https://days.pravoslavie.ru/Days/${stamp}.html`)).text();
  const $ = cheerio.load(html);
  const h2 = $("h2").filter((_, el) => /Евангельские\s+Чтения/i.test($(el).text())).first();
  if (!h2.length) return { groups: [], notes: [] };

  const groups = [];
  const notes = [];
  let current = null;
  let marked = null;
  const open = (key, title) => {
    current = { key, title, readings: [] };
    groups.push(current);
  };
  const handleLabel = (text) => {
    const labels = text.match(/(Утр|Лит|Ряд|Свт|Прп|Мчч?|Мцц?|Прор|Ап|Прав|Блж|Бог)\.[^А-Яа-я]{0,6}/g);
    if (!labels) return;
    const first = labels[0].match(/^([А-Яа-я]+)\./)[1];
    if (first === "Ап") return; // «Лит. - Ап.:» — это пометка вида чтения, не новая служба
    open(first, PRAV_GROUPS[first] || first);
  };
  const walk = (nodes) => {
    nodes.each((_, node) => {
      if (node.type === "text") {
        handleLabel(node.data || "");
      } else if (node.type === "tag") {
        const el = $(node);
        if (node.name === "h2") return false;
        if (node.name === "a") {
          const reading = parsePravReading(el.text(), el.attr("href"));
          if (reading) {
            if (!current) open("day", "Чтения дня");
            current.readings.push(reading);
          }
        } else if (el.hasClass("DAYS_snoska")) {
          // сноска к тому блоку чтений, где стоит звёздочка (иначе — к последнему)
          const t = el.text().replace(/\s+/g, " ").replace(/^[*\s]+/, "* ").trim();
          const target = marked || current;
          if (t && target) (target.notes ||= []).push(t);
          else if (t) notes.push(t);
        } else if (el.hasClass("DAYS_asterix")) {
          marked = current;
        } else if (el.css("display") === "none") {
          // скрытое
        } else {
          walk(el.contents());
        }
      }
    });
  };
  // всё между этим <h2> и следующим <h2>
  const between = [];
  let n = h2[0].next;
  while (n && !(n.type === "tag" && /^h2$/i.test(n.name))) {
    between.push(n);
    n = n.next;
  }
  for (const node of between) walk($(node));
  return { groups: groups.filter((g) => g.readings.length), notes };
}

async function loadDayInfo(date) {
  const res = await fetchWithRetry(`${AZBYKA_DAY}/${date}.json`);
  const d = await res.json();

  const saints = (d.saints || []).map((s) => ({
    title: s.title,
    type: s.type_of_sanctity || "",
    url: s.uri ? `https://azbyka.ru/days/sv-${s.uri}` : null,
  }));
  const holidays = (d.holidays || []).map((h) => ({ title: h.title || h.name || "" })).filter((h) => h.title);

  const fasting = d.fasting || {};
  const info = {
    date,
    saints,
    holidays,
    week: stripTags(fasting.round_week),
    memorial: stripTags(fasting.weeks),
    fasting: stripTags(fasting.fasting),
    fastingNote: stripTags(fasting.description),
  };

  try {
    info.food = await foodFor(date, info.fasting, `${info.week} ${info.memorial} ${holidays.map((h) => h.title).join(" ")}`);
  } catch {
    info.food = null;
  }

  const readings = [];
  const notes = [];
  for (const t of d.texts || []) {
    const $ = cheerio.load(`<div>${t.text || ""}</div>`);
    $("a.bibref").each((_, a) => {
      const href = $(a).attr("href") || "";
      const refMatch = href.match(/biblia\/\?(.+)$/);
      if (!refMatch) return;
      const ref = decodeURIComponent(refMatch[1]);
      const label = $(a).text().replace(/\u2013/g, "–");
      const tail = ($(a).parent().text().split($(a).text())[1] || "").match(/^\s*\((?:[^)]*?)зач\.?\s*(\d+)\)/);
      readings.push({ ref, label, href, kind: readingKind(ref), zachalo: tail ? Number(tail[1]) : null, bookTitle: null, verses: null });
    });
    $("p").each((_, p) => {
      if ($(p).find("a.bibref").length) return;
      const text = $(p).text().replace(/\s+/g, " ").trim();
      if (text) notes.push(text);
    });
  }

  // Чтения по службам — с pravoslavie.ru; если он недоступен или ничего не
  // отдал, показываем одним блоком чтения из Азбуки.
  let groups = [];
  try {
    const prav = await loadPravReadings(date);
    groups = prav.groups;
    for (const n of prav.notes) if (!notes.includes(n)) notes.push(n);
  } catch {
    groups = [];
  }
  if (!groups.length) groups = [{ key: "day", title: "Чтения дня", readings }];

  let complete = true;
  for (const g of groups) {
    for (const r of g.readings) {
      r.bookTitle = null;
      r.verses = null;
      if (!r.ref) {
        complete = false;
        continue;
      }
      try {
        const got = await fetchReadingText(r.ref);
        if (got) {
          r.bookTitle = got.bookTitle;
          r.verses = got.verses.length ? got.verses : null;
          r.hasCs = got.hasCs;
        }
        if (!r.verses || !r.hasCs) complete = false;
      } catch {
        complete = false;
      }
    }
  }
  info.readingGroups = groups;
  // «* Поминовение усопших установлено…» — сноска к строке про поминовение в
  // шапке дня, показываем прямо под ней, а не отдельным абзацем в конце
  const rest = [];
  for (const n of notes) {
    if (info.memorial && !info.memorialNote && /^\*?\s*Поминовени/i.test(n)) info.memorialNote = n;
    else rest.push(n);
  }
  info.notes = rest;
  return { info, complete };
}

const dayInfoInflight = new Map();
app.get("/api/day-info", (req, res) => {
  const date = ISO_DATE_RE.test(req.query.date || "") ? req.query.date : todayISO();
  const id = `day-info-v6:${date}`;
  database.findOne({ _id: id }, async (err, cached) => {
    if (cached) return res.json(cached.info);
    try {
      let job = dayInfoInflight.get(date);
      if (!job) {
        job = loadDayInfo(date).finally(() => dayInfoInflight.delete(date));
        dayInfoInflight.set(date, job);
      }
      const { info, complete } = await job;
      if (complete) database.update({ _id: id }, { $set: { info, cachedAt: Date.now() } }, { upsert: true }, () => {});
      res.json(info);
    } catch {
      res.status(503).json({ error: "Церковный календарь недоступен" });
    }
  });
});

// ── Толкования на стих ───────────────────────────────────────────────────
// https://azbyka.ru/biblia/in/?Мф.5:3 — толкования святых отцов и богословов на
// один стих. Разбираем страницу в список {автор, текст, источник}, разметку
// чистим (оставляем только абзацы и выделение, без ссылок и скриптов) и
// кладём в базу: толкования не меняются, повторно на сайт не ходим.
const VERSE_REF_RE = /^[A-Za-z0-9]+\.\d{1,3}:\d{1,3}$/;
const COMMENT_TAGS = new Set(["p", "strong", "b", "em", "i", "br", "sup", "sub", "blockquote"]);

function cleanCommentHtml($, root) {
  const clean = (node) => {
    $(node)
      .contents()
      .each((_, child) => {
        if (child.type === "text") return;
        if (child.type !== "tag") {
          $(child).remove();
          return;
        }
        const name = child.tagName.toLowerCase();
        if (["script", "style", "iframe", "img", "svg"].includes(name)) {
          $(child).remove();
          return;
        }
        clean(child);
        if (COMMENT_TAGS.has(name)) child.attribs = {};
        else $(child).replaceWith($(child).contents());
      });
  };
  clean(root);
  return $(root).html().replace(/\s+/g, " ").trim();
}

async function loadVerseCommentary(ref) {
  const res = await fetchWithRetry(`https://azbyka.ru/biblia/in/?${ref}`);
  const $ = cheerio.load(await res.text());
  const items = [];
  $(".interpretation").each((_, el) => {
    const block = $(el);
    const author = block.find("h2").first().clone().children().remove().end().text().replace(/\s+/g, " ").trim();
    const content = block.find(".interp-content").first();
    if (!author || !content.length) return;
    const html = cleanCommentHtml($, content);
    if (!stripTags(html)) return;
    const src = block.find(".interp-src a").first();
    const href = src.attr("href") || "";
    items.push({
      author,
      html,
      source: src.length ? { title: src.text().replace(/\s+/g, " ").trim(), url: /^https:\/\/azbyka\.ru\//.test(href) ? href : null } : null,
    });
  });
  return { ref, url: `https://azbyka.ru/biblia/in/?${ref}`, items };
}

const commentaryInflight = new Map();
app.get("/api/verse-commentary", (req, res) => {
  const ref = String(req.query.ref || "");
  if (!VERSE_REF_RE.test(ref)) return res.status(400).json({ error: "Некорректная ссылка на стих" });
  const id = `verse-comm-v1:${ref}`;
  database.findOne({ _id: id }, async (err, cached) => {
    if (cached) return res.json(cached.data);
    try {
      let job = commentaryInflight.get(ref);
      if (!job) {
        job = loadVerseCommentary(ref).finally(() => commentaryInflight.delete(ref));
        commentaryInflight.set(ref, job);
      }
      const data = await job;
      database.update({ _id: id }, { $set: { data, cachedAt: Date.now() } }, { upsert: true }, () => {});
      res.json(data);
    } catch {
      res.status(503).json({ error: "Толкования сейчас недоступны" });
    }
  });
});

// Объявления на главной («истории») — без авторизации, как и остальные
// редакторы в проекте: хранятся в общей NeDB с type: "announcement",
// полем order (порядок в ленте, меняется перетаскиванием в админке — см.
// /api/announcements/reorder) и необязательным expiresAt (мс, до какого
// момента показывать; null/отсутствует — бессрочно). Публичный список
// (без ?all=1) отдаёт только ещё не просроченные — админка в
// Announcements.jsx запрашивает ?all=1, чтобы видеть и просроченные тоже
// (их можно продлить или удалить).
app.get("/api/announcements", (req, res) => {
  const showAll = req.query.all === "1";
  const query = { type: "announcement" };
  database
    .find(query)
    .sort({ order: 1 })
    .exec((err, docs) => {
      if (err) return res.status(500).json({ error: "Не удалось загрузить объявления" });
      const now = Date.now();
      const filtered = showAll ? docs : (docs || []).filter((d) => !d.expiresAt || d.expiresAt > now);
      res.json(filtered || []);
    });
});

// expiresAt в теле запроса: число (мс) — показывать до этого момента;
// null — явно снять срок (бессрочно); отсутствует в body — не трогать
// (для PUT) / бессрочно по умолчанию (для POST).
app.post("/api/announcements", express.json(), (req, res) => {
  const { title, imageUrl, expiresAt } = req.body || {};
  if (typeof title !== "string" || !title.trim() || typeof imageUrl !== "string" || !imageUrl) {
    return res.status(400).json({ error: "title и imageUrl обязательны" });
  }
  database.count({ type: "announcement" }, (countErr, count) => {
    if (countErr) return res.status(500).json({ error: "Не удалось создать объявление" });
    database.insert(
      {
        type: "announcement",
        title: title.trim(),
        imageUrl,
        expiresAt: typeof expiresAt === "number" ? expiresAt : null,
        order: count,
        createdAt: Date.now(),
      },
      (err, doc) => {
        if (err) return res.status(500).json({ error: "Не удалось создать объявление" });
        res.json(doc);
      }
    );
  });
});

app.put("/api/announcements/:id", express.json(), (req, res) => {
  const { title, imageUrl, expiresAt } = req.body || {};
  const $set = {};
  if (typeof title === "string" && title.trim()) $set.title = title.trim();
  if (typeof imageUrl === "string" && imageUrl) $set.imageUrl = imageUrl;
  if (expiresAt === null || typeof expiresAt === "number") $set.expiresAt = expiresAt;
  if (!Object.keys($set).length) return res.status(400).json({ error: "Нечего сохранять" });
  database.update({ _id: req.params.id, type: "announcement" }, { $set }, {}, (err, num) => {
    if (err) return res.status(500).json({ error: "Не удалось сохранить объявление" });
    if (!num) return res.status(404).json({ error: "Объявление не найдено" });
    database.findOne({ _id: req.params.id }, (findErr, doc) => res.json(doc));
  });
});

app.delete("/api/announcements/:id", (req, res) => {
  database.remove({ _id: req.params.id, type: "announcement" }, {}, (err, num) => {
    if (err) return res.status(500).json({ error: "Не удалось удалить объявление" });
    if (!num) return res.status(404).json({ error: "Объявление не найдено" });
    res.json({ ok: true });
  });
});

// Перетаскивание в админке (см. Announcements.jsx) — целиком новый порядок
// разом, id по порядку; order проставляется по позиции в массиве.
app.post("/api/announcements/reorder", express.json(), (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "ids обязателен" });
  let pending = ids.length;
  let failed = false;
  ids.forEach((id, index) => {
    database.update({ _id: id, type: "announcement" }, { $set: { order: index } }, {}, (err) => {
      if (err) failed = true;
      pending -= 1;
      if (pending === 0) {
        if (failed) return res.status(500).json({ error: "Не удалось сохранить порядок" });
        res.json({ ok: true });
      }
    });
  });
});

app.post("/api/announcements/upload", upload.single("image"), uploadHandler);

// Новости — та же схема без авторизации, что и объявления выше: общая
// NeDB, type: "news". В отличие от объявлений порядок не перетаскиваемый
// вручную — сортировка всегда по publishedAt (по убыванию, свежие сверху),
// его можно менять в форме (по умолчанию — момент создания). Категория —
// свободный текст, а не фиксированный список: фильтр на странице /news сам
// строит выпадающий список из тех значений, что реально встретились.
// Поиск и фильтр по категории — на клиенте (см. NewsPage.jsx): новостей на
// приходском сайте немного, гонять их через отдельный серверный запрос
// избыточно, а полный список и так нужен странице целиком.
app.get("/api/news", (req, res) => {
  database
    .find({ type: "news" })
    .sort({ publishedAt: -1 })
    .exec((err, docs) => {
      if (err) return res.status(500).json({ error: "Не удалось загрузить новости" });
      res.json(docs || []);
    });
});

// Одна новость по id — открытая страница /news/:id (см. NewsArticlePage.jsx)
// запрашивает напрямую, а не ищет в общем списке: работает и при прямом
// переходе по ссылке, до того как общий список вообще загрузился.
app.get("/api/news/:id", (req, res) => {
  database.findOne({ _id: req.params.id, type: "news" }, (err, doc) => {
    if (err) return res.status(500).json({ error: "Не удалось загрузить новость" });
    if (!doc) return res.status(404).json({ error: "Новость не найдена" });
    res.json(doc);
  });
});

// imageFocus/imageZoom — как обложка кадрируется в фиксированных рамках
// (карточки, карусель, шапка статьи, все object-cover — см. NewsCard.jsx/
// NewsCarousel.jsx/NewsArticlePage.jsx): imageFocus {x,y} в процентах — это
// object-position (какая точка картинки остаётся в кадре при обрезке),
// imageZoom — во сколько раз картинка увеличена сверх обычного object-cover
// (масштаб/приближение). Настраивается один раз на странице статьи
// (ImagePositioner.jsx) и одинаково применяется везде, где обложка
// показывается обрезанной.
const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);
const parseImageFocus = (focus) => {
  if (!focus || typeof focus !== "object") return null;
  if (!isFiniteNumber(focus.x) || !isFiniteNumber(focus.y)) return null;
  return { x: Math.min(100, Math.max(0, focus.x)), y: Math.min(100, Math.max(0, focus.y)) };
};

app.post("/api/news", express.json(), (req, res) => {
  const { title, body, imageUrl, category, publishedAt, imageFocus, imageZoom } = req.body || {};
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title обязателен" });
  }
  database.insert(
    {
      type: "news",
      title: title.trim(),
      // body — HTML из редактора (Tiptap, см. RichTextEditor.jsx), не
      // обычный текст: .trim() тут просто снимает пробелы/переводы строк по
      // краям всей строки, теги внутри не трогает.
      body: typeof body === "string" ? body.trim() : "",
      imageUrl: typeof imageUrl === "string" && imageUrl ? imageUrl : null,
      imageFocus: parseImageFocus(imageFocus) || { x: 50, y: 50 },
      imageZoom: isFiniteNumber(imageZoom) ? Math.min(3, Math.max(1, imageZoom)) : 1,
      category: typeof category === "string" && category.trim() ? category.trim() : null,
      publishedAt: typeof publishedAt === "number" ? publishedAt : Date.now(),
      viewCount: 0,
      createdAt: Date.now(),
    },
    (err, doc) => {
      if (err) return res.status(500).json({ error: "Не удалось создать новость" });
      res.json(doc);
    }
  );
});

app.put("/api/news/:id", express.json(), (req, res) => {
  const { title, body, imageUrl, category, publishedAt, imageFocus, imageZoom } = req.body || {};
  const $set = {};
  if (typeof title === "string" && title.trim()) $set.title = title.trim();
  if (typeof body === "string") $set.body = body.trim();
  if (imageUrl === null || (typeof imageUrl === "string" && imageUrl)) $set.imageUrl = imageUrl || null;
  if (category === null || typeof category === "string") $set.category = (category || "").trim() || null;
  if (typeof publishedAt === "number") $set.publishedAt = publishedAt;
  const focus = parseImageFocus(imageFocus);
  if (focus) $set.imageFocus = focus;
  if (isFiniteNumber(imageZoom)) $set.imageZoom = Math.min(3, Math.max(1, imageZoom));
  if (!Object.keys($set).length) return res.status(400).json({ error: "Нечего сохранять" });
  database.update({ _id: req.params.id, type: "news" }, { $set }, {}, (err, num) => {
    if (err) return res.status(500).json({ error: "Не удалось сохранить новость" });
    if (!num) return res.status(404).json({ error: "Новость не найдена" });
    database.findOne({ _id: req.params.id }, (findErr, doc) => res.json(doc));
  });
});

app.delete("/api/news/:id", (req, res) => {
  database.remove({ _id: req.params.id, type: "news" }, {}, (err, num) => {
    if (err) return res.status(500).json({ error: "Не удалось удалить новость" });
    if (!num) return res.status(404).json({ error: "Новость не найдена" });
    res.json({ ok: true });
  });
});

app.post("/api/news/upload", upload.single("image"), uploadHandler);

// Счётчик просмотров — страница статьи (NewsArticlePage.jsx) шлёт сюда раз
// за сессию (см. sessionStorage-отметку там же), $inc — атомарный инкремент
// NeDB, без гонки чтение-запись при параллельных запросах.
app.post("/api/news/:id/view", (req, res) => {
  database.update({ _id: req.params.id, type: "news" }, { $inc: { viewCount: 1 } }, {}, (err, num) => {
    if (err) return res.status(500).json({ error: "Не удалось обновить счётчик" });
    if (!num) return res.status(404).json({ error: "Новость не найдена" });
    res.json({ ok: true });
  });
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(__dirname + "/build/index.html");
});

const PORT = process.env.PORT || 4500;
// Фоновый прогрев кеша «дня»: чтения и святые собираются с внешних сайтов
// (azbyka.ru, pravoslavie.ru) и на новую дату занимают десятки секунд, а то и
// падают. Поэтому заранее, по одной дате за раз, подгружаем сегодня и
// ближайшие дни — к моменту, когда человек откроет страницу дня, ответ
// уже лежит в базе (миллисекунды). Недогруженное (complete=false) в кеш
// не пишется и будет повторено на следующем круге.
const WARM_AHEAD_DAYS = 21;
const WARM_BEHIND_DAYS = 2;
const WARM_EVERY_MS = 3 * 60 * 60 * 1000;
let warming = false;
async function warmDayInfo() {
  if (warming) return;
  warming = true;
  try {
    for (let i = -WARM_BEHIND_DAYS; i <= WARM_AHEAD_DAYS; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const date = todayISO(d);
      const id = `day-info-v6:${date}`;
      const cached = await new Promise((resolve) => database.findOne({ _id: id }, (e, doc) => resolve(doc)));
      if (cached) continue;
      try {
        let job = dayInfoInflight.get(date);
        if (!job) {
          job = loadDayInfo(date).finally(() => dayInfoInflight.delete(date));
          dayInfoInflight.set(date, job);
        }
        const { info, complete } = await job;
        if (complete) {
          await new Promise((resolve) => database.update({ _id: id }, { $set: { info, cachedAt: Date.now() } }, { upsert: true }, resolve));
        }
      } catch {
        /* источник недоступен — попробуем на следующем круге */
      }
    }
  } finally {
    warming = false;
  }
}

app.listen(PORT, () => {
  console.log("sobor server on " + PORT);
  refreshSchedule();
  setInterval(refreshSchedule, 30000).unref();
  setTimeout(warmDayInfo, 5000);
  setInterval(warmDayInfo, WARM_EVERY_MS).unref();
});
