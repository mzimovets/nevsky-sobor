import { useEffect, useState } from "react";

// День церковного календаря с Азбуки (святые, неделя, пост, чтения с текстом) —
// собирается и кэшируется на сервере, см. /api/day-info в server/index.js.
//
// На клиенте: кэш по датам в памяти + тихая предзагрузка соседних дней, а пока
// новый день грузится, остаётся содержимое предыдущего (pending) — иначе
// страница схлопывалась до «Загрузка…» и подпрыгивала при каждом переключении.
const cache = new Map();

const load = (date) =>
  fetch(`/api/day-info?date=${encodeURIComponent(date)}`).then((res) => {
    if (!res.ok) throw new Error("Церковный календарь недоступен");
    return res.json();
  });

const shiftISO = (iso, delta) => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(y, m - 1, d + delta);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

const prefetch = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || cache.has(date)) return;
  load(date).then((info) => cache.set(date, info)).catch(() => {});
};

export function useDayInfo(date) {
  const [state, setState] = useState(() =>
    cache.has(date) ? { loading: false, pending: false, error: null, info: cache.get(date) } : { loading: true, pending: false, error: null, info: null }
  );
  useEffect(() => {
    let cancelled = false;
    if (cache.has(date)) {
      setState({ loading: false, pending: false, error: null, info: cache.get(date) });
    } else {
      // прошлое содержимое остаётся на экране, пока грузится новое
      setState((s) => (s.info ? { ...s, loading: false, pending: true, error: null } : { loading: true, pending: false, error: null, info: null }));
      load(date)
        .then((info) => {
          cache.set(date, info);
          if (!cancelled) setState({ loading: false, pending: false, error: null, info });
        })
        .catch((err) => !cancelled && setState({ loading: false, pending: false, error: err.message, info: null }));
    }
    prefetch(shiftISO(date, -1));
    prefetch(shiftISO(date, 1));
    return () => {
      cancelled = true;
    };
  }, [date]);
  return state;
}
