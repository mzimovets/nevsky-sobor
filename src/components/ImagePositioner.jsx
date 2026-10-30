import { useRef, useState } from "react";

// Настройка обложки — кадр фиксированных пропорций (aspectClassName,
// например "aspect-[16/9]"), внутри которого картинку можно перетаскивать
// (меняет focus — object-position, какая точка остаётся в кадре при
// обрезке) и приближать ползунком zoom (scale поверх обычного object-cover,
// с transform-origin в текущей точке фокуса, чтобы масштаб рос «от» неё, а
// не от центра кадра). Тот же приём, что у Notion/VK при перетаскивании
// обложки страницы — без обрезки самого файла на диске, только CSS.
export default function ImagePositioner({ src, focus, zoom, aspectClassName = "aspect-[16/9]", onChange }) {
  const frameRef = useRef(null);
  const draggingRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const startDrag = (e) => {
    const rect = frameRef.current.getBoundingClientRect();
    draggingRef.current = { startX: e.clientX, startY: e.clientY, startFocus: focus, rect };
    setDragging(true);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const { startX, startY, startFocus, rect } = draggingRef.current;
    // Тянем картинку — она должна ехать за курсором, а object-position
    // работает наоборот (больше x — видно правее), поэтому знак минус.
    const dxPct = ((e.clientX - startX) / rect.width) * 100;
    const dyPct = ((e.clientY - startY) / rect.height) * 100;
    onChange({
      x: Math.min(100, Math.max(0, startFocus.x - dxPct)),
      y: Math.min(100, Math.max(0, startFocus.y - dyPct)),
      zoom,
    });
  };

  const endDrag = () => {
    draggingRef.current = null;
    setDragging(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={frameRef}
        onPointerDown={startDrag}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className={`relative w-full select-none overflow-hidden rounded-2xl border border-line bg-cream ${aspectClassName} ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: `${focus.x}% ${focus.y}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${focus.x}% ${focus.y}%`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
          <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">Перетащите, чтобы сдвинуть</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">Масштаб</span>
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={zoom}
          onChange={(e) => onChange({ x: focus.x, y: focus.y, zoom: Number(e.target.value) })}
          className="flex-1 accent-maroon"
        />
        {(zoom !== 1 || focus.x !== 50 || focus.y !== 50) && (
          <button
            type="button"
            onClick={() => onChange({ x: 50, y: 50, zoom: 1 })}
            className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-xs text-muted hover:text-maroon"
          >
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
