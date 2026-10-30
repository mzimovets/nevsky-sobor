import { useEffect, useRef, useState } from "react";
import { fetchSchedule } from "./api.js";

const POLL_MS = 20000;

// Как поллинг в a_nevsky_react/ButtonSave.jsx: раз в 20с (и сразу при
// возврате на вкладку/фокусе) тихо проверяем /api/schedule; применяем
// новые данные, только если updatedAt действительно новее.
export function useLiveSchedule() {
  const [state, setState] = useState({ loading: true, error: null, days: [], fontSize: "17px", stale: false });
  const updatedAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      fetchSchedule()
        .then((doc) => {
          if (cancelled) return;
          const updatedAt = doc?.updatedAt || 0;
          if (updatedAt && updatedAt <= updatedAtRef.current) return;
          updatedAtRef.current = updatedAt || updatedAtRef.current;
          setState({
            loading: false,
            error: null,
            days: doc?.data || [],
            fontSize: doc?.meta?.fontSize || "17px",
            stale: !!doc?.stale,
          });
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
