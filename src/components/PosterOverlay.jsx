import { useEffect, useRef, useState } from "react";
import { Modal, useOverlayState } from "@heroui/react";
import { domToCanvas } from "modern-screenshot";
import Poster, { POSTER_WIDTH, POSTER_HEIGHT } from "./Poster.jsx";
import GlassLoupe, { RIM } from "./GlassLoupe.jsx";

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const LoupeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M10.5 8v5M8 10.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const LOUPE_ZOOM = 2.6;

// Подробное расписание на неделю (постер) поверх сайта: затемнённая подложка,
// постер по центру и кнопка-крестик в углу. Постер масштабируется так, чтобы
// ПОЛНОСТЬЮ помещаться на экране — и по высоте, и по ширине, без прокрутки.
// children — содержимое кнопки-триггера, className — её оформление.
const padFor = () => (window.innerWidth < 640 ? 0 : 16); // воздух вокруг постера: на телефоне — на весь экран

function useFitScale() {
  const calc = () => Math.min(1, (window.innerWidth - padFor()) / POSTER_WIDTH, (window.innerHeight - padFor()) / POSTER_HEIGHT);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return scale;
}

// Фон и шрифты постера тянем заранее, в простое после загрузки страницы, —
// иначе при открытии фон дорисовывается сверху вниз, а шрифты подменяются.
let posterWarmed = false;
function warmPoster() {
  if (posterWarmed) return;
  posterWarmed = true;
  new Image().src = "/poster/background.webp";
  document.fonts?.load("16px Pompadur");
  document.fonts?.load("16px Font");
}

export default function PosterOverlay({ days, fontSize, children, className = "" }) {
  const scale = useFitScale();
  useEffect(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    idle(warmPoster);
  }, []);
  const w = Math.floor(POSTER_WIDTH * scale);
  const h = Math.floor(POSTER_HEIGHT * scale);

  const state = useOverlayState();

  // ── Лупа (как в «Просмотре» на macOS) ──────────────────────────────
  // Включается кнопкой: за мышью/пальцем ездит стеклянная линза с увеличенной
  // копией постера. Копию двигаем напрямую через ref (без setState на каждое
  // движение), чтобы не перерисовывать постер при каждом пикселе.
  const [loupeOn, setLoupeOn] = useState(false);
  const loupeRef = useRef(null);
  const innerRef = useRef(null);
  const boxRef = useRef(null);
  const R = w < 420 ? 84 : 112; // радиус линзы

  // Снимок постера для стеклянной линзы (WebGL). Пока он делается (≈полсекунды)
  // или если WebGL недоступен, работает простая CSS-линза с увеличенной копией.
  const [snap, setSnap] = useState(null);
  const [glassFailed, setGlassFailed] = useState(false);
  const glassRef = useRef(null);
  const glassOn = Boolean(snap) && !glassFailed;
  // days приходит новым массивом на каждый рендер — сравниваем по содержимому
  const contentKey = JSON.stringify(days) + fontSize;
  useEffect(() => {
    setSnap(null);
  }, [contentKey]);
  useEffect(() => {
    if (!loupeOn || snap || glassFailed) return undefined;
    let dead = false;
    const el = boxRef.current?.querySelector(".poster");
    if (!el) return undefined;
    domToCanvas(el, {
      scale: Math.min(3, 4096 / POSTER_HEIGHT),
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
      backgroundColor: "#ffffff",
    })
      .then((c) => !dead && setSnap(c))
      .catch((err) => {
        console.warn("loupe snapshot failed", err);
        if (!dead) setGlassFailed(true);
      });
    return () => {
      dead = true;
    };
  }, [loupeOn, snap, glassFailed]);

  useEffect(() => {
    if (!state.isOpen) setLoupeOn(false);
  }, [state.isOpen]);

  const moveLoupe = (e) => {
    const box = boxRef.current?.getBoundingClientRect();
    const lens = loupeRef.current;
    const inner = innerRef.current;
    if (!box || !lens) return;
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    const touch = e.pointerType === "touch";
    const half = glassOn ? Math.round(R * (1 + RIM)) : R; // с оправой линза шире
    // на пальце линзу поднимаем над ним, чтобы её не закрывала рука
    const cy = touch ? py - half - 28 : py;
    lens.style.transform = `translate3d(${px - half}px, ${cy - half}px, 0)`;
    lens.style.opacity = "1";
    if (glassRef.current) glassRef.current.setCenter(px, py);
    else if (inner) inner.style.transform = `translate3d(${R - px * LOUPE_ZOOM}px, ${R - py * LOUPE_ZOOM}px, 0) scale(${(w / POSTER_WIDTH) * LOUPE_ZOOM})`;
  };
  const hideLoupe = () => {
    if (loupeRef.current) loupeRef.current.style.opacity = "0";
  };

  return (
    <Modal state={state}>
      <Modal.Trigger className={className}>{children}</Modal.Trigger>
      <Modal.Backdrop isDismissable={false} isKeyboardDismissDisabled className="bg-black/70 backdrop-blur-[2px]">
        {/* Контейнер центрирует постер и по вертикали, и по горизонтали (на
            телефоне он не прижат к верху). */}
        <Modal.Container placement="center" className="!flex !items-center !justify-center !p-0 sm:!p-2">
          {/* Крестик — в той же точке экрана, что и у просмотра объявлений
              (AnnouncementStoryModal): фиксированно в правом верхнем углу. */}
          <button
            type="button"
            onClick={() => setLoupeOn((v) => !v)}
            aria-label={loupeOn ? "Выключить лупу" : "Включить лупу"}
            aria-pressed={loupeOn}
            title="Лупа"
            className={`pointer-events-auto fixed left-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-[#d4574a]/50 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-[background-color,color,transform,border-color] duration-300 active:scale-95 sm:left-8 sm:top-6 ${loupeOn ? "!bg-[#9b2316] !text-white !border-transparent" : "!bg-white !text-[#9b2316] hover:!border-transparent hover:!bg-[#9b2316] hover:!text-white"}`}
          >
            <LoupeIcon />
          </button>
          <button
            type="button"
            onClick={() => state.close()}
            aria-label="Закрыть"
            className="pointer-events-auto fixed right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-[#d4574a]/50 !bg-white !text-[#9b2316] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-[background-color,color,transform,border-color] duration-300 hover:!border-transparent hover:!bg-[#9b2316] hover:!text-white active:scale-95 sm:right-8 sm:top-6"
          >
            <CloseIcon />
          </button>
          <Modal.Dialog className="relative m-auto w-auto max-w-none overflow-visible bg-transparent p-0 shadow-none" style={{ width: w, height: h, maxHeight: "none" }}>
            <Modal.Body
              ref={boxRef}
              className="m-0 flex-none overflow-hidden rounded-[20px] bg-transparent p-0 shadow-2xl"
              style={{ width: "100%", height: h, maxHeight: "none", cursor: loupeOn ? "none" : undefined, touchAction: loupeOn ? "none" : undefined }}
              onPointerDown={loupeOn ? moveLoupe : undefined}
              onPointerMove={loupeOn ? moveLoupe : undefined}
              onPointerLeave={loupeOn ? hideLoupe : undefined}
              onPointerUp={loupeOn ? (e) => e.pointerType === "touch" && hideLoupe() : undefined}
              onPointerCancel={loupeOn ? hideLoupe : undefined}
            >
              <div style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT, transform: `scale(${w / POSTER_WIDTH})`, transformOrigin: "top left" }}>
                <Poster days={days} fontSize={fontSize} />
              </div>
            </Modal.Body>
            {loupeOn && (
              <div
                ref={loupeRef}
                className={`loupe${snap && !glassFailed ? " loupe--glass" : ""}`}
                style={{ width: (glassOn ? Math.round(R * (1 + RIM)) : R) * 2, height: (glassOn ? Math.round(R * (1 + RIM)) : R) * 2 }}
                aria-hidden
              >
                {snap && !glassFailed ? (
                  <GlassLoupe ref={glassRef} source={snap} posterW={w} posterH={h} R={R} zoom={LOUPE_ZOOM} onFail={() => setGlassFailed(true)} />
                ) : (
                  <div ref={innerRef} className="loupe-inner" style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT }}>
                    <Poster days={days} fontSize={fontSize} />
                  </div>
                )}
              </div>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
