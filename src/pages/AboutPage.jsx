import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Modal, useOverlayState } from "@heroui/react";
import { Eyebrow, RevealWords } from "../components/Reveal.jsx";
import {
  ERAS,
  INTRO,
  MAGAZINE,
  NUMBERS,
  PARTS,
  PHOTOS,
  PHOTO_GROUPS,
  SOURCES,
  TIMELINE,
  VIDEOS,
} from "../data/about.js";

const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";
const img = (slug) => `/about/${slug}.webp`;
const photoOf = (slug) => PHOTOS.find((p) => p.slug === slug);

const Arrow = ({ dir }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

function SectionTitle({ eyebrow, title }) {
  return (
    <div className="mb-8">
      <Eyebrow className="text-xs uppercase text-[#9b2316]">{eyebrow}</Eyebrow>
      <h2 style={{ textTransform: "uppercase" }} className="font-slovic mt-3 text-4xl leading-none sm:text-5xl">
        <RevealWords text={title} wordClassName={GOLD_TEXT} />
      </h2>
    </div>
  );
}

// Подпись к фото: автор и лицензия (со ссылкой на Commons, если есть)
function Credit({ photo, className = "" }) {
  if (!photo) return null;
  return (
    <p className={`text-[0.6875rem] leading-snug text-ink/50 ${className}`}>
      {photo.credit}, {photo.license}
      {photo.page && (
        <>
          {" · "}
          <a href={photo.page} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-[#9b2316]">
            источник
          </a>
        </>
      )}
    </p>
  );
}

// ── Переключатель эпох ────────────────────────────────────────────────────
function Eras() {
  const [active, setActive] = useState("tsaritsyn");
  const era = ERAS.find((e) => e.id === active);
  return (
    <div>
      <div className="inline-flex rounded-full border border-[#ece6e1] bg-white p-1 shadow-sm" role="tablist" aria-label="Эпоха">
        {ERAS.map((e) => (
          <button
            key={e.id}
            type="button"
            role="tab"
            aria-selected={e.id === active}
            onClick={() => setActive(e.id)}
            className={`rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.2em] transition-colors ${e.id === active ? "bg-[#9b2316] text-white" : "text-ink/70 hover:text-[#9b2316]"}`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <div key={era.id} className="era-in mt-6 grid gap-8 rounded-[28px] border border-[#ece6e1] bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-[0.6875rem] uppercase tracking-[0.28em] text-[#9b2316]">{era.years}</p>
          <h3 style={{ textTransform: "none" }} className="font-serif-hero mt-2 text-3xl leading-tight text-ink sm:text-4xl">
            {era.title}
          </h3>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink/80">{era.text}</p>
        </div>
        <ul className="grid content-start gap-3">
          {era.facts.map((f) => (
            <li key={f} className="flex items-start gap-3 rounded-2xl bg-[#faf6f4] px-4 py-3 text-ink/85">
              <img src="/ornaments/cross.webp" alt="" aria-hidden width="14" height="14" className="mt-1.5 h-3.5 w-3.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Хронология ────────────────────────────────────────────────────────────
function Timeline() {
  const [filter, setFilter] = useState("all");
  const [i, setI] = useState(0);
  const list = useMemo(() => TIMELINE.filter((t) => filter === "all" || t.era === filter), [filter]);
  const cur = list[Math.min(i, list.length - 1)];
  const dotsRef = useRef(null);

  useEffect(() => setI(0), [filter]);
  useEffect(() => {
    const el = dotsRef.current?.querySelector('[aria-current="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [i, filter]);

  const photo = cur?.image ? photoOf(cur.image) : null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {[{ id: "all", label: "Вся история" }, { id: "tsaritsyn", label: "Царицын" }, { id: "volgograd", label: "Волгоград" }].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-full border px-5 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${filter === f.id ? "border-[#9b2316] bg-[#9b2316] text-white" : "border-[#e3d6cf] bg-white text-ink/70 hover:border-[#d4574a] hover:text-[#9b2316]"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div ref={dotsRef} className="relative -mx-6 overflow-x-auto px-6 pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="relative flex min-w-max items-start gap-1">
          <span aria-hidden className="absolute left-4 right-4 top-[11px] h-px bg-[#ece6e1]" />
          {list.map((t, idx) => (
            <button
              key={`${t.date}-${t.title}`}
              type="button"
              onClick={() => setI(idx)}
              aria-current={idx === i ? "true" : undefined}
              className="group relative flex w-[5.5rem] flex-col items-center gap-2 text-center"
            >
              <span className={`relative z-10 h-[1.375rem] w-[1.375rem] rounded-full border-2 transition-all duration-300 ${idx === i ? "scale-110 border-[#9b2316] bg-[#9b2316] shadow-[0_0_0_5px_rgba(155,35,22,0.18)]" : t.era === "tsaritsyn" ? "border-[#b8453a] bg-white group-hover:bg-[#fbe6e2]" : "border-[#7a1a10] bg-[#f6e9e6] group-hover:bg-[#fbe6e2]"}`} />
              <span className={`text-[0.6875rem] leading-tight transition-colors ${idx === i ? "font-semibold text-[#9b2316]" : "text-ink/55 group-hover:text-ink"}`}>{t.date}</span>
            </button>
          ))}
        </div>
      </div>

      {cur && (
        <div key={`${cur.date}-${cur.title}`} className="era-in mt-4 grid overflow-hidden rounded-[28px] border border-[#ece6e1] bg-white shadow-sm md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col p-6 sm:p-9">
            <p className="text-[0.6875rem] uppercase tracking-[0.28em] text-[#9b2316]">{cur.date}</p>
            <h3 style={{ textTransform: "none" }} className="font-serif-hero mt-2 text-3xl leading-tight text-ink">{cur.title}</h3>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink/80">{cur.text}</p>
            <div className="mt-auto flex items-center gap-3 pt-6">
              <button type="button" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} aria-label="Предыдущее событие" className="grid h-11 w-11 place-items-center rounded-full border border-[#9b2316]/40 text-[#9b2316] transition-colors hover:bg-[#9b2316] hover:text-white disabled:pointer-events-none disabled:opacity-30">
                <Arrow dir="left" />
              </button>
              <span className="text-sm tabular-nums text-ink/50">{i + 1} из {list.length}</span>
              <button type="button" onClick={() => setI((n) => Math.min(list.length - 1, n + 1))} disabled={i >= list.length - 1} aria-label="Следующее событие" className="grid h-11 w-11 place-items-center rounded-full border border-[#9b2316]/40 text-[#9b2316] transition-colors hover:bg-[#9b2316] hover:text-white disabled:pointer-events-none disabled:opacity-30">
                <Arrow dir="right" />
              </button>
            </div>
          </div>
          <div className="relative min-h-[16rem] bg-[#faf6f4]">
            {photo ? (
              <>
                <img src={img(photo.slug)} alt={photo.caption} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-3 pt-10">
                  <p className="text-sm text-white">{photo.caption}</p>
                  <p className="text-[0.625rem] text-white/70">{photo.credit}, {photo.license}</p>
                </div>
              </>
            ) : (
              <div className="grid h-full place-items-center p-8 text-center text-ink/35">
                <img src="/ornaments/cross-outline.webp" alt="" aria-hidden width="56" height="56" className="opacity-60" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Счётчики ──────────────────────────────────────────────────────────────
function Counter({ value, prefix = "", suffix = "" }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / 1400);
        setN(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      setTimeout(() => setN(value), 1700); // страховка, если вкладка в фоне
    };
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && run(), { threshold: 0.4 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <span ref={ref} className="font-slovic tabular-nums">
      {prefix}
      {n.toLocaleString("ru-RU")}
      {suffix}
    </span>
  );
}

// ── Было / стало ──────────────────────────────────────────────────────────
function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const boxRef = useRef(null);
  const drag = useRef(false);
  const move = (clientX) => {
    const r = boxRef.current.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  const before = photoOf("tsaritsyn-1915");
  const after = photoOf("volgograd-2021");
  return (
    <div>
      <div
        ref={boxRef}
        className="relative aspect-[3/2] w-full cursor-ew-resize select-none overflow-hidden rounded-[28px] border border-[#ece6e1] bg-[#faf6f4] shadow-sm"
        onPointerDown={(e) => {
          drag.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => drag.current && move(e.clientX)}
        onPointerUp={() => (drag.current = false)}
        onPointerCancel={() => (drag.current = false)}
        style={{ touchAction: "pan-y" }}
      >
        <img src={img(after.slug)} alt={after.caption} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        <img src={img(before.slug)} alt={before.caption} draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[0.6875rem] uppercase tracking-[0.2em] text-white">1915–1917</span>
        <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[0.6875rem] uppercase tracking-[0.2em] text-white">2021</span>
        <span className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#9b2316] shadow-lg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5" /></svg>
          </span>
        </span>
      </div>
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Сравнение: исторический и воссозданный собор" className="mt-4 w-full accent-[#9b2316]" />
      <p className="mt-2 text-sm text-ink/60">Слева — царицынский собор, справа — воссозданный. Потяните ползунок.</p>
      <Credit photo={before} className="mt-1" />
      <Credit photo={after} />
    </div>
  );
}

// ── Устройство собора ─────────────────────────────────────────────────────
function Parts() {
  const [open, setOpen] = useState("narthex");
  return (
    <div className="grid gap-3">
      {PARTS.map((p) => {
        const isOpen = open === p.id;
        return (
          <div key={p.id} className={`overflow-hidden rounded-[22px] border bg-white transition-colors ${isOpen ? "border-[#d4574a] shadow-sm" : "border-[#ece6e1]"}`}>
            <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
              <span>
                <span className="font-serif-hero block text-2xl leading-tight text-ink">{p.title}</span>
                <span className="mt-0.5 block text-sm text-ink/55">{p.summary}</span>
              </span>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#9b2316]/40 text-[#9b2316] transition-transform duration-300 ${isOpen ? "rotate-45 bg-[#9b2316] text-white" : ""}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </button>
            <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!isOpen}>
              <div className="overflow-hidden">
                <div className={`grid gap-6 border-t border-[#ece6e1] px-6 pb-6 pt-5 ${p.image ? "md:grid-cols-[1.3fr_1fr]" : ""}`}>
                  <p className="text-[1.0625rem] leading-relaxed text-ink/80">{p.text}</p>
                  {p.image && <img src={img(p.image)} alt={p.title} loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Галерея и просмотр ────────────────────────────────────────────────────
function Gallery() {
  const [group, setGroup] = useState("all");
  const [idx, setIdx] = useState(0);
  const state = useOverlayState();
  const list = useMemo(() => PHOTOS.filter((p) => group === "all" || p.group === group), [group]);
  const cur = list[idx];

  const open = (i) => {
    setIdx(i);
    state.open();
  };
  useEffect(() => {
    if (!state.isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx((i) => Math.min(list.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.isOpen, list.length]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {PHOTO_GROUPS.map((g) => (
          <button key={g.id} type="button" onClick={() => setGroup(g.id)} aria-pressed={group === g.id} className={`rounded-full border px-5 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${group === g.id ? "border-[#9b2316] bg-[#9b2316] text-white" : "border-[#e3d6cf] bg-white text-ink/70 hover:border-[#d4574a] hover:text-[#9b2316]"}`}>
            {g.label}
          </button>
        ))}
      </div>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {list.map((p, i) => (
          <button key={p.slug} type="button" onClick={() => open(i)} className="group relative mb-4 block w-full overflow-hidden rounded-2xl border border-[#ece6e1] bg-white text-left shadow-sm [break-inside:avoid]">
            <img src={img(p.slug)} alt={p.caption} loading="lazy" className="block w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-sm text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">{p.caption}</span>
          </button>
        ))}
      </div>

      <Modal state={state}>
        <Modal.Backdrop className="bg-black/85">
          <Modal.Container placement="center" scroll="outside">
            <button type="button" onClick={() => state.close()} aria-label="Закрыть" className="pointer-events-auto fixed right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white text-[#9b2316] shadow-lg transition-colors hover:bg-[#9b2316] hover:text-white sm:right-8 sm:top-6">
              <CloseIcon />
            </button>
            {["left", "right"].map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setIdx((i) => (side === "left" ? Math.max(0, i - 1) : Math.min(list.length - 1, i + 1)))}
                disabled={side === "left" ? idx === 0 : idx >= list.length - 1}
                aria-label={side === "left" ? "Предыдущее фото" : "Следующее фото"}
                className={`pointer-events-auto fixed top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-[#9b2316] shadow-lg transition-colors hover:bg-[#9b2316] hover:text-white disabled:pointer-events-none disabled:opacity-30 ${side === "left" ? "left-3 sm:left-8" : "right-3 sm:right-8"}`}
              >
                <Arrow dir={side} />
              </button>
            ))}
            <Modal.Dialog className="w-auto max-w-none overflow-visible bg-transparent p-0 shadow-none">
              {cur && (
                <figure className="mx-auto flex max-w-[92vw] flex-col items-center sm:max-w-[min(86vw,1100px)]">
                  <img key={cur.slug} src={img(cur.slug)} alt={cur.caption} className="era-in max-h-[78vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl" />
                  <figcaption className="mt-3 text-center text-white">
                    <p className="text-base">{cur.caption}</p>
                    <p className="mt-1 text-xs text-white/65">{cur.credit}, {cur.license}</p>
                  </figcaption>
                </figure>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

// ── Видео (плеер подключается по нажатию) ─────────────────────────────────
function Videos() {
  const [playing, setPlaying] = useState(null);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {VIDEOS.map((v) => (
        <div key={v.id} className="overflow-hidden rounded-[22px] border border-[#ece6e1] bg-white shadow-sm">
          <div className="relative aspect-video bg-black">
            {playing === v.id ? (
              <iframe
                title={v.title}
                src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
                className="absolute inset-0 h-full w-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <button type="button" onClick={() => setPlaying(v.id)} aria-label={`Смотреть: ${v.title}`} className="group absolute inset-0 block w-full">
                <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#9b2316] shadow-xl transition-transform duration-300 group-hover:scale-110">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </button>
            )}
          </div>
          <div className="px-5 py-4">
            <p className="font-serif-hero text-xl leading-snug text-ink">{v.title}</p>
            <p className="mt-1 text-xs text-ink/50">{v.author} · YouTube</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto w-[94%] max-w-[73.75rem] pb-16 pt-8">
      <nav aria-label="Навигация" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/55">
        <Link to="/" className="transition-colors hover:text-[#9b2316]">Главная</Link>
        <span aria-hidden className="text-[#d4574a]">◆</span>
        <span className="text-[#9b2316]">О соборе</span>
      </nav>

      <header className="mt-8 grid items-end gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 style={{ textTransform: "uppercase" }} className="font-slovic text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
            <RevealWords text="О соборе" wordClassName={GOLD_TEXT} />
          </h1>
          <p className="mt-6 max-w-2xl text-[1.1875rem] leading-relaxed text-ink/80">{INTRO}</p>
        </div>
        <figure className="overflow-hidden rounded-[28px] border border-[#ece6e1] bg-white shadow-sm">
          <img src={img("volgograd-2021")} alt="Собор Александра Невского в Волгограде" className="aspect-[4/3] w-full object-cover" />
          <figcaption className="px-4 py-2"><Credit photo={photoOf("volgograd-2021")} /></figcaption>
        </figure>
      </header>

      <section className="mt-16">
        <SectionTitle eyebrow="Два храма" title="Царицын и Волгоград" />
        <Eras />
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="Собор в цифрах" title="Размеры и числа" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {NUMBERS.map((n) => (
            <div key={n.label} className="rounded-[22px] border border-[#ece6e1] bg-white p-5 shadow-sm sm:p-7">
              <p className="text-4xl leading-none text-[#9b2316] sm:text-5xl"><Counter {...n} /></p>
              <p className="mt-3 text-sm leading-snug text-ink/70">{n.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="Хронология" title="Дорога длиной в век" />
        <Timeline />
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="Было и стало" title="Тот же облик" />
        <BeforeAfter />
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="Внутри и снаружи" title="Устройство собора" />
        <Parts />
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="Фотографии" title="Галерея" />
        <Gallery />
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="Видео" title="Смотреть и слушать" />
        <Videos />
        <p className="mt-3 text-xs text-ink/50">Ролики загружаются с YouTube только после нажатия.</p>
      </section>

      <section className="mt-16 rounded-[28px] border border-[#ece6e1] bg-white p-6 sm:p-9">
        <h2 style={{ textTransform: "none" }} className="font-serif-hero text-2xl text-ink">Источники</h2>
        <ul className="mt-4 grid gap-2 text-sm text-ink/70">
          {SOURCES.map((s) => (
            <li key={s.title}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-[#9b2316]">{s.title} ↗</a>
              ) : (
                s.title
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink/45">Тексты изложены своими словами по перечисленным материалам. Фотографии — со свободными лицензиями Wikimedia Commons или из журнала «Царицын Православный» (см. подписи).</p>
      </section>
    </div>
  );
}
