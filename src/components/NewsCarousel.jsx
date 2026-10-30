import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatNewsDate, coverImageStyle } from "./NewsCard.jsx";

const AUTOPLAY_MS = 5000;

const ChevronIcon = ({ direction }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Карусель последних новостей вверху страницы /news (см. NewsPage.jsx) —
// сама листается по таймеру (AUTOPLAY_MS), и её же можно листать вручную
// стрелками или точками; ручное действие просто сбрасывает таймер (см.
// restartAutoplay), а не останавливает автолистание насовсем — пользователь
// не должен «терять» автопрокрутку одним кликом. Наведение мышью тоже
// ставит на паузу (typical carousel UX), отпускание — продолжает.
export default function NewsCarousel({ items }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const restartAutoplay = () => {
    clearInterval(timerRef.current);
    if (paused || items.length < 2) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, AUTOPLAY_MS);
  };

  useEffect(() => {
    restartAutoplay();
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, items.length]);

  const goTo = (i) => {
    setIndex(((i % items.length) + items.length) % items.length);
    restartAutoplay();
  };

  if (!items.length) return null;

  return (
    <div
      className="group/carousel relative w-full overflow-hidden rounded-3xl bg-slate shadow-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => navigate(`/news/${item._id}`)}
              className="relative h-full w-full shrink-0 text-left"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  style={coverImageStyle(item)}
                  className="absolute inset-0 h-full w-full object-cover [transform:scale(var(--z))]"
                />
              ) : (
                <div className="absolute inset-0 bg-cocoa" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                <p className="text-xs text-white/70 sm:text-sm">{formatNewsDate(item.publishedAt)}</p>
                <p className="rich-heading mt-1 max-w-2xl text-lg normal-case tracking-normal text-white sm:text-2xl">
                  {item.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Предыдущая новость"
            className="absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-opacity hover:bg-white/25 group-hover/carousel:opacity-100 sm:left-4"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Следующая новость"
            className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-opacity hover:bg-white/25 group-hover/carousel:opacity-100 sm:right-4"
          >
            <ChevronIcon direction="right" />
          </button>

          <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2">
            {items.map((item, i) => (
              <button
                key={item._id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Слайд ${i + 1}`}
                className="grid h-4 w-4 place-items-center"
              >
                <span
                  className={`rounded-full transition-all ${
                    i === index ? "h-2 w-5 bg-white" : "h-1.5 w-1.5 bg-white/50"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
