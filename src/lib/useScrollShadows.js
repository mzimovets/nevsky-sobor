import { useRef, useState } from "react";

// Тень сверху/снизу для прокручиваемого блока (например Modal.Body) — общая
// логика, вынесенная из DaySchedule.jsx (см. bottomShadow/popupTopShadow там):
// MutationObserver нужен потому, что смена содержимого (например открытие
// календаря в форме) меняет scrollHeight, но само по себе не стреляет
// событием scroll.
export function useScrollShadows() {
  const bodyRef = useRef(null);
  const observerRef = useRef(null);
  const [topShadow, setTopShadow] = useState(false);
  const [bottomShadow, setBottomShadow] = useState(false);

  const update = () => {
    const el = bodyRef.current;
    if (!el) return;
    setTopShadow(el.scrollTop > 4);
    setBottomShadow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };

  const refCallback = (el) => {
    bodyRef.current = el;
    observerRef.current?.disconnect();
    if (!el) return;
    update();
    observerRef.current = new MutationObserver(update);
    observerRef.current.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
  };

  return { bodyRef, topShadow, bottomShadow, update, refCallback };
}
