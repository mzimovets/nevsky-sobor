import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { dayISODate, dayStatus, todayIndex } from "../lib/scheduleDate.js";
import { parseServices } from "../lib/services.js";
import { Eyebrow, RevealWords } from "./Reveal.jsx";

const MONTHS_NOM = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const stripHtml = (html) => (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const Arrow = ({ dir = "right" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} />
  </svg>
);

const DocIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8" />
  </svg>
);

const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

// Блок «Расписание» на главной в стиле sobormihailsochi.ru: крупная карточка
// сегодняшнего дня и лента карточек дней (прошедшие приглушены, сегодняшняя
// тёмная) с горизонтальной прокруткой, кнопками и полоской прогресса.
export default function DaySchedule({ days }) {
  const sliderRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const initializedRef = useRef(false);
  const topCardRef = useRef(null);
  const [pad, setPad] = useState(null);
  const navigate = useNavigate();
  // Тянули ленту мышью — следующий «клик» по карточке не открывает день.
  const dragMovedRef = useRef(false);

  // Края ленты (первая карточка слева и последняя справа при докрутке)
  // выравниваются ровно по краям верхней крупной карточки — меряем их по
  // факту, а не считаем через vw (100vw включает ширину полосы прокрутки).
  const measurePad = () => {
    const sl = sliderRef.current;
    const top = topCardRef.current;
    if (!sl || !top) return;
    const a = sl.getBoundingClientRect();
    const b = top.getBoundingClientRect();
    setPad({ l: Math.max(0, b.left - a.left), r: Math.max(0, a.right - b.right) });
  };

  // Как на sobormihailsochi.ru: лента «примагничена» к карточкам нативным
  // scroll-snap (mandatory + snap-start, scroll-padding = отступ до края
  // верхней карточки) — браузер сам плавно доводит её до края после
  // прокрутки пальцем/колесом. Мышью лента тянется вручную: на время
  // перетаскивания snap выключается (иначе он дёргал бы ленту под рукой), а
  // при отпускании включается обратно — и браузер доводит карточку сам.
  const onPointerDown = (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = sliderRef.current;
    const drag = { x: e.clientX, left: el.scrollLeft, moved: false };
    dragMovedRef.current = false;
    const move = (ev) => {
      const dx = ev.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) {
        drag.moved = true;
        el.style.scrollSnapType = "none";
      }
      if (drag.moved) el.scrollLeft = drag.left - dx;
    };
    const up = () => {
      dragMovedRef.current = drag.moved;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.style.scrollSnapType = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Вызывается на каждый кадр прокрутки — поэтому полоска прогресса
  // двигается напрямую через ref (без setState), а стейт краёв меняется
  // только когда кнопка реально включается/выключается. Иначе каждый кадр
  // перерисовывал бы все карточки в React, и лента дёргалась.
  // Позиция курсора внутри карточки — для наклона карточки при наведении (см. .dcard в theme.css), — наклон карточки к курсору.
  const onCardMove = (e, k = 8) => {
    const card = e.currentTarget.firstElementChild;
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
    card.style.setProperty("--ry", `${(x / r.width - 0.5) * k}deg`);
    card.style.setProperty("--rx", `${-(y / r.height - 0.5) * k}deg`);
  };
  const barRef = useRef(null);
  const updateProgress = () => {
    const el = sliderRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const w = max > 0 ? (el.clientWidth / el.scrollWidth) * 100 : 100;
    const x = max > 0 ? (el.scrollLeft / max) * (100 - w) : 0;
    if (barRef.current) {
      barRef.current.style.width = `${w}%`;
      barRef.current.style.transform = `translateX(${(x / w) * 100}%)`;
    }
    const start = el.scrollLeft <= 2;
    const end = el.scrollLeft >= max - 2;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  };

  // Первый раз, когда расписание загрузилось, лента встаёт на сегодняшний
  // день (а не на самый ранний в списке) — потом позицию не трогаем, иначе
  // каждый poll (useLiveSchedule, 20с) сбрасывал бы прокрутку.
  useEffect(() => {
    const el = sliderRef.current;
    if (!el || initializedRef.current || !days?.length || !pad) return;
    initializedRef.current = true;
    const card = el.children[todayIndex(days)];
    if (card) el.scrollLeft = card.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft);
    updateProgress();
  }, [days, pad]);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      measurePad();
      updateProgress();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [days]);

  if (!days || !days.length) return null;

  const scrollByCards = (dir) => {
    const el = sliderRef.current;
    const card = el?.children[0];
    if (!el || !card) return;
    const step = card.getBoundingClientRect().width + 18;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  const today = days[todayIndex(days)];
  const todayStatus = dayStatus(today);
  const todayFeast = stripHtml(today.saintsOfDay);

  return (
    <section className="w-full overflow-x-clip px-6 py-12 [--pad:1.5rem] sm:px-10 sm:[--pad:2.5rem]">
      <div className="mx-auto max-w-[1700px]">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <Eyebrow className="text-xs uppercase text-[#9b2316]">Богослужения</Eyebrow>
            <h2 style={{ textTransform: "uppercase" }} className="font-slovic mt-3 text-4xl leading-none sm:text-5xl">
              <RevealWords text="Расписание богослужений" wordClassName={GOLD_TEXT} />
            </h2>
          </div>
          <div className="hidden gap-2.5 sm:flex">
            {[-1, 1].map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => scrollByCards(dir)}
                disabled={dir < 0 ? edges.start : edges.end}
                aria-label={dir < 0 ? "Предыдущие дни" : "Следующие дни"}
                className="grid h-13 w-13 place-items-center rounded-full border border-[#9b2316]/30 bg-transparent text-ink transition-all hover:border-maroon-dark hover:bg-maroon-dark hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                style={{ width: 52, height: 52 }}
              >
                <Arrow dir={dir < 0 ? "left" : "right"} />
              </button>
            ))}
          </div>
        </div>

        <div ref={topCardRef} className="dwrap mb-6" onPointerMove={(e) => onCardMove(e, 2.5)}>
        <Link
          to={`/day/${dayISODate(today) || ""}`}
          className="dcard dcard-wide group relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-4 rounded-[18px] border border-[#ece6e1] bg-white px-6 py-5 pl-7 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-10 sm:px-10"
        >
          <span aria-hidden className="dlayer" />
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]" aria-hidden>
            <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#e8a79e] to-[#b8453a]" />
          </span>
          <span className="flex items-center gap-3 border-r border-[#ece6e1] pr-5 sm:gap-4 sm:pr-10">
            <span className={`font-slovic text-6xl leading-[0.85] ${GOLD_TEXT}`}>{today.dateWeek}</span>
            <span className="flex flex-col gap-2">
              <span className="font-serif-hero text-lg uppercase leading-none tracking-[0.06em] text-ink">
                {MONTHS_NOM[Number(today.month) - 1]}
              </span>
              <span className="text-[10px] uppercase tracking-[0.24em] text-muted">{today.dayWeek}</span>
            </span>
          </span>
          <span className="min-w-0">
            <span className="mb-1 hidden text-[10px] uppercase tracking-[0.24em] text-[#9b2316] sm:block">
              {todayStatus === "today" ? "Сегодня" : "Ближайший день"}
            </span>
            <span className="block text-lg leading-snug text-ink sm:text-lg sm:leading-relaxed">{todayFeast || "Богослужения по расписанию"}</span>
          </span>
          <span className="hidden h-11 w-11 place-items-center rounded-full border border-[#9b2316]/30 text-ink transition-colors group-hover:border-[#b8453a] group-hover:bg-[#b8453a] group-hover:text-white sm:grid">
            <Arrow />
          </span>
          {/* Нижняя строка карточки — только на телефоне: метка дня слева,
              «Подробнее о дне» со стрелкой справа. */}
          <span className="col-span-2 flex items-center justify-between gap-4 border-t border-[#ece6e1] pt-4 sm:hidden">
            <span className="rounded-full border border-[#e3d6cf] bg-[#fbeeea] px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-[#9b2316]">
              {todayStatus === "today" ? "Сегодня" : "Ближайший день"}
            </span>
            <span className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink">Подробнее о дне</span>
              <span className="grid h-11 w-11 place-items-center rounded-full border border-[#9b2316]/30 text-ink">
                <Arrow />
              </span>
            </span>
          </span>
        </Link>
        </div>

        <div
          ref={sliderRef}
          onScroll={updateProgress}
          onPointerDown={onPointerDown}
          className="relative flex cursor-grab snap-x snap-mandatory gap-[18px] overflow-x-auto overflow-y-hidden pb-14 pt-7 [-ms-overflow-style:none] [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          style={{
            margin: "-22px calc(50% - 50vw) -44px",
            paddingLeft: pad ? pad.l : undefined,
            paddingRight: pad ? pad.r : undefined,
            scrollPaddingLeft: pad ? pad.l : undefined,
            scrollPaddingRight: pad ? pad.r : undefined,
            overscrollBehaviorX: "contain",
          }}
        >
          {days.map((day, i) => {
            const status = dayStatus(day);
            const isToday = status === "today";
            const services = parseServices(day.prayerTimes);
            return (
              // Hover ловит неподвижная обёртка, а сдвигается вложенная карточка —
              // иначе при подъёме карточка уходит из-под курсора у нижнего края,
              // hover «мигает», и анимация выглядит дёрганой.
              <div
                key={`${day.month}-${day.dateWeek}-${i}`}
                className="dwrap w-[82vw] shrink-0 snap-start select-none sm:w-[300px] lg:w-[330px]"
                onPointerMove={onCardMove}
              >
              <div
                role="link"
                tabIndex={0}
                aria-label={`Открыть день: ${day.dateWeek} ${MONTHS_NOM[Number(day.month) - 1]}`}
                onClick={() => {
                  if (dragMovedRef.current) {
                    dragMovedRef.current = false;
                    return;
                  }
                  const iso = dayISODate(day);
                  if (iso) navigate(`/day/${iso}`);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  const iso = dayISODate(day);
                  if (iso) navigate(`/day/${iso}`);
                }}
                className={`dcard relative flex h-full cursor-pointer flex-col rounded-[18px] border px-5 py-6 outline-none ${
                  isToday
                    ? "is-today border-maroon-dark bg-maroon-dark text-[#efe7d8]"
                    : "border-[#ece6e1] bg-white text-ink"
                } ${status === "past" ? "is-past" : ""}`}
              >
                <span aria-hidden className="dlayer" />
                <div className="flex items-baseline gap-3">
                  <span className={`font-slovic text-5xl leading-[0.85] ${isToday ? "text-[#e8a79e]" : GOLD_TEXT}`}>
                    {day.dateWeek}
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="font-serif-hero text-base uppercase leading-none tracking-[0.06em]">
                      {MONTHS_NOM[Number(day.month) - 1]}
                    </span>
                    <span className={`text-[9.5px] uppercase tracking-[0.22em] ${isToday ? "text-[#efe7d8]/60" : "text-muted"}`}>
                      {day.dayWeek}
                    </span>
                  </span>
                </div>

                {day.saintsOfDay && (
                  <div
                    className={`rich-text mt-4 text-[13.5px] leading-relaxed ${isToday ? "[&_*]:!text-[#efe7d8]/85" : ""}`}
                    dangerouslySetInnerHTML={{ __html: day.saintsOfDay }}
                  />
                )}

                <div className={`mt-4 flex flex-col gap-2.5 border-t pt-4 ${isToday ? "border-[#e8a79e]/25" : "border-[#ece6e1]"}`}>
                  {services.length ? (
                    services.map((svc, j) => (
                      <div key={j} className="grid grid-cols-[48px_minmax(0,1fr)] gap-2.5 text-[13.5px] leading-snug">
                        <span className={`font-semibold tabular-nums ${isToday ? "text-[#e8a79e]" : "text-[#9b2316]"}`}>{svc.time}</span>
                        <span className={isToday ? "text-[#efe7d8]/85" : "text-ink/80"}>{svc.text}</span>
                      </div>
                    ))
                  ) : (
                    <span className={`text-[13.5px] italic ${isToday ? "text-[#efe7d8]/60" : "text-muted"}`}>
                      Богослужения по расписанию
                    </span>
                  )}
                </div>
              </div>
              </div>
            );
          })}
        </div>

        <div className="relative mt-6 h-px bg-[#b0a9ae]/60" aria-hidden>
          <i
            ref={barRef}
            className="absolute -top-px left-0 h-[3px] w-1/5 rounded-full bg-gradient-to-r from-[#d4574a] to-[#9b2316]"
          />
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/schedule"
            className="inline-flex items-center gap-3 rounded-full border border-ink/20 px-7 py-4 text-[10px] font-medium uppercase tracking-[0.2em] text-ink transition-colors hover:border-[#b8453a] hover:bg-[#b8453a]/10 hover:text-[#9b2316]"
          >
            <span className="text-[#b8453a]">
              <DocIcon />
            </span>
            Подробное расписание на неделю
          </Link>
        </div>
      </div>
    </section>
  );
}
