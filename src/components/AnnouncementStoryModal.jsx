import { useEffect, useRef, useState } from "react";
import { Modal, useOverlayState } from "@heroui/react";

const STORY_MS = 5000;
// Общая высота-рамка для пиков соседних историй (объекты разных пропорций
// внутри — object-cover, см. ниже) — держится в vh, чтобы расти вместе с
// экраном так же, как и открытая история.
const PEEK_CLASS = "hidden aspect-[9/16] shrink-0 sm:block sm:h-[58vh] sm:max-h-[560px]";

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// Раскрытая история — крупная карточка ровно по центру экрана (см. Dialog
// ниже: пики соседних историй слева/справа занимают одинаковое место —
// PEEK_CLASS — даже когда одного из них нет, это просто пустой div той же
// ширины, иначе при отсутствии, скажем, «предыдущей» карточка съезжала бы
// от центра). Картинка — в своих собственных пропорциях, без обрезки (не
// object-cover — max-h/max-w у самой картинки, а не жёсткий 9:16 бокс),
// скруглённые углы даёт overflow-hidden на обёртке, которая под картинку и
// подстраивается. Сверху — ОДНА полоса прогресса на всю ширину (не по
// сегменту на объявление — так было раньше, но с несколькими объявлениями
// сегменты становились слишком тонкими и нечитаемыми): она просто
// сбрасывается в 0% при переходе к следующей истории и снова наполняется
// до 100% за STORY_MS. Прогресс ведётся вручную через requestAnimationFrame
// (а не одной CSS-анимацией), чтобы можно было поставить на паузу нажатием
// и удержанием по истории — держим накопленное время в ref и просто не
// прибавляем его, пока paused; полоска и автолистание с точки паузы
// продолжаются, а не начинаются заново. Пока держат палец/курсор — полоса
// ещё и визуально прячется (holding), чтобы не отвлекала, и проявляется
// обратно при отпускании, с той же шириной, на которой остановилась.
//
// Ширина полосы выставляется ТОЛЬКО императивно, через ref (не через
// style-проп в JSX) — при обычном style={{width: ...}} React видит одно и
// то же объявленное значение «0%» что до, что после того, как прогресс
// потикал (он идёт мимо этого пропа, напрямую в DOM), и при возврате назад
// не перерисовывает узел, оставляя старую, уже накрученную ширину. Явный
// resetProgress() жёстко проставляет ширину в 0% — и при смене activeIndex,
// и при повторном открытии модалки.
//
// Переключение — с анимацией: карточка перемонтируется по key={item._id} и
// получает CSS-класс entrance-анимации (story-in-right/story-in-left,
// theme.css) — направление зависит от того, что нажали.
export default function AnnouncementStoryModal({ items, activeIndex, setActiveIndex, triggerRef, onOpenChange }) {
  const modalOpenRef = useRef(false);
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef(null);
  const rafRef = useRef(null);
  const progressRef = useRef(null);
  const directionRef = useRef("next");
  const [holding, setHolding] = useState(false);
  // useOverlayState вместо неконтролируемого Modal — чтобы можно было
  // ЗАКРЫТЬ модалку программно (overlayState.close()), когда последняя
  // история доигрывается до конца. Обычный ref.click() по CloseTrigger тут
  // не работает: React Aria обрабатывает press по реальным pointer-событиям.
  const overlayState = useOverlayState({ onOpenChange: (open) => handleOpenChange(open) });

  const goTo = (index, direction) => {
    const next = Math.max(0, Math.min(items.length - 1, index));
    if (next === activeIndex) return;
    directionRef.current = direction;
    setActiveIndex(next);
  };
  const goPrev = () => goTo(activeIndex - 1, "prev");
  const goNext = () => goTo(activeIndex + 1, "next");

  const resetProgress = () => {
    elapsedRef.current = 0;
    lastTsRef.current = null;
    if (progressRef.current) progressRef.current.style.width = "0%";
  };

  // Новая история — прогресс с нуля.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(resetProgress, [activeIndex]);

  useEffect(() => {
    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick);
      if (!modalOpenRef.current || pausedRef.current) {
        lastTsRef.current = ts;
        return;
      }
      if (lastTsRef.current == null) lastTsRef.current = ts;
      elapsedRef.current += ts - lastTsRef.current;
      lastTsRef.current = ts;
      const pct = Math.min(100, (elapsedRef.current / STORY_MS) * 100);
      if (progressRef.current) progressRef.current.style.width = `${pct}%`;
      if (elapsedRef.current >= STORY_MS) {
        if (activeIndex < items.length - 1) goNext();
        else {
          // Последняя история досмотрена до конца — закрываем модалку сами.
          pausedRef.current = true;
          overlayState.close();
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items.length]);

  const handleOpenChange = (open) => {
    const wasOpen = modalOpenRef.current;
    modalOpenRef.current = open;
    // Переоткрыли на той же истории (activeIndex не менялся, значит эффект
    // выше не сработает сам) — сбрасываем полосу и здесь тоже.
    if (open && !wasOpen) {
      pausedRef.current = false;
      resetProgress();
    }
    onOpenChange?.(open);
  };

  const pause = () => {
    pausedRef.current = true;
    setHolding(true);
  };
  const resume = () => {
    pausedRef.current = false;
    setHolding(false);
  };

  const current = items[activeIndex];
  if (!current) return null;
  const prevItem = items[activeIndex - 1];
  const nextItem = items[activeIndex + 1];

  return (
    <Modal state={overlayState}>
      <Modal.Trigger ref={triggerRef} className="sr-only" aria-hidden />
      {/* bg-black/80 явно — тёмная, но не глухая подложка: главная страница
          за ней должна немного просвечивать, а не скрываться наглухо (как в
          ImageLightboxModal, где это, наоборот, не нужно).
          !overflow-visible (важно, с «!») — HeroUI сам вешает на backdrop
          overflow-y:auto, как только у Container указан scroll="outside"
          (см. ниже), через правило `.modal__backdrop:has(.modal__container--scroll-outside)`
          — а это как раз и обрезает тень карточки понизу, стоит её высоте
          приблизиться к высоте экрана (тот же эффект, что раньше давал
          overflow-clip на самом modal__dialog, только источник сместился на
          уровень выше). Обычный `overflow-visible` без `!` проигрывает этому
          правилу по специфичности (у него :has() + класс). */}
      <Modal.Backdrop className="!overflow-visible bg-black/80">
        {/* placement="center" явно — по умолчанию (auto) HeroUI на узких
            экранах уводит модалку вниз, как bottom sheet, а тут это должна
            быть карточка по центру экрана в любом размере вьюпорта.
            scroll="outside" — иначе modal__dialog получает overflow-clip
            (режим по умолчанию, scroll-inside) и обрезает по своей же
            рамке тень карточки (box-shadow). */}
        <Modal.Container placement="center" scroll="outside">
          {/* Крестик закрытия — не на самой карточке (там был раньше), а
              фиксированно в правом верхнем углу ЭКРАНА: так он не зависит от
              размера/положения карточки и не перекрывает картинку. */}
          <button
            type="button"
            onClick={() => overlayState.close()}
            aria-label="Закрыть"
            className="pointer-events-auto fixed right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-[#d4574a]/50 !bg-white !text-[#9b2316] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-[background-color,color,transform,border-color] duration-300 hover:!border-transparent hover:!bg-[#d4574a] hover:!text-white active:scale-95 sm:right-8 sm:top-6"
          >
            <CloseIcon />
          </button>

          {/* Dialog теперь не сама карточка, а строка из трёх: слева —
              маленький превью-пик предыдущей истории (если есть), по центру —
              открытая история, справа — пик следующей (если есть), как в
              Instagram. max-w-none/bg-transparent/shadow-none/p-0 гасят
              стандартные ограничения modal__dialog (max-w-sm и т.п.) — сама
              рамка (rounded-3xl bg-black) теперь только на центральной
              карточке, а не на всём dialog. */}
          <Modal.Dialog className="w-auto max-w-none flex-row items-center justify-center gap-4 overflow-visible bg-transparent p-0 shadow-none">
            {/* Слот пика ВСЕГДА занимает место (PEEK_CLASS), даже когда
                соседней истории нет, — иначе с одной стороной пустой центр
                съезжал бы от середины экрана. */}
            {/* Тень — на ВНЕШНЕМ элементе (button/Modal.Body, без
                overflow-hidden), скругление содержимого — на ВНУТРЕННЕМ
                (overflow-hidden). Раньше оба были на одном узле — в Safari
                сочетание overflow-hidden + box-shadow на одном элементе
                обрезает саму тень до острого прямоугольника (известный баг
                WebKit): тень получалась грубой, не повторяющей скруглённую
                форму карточки. */}
            {/* Пик — непрозрачный (alpha=1), просто блёклый: приглушаем
                brightness/saturate фильтром, а не opacity, иначе сквозь
                полупрозрачную картинку просвечивал бы тёмный фон подложки.
                При наведении фильтр снимается — картинка становится обычной. */}
            <div className={PEEK_CLASS}>
              {prevItem && (
                <button
                  type="button"
                  onClick={() => goTo(activeIndex - 1, "prev")}
                  aria-label="Предыдущее объявление"
                  className="block h-full w-full rounded-2xl shadow-md"
                >
                  <span className="block h-full w-full overflow-hidden rounded-2xl">
                    <img
                      src={prevItem.imageUrl}
                      alt=""
                      className="h-full w-full object-cover [filter:brightness(0.55)_saturate(0.7)] transition-[filter] duration-200 hover:[filter:none]"
                    />
                  </span>
                </button>
              )}
            </div>

            <Modal.Body
              key={current._id}
              className={`relative w-fit shrink-0 grow-0 basis-auto rounded-3xl bg-black p-0 shadow-2xl ${
                directionRef.current === "prev" ? "story-in-left" : "story-in-right"
              }`}
              onPointerDown={pause}
              onPointerUp={resume}
              onPointerCancel={resume}
              onPointerLeave={resume}
            >
              {/* Картинка в своих пропорциях — только max-h/max-w-ограничения
                  (не object-cover и без фиксированного бокса под неё), сама
                  задаёт размер обёртки (w-fit выше), rounded углы — за счёт
                  overflow-hidden на этой внутренней обёртке. */}
              <div className="relative overflow-hidden rounded-3xl">
                <img src={current.imageUrl} alt="" className="block max-h-[86vh] max-w-[92vw] sm:max-w-[min(56vw,720px)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40" aria-hidden />

                <div
                  className={`absolute inset-x-0 top-0 z-10 p-3 transition-opacity duration-150 ${holding ? "opacity-0" : "opacity-100"}`}
                >
                  <div className="h-1 overflow-hidden rounded-full bg-white/30">
                    <div ref={progressRef} className="h-full rounded-full bg-white" style={{ width: "0%" }} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Предыдущее объявление"
                  className="absolute inset-y-0 left-0 z-[5] w-1/3"
                />
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Следующее объявление"
                  className="absolute inset-y-0 right-0 z-[5] w-1/3"
                />
                <p className="rich-heading absolute inset-x-0 bottom-0 z-[1] px-5 pb-6 text-lg normal-case tracking-normal text-white drop-shadow">
                  {current.title}
                </p>
              </div>
            </Modal.Body>

            <div className={PEEK_CLASS}>
              {nextItem && (
                <button
                  type="button"
                  onClick={() => goTo(activeIndex + 1, "next")}
                  aria-label="Следующее объявление"
                  className="block h-full w-full rounded-2xl shadow-md"
                >
                  <span className="block h-full w-full overflow-hidden rounded-2xl">
                    <img
                      src={nextItem.imageUrl}
                      alt=""
                      className="h-full w-full object-cover [filter:brightness(0.55)_saturate(0.7)] transition-[filter] duration-200 hover:[filter:none]"
                    />
                  </span>
                </button>
              )}
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
