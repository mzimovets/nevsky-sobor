import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Drawer, Modal } from "@heroui/react";
import { akathist, akathistSections } from "../data/akathist.js";

// ─── Оформление ───────────────────────────────────────────────────────────
// Шрифт и фоны собраны здесь — чтобы поменять вид книги, правьте эти классы:
// TEXT_FONT (шрифт текста), PAGE_BG (бумага страниц).
const TEXT_FONT = "font-serif-hero";
const PAGE_BG = "bg-white";
const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";
// Акафист всегда открывается с начала; место чтения помним только пока открыто окно
// (чтобы при смене размера окна и перепаговании не потерять страницу).
const HINT_KEY = "akathist-alexander-nevsky:hint-seen";
const FLIP_MS = 850;

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const Arrow = ({ dir }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} />
  </svg>
);

// ─── Блоки текста ─────────────────────────────────────────────────────────
// Секции акафиста раскладываются на блоки; Block рисует блок и для страницы, и
// (через renderToStaticMarkup) для замеров при разбиении на страницы.
function sectionBlocks(section) {
  const blocks = [];
  const numbered = section.number != null;
  blocks.push({
    k: "chapter",
    label: numbered ? "" : section.tone ? `Глас ${section.tone}` : "",
    title: numbered ? section.title : section.title.replace(/, глас \d+/, ""),
    sub: "",
  });
  if (section.type === "ikos") {
    blocks.push({ k: "para", text: section.intro, drop: true });
    for (const v of section.verses) blocks.push({ k: v === akathist.refrain ? "refrain" : "verse", text: v });
  } else {
    section.text.split("\n\n").forEach((t, i) => blocks.push({ k: "para", text: t.replace(/\s*\/\s*/g, " / "), drop: i === 0 }));
  }
  return blocks;
}

function Block({ b }) {
  if (b.k === "chapter") {
    return (
      <div className="mb-5 mt-12 text-center">
        {b.label && <p className="text-[0.55em] uppercase tracking-[0.3em] text-[#9b2316]">{b.label}</p>}
        <h2 style={{ textTransform: "none", fontSize: "2.6em", lineHeight: 1 }} className={`${TEXT_FONT} mt-1 ${GOLD_TEXT}`}>
          {b.title}
        </h2>
        {b.sub && <p className="mt-1 text-[0.85em] text-[#2f2523]/60">{b.sub}</p>}
        <div className="mt-3 flex items-center justify-center gap-3 text-[#d4574a]" aria-hidden>
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4574a]/80" />
          <span className="text-[0.4em]">◆</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4574a]/80" />
        </div>
      </div>
    );
  }
  if (b.k === "para") {
    return (
      <p className="mb-3 text-justify text-[#2f2523]" style={{ lineHeight: 1.48 }}>
        {b.drop && (
          <span className="float-left mr-[0.12em] mt-[0.06em] font-semibold text-[#a3231f]" style={{ fontSize: "3.3em", lineHeight: 0.8 }}>
            {b.text.charAt(0)}
          </span>
        )}
        {b.drop ? b.text.slice(1) : b.text}
      </p>
    );
  }
  const m = b.text.match(/^(Радуйся)(.*)$/s);
  return (
    <p
      className={`mb-2.5 text-[#2f2523] ${b.k === "refrain" ? "mt-4 text-center italic" : ""}`}
      style={{ lineHeight: 1.42 }}
    >
      {m ? (
        <>
          <span className="font-semibold text-[#a3231f]">{m[1]}</span>
          {m[2]}
        </>
      ) : (
        b.text
      )}
    </p>
  );
}

// ─── Разбиение на страницы по реальным размерам ───────────────────────────
function paginate(contentW, contentH, fontSize) {
  const probe = document.createElement("div");
  probe.setAttribute("lang", "ru");
  probe.className = `${TEXT_FONT} [&>:first-child]:!mt-0`;
  probe.style.cssText = `position:fixed;left:-99999px;top:0;visibility:hidden;width:${contentW}px;font-size:${fontSize}px;hyphens:auto;`;
  document.body.appendChild(probe);
  const html = (blocks) => blocks.map((b) => renderToStaticMarkup(<Block b={b} />)).join("");
  const heightOf = (blocks) => {
    probe.innerHTML = html(blocks);
    return probe.offsetHeight;
  };

  const pages = [];
  let cur = [];
  const flush = () => {
    if (cur.length) pages.push(cur);
    cur = [];
  };
  const MIN_AFTER_HEADING = fontSize * 7;

  for (const section of akathistSections) {
    for (const block of sectionBlocks(section)) {
      let b = block;
      for (let guard = 0; guard < 40 && b; guard++) {
        if (heightOf([...cur, b]) <= contentH) {
          cur.push(b);
          if (b.k === "chapter" && contentH - heightOf(cur) < MIN_AFTER_HEADING && cur.length > 1) {
            cur.pop();
            flush();
            cur.push(b);
          }
          b = null;
        } else if (b.k === "para" && b.text.includes(" ")) {
          const words = b.text.split(" ");
          let lo = 0;
          let hi = words.length - 1;
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (heightOf([...cur, { ...b, text: words.slice(0, mid).join(" ") }]) <= contentH) lo = mid;
            else hi = mid - 1;
          }
          if (lo >= 2) {
            cur.push({ ...b, text: words.slice(0, lo).join(" ") });
            flush();
            b = { ...b, text: words.slice(lo).join(" "), drop: false };
          } else {
            flush();
          }
        } else if (cur.length) {
          flush();
        } else {
          cur.push(b);
          b = null;
        }
      }
    }
  }
  flush();
  document.body.removeChild(probe);
  return pages;
}

// ─── Страница ─────────────────────────────────────────────────────────────
function PageFace({ page, size }) {
  const { W, H, fs, padX, padTop, padBottom } = size;
  return (
    <div className={`relative overflow-hidden ${PAGE_BG}`} style={{ width: W, height: H }}>
      {/* колонтитул — часть страницы, листается вместе с текстом */}
      <div className="absolute inset-x-0 top-0 px-[3.75rem] pt-3 text-center sm:px-20" aria-hidden>
        <p className="text-[0.5625rem] uppercase leading-snug tracking-[0.1em] text-[#9b2316] sm:text-[0.6875rem] sm:tracking-[0.26em]">Акафист святому Александру Невскому</p>
        <div className="mx-auto mt-2.5 flex max-w-xs items-center justify-center gap-3 text-[#d4574a]">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4574a]/80" />
          <span className="text-[0.45rem]">◆</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4574a]/80" />
        </div>
      </div>
      <div
        lang="ru"
        className={`${TEXT_FONT} absolute overflow-hidden [&>:first-child]:!mt-0`}
        style={{ left: padX, right: padX, top: padTop, bottom: padBottom, fontSize: fs, hyphens: "auto" }}
      >
        {page.map((b, i) => (
          <Block key={i} b={b} />
        ))}
      </div>
    </div>
  );
}

const ease = (t) => 1 - Math.pow(1 - t, 3);

// Геометрия загиба: угол листа (C) тянут в точку (px, py); линия сгиба — серединный
// перпендикуляр между C и точкой пальца, поэтому наклон сгиба следует за движением.
function foldGeometry(W, H, f) {
  const cx = W;
  const dx = cx - f.px;
  const dy = f.cy - f.py;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const n = { x: dx / len, y: dy / len };
  const m = { x: (cx + f.px) / 2, y: (f.cy + f.py) / 2 };
  const side = (pt) => (pt.x - m.x) * n.x + (pt.y - m.y) * n.y;
  const rect = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
  const clip = (sign) => {
    const out = [];
    for (let i = 0; i < 4; i++) {
      const a = rect[i];
      const b = rect[(i + 1) % 4];
      const sa = side(a) * sign;
      const sb = side(b) * sign;
      if (sa >= 0) out.push(a);
      if ((sa >= 0) !== (sb >= 0)) {
        const t = sa / (sa - sb);
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    return out.length ? `polygon(${out.map((q) => `${q.x}px ${q.y}px`).join(",")})` : "polygon(0 0)";
  };
  const k = 2 * (m.x * n.x + m.y * n.y);
  return {
    n,
    m,
    angle: (Math.atan2(n.y, n.x) * 180) / Math.PI,
    front: clip(-1),
    flap: clip(1),
    // отражение относительно линии сгиба
    matrix: `matrix(${1 - 2 * n.x * n.x},${-2 * n.x * n.y},${-2 * n.x * n.y},${1 - 2 * n.y * n.y},${k * n.x},${k * n.y})`,
  };
}

// ─── Книга: одна страница, загиб как в Apple Books ────────────────────────
function Book({ onProgress, onToc }) {
  const stageRef = useRef(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [pages, setPages] = useState(null);
  const [pos, setPos] = useState(null);
  const [fold, setFold] = useState(null); // { dir, cy, px, py }
  const dragRef = useRef(null);
  const rafRef = useRef(0);
  const busyRef = useRef(false);

  useLayoutEffect(() => {
    const el = stageRef.current;
    const ro = new ResizeObserver(() => setStage({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setStage({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const size = useMemo(() => {
    if (!stage.w || !stage.h) return null;
    // на больших экранах (корневой шрифт > 16px, см. theme.css) страница книги растёт целиком:
    // колонка текста, кегль и поля — в k раз
    const k = Math.max(1, parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1);
    const textW = Math.min(600 * k, stage.w - 40);
    const fs = Math.max(16 * k, Math.min(21 * k, textW * 0.04));
    return { W: stage.w, H: stage.h, fs, padX: (stage.w - textW) / 2, padTop: 76 * k, padBottom: 92 * k };
  }, [stage]);

  const sizeKey = size ? `${size.W}-${size.H}` : "";
  useEffect(() => {
    if (!size) return undefined;
    let cancelled = false;
    (document.fonts?.ready || Promise.resolve()).then(() => {
      if (cancelled) return;
      setPages(paginate(size.W - 2 * size.padX, size.H - size.padTop - size.padBottom, size.fs));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeKey]);

  const N = pages ? pages.length : 0;

  // оглавление: где в разбиении начинается каждый раздел
  useEffect(() => {
    if (!pages) return;
    const toc = [];
    pages.forEach((pg, i) => pg.forEach((b, bi) => b.k === "chapter" && toc.push({ title: b.title, page: i, lead: bi === 0 })));
    onToc?.(toc);
  }, [pages, onToc]);

  useEffect(() => {
    window.__akathistGo = (i) => {
      cancelAnimationFrame(rafRef.current);
      busyRef.current = false;
      setFold(null);
      setPos(Math.max(0, Math.min(N - 1, i)));
    };
    return () => {
      delete window.__akathistGo;
    };
  }, [N]);

  const fracRef = useRef(null);
  useEffect(() => {
    if (!N) return;
    if (fracRef.current == null) fracRef.current = 0;
    setPos(Math.round(fracRef.current * (N - 1)));
  }, [N]);

  useEffect(() => {
    if (pos == null || !N) return;
    const frac = N > 1 ? pos / (N - 1) : 0;
    fracRef.current = frac;
    onProgress?.({ page: pos + 1, total: N, frac });
  }, [pos, N, onProgress]);

  // Доводка загиба из текущей точки в целевую; py слегка «дышит» дугой, чтобы
  // угол менялся и при перелистывании кнопкой.
  const animate = useCallback((from, to, ms, lift, done) => {
    cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = ease(t);
      setFold((f) =>
        f && {
          ...f,
          px: from.px + (to.px - from.px) * e,
          py: from.py + (to.py - from.py) * e - Math.sin(Math.PI * e) * lift,
        }
      );
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else done();
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const settle = useCallback(
    (f, complete, lift = 0) => {
      if (!size) return;
      busyRef.current = true;
      const W = size.W;
      const targetX = complete ? (f.dir > 0 ? -W : W) : f.dir > 0 ? W : -W;
      const dist = Math.abs(targetX - f.px) / (2 * W);
      animate({ px: f.px, py: f.py }, { px: targetX, py: f.cy }, FLIP_MS * Math.max(0.35, dist), lift, () => {
        if (complete) setPos((x) => x + f.dir);
        setFold(null);
        busyRef.current = false;
      });
    },
    [animate, size]
  );

  const startFlip = useCallback(
    (dir) => {
      if (busyRef.current || pos == null || !size) return;
      if ((dir > 0 && pos >= N - 1) || (dir < 0 && pos <= 0)) return;
      const f = { dir, cy: size.H, px: dir > 0 ? size.W : -size.W, py: size.H };
      setFold(f);
      settle(f, true, size.H * 0.22);
    },
    [pos, N, size, settle]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") startFlip(1);
      if (e.key === "ArrowLeft") startFlip(-1);
    };
    window.addEventListener("keydown", onKey);
    window.__akathistFlip = startFlip;
    return () => {
      window.removeEventListener("keydown", onKey);
      delete window.__akathistFlip;
      cancelAnimationFrame(rafRef.current);
    };
  }, [startFlip]);

  const onPointerDown = (e) => {
    if (busyRef.current || !size || (e.pointerType === "mouse" && e.button !== 0)) return;
    const r = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      lock: null,
      dir: 0,
      cy: e.clientY - r.top > size.H / 2 ? size.H : 0, // за какой угол берёмся
      f: null,
    };
  };
  const onPointerMove = (e) => {
    const s = dragRef.current;
    if (!s || !size) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.lock && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      s.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (s.lock === "x") {
        e.currentTarget.setPointerCapture(e.pointerId);
        s.dir = dx < 0 ? 1 : -1;
        if ((s.dir > 0 && pos >= N - 1) || (s.dir < 0 && pos <= 0)) s.lock = "none";
      }
    }
    if (s.lock !== "x") return;
    // угол листа идёт за пальцем: по горизонтали — вдоль движения (сгиб движется
    // вдвое медленнее угла), по вертикали — наклоняет линию сгиба
    const base = s.dir > 0 ? size.W : -size.W;
    const moved = s.dir > 0 ? Math.min(0, dx) : Math.max(0, dx);
    const px = Math.max(-size.W, Math.min(size.W, base + moved * 1.7));
    const py = s.cy + Math.max(-size.H, Math.min(size.H, dy));
    s.f = { dir: s.dir, cy: s.cy, px, py };
    setFold(s.f);
  };
  const onPointerUp = (e) => {
    const s = dragRef.current;
    dragRef.current = null;
    if (!s || s.lock !== "x" || !s.f) return;
    const prog = s.dir > 0 ? (size.W - s.f.px) / (2 * size.W) : (s.f.px + size.W) / (2 * size.W);
    const v = Math.abs(e.clientX - s.x) / Math.max(1, performance.now() - s.t);
    settle(s.f, prog > 0.3 || v > 0.5);
  };

  const ready = size && pos != null && N > 0;
  const W = size?.W || 0;
  const H = size?.H || 0;
  let top = null;
  let under = null;
  let g = null;
  if (ready) {
    top = !fold ? pages[pos] : fold.dir > 0 ? pages[pos] : pages[pos - 1];
    under = fold ? (fold.dir > 0 ? pages[pos + 1] : pages[pos]) : null;
    g = fold ? foldGeometry(W, H, fold) : null;
  }
  // полоса вдоль линии сгиба: локальная ось x направлена на сторону угла листа
  const strip = (left, width, bg, extra) => (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: 0,
        top: -H * 2,
        width,
        height: H * 5,
        marginLeft: left,
        transformOrigin: `${-left}px ${H * 2}px`,
        transform: `translate(${g.m.x}px,${g.m.y}px) rotate(${g.angle}deg)`,
        background: bg,
        ...extra,
      }}
    />
  );

  return (
    <div
      ref={stageRef}
      className={`absolute inset-0 touch-pan-y select-none overflow-hidden ${PAGE_BG}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {!ready && <div className="grid h-full place-items-center text-sm text-[#2f2523]/50">Готовим книгу…</div>}
      {ready && (!fold || !g) && <PageFace page={top} size={size} />}
      {ready && fold && g && (
        <>
          <div className="absolute inset-0">
            <PageFace page={under} size={size} />
            {strip(0, 40, "linear-gradient(to right, rgba(60,40,15,0.26), rgba(60,40,15,0.06) 50%, transparent)")}
          </div>
          <div className="absolute inset-0" style={{ clipPath: g.front }}>
            <PageFace page={top} size={size} />
            {strip(-45, 45, "linear-gradient(to right, transparent, rgba(60,40,15,0.14))")}
          </div>
          {/* оборот листа: внешний слой отбрасывает тень на страницу под собой и на себя */}
          <div className="pointer-events-none absolute inset-0" style={{ filter: "drop-shadow(-2px 2px 4px rgba(40,25,10,0.3))" }}>
            <div className="absolute inset-0" style={{ clipPath: g.flap, transform: g.matrix, transformOrigin: "0 0" }}>
              <div className={`absolute inset-0 ${PAGE_BG}`} />
              <div className="absolute inset-0 opacity-[0.32]">
                <PageFace page={top} size={size} />
              </div>
              {strip(0, 70, "linear-gradient(to right, rgba(60,40,15,0.28), rgba(60,40,15,0.06) 40%, rgba(255,255,255,0.16) 70%, transparent)")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Оглавление ───────────────────────────────────────────────────────────
// Все разделы подряд, по порядку акафиста, вдоль вертикальной линии: икосы
// крупными узлами (и молитвы, тропари, величание), нумерованные кондаки — мельче; текущий раздел подсвечен.
function TocList({ toc, current, activeSet, onGo }) {
  const scrollRef = (el) => el && requestAnimationFrame(() => el.scrollIntoView({ block: "center" }));
  return (
    <ol className="relative ml-3 flex flex-col border-l border-[#d4574a]/50 pb-2">
      {toc.map((t, i) => {
        const ikos = !/^Кондак \d+$/.test(t.title);
        const active = activeSet.has(i);
        return (
          <li key={i} className="relative">
            <span
              aria-hidden
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${
                ikos ? "h-3.5 w-3.5" : "h-2 w-2"
              } ${active ? "toc-dot-active border-[#7a1a10] bg-[#7a1a10]" : "border-[#d4574a] bg-white"}`}
              style={{ left: -0.5, animationDelay: active ? `${-(i % 7) * 0.9}s` : undefined }}
            >
              {active && <span className="absolute inset-[18%] rounded-full bg-[#f8ecc9] shadow-[0_0_4px_rgba(255,240,200,0.9)]" />}
            </span>
            <button
              type="button"
              ref={i === current ? scrollRef : undefined}
              aria-current={active ? "true" : undefined}
              onClick={() => onGo(t.page)}
              className={`ml-5 flex w-[calc(100%-1.25rem)] items-center justify-between gap-3 rounded-xl px-3 text-left transition-all ${
                ikos ? "my-0.5 py-2.5 text-[1.1875rem]" : "py-1.5 text-[0.9375rem]"
              } ${
                active
                  ? "toc-glint bg-gradient-to-b from-[#b3382a] to-[#7a1a10] text-white shadow-[0_6px_16px_-6px_rgba(122,26,16,0.8)]"
                  : ikos
                    ? "text-[#2f2523] hover:bg-[#9b2316]/12"
                    : "text-[#2f2523]/65 hover:bg-[#9b2316]/10"
              }`}
            >
              <span>{t.title}</span>
              <span className={`text-xs tabular-nums ${active ? "text-white/70" : "text-[#2f2523]/40"}`}>{t.page + 1}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Подсказка при первом открытии ────────────────────────────────────────
function FirstHint() {
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(HINT_KEY);
    } catch {
      return false;
    }
  });
  // сенсорное устройство (телефон/планшет) или мышь с клавиатурой
  const [touch] = useState(() => {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  });
  // кнопка «?» в углу читалки открывает подсказку снова
  useEffect(() => {
    window.__akathistHint = () => setOpen(true);
    return () => {
      delete window.__akathistHint;
    };
  }, []);
  if (!open) return null;
  const close = () => {
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* без сохранения */
    }
    setOpen(false);
  };
  const Row = ({ icon, title, children }) => (
    <li className="flex items-start gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#d4574a]/60 bg-white/60 text-[#9b2316]">{icon}</span>
      <span>
        <span className="block text-[1.3125rem] leading-tight text-[#2f2523]">{title}</span>
        <span className="mt-1 block text-[1.0625rem] leading-snug text-[#2f2523]/65">{children}</span>
      </span>
    </li>
  );
  return (
    <div className="hint-backdrop absolute inset-0 z-30 flex overflow-y-auto bg-[#2a1d12]/55 p-4 backdrop-blur-sm" role="group" aria-label="Как читать акафист">
      <div className={`hint-card ${PAGE_BG} ${TEXT_FONT} relative m-auto w-full max-w-[26.25rem] rounded-[28px] px-6 pb-6 pt-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]`}>
        <img src="/ornaments/corner.webp" alt="" aria-hidden draggable={false} className="pointer-events-none absolute -left-4 -top-4 w-24 -scale-x-100 select-none opacity-50" />
        <h3 style={{ textTransform: "none", fontSize: "2rem", lineHeight: 1.1, fontWeight: 500 }} className={`${TEXT_FONT} text-center ${GOLD_TEXT}`}>
          Как читать
        </h3>
        <div className="mt-3 flex items-center justify-center gap-3 text-[#d4574a]" aria-hidden>
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4574a]/80" />
          <span className="text-[0.45rem]">◆</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4574a]/80" />
        </div>
        <ul className="mt-5 flex flex-col gap-4">
          {touch && (
            <Row
              title="Листайте, как книгу"
              icon={
                <span className="relative block h-3 w-7">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-[#d4574a]/70" />
                  <span className="hint-finger absolute left-0 top-1/2 -mt-[5px] h-2.5 w-2.5 rounded-full bg-[#9b2316]" />
                </span>
              }
            >
              Проведите пальцем влево или вправо — страница загнётся и перевернётся.
            </Row>
          )}
          <Row
            title={touch ? "Кнопки" : "Переход по страницам"}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12h7M6 8l-3 4 3 4M21 12h-7M18 8l3 4-3 4" />
              </svg>
            }
          >
            {touch
              ? "Стрелки внизу экрана листают страницы назад и вперёд."
              : "Стрелки по краям экрана листают страницы, а на клавиатуре работают клавиши ← и →."}
          </Row>
          <Row
            title="Оглавление"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M8 6h12M8 12h12M8 18h12" />
                <circle cx="4" cy="6" r="1" fill="currentColor" />
                <circle cx="4" cy="12" r="1" fill="currentColor" />
                <circle cx="4" cy="18" r="1" fill="currentColor" />
              </svg>
            }
          >
            Кнопка слева внизу открывает список разделов для быстрого перехода.
          </Row>
        </ul>
        <button
          type="button"
          onClick={close}
          className="mt-6 w-full rounded-full bg-[#9b2316] py-3.5 text-[1rem] uppercase tracking-[0.2em] text-white shadow-lg transition-colors hover:bg-[#7a1a10]"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}

// ─── Модалка ──────────────────────────────────────────────────────────────
export default function AkathistReader({ children, className = "" }) {
  const [info, setInfo] = useState({ page: 1, total: 1, frac: 0 });
  const onProgress = useCallback((p) => setInfo(p), []);
  const [toc, setToc] = useState([]);
  const atStart = info.page <= 1;
  const atEnd = info.page >= info.total;
  const [tocOpen, setTocOpen] = useState(false);
  // Подсвечивается раздел, чей ЗАГОЛОВОК сейчас на открытой странице (если
  // заголовков два — оба). Если на странице заголовка нет (идёт продолжение
  // текста), светится последний заголовок до неё — тот, что читаем.
  const cur = info.page - 1;
  const onPage = toc.map((t, i) => i).filter((i) => toc[i].page === cur);
  const lastBefore = toc.reduce((acc, t, i) => (t.page < cur ? i : acc), -1);
  const activeSet = new Set(onPage.length ? onPage : lastBefore >= 0 ? [lastBefore] : []);
  const current = [...activeSet][0] ?? 0;
  const flip = (dir) => window.__akathistFlip?.(dir);

  return (
    <Modal>
      <Modal.Trigger className={className}>{children}</Modal.Trigger>
      <Modal.Backdrop>
        <Modal.Container size="full" placement="center">
          <Modal.Dialog className={`${PAGE_BG} p-0`}>
            <div className="relative flex h-full w-full flex-col overflow-hidden">
              <Book onProgress={onProgress} onToc={setToc} />
              <FirstHint />
              

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
                <button
                  type="button"
                  onClick={() => window.__akathistHint?.()}
                  aria-label="Как читать"
                  className="pointer-events-auto absolute left-4 top-3.5 grid h-8 w-8 place-items-center rounded-full bg-white text-[#9b2316] shadow-lg transition-colors hover:bg-[#9b2316] hover:text-white sm:left-8 sm:top-4 sm:h-9 sm:w-9"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 9a3 3 0 1 1 4.4 2.65c-.9.5-1.4 1.1-1.4 2.1" />
                    <circle cx="12" cy="18" r="0.6" fill="currentColor" />
                  </svg>
                </button>
                <Modal.CloseTrigger className="pointer-events-auto absolute right-4 top-3.5 grid h-8 w-8 place-items-center rounded-full bg-white text-[#9b2316] shadow-lg transition-colors hover:bg-[#9b2316] hover:text-white sm:right-8 sm:top-4 sm:h-9 sm:w-9 [&>svg]:h-4 [&>svg]:w-4">
                  <CloseIcon />
                </Modal.CloseTrigger>
              </div>

              <div className="pointer-events-none relative z-10 mt-auto flex items-center justify-between gap-2.5 px-4 pb-4 pt-3 text-[#2f2523] sm:justify-center sm:gap-5 sm:px-5 sm:pb-6">
                <button type="button" onClick={() => flip(-1)} disabled={atStart} aria-label="Предыдущая страница" className="grid h-10 w-10 shrink-0 place-items-center sm:hidden rounded-full pointer-events-auto bg-white text-[#9b2316] shadow-lg transition-colors hover:bg-[#9b2316] hover:text-white disabled:cursor-default disabled:opacity-35 disabled:shadow-none disabled:hover:bg-white disabled:hover:text-[#9b2316]">
                  <Arrow dir="left" />
                </button>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-none">
                  <span className="whitespace-nowrap text-xs tabular-nums text-[#2f2523]/60">
                    стр. {info.page} из {info.total}
                  </span>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-black/10 sm:w-72" aria-hidden>
                    <div className="h-full rounded-full bg-gradient-to-r from-[#d4574a] to-[#b8453a] transition-[width] duration-700 ease-out" style={{ width: `${info.frac * 100}%` }} />
                  </div>
                </div>
                <button type="button" onClick={() => flip(1)} disabled={atEnd} aria-label="Следующая страница" className="grid h-10 w-10 shrink-0 place-items-center sm:hidden rounded-full pointer-events-auto bg-white text-[#9b2316] shadow-lg transition-colors hover:bg-[#9b2316] hover:text-white disabled:cursor-default disabled:opacity-35 disabled:shadow-none disabled:hover:bg-white disabled:hover:text-[#9b2316]">
                  <Arrow dir="right" />
                </button>
                <button
                  type="button"
                  onClick={() => setTocOpen(true)}
                  aria-label="Оглавление"
                  className="pointer-events-auto order-first grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#9b2316] shadow-lg transition-colors hover:bg-[#9b2316] hover:text-white sm:absolute sm:bottom-6 sm:left-8 sm:h-12 sm:w-12"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M8 6h12M8 12h12M8 18h12" />
                    <circle cx="4" cy="6" r="1" fill="currentColor" />
                    <circle cx="4" cy="12" r="1" fill="currentColor" />
                    <circle cx="4" cy="18" r="1" fill="currentColor" />
                  </svg>
                </button>
              </div>

              {/* на широком экране стрелки — по краям страницы, посередине */}
              {[["left", -1, "Предыдущая страница"], ["right", 1, "Следующая страница"]].map(([side, dir, label]) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => flip(dir)}
                  disabled={dir < 0 ? atStart : atEnd}
                  aria-label={label}
                  className={`pointer-events-auto absolute top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full bg-white text-[#9b2316] shadow-lg transition-colors hover:bg-[#9b2316] hover:text-white disabled:cursor-default disabled:opacity-35 disabled:shadow-none disabled:hover:bg-white disabled:hover:text-[#9b2316] sm:grid ${side === "left" ? "left-6" : "right-6"}`}
                >
                  <Arrow dir={side} />
                </button>
              ))}

              <Drawer isOpen={tocOpen} onOpenChange={setTocOpen}>
                <Drawer.Backdrop variant="blur">
                  <Drawer.Content placement="left">
                    <Drawer.Dialog className={`toc-dialog ${PAGE_BG} ${TEXT_FONT} !w-[min(86vw,22.5rem)] !p-0`}>
                      <Drawer.CloseTrigger className="!absolute right-4 top-4 z-20 grid !h-10 !w-10 place-items-center !rounded-full !bg-white !text-[#9b2316] shadow-lg transition-colors hover:!bg-[#9b2316] hover:!text-white">
                        <CloseIcon />
                      </Drawer.CloseTrigger>
                      <div className="relative shrink-0 overflow-hidden px-7 pb-4 pt-8 text-center">
                        <img src="/ornaments/corner.webp" alt="" aria-hidden draggable={false} className="pointer-events-none absolute -left-5 -top-5 w-24 -scale-x-100 opacity-50 select-none" />
                        <p className="text-[0.6875rem] uppercase tracking-[0.3em] text-[#9b2316]">Акафист</p>
                        <Drawer.Heading style={{ fontFamily: "inherit", fontWeight: 500, textTransform: "none", fontSize: "2rem", lineHeight: 1.1, letterSpacing: 0 }} className={`mt-1 ${GOLD_TEXT}`}>
                          Оглавление
                        </Drawer.Heading>
                        <div className="mt-3 flex items-center justify-center gap-3 text-[#d4574a]" aria-hidden>
                          <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4574a]/80" />
                          <span className="text-[0.5rem]">◆</span>
                          <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4574a]/80" />
                        </div>
                      </div>
                      <Drawer.Body className="px-5 pb-6">
                        <TocList toc={toc} current={current} activeSet={activeSet} onGo={(page) => { window.__akathistGo?.(page); setTocOpen(false); }} />
                      </Drawer.Body>
                      <p className="shrink-0 border-t border-[#d4574a]/30 px-7 py-3 text-center text-xs text-[#2f2523]/55">
                        Вы на странице {info.page} из {info.total}
                      </p>
                    </Drawer.Dialog>
                  </Drawer.Content>
                </Drawer.Backdrop>
              </Drawer>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
