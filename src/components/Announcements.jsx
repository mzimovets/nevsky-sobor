import { Eyebrow, RevealWords } from "./Reveal.jsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAnnouncements } from "../lib/useAnnouncements.js";
import AnnouncementStoryModal from "./AnnouncementStoryModal.jsx";

const ChevronIcon = ({ direction }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

// Золотое пятно рамки и лёгкий наклон следуют за курсором (.dwrap/.dcard в
// theme.css — те же, что у карточек расписания и новостей).
const onCardMove = (e, k = 6) => {
  const card = e.currentTarget.firstElementChild;
  const r = card.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  card.style.setProperty("--mx", `${x}px`);
  card.style.setProperty("--my", `${y}px`);
  card.style.setProperty("--ry", `${(x / r.width - 0.5) * k}deg`);
  card.style.setProperty("--rx", `${-(y / r.height - 0.5) * k}deg`);
};

const DOT_COUNT_MAX = 5; // больше точек не показываем, даже если объявлений намного больше

// Раздел «Объявления» на главной — фон отличается от соседних секций (paper
// выше и ниже), карточки в стиле «историй» соцсетей: вертикальные
// прямоугольники со скруглёнными углами в горизонтальной прокрутке. Если
// карточки не помещаются по ширине — по краям появляются стрелки (как в
// блоке «Расписание», см. DaySchedule.jsx), скрывающиеся сами, когда
// прокручивать больше некуда в эту сторону. Заголовок ведёт на /announcements
// — отдельную страницу со всеми объявлениями, и там же теперь и управление
// (добавление/редактирование/порядок/удаление) — см. AnnouncementsPage.jsx;
// здесь, на главной, только публичная лента для чтения, без админки.
//
// Клик по карточке открывает эту же историю крупнее (см.
// AnnouncementStoryModal.jsx) — общий с /announcements компонент, чтобы не
// дублировать логику прогресса/автолистания/паузы по удержанию.
export default function Announcements() {
  const { items, loading } = useAnnouncements();

  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef(null);

  const scrollRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  // Число точек не зависит от числа объявлений (иначе при десятке карточек
  // получится десяток точек подряд — нечитаемо) — это индикатор ПРОГРЕССА
  // прокрутки на фиксированное число делений, как на референсе пользователя.
  const dotCount = Math.min(items.length, DOT_COUNT_MAX);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollPrev(el.scrollLeft > 4);
      setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
      // Активная точка — по ДОЛЕ прокрутки (scrollLeft к максимуму), а не по
      // индексу ближайшей карточки: индекс карточки не гарантирует, что при
      // упоре трека в правый край будет выбрана именно последняя точка
      // (упёртый scrollLeft не обязательно кратен ширине карточки), а доля —
      // гарантирует ровно это на обоих концах.
      const maxScroll = el.scrollWidth - el.clientWidth;
      const fraction = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
      setActiveDot(Math.round(fraction * (dotCount - 1)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [items.length, dotCount]);

  const scrollByCards = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * scrollRef.current.clientWidth * 0.8, behavior: "smooth" });
  };

  const scrollToDot = (dotIndex) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: (dotIndex / (dotCount - 1)) * maxScroll, behavior: "smooth" });
  };

  const openAt = (index) => {
    setActiveIndex(index);
    requestAnimationFrame(() => triggerRef.current?.click());
  };

  if (loading) return null;

  return (
    <section className="w-full overflow-x-clip px-6 py-12 sm:px-10">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <Eyebrow className="text-xs uppercase text-[#9b2316]">Важное для прихода</Eyebrow>
          {/* h2, а не просто стилизованная ссылка — общее для всех заголовков
              секций правило h1,h2,h3{font-family:var(--font-display)…}
              (theme.css) применяется по тегу, ссылка внутри его не теряет. */}
          <h2 style={{ textTransform: "uppercase" }} className="font-slovic mt-3 text-4xl leading-none sm:text-5xl">
            <Link to="/announcements" className="transition-opacity hover:opacity-80">
              <RevealWords text="Объявления" wordClassName={GOLD_TEXT} />
            </Link>
          </h2>
        </div>
        {items.length > 0 && (
          <div className="hidden gap-2.5 sm:flex">
            {[-1, 1].map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => scrollByCards(dir)}
                disabled={dir < 0 ? !canScrollPrev : !canScrollNext}
                aria-label={dir < 0 ? "Прокрутить влево" : "Прокрутить вправо"}
                className="grid place-items-center rounded-full border border-[#9b2316]/30 bg-transparent text-ink transition-all hover:border-maroon-dark hover:bg-maroon-dark hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                style={{ width: 52, height: 52 }}
              >
                <ChevronIcon direction={dir < 0 ? "left" : "right"} />
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 && <p className="text-sm text-muted">Объявлений пока нет.</p>}

      {items.length > 0 && (
        <>
          {/* -mx-6/sm:-mx-10 гасят паддинг section (px-6 sm:px-10), растягивая
              именно скроллящийся трек до истинных краёв экрана, а свой
              px-6/sm:px-10 возвращает тот же отступ только в состоянии покоя
              (первая/последняя карточка) — при прокрутке трек уезжает под
              край страницы, а не упирается в невидимый гаттер раньше него.
              Кнопки прокрутки — не здесь, а в шапке секции рядом с
              заголовком (как у «Расписание», см. DaySchedule.jsx), поэтому
              обёртке не нужен relative/абсолютное позиционирование стрелок.
              Системный скроллбар спрятан ([-ms-overflow-style]/
              [scrollbar-width]/[&::-webkit-scrollbar]) — вместо него ниже
              своя пагинация точками (activeDot), как в нативных
              «историях» — см. handleDelete/update в useEffect выше.
              pt-2 pb-8 (а не просто pb-2) — по спецификации CSS
              overflow-x: auto заодно переводит и overflow-y в auto
              («если одна из осей не visible — другая тоже становится auto»),
              и без запаса снизу тень карточки (shadow-md/hover:shadow-xl)
              обрезалась этим же треком по нижнему краю паддинга — грубо,
              без плавного схождения на нет. */}
          <div
            ref={scrollRef}
            className="-mx-6 flex gap-5 overflow-x-auto px-6 pb-10 pt-3 scroll-smooth sm:-mx-10 sm:px-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, index) => (
              <div key={item._id} className="dwrap shrink-0" onPointerMove={onCardMove}>
                <button
                  type="button"
                  onClick={() => openAt(index)}
                  className="dcard group relative block h-[22rem] w-60 rounded-[22px] text-left shadow-md sm:h-[27rem] sm:w-72"
                >
                  <span aria-hidden className="dlayer" />
                  <span
                    className="absolute inset-0 block overflow-hidden rounded-[22px]"
                    aria-hidden
                  >
                    <span className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105" style={{ backgroundImage: `url(${item.imageUrl})` }} />
                    <span className="absolute inset-0 rounded-[22px]" />
                    <span className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1c1208]/85 via-[#1c1208]/45 to-transparent p-4 pt-14">
                      <span aria-hidden className="mb-2 block h-px w-8 bg-gradient-to-r from-[#f0a89f] to-transparent" />
                      <span className="font-serif-hero block text-[1.375rem] leading-tight text-white">{item.title}</span>
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>

          {items.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              {Array.from({ length: dotCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollToDot(index)}
                  aria-label={`Прокрутить к позиции ${index + 1}`}
                  className="grid h-4 w-4 place-items-center"
                >
                  <span
                    className={`rounded-full transition-all ${
                      index === activeDot ? "h-1.5 w-6 bg-[#9b2316]" : "h-1.5 w-1.5 bg-[#9b2316]/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {items.length > 0 && (
        <AnnouncementStoryModal items={items} activeIndex={activeIndex} setActiveIndex={setActiveIndex} triggerRef={triggerRef} />
      )}
    </section>
  );
}
