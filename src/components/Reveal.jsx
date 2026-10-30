import { useEffect, useRef, useState } from "react";

// Плавное появление при прокрутке, как на sobormihailsochi.ru: заголовки
// «поднимаются» по словам из-под маски, абзацы появляются волной, подписи над
// заголовками схлопываются из разрежённых букв. Срабатывает один раз, когда
// элемент зашёл в экран. Стили — .tx-*/.eb в theme.css.
export function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

// mode="rise" — заголовок (слова поднимаются с лёгким наклоном),
// mode="wave" — абзац (слова мягко всплывают волной). wordClassName попадает
// на каждое слово — для градиентного текста (bg-clip-text) он должен лежать
// на самих словах, а не на родителе.
export function RevealWords({ text, mode = "rise", wordClassName = "", className = "" }) {
  const [ref, seen] = useInView();
  const words = text.split(/\s+/).filter(Boolean);
  const step = mode === "wave" ? Math.min(22, 900 / Math.max(words.length, 1)) : 80;
  const base = mode === "wave" ? 200 : 100;
  return (
    <span ref={ref} data-split={mode} className={`${seen ? "tx-in" : ""} ${className}`} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} aria-hidden="true">
          {i > 0 && " "}
          <span className="tx-w">
            <span className={`tx-i ${wordClassName}`} style={{ transitionDelay: `${Math.round(base + i * step)}ms` }}>
              {word}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}

// Подпись над заголовком: буквы сходятся, ромб поворачивается, линия
// дорисовывается (элементы с классами eb-dot / eb-line внутри).
export function Eyebrow({ className = "", children }) {
  const [ref, seen] = useInView();
  return (
    <p ref={ref} className={`eb ${seen ? "eb-in" : ""} ${className}`}>
      {children}
    </p>
  );
}
