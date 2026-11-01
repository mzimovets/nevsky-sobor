import { useEffect, useRef, useState } from "react";
import { fetchSchedule } from "./api.js";

const POLL_MS = 20000;

// Как поллинг в a_nevsky_react/ButtonSave.jsx: раз в 20с (и сразу при
// возврате на вкладку/фокусе) тихо проверяем /api/schedule; применяем
// новые данные, только если updatedAt действительно новее.
// Последнее полученное расписание помним и в памяти, и в localStorage: при
// переходе между страницами и после перезагрузки лента дней и расписание
// появляются сразу, а свежее подтягивается тихо в фоне.
const STORE_KEY = "sobor:schedule";
let memo = null;
const readStored = () => {
  if (memo) return memo;
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (raw?.days?.length) memo = { loading: false, error: null, days: raw.days, fontSize: raw.fontSize || "17px", stale: false, updatedAt: raw.updatedAt || 0 };
  } catch {
    /* без сохранённого */
  }
  return memo;
};
const remember = (st, updatedAt) => {
  memo = { ...st, updatedAt };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ days: st.days, fontSize: st.fontSize, updatedAt }));
  } catch {
    /* переполнено или запрещено */
  }
};

export function useLiveSchedule() {
  const [state, setState] = useState(() => {
    const m = readStored();
    return m ? { loading: false, error: null, days: m.days, fontSize: m.fontSize, stale: false } : { loading: true, error: null, days: [], fontSize: "17px", stale: false };
  });
  const updatedAtRef = useRef(readStored()?.updatedAt || 0);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      fetchSchedule()
        .then((doc) => {
          if (cancelled) return;
          const updatedAt = doc?.updatedAt || 0;
          if (updatedAt && updatedAt <= updatedAtRef.current) return;
          updatedAtRef.current = updatedAt || updatedAtRef.current;
          const next = {
            loading: false,
            error: null,
            days: doc?.data || [],
            fontSize: doc?.meta?.fontSize || "17px",
            stale: !!doc?.stale,
          };
          if (next.days.length) remember(next, updatedAt);
          setState(next);
        })
        .catch((err) => {
          if (cancelled) return;
          setState((prev) =>
            prev.days.length ? prev : { loading: false, error: err.message, days: [], fontSize: "17px", stale: false }
          );
        });
    };

    tick();
    const interval = setInterval(tick, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, []);

  return state;
}
