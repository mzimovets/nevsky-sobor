import { useEffect, useState } from "react";
import { Modal, useOverlayState } from "@heroui/react";
import Poster, { POSTER_WIDTH, POSTER_HEIGHT } from "./Poster.jsx";

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

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

export default function PosterOverlay({ days, fontSize, children, className = "" }) {
  const scale = useFitScale();
  const w = Math.floor(POSTER_WIDTH * scale);
  const h = Math.floor(POSTER_HEIGHT * scale);

  const state = useOverlayState();

  return (
    <Modal state={state}>
      <Modal.Trigger className={className}>{children}</Modal.Trigger>
      <Modal.Backdrop className="bg-black/70 backdrop-blur-[2px]">
        {/* Контейнер центрирует постер и по вертикали, и по горизонтали (на
            телефоне он не прижат к верху). */}
        <Modal.Container placement="center" className="!flex !items-center !justify-center !p-0 sm:!p-2">
          {/* Крестик — в той же точке экрана, что и у просмотра объявлений
              (AnnouncementStoryModal): фиксированно в правом верхнем углу. */}
          <button
            type="button"
            onClick={() => state.close()}
            aria-label="Закрыть"
            className="pointer-events-auto fixed right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-[#d4574a]/50 !bg-white !text-[#9b2316] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-[background-color,color,transform,border-color] duration-300 hover:!border-transparent hover:!bg-[#9b2316] hover:!text-white active:scale-95 sm:right-8 sm:top-6"
          >
            <CloseIcon />
          </button>
          <Modal.Dialog className="relative m-auto w-auto max-w-none overflow-visible bg-transparent p-0 shadow-none" style={{ width: w, height: h, maxHeight: "none" }}>
            <Modal.Body className="m-0 flex-none overflow-hidden rounded-[20px] bg-transparent p-0 shadow-2xl" style={{ width: "100%", height: h, maxHeight: "none" }}>
              <div style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT, transform: `scale(${w / POSTER_WIDTH})`, transformOrigin: "top left" }}>
                <Poster days={days} fontSize={fontSize} />
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
