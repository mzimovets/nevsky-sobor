import { Modal } from "@heroui/react";
import PosterScaled from "./PosterScaled.jsx";
import { useScrollShadows } from "../lib/useScrollShadows.js";

const ExpandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Постер, кликабельный/наводимый — открывает себя же на весь экран через
// HeroUI Modal (size="full"). Подсказка «Открыть на весь экран» появляется
// по hover на десктопе; на телефоне работает просто тап.
export default function PosterModal({ days, fontSize }) {
  const { topShadow, bottomShadow, refCallback: bodyRefCallback, update: updateShadows } = useScrollShadows();

  return (
    <Modal>
      <Modal.Trigger className="group relative block w-full cursor-pointer text-left">
        <PosterScaled days={days} fontSize={fontSize} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/10 group-hover:opacity-100">
          <span className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm text-maroon shadow-md">
            <ExpandIcon />
            Открыть на весь экран
          </span>
        </div>
      </Modal.Trigger>

      <Modal.Backdrop>
        <Modal.Container size="full">
          <Modal.Dialog className="bg-paper">
            <Modal.CloseTrigger className="absolute right-4 top-4 z-10" />
            <div className="relative min-h-0 flex-1">
              <Modal.Body
                ref={bodyRefCallback}
                onScroll={updateShadows}
                className="flex h-full items-center justify-center overflow-auto p-4"
              >
                <PosterScaled days={days} fontSize={fontSize} />
              </Modal.Body>
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-paper via-paper/80 to-transparent transition-opacity duration-200 ${
                  topShadow ? "opacity-100" : "opacity-0"
                }`}
              />
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper via-paper/80 to-transparent transition-opacity duration-200 ${
                  bottomShadow ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
