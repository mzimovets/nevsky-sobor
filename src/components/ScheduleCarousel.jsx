import { useEffect, useRef, useState } from "react";
import ScheduleDay from "./ScheduleDay.jsx";

const CARD_WIDTH = 288; // px, держим в шаге со scrollBy
const CARD_HEIGHT = 320; // px, все карточки одной высоты
const EDGE_EPS = 2; // px, погрешность сравнения scrollLeft с краями

const Arrow = ({ dir, onClick, label, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-white text-maroon shadow-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:opacity-30"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>
);

// Карусель дней: вертикальные прямоугольные карточки уезжают к краю экрана
// (трек без боковых отступов), скролл по горизонтали со snap (свайп на
// телефоне). Кнопка «назад» — слева, «вперёд» — справа, обе строкой над
// карточками; недоступны (disabled), когда карусель докручена до края.
// Все карточки одной высоты (CARD_HEIGHT); если «Святые дня» не помещаются —
// скроллятся внутри карточки (см. ScheduleDay), а не обрезаются молча.
export default function ScheduleCarousel({ days }) {
  const trackRef = useRef(null);
  const [{ atStart, atEnd }, setEdges] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => {
      setEdges({
        atStart: el.scrollLeft <= EDGE_EPS,
        atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_EPS,
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [days]);

  const scrollByCard = (dir) => {
    trackRef.current?.scrollBy({ left: dir * (CARD_WIDTH + 16), behavior: "smooth" });
  };

  return (
    <div>
      <div className="mb-2 flex justify-between gap-2 px-6 sm:px-10">
        <Arrow dir="left" label="Предыдущие дни" disabled={atStart} onClick={() => scrollByCard(-1)} />
        <Arrow dir="right" label="Следующие дни" disabled={atEnd} onClick={() => scrollByCard(1)} />
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto scroll-smooth px-6 pb-2 sm:px-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day, i) => (
          <div
            key={day.id || `${day.month}-${day.dateWeek}-${i}`}
            className="shrink-0 snap-start"
            style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
          >
            <ScheduleDay day={day} />
          </div>
        ))}
      </div>
    </div>
  );
}
