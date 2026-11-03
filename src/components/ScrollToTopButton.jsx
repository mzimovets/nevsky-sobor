import { useEffect, useState } from "react";

const THRESHOLD = 400; // px прокрутки, после которых кнопка вообще возможна
const DELTA = 6; // игнорируем дрожание меньше стольких px

const UpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Кнопка «наверх» — одна на всё приложение (см. App.jsx, рендерится вне
// <Routes>, поверх любой страницы), а не по одной в каждом модале/странице.
// Появляется/пропадает плавно (opacity+translate, тем же приёмом, что и
// кнопка «наверх» внутри модалки жития — см. DaySchedule.jsx), но следит за
// прокруткой всей страницы (window), а не своего внутреннего контейнера.
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y <= THRESHOLD) setVisible(false);
      else if (delta < -DELTA) setVisible(true); // листаем вверх
      else if (delta > DELTA) setVisible(false); // листаем вниз
      if (Math.abs(delta) > DELTA) lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Наверх страницы"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-5 right-5 z-40 grid h-11 w-11 place-items-center rounded-full border border-[#d4574a]/50 !bg-white !text-[#9b2316] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out hover:!border-transparent hover:!bg-[#9b2316] hover:!text-white active:scale-95 ${
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-75 opacity-0"
      }`}
    >
      <UpIcon />
    </button>
  );
}
