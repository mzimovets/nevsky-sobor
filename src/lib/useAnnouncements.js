import { useCallback, useEffect, useState } from "react";

// Объявления — как и остальные редакторы в проекте (расписание в
// a_nevsky_react, выбор иконки дня в DaySchedule.jsx), без авторизации:
// админка открыта прямо на странице, отдельного логина нет.
// all=true — режим админки: видны и уже просроченные (expiresAt в
// прошлом) объявления, чтобы их можно было продлить или удалить; без него
// (публичная лента/страница со всеми объявлениями) сервер сам отфильтрует
// просроченные.
export function useAnnouncements({ all = false } = {}) {
  const [state, setState] = useState({ loading: true, error: null, items: [] });

  const reload = useCallback(() => {
    fetch(`/api/announcements${all ? "?all=1" : ""}`)
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить объявления");
        return res.json();
      })
      .then((items) => setState({ loading: false, error: null, items: items || [] }))
      .catch((err) => setState({ loading: false, error: err.message, items: [] }));
  }, [all]);

  useEffect(() => {
    reload();
  }, [reload]);

  // expiresAt: число (мс) — показывать до этого момента; null — бессрочно.
  const create = useCallback(
    async ({ title, imageUrl, expiresAt = null }) => {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, imageUrl, expiresAt }),
      });
      if (!res.ok) throw new Error("Не удалось создать объявление");
      reload();
    },
    [reload]
  );

  const update = useCallback(
    async (id, { title, imageUrl, expiresAt }) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, imageUrl, expiresAt }),
      });
      if (!res.ok) throw new Error("Не удалось сохранить объявление");
      reload();
    },
    [reload]
  );

  const remove = useCallback(
    async (id) => {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить объявление");
      reload();
    },
    [reload]
  );

  const upload = useCallback(async (file) => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/announcements/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Не удалось загрузить картинку");
    const data = await res.json();
    return data.url;
  }, []);

  // ids — весь список в новом порядке (после перетаскивания в админке);
  // применяем оптимистично в state сразу, не дожидаясь ответа сервера, —
  // перетаскивание должно ощущаться мгновенным.
  const reorder = useCallback((ids) => {
    setState((prev) => {
      const byId = new Map(prev.items.map((item) => [item._id, item]));
      const reordered = ids.map((id) => byId.get(id)).filter(Boolean);
      return { ...prev, items: reordered };
    });
    fetch("/api/announcements/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  }, []);

  return { ...state, reload, create, update, remove, upload, reorder };
}
