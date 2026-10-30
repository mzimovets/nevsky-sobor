import { useEffect, useState } from "react";
import { Modal } from "@heroui/react";

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const ChevronIcon = ({ direction }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Простой просмотр картинки объявления — НЕ «история» (без вырезанного
// 9:16 прямоугольника, полосы прогресса и автолистания, см.
// AnnouncementStoryModal.jsx, который используется на главной): картинка в
// своих естественных пропорциях (object-contain), карточкой по центру
// экрана, а не на весь экран (было size="full" + object-cover — жаловались,
// что слишком огромно) — та же схема backdrop/container, что и в
// AnnouncementStoryModal (fixed-позиционированные крестик и стрелки вокруг
// центральной карточки произвольного размера).
export default function ImageLightboxModal({ items, activeIndex, setActiveIndex, triggerRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goNext = () => setActiveIndex((i) => Math.min(items.length - 1, i + 1));

  // Стрелки ← → клавиатуры листают так же, как кнопки-стрелки (раньше
  // работал только клик по ним) — слушаем только пока модалка открыта,
  // иначе стрелки перехватывали бы клавиатуру и вне просмотра.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const current = items[activeIndex];
  if (!current) return null;

  return (
    <Modal onOpenChange={setIsOpen}>
      <Modal.Trigger ref={triggerRef} className="sr-only" aria-hidden />
      <Modal.Backdrop className="!overflow-visible bg-black/80">
        <Modal.Container placement="center" scroll="outside">
          <Modal.CloseTrigger className="fixed right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <CloseIcon />
          </Modal.CloseTrigger>

          {activeIndex > 0 && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Предыдущее объявление"
              className="fixed left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
            >
              <ChevronIcon direction="left" />
            </button>
          )}
          {activeIndex < items.length - 1 && (
            <button
              type="button"
              onClick={goNext}
              aria-label="Следующее объявление"
              className="fixed right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
            >
              <ChevronIcon direction="right" />
            </button>
          )}

          <Modal.Dialog className="w-auto max-w-none overflow-visible bg-transparent p-0 shadow-none">
            <Modal.Body className="overflow-hidden rounded-2xl bg-black p-0 shadow-2xl">
              <img src={current.imageUrl} alt={current.title} className="block max-h-[80vh] max-w-[90vw] object-contain" />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
