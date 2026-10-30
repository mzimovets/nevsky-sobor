import { useEffect, useRef, useState } from "react";
import Poster, { POSTER_WIDTH, POSTER_HEIGHT } from "./Poster.jsx";

// Обёртка занимает реальный размер после масштаба (как posterView в
// a_nevsky_react/ButtonSave.jsx) — постер вписывается по ширине контейнера
// без горизонтального скролла на телефоне.
export default function PosterScaled({ days, fontSize }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / POSTER_WIDTH));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="poster-scale-wrap">
      <div
        className="mx-auto"
        style={{
          width: POSTER_WIDTH * scale,
          height: POSTER_HEIGHT * scale,
          boxShadow: "0 8px 28px -10px rgba(30,20,15,0.35)",
        }}
      >
        <div style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <Poster days={days} fontSize={fontSize} />
        </div>
      </div>
    </div>
  );
}
