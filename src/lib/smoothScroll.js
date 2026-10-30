// Плавная прокрутка страницы к элементу по id: своя анимация (rAF) с мягким
// разгоном и торможением — нативный smooth у браузеров короткий и резкий.
// Длительность растёт с расстоянием. Пользователь может прервать колесом или
// касанием. При prefers-reduced-motion прокручивает сразу.
let current = null;

export function smoothScrollToId(id, { offset = 24 } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const target = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, target);
    return;
  }
  if (current) cancelAnimationFrame(current.id);
  const from = window.scrollY;
  const dist = target - from;
  if (Math.abs(dist) < 2) return;
  const duration = Math.min(1800, 800 + Math.abs(dist) * 0.3);
  const t0 = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const stop = () => {
    if (current) cancelAnimationFrame(current.id);
    current = null;
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
  };
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, from + dist * ease(t));
    if (t < 1) current = { id: requestAnimationFrame(step) };
    else stop();
  };
  current = { id: requestAnimationFrame(step) };
}
