import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useLiveSchedule } from "../lib/useLiveSchedule.js";
import { useDayInfo } from "../lib/useDayInfo.js";
import { dayISODate, dayStatus, todayIndex } from "../lib/scheduleDate.js";
import { parseServices } from "../lib/services.js";
import { Eyebrow, RevealWords } from "../components/Reveal.jsx";

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const SANCTITY = {
  "прор.": "Пророк", "прмч.": "Преподобномученик", "прп.": "Преподобный", "мч.": "Мученик", "прав.": "Праведный",
  "сщмч.": "Священномученик", "свт.": "Святитель", "блж.": "Блаженный", "ап.": "Апостол", "мц.": "Мученица",
  "прмц.": "Преподобномученица", "прпп.": "Преподобные", "мчч.": "Мученики", "вмч.": "Великомученик",
  "вмц.": "Великомученица", "равноап.": "Равноапостольный", "благов.": "Благоверный", "кн.": "Князь",
};

const toRoman = (n) => {
  const table = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [value, symbol] of table) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
};

const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

const Arrow = ({ dir = "right" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} />
  </svg>
);
const Chevron = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform duration-500 ${open ? "rotate-180" : ""}`}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const BookIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 21.5A2.5 2.5 0 0 1 6.5 19H20M12 7v6M9.5 9.5h5" />
  </svg>
);
const LeafIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19l8-8" />
  </svg>
);

// Только <em class="christ"> — слова Спасителя; остальное с сервера уже чистый текст.
const cleanVerse = (html) => (html || "").replace(/<(?!\/?em\b)[^>]*>/g, "");

function Section({ eyebrow, title, aside, children, className = "" }) {
  return (
    <section className={`mt-14 ${className}`}>
      <Eyebrow className="flex items-center gap-4 text-xs uppercase text-[#9b2316]">
        <span aria-hidden className="eb-dot">◇</span>
        {eyebrow}
        <span className="eb-line hidden h-px w-24 bg-gradient-to-r from-[#9b2316] to-transparent sm:block" aria-hidden />
      </Eyebrow>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <h2 style={{ textTransform: "uppercase" }} className="font-slovic text-4xl leading-none sm:text-5xl">
          <RevealWords text={title} wordClassName={GOLD_TEXT} />
        </h2>
        {aside && <span className="font-serif-hero text-2xl italic text-[#9b2316] sm:text-3xl">{aside}</span>}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

// Апостол и Евангелие — разными цветами и значками, чтобы читались с первого взгляда.
const KIND_STYLE = {
  "Евангелие": { accent: "#2f6a63", tint: "from-[#e9f3f0]", icon: "cross" },
  "Апостол": { accent: "#9a1b1b", tint: "from-[#fbeeea]", icon: "scroll" },
  "Ветхий Завет": { accent: "#9b2316", tint: "from-[#f6efe4]", icon: "book" },
};
// Оформление шапки «большой» карточки чтения: иллюстрация слева, узор в углу,
// фон шапки и цвет рамки — свои у Евангелия (зелёное) и Апостола (бордовое).
const FANCY = {
  "Евангелие": {
    art: "/ornaments/lectern.webp",
    artW: 0.9,
    corner: "/ornaments/corner.webp",
    bg: "from-[#e4ebe1] via-[#f2f0e6] to-[#f4f2e9]",
    border: "#e3d6cf",
  },
  "Апостол": {
    art: "/ornaments/scroll.webp",
    artW: 0.8,
    corner: "/ornaments/corner-red.webp",
    bg: "from-[#f1e0d8] via-[#f6ede1] to-[#f7f1e6]",
    border: "#cdae7e",
  },
};

const KindIcon = ({ type }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "cross" && <path d="M12 3v18M7 8h10" />}
    {type === "scroll" && <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Zm0 0a2 2 0 0 0-2 2v1h2M10 9h6M10 13h6" />}
    {type === "book" && <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 21.5A2.5 2.5 0 0 1 6.5 19H20" />}
  </svg>
);

// Круглая кнопка раскрытия: при наведении на карточку плавно (долгим
// переходом) заливается золотым, стрелка белеет.
function ExpandButton({ open, className = "" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-[#9b2316]/30 bg-white/90 text-ink transition-[background-color,border-color,color] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:border-[#b8453a] group-hover:bg-[#b8453a] group-hover:text-white ${className}`}
    >
      <Chevron open={open} />
    </span>
  );
}

// Сравнение без ударений/регистра/скобок — чтобы связать «Осии» из расписания
// собора с «Осия» из календаря: совпадение по началу первого слова имени.
const plain = (t) =>
  (t || "")
    .replace(/<[^>]+>/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase();
function isServed(saint, servedText) {
  const first = plain(saint.title).trim().split(/[\s,]+/)[0] || "";
  const stem = first.slice(0, Math.max(3, Math.min(first.length - 1, 5)));
  if (stem.length < 3) return false;
  return servedText.split(/[^а-яё-]+/).some((w) => w.startsWith(stem));
}

// Один контейнер: сверху — кому служим сегодня в нашем соборе (из расписания),
// ниже — остальная память дня по календарю Азбуки.
function SaintsPanel({ day, info, loading }) {
  const served = day?.saintsOfDay || "";
  const servedPlain = plain(served);
  const rest = (info?.saints || []).filter((sv) => !(served && isServed(sv, servedPlain)));
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#e3d6cf] bg-[#ffffff] shadow-[0_30px_60px_-44px_rgba(70,20,14,0.55)]">
      {served && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#f7ecd5] via-[#fbf5e8] to-[#f3e4c3] px-7 py-10 text-center sm:px-14 sm:py-14">
          <img src="/ornaments/corner.webp" alt="" aria-hidden className="pointer-events-none absolute -left-6 -top-6 w-40 -scale-x-100 -scale-y-100 select-none opacity-70 sm:-left-8 sm:-top-8 sm:w-56" />
          <img src="/ornaments/corner-red.webp" alt="" aria-hidden className="pointer-events-none absolute -bottom-10 -right-4 w-40 select-none opacity-80 sm:-right-6 sm:w-56" />
          <div className="serif-force font-slovic relative mx-auto max-w-3xl text-3xl leading-snug sm:text-5xl [&_p]:my-1.5" dangerouslySetInnerHTML={{ __html: served }} />
        </div>
      )}

      <div className="px-7 py-8 sm:px-12 sm:py-10">
        <div className="mb-7 flex items-center gap-4">
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-[#b8453a]/60" />
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#9b2316]">
            {served ? "Другие святые дня" : "Память дня"}
          </p>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-[#b8453a]/60" />
        </div>
        {loading && <p className="text-center text-ink/50">Загрузка…</p>}
        {info && (
          <ul className="columns-1 gap-x-12 md:columns-2 lg:columns-3">
            {(served ? rest : info.saints).map((sv) => (
              <li key={sv.title} className="group mb-6 break-inside-avoid border-l border-[#b8453a]/30 pl-4 transition-colors duration-500 hover:border-[#b8453a]">
                {sv.type && <span className="block text-[10px] uppercase tracking-[0.22em] text-[#b8453a]">{SANCTITY[sv.type] || sv.type}</span>}
                <span className="font-serif-hero mt-0.5 block text-xl leading-snug text-ink transition-colors duration-500 group-hover:text-[#9b2316]">{sv.title}</span>
              </li>
            ))}
          </ul>
        )}
        {info?.holidays?.length > 0 && (
          <p className="mt-2 border-t border-[#ece6e1] pt-5 text-center text-ink/80">
            <span className="text-[11px] uppercase tracking-[0.24em] text-[#9b2316]">Праздник · </span>
            {info.holidays.map((h) => h.title).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

// Чтение с раскрытием: слева церковнославянский, справа русский — по стихам,
// одним шрифтом и размером, с золотым разделителем посередине.
function ReadingCard({ reading }) {
  const [open, setOpen] = useState(false);
  const style = KIND_STYLE[reading.kind] || KIND_STYLE["Ветхий Завет"];
  const hasCs = reading.verses?.some((v) => v.cs);
  const decor = FANCY[reading.kind];
  const fancy = Boolean(decor);
  // Подъём, наклон к курсору и золотая обводка — те же, что у карточек
  // расписания на главной (.dwrap/.dcard в theme.css).
  const onMove = (e) => {
    const card = e.currentTarget.firstElementChild;
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
    card.style.setProperty("--ry", `${(x / r.width - 0.5) * 2}deg`);
    card.style.setProperty("--rx", `${-(y / r.height - 0.5) * 2}deg`);
  };
  const verseText = "font-serif-hero text-[1.3rem] leading-[1.4] text-ink sm:text-[1.4rem]";
  return (
    <div className={fancy ? "dwrap" : undefined} onPointerMove={fancy ? onMove : undefined}>
    <article
      className={`relative overflow-hidden rounded-[22px] border bg-[#ffffff] transition-[border-color,box-shadow] duration-500 ${
        fancy ? `dcard dcard-solo ${open ? "is-open" : ""}` : ""
      } ${
        open ? "shadow-[0_26px_50px_-34px_rgba(70,20,14,0.5)]" : fancy ? "" : "hover:shadow-[0_18px_36px_-28px_rgba(70,20,14,0.45)]"
      }`}
      style={{ borderColor: fancy ? decor.border : open ? `${style.accent}66` : "#ece6e1" }}
    >
      {fancy ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`group relative flex w-full items-center overflow-hidden bg-gradient-to-r ${decor.bg} py-3 pr-16 text-left sm:pr-24`}
          style={{
            // Всё оформление считается от одной величины --lw (ширина аналоя,
            // плавно меняется с шириной экрана), поэтому картинки сидят в углах
            // в одном и том же положении на любом экране.
            "--lw": "clamp(8.25rem, 15.2vw, 14rem)",
            minHeight: "max(7.25rem, calc(var(--lw) * 0.52))",
            paddingLeft: "calc(var(--lw) * 0.84 + 0.5rem)",
          }}
        >
          <img
            src={decor.art}
            alt=""
            aria-hidden
            className="pointer-events-none absolute max-w-none origin-bottom-left select-none object-contain object-left-bottom"
            style={{ width: `calc(var(--lw) * ${decor.artW})`, height: "auto", left: "calc(var(--lw) * -0.05)", bottom: "calc(var(--lw) * -0.07)" }}
          />
          <img
            src={decor.corner}
            alt=""
            aria-hidden
            className="pointer-events-none absolute max-w-none origin-bottom-right select-none object-contain object-right-bottom opacity-90"
            style={{ width: "calc(var(--lw) * 0.72)", height: "auto", right: "calc(var(--lw) * -0.04)", bottom: "calc(var(--lw) * -0.07)" }}
          />
          <span aria-hidden className="pointer-events-none absolute right-[26%] top-1/2 hidden -translate-y-1/2 items-center gap-3 lg:flex">
            <span className="h-px w-28 bg-gradient-to-r from-transparent to-[#d4574a]/80" />
            <span className="text-[10px] text-[#d4574a]">◆</span>
            <span className="h-px w-28 bg-gradient-to-l from-transparent to-[#d4574a]/80" />
          </span>
          <span className="relative z-10 min-w-0 flex-1">
            <span className="inline-block rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white shadow-sm" style={{ background: style.accent }}>
              {reading.kind}
            </span>
            <span className="font-slovic mt-2 block text-3xl leading-tight text-ink sm:text-5xl">{reading.label}</span>
            <span className="mt-1 block text-sm text-ink/60 sm:text-base">
            {reading.bookTitle}
            {reading.zachalo ? ` · зачало ${reading.zachalo}` : ""}
            {reading.zachaloNote ? ` (${reading.zachaloNote})` : ""}
            </span>
          </span>
          <ExpandButton open={open} className="absolute right-10 top-3 z-10 h-10 w-10 sm:right-16 sm:top-1/2 sm:-translate-y-1/2" />
        </button>
      ) : (
        <>
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: style.accent }} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`group relative flex w-full items-center gap-5 bg-gradient-to-r ${style.tint} to-transparent py-6 pl-8 pr-6 text-left sm:gap-7 sm:pl-10 sm:pr-9`}
        >
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full border bg-white sm:h-16 sm:w-16"
            style={{ borderColor: `${style.accent}55`, color: style.accent }}
          >
            <KindIcon type={style.icon} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white" style={{ background: style.accent }}>
              {reading.kind}
            </span>
            <span className="font-slovic mt-2 block text-3xl leading-tight text-ink sm:text-4xl">{reading.label}</span>
            <span className="mt-1 block text-sm text-ink/60">
              {reading.bookTitle}
              {reading.zachalo ? ` · зачало ${reading.zachalo}` : ""}
              {reading.zachaloNote ? ` (${reading.zachaloNote})` : ""}
            </span>
          </span>
          <ExpandButton open={open} className="relative h-12 w-12" />
        </button>
        </>
      )}

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#ece6e1] px-6 pb-8 pt-6 sm:px-10">
            {reading.verses ? (
              <div className="relative">
                {hasCs && (
                  <>
                    <div className="mb-5 hidden grid-cols-2 gap-x-16 text-[11px] uppercase tracking-[0.24em] md:grid" style={{ color: style.accent }}>
                      <span>Церковнославянский</span>
                      <span>Русский · синодальный перевод</span>
                    </div>
                    {/* золотой разделитель между колонками */}
                    <span aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#d4574a]/70 to-transparent md:block" />
                    <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 hidden -translate-x-1/2 bg-[#ffffff] px-2 text-[#d4574a] md:block">◇</span>
                  </>
                )}
                <div className="flex flex-col gap-5">
                  {reading.verses.map((v) => (
                    <div key={`${v.c}:${v.n}`} className={`grid gap-x-16 gap-y-2 ${hasCs ? "md:grid-cols-2" : ""}`}>
                      {hasCs && (
                        <p className={verseText}>
                          <sup className="mr-1.5 font-sans text-[11px] font-semibold" style={{ color: style.accent }}>{v.n}</sup>
                          <span className="christ-scope" dangerouslySetInnerHTML={{ __html: cleanVerse(v.cs || "") }} />
                        </p>
                      )}
                      <p className={`${verseText} ${hasCs ? "border-l-2 border-[#ece6e1] pl-4 md:border-l-0 md:pl-0" : ""}`}>
                        <sup className="mr-1.5 font-sans text-[11px] font-semibold" style={{ color: style.accent }}>{v.n}</sup>
                        <span className="christ-scope" dangerouslySetInnerHTML={{ __html: cleanVerse(v.ru) }} />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-ink/60">Текст не удалось загрузить — его можно прочитать по ссылке ниже.</p>
            )}
            <a href={reading.href} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#9b2316] transition-colors hover:text-maroon">
              Открыть на pravoslavie.ru <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </div>
    </article>
    </div>
  );
}

export default function DayPage() {
  const { date } = useParams();
  const { loading: scheduleLoading, days } = useLiveSchedule();
  const { loading, error, info } = useDayInfo(date);
  const stripRef = useRef(null);

  const entries = useMemo(() => days.map((d) => ({ day: d, iso: dayISODate(d) })), [days]);
  const idx = entries.findIndex((e) => e.iso === date);
  const day = idx >= 0 ? entries[idx].day : null;
  const services = day ? parseServices(day.prayerTimes) : [];

  // активный день в ленте дней — в поле зрения
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [idx]);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return <Navigate to="/" replace />;

  const [yy, mm, dd] = date.split("-").map(Number);
  const jsDate = new Date(yy, mm - 1, dd);
  const weekday = WEEKDAYS[jsDate.getDay()];
  const prev = idx > 0 ? entries[idx - 1].iso : null;
  const next = idx >= 0 && idx < entries.length - 1 ? entries[idx + 1].iso : null;
  const isToday = day ? dayStatus(day) === "today" : false;

  return (
    <div className="mx-auto w-[94%] max-w-[1180px] pb-8 pt-8">
      <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/60 transition-colors hover:text-maroon">
        <Arrow dir="left" /> На главную
      </Link>

      {/* Лента дней — только те, что есть в расписании */}
      {entries.length > 0 && (
        <div className="mt-5 flex items-center gap-3">
          <Link
            to={prev ? `/day/${prev}` : "#"}
            aria-disabled={!prev}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#9b2316]/30 text-ink transition-colors hover:bg-maroon-dark hover:text-white ${prev ? "" : "pointer-events-none opacity-30"}`}
            aria-label="Предыдущий день"
          >
            <Arrow dir="left" />
          </Link>
          <div ref={stripRef} className="flex flex-1 gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {entries.map(({ day: d, iso }) => {
              const active = iso === date;
              const status = dayStatus(d);
              return (
                <Link
                  key={iso}
                  to={`/day/${iso}`}
                  data-active={active}
                  className={`flex w-[68px] shrink-0 flex-col items-center rounded-2xl border px-2 py-2.5 transition-all duration-500 ${
                    active
                      ? "border-maroon-dark bg-maroon-dark text-[#efe7d8] shadow-lg"
                      : "border-[#ece6e1] bg-white/70 text-ink hover:border-[#b8453a] hover:bg-white"
                  } ${status === "past" && !active ? "opacity-60" : ""}`}
                >
                  <span className={`font-serif-hero text-2xl leading-none ${active ? "text-[#e8a79e]" : "text-[#9b2316]"}`}>{d.dateWeek}</span>
                  <span className={`mt-1 text-[9px] uppercase tracking-[0.16em] ${active ? "text-[#efe7d8]/70" : "text-muted"}`}>{(d.dayWeek || "").slice(0, 2)}</span>
                  {status === "today" && <span className="mt-1.5 h-1 w-1 rounded-full bg-[#e8a79e]" />}
                </Link>
              );
            })}
          </div>
          <Link
            to={next ? `/day/${next}` : "#"}
            aria-disabled={!next}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#9b2316]/30 text-ink transition-colors hover:bg-maroon-dark hover:text-white ${next ? "" : "pointer-events-none opacity-30"}`}
            aria-label="Следующий день"
          >
            <Arrow />
          </Link>
        </div>
      )}

      {/* Шапка дня */}
      <header className="relative mt-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3a3131] via-[#4a2b28] to-[#2c2020] px-7 py-10 text-[#efe7d8] sm:px-12 sm:py-14">
        <span aria-hidden className="font-serif-hero pointer-events-none absolute -right-4 -top-10 select-none text-[16rem] leading-none text-[#e8a79e]/10 sm:text-[22rem]">
          {dd}
        </span>
        <Eyebrow className="relative flex items-center gap-4 text-xs uppercase text-[#e8a79e]">
          <span aria-hidden className="eb-dot">◇</span>
          {isToday ? "Сегодня" : "Церковный календарь"}
        </Eyebrow>
        <h1 style={{ textTransform: "none" }} className="font-slovic relative mt-4 text-6xl leading-[0.95] sm:text-8xl">
          <RevealWords text={`${dd} ${MONTHS[mm - 1]}`} wordClassName="text-[#e8d3a0]" />
        </h1>
        <p className="relative mt-3 text-sm uppercase tracking-[0.32em] text-[#efe7d8]/70">{weekday}</p>

        <div className="relative mt-8 flex flex-wrap items-center gap-3">
          {info?.week && <span className="rounded-full border border-[#e8a79e]/40 bg-white/5 px-4 py-2 text-xs tracking-wide text-[#efe7d8]">{info.week}</span>}
          {info && (() => {
            const fastDay = Boolean(info.fasting) || info.food?.rule === "пост";
            return (
              <span
                className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] ${
                  fastDay ? "border-[#d4574a]/50 bg-[#d4574a]/15 text-[#f1c27d]" : "border-[#9fc08a]/40 bg-[#9fc08a]/10 text-[#b8d6a4]"
                }`}
              >
                {info.fasting || (fastDay ? "Постный день" : "Поста нет")}
              </span>
            );
          })()}
        </div>
        {info?.memorial && (
          <p className="relative mt-5 max-w-3xl text-sm italic leading-relaxed text-[#efe7d8]/65">
            {info.memorial}
            {info.memorialNote && <span className="mt-1.5 block text-xs not-italic text-[#efe7d8]/45">{info.memorialNote}</span>}
          </p>
        )}
      </header>

      {error && <p className="mt-8 rounded-2xl border border-[#ece6e1] bg-white/60 px-6 py-5 text-ink/70">{error}. Расписание богослужений собора при этом доступно ниже.</p>}

      {/* Пища и пост */}
      {info && (
        <div className="mt-6 grid gap-4 rounded-[22px] border border-[#ece6e1] bg-[#ffffff] px-6 py-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6 sm:px-9">
          <span className="grid h-14 w-14 place-items-center rounded-full border border-[#b8453a]/40 bg-white text-[#b8453a]"><LeafIcon /></span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#9b2316]">Пища и пост{info.fasting ? ` · ${info.fasting}` : ""}</p>
            <p className="mt-1.5 text-lg leading-snug text-ink">
              {info.food?.text || (info.fasting ? "Подробности о трапезе — в церковном календаре." : "В этот день ограничений в пище нет — трапеза без поста.")}
            </p>
          </div>
        </div>
      )}

      {/* Святые дня */}
      <Section eyebrow="Память" title="Святые дня">
        <SaintsPanel day={day} info={info} loading={loading} />
      </Section>

      {/* Богослужения */}
      {services.length > 0 && (
        <Section eyebrow="В нашем соборе" title="Богослужения">
          <ol className="relative ml-3 border-l border-[#b8453a]/50 sm:ml-5">
            {services.map((svc, i) => (
              <li key={i} className="group relative pb-8 pl-8 last:pb-0 sm:pl-12">
                <span className="absolute -left-[7px] top-3 h-3.5 w-3.5 rounded-full border-2 border-[#b8453a] bg-paper transition-colors duration-500 group-hover:bg-[#b8453a]" aria-hidden />
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  {svc.time && <span className={`font-slovic text-4xl leading-none sm:text-5xl ${GOLD_TEXT}`}>{svc.time}</span>}
                  <span className="text-lg text-ink sm:text-xl">{svc.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Чтения */}
      {(loading || info?.readingGroups?.length > 0) && (
        <Section eyebrow="Священное Писание" title="Чтения дня" aside={`${dd} ${MONTHS[mm - 1]}, ${weekday}`}>
          {loading && <p className="text-ink/50">Загрузка чтений…</p>}
          <div className="flex flex-col gap-10">
            {info?.readingGroups?.map((g) => (
              <div key={g.key}>
                {g.key !== "day" && (
                  <div className="mb-4 flex items-center gap-4">
                    <span className="rounded-full border border-[#b8453a]/50 bg-white px-5 py-1.5 text-[11px] uppercase tracking-[0.24em] text-[#9b2316]">{g.title}</span>
                    <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-[#b8453a]/50 to-transparent" />
                  </div>
                )}
                <div className="flex flex-col gap-4">
                  {g.readings.map((r) => (
                    <ReadingCard key={`${g.key}-${r.ref || r.label}`} reading={r} />
                  ))}
                </div>
                {g.notes?.map((n) => (
                  <p key={n} className="mt-3 max-w-3xl text-sm italic leading-relaxed text-ink/60">{n}</p>
                ))}
              </div>
            ))}
          </div>
          {info?.notes?.map((n) => (
            <p key={n} className="mt-6 max-w-3xl text-sm italic leading-relaxed text-ink/60">{n}</p>
          ))}
        </Section>
      )}

      {!scheduleLoading && !day && (
        <p className="mt-10 rounded-2xl border border-[#ece6e1] bg-white/60 px-6 py-5 text-ink/70">
          Этого дня нет в расписании собора, поэтому показан только церковный календарь.
        </p>
      )}
    </div>
  );
}
