import { useEffect, useState } from "react";

// День церковного календаря с Азбуки (святые, неделя, пост, чтения с текстом) —
// собирается и кэшируется на сервере, см. /api/day-info в server/index.js.
export function useDayInfo(date) {
  const [state, setState] = useState({ loading: true, error: null, info: null });
  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, info: null });
    fetch(`/api/day-info?date=${encodeURIComponent(date)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Церковный календарь недоступен");
        return res.json();
      })
      .then((info) => !cancelled && setState({ loading: false, error: null, info }))
      .catch((err) => !cancelled && setState({ loading: false, error: err.message, info: null }));
    return () => {
      cancelled = true;
    };
  }, [date]);
  return state;
}
