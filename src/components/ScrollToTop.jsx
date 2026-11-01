import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// При переходе на другую страницу (например, с карточки дня на /day/дата) —
// сразу в самый верх, мгновенно, а не с позиции прошлой страницы.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
