import { useCallback, useEffect, useState } from "react";

// Новости — как и объявления (useAnnouncements.js), без авторизации: весь
// список сразу (сервер уже сортирует по publishedAt по убыванию), фильтр/
// поиск/пагинация «показать ещё» — на клиенте (см. NewsPage.jsx). Порядка-
// перетаскивания нет (сортировка всегда по дате) — нет и reorder().
export function useNews() {
  const [state, setState] = useState({ loading: true, error: null, items: [] });

  const reload = useCallback(() => {
    fetch("/api/news")
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить новости");
        return res.json();
      })
      .then((items) => setState({ loading: false, error: null, items: items || [] }))
      .catch((err) => setState({ loading: false, error: err.message, items: [] }));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Возвращает созданный документ (с _id) — страница /news после «Добавить»
  // сразу переходит в его статью (см. handleCreate в NewsPage.jsx), а не
  // просто обновляет список на месте.
  const create = useCallback(async ({ title, body = "", imageUrl = null, category = null, publishedAt }) => {
    const res = await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, imageUrl, category, publishedAt }),
    });
    if (!res.ok) throw new Error("Не удалось создать новость");
    return res.json();
  }, []);

  const remove = useCallback(
    async (id) => {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить новость");
      reload();
    },
    [reload]
  );

  const upload = useCallback(async (file) => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/news/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Не удалось загрузить картинку");
    const data = await res.json();
    return data.url;
  }, []);

  return { ...state, reload, create, remove, upload };
}

// Одна новость по id — страница статьи (NewsArticlePage.jsx): грузит сама
// себя напрямую (GET /api/news/:id), не выбирает из общего списка — так
// работает и прямой переход по ссылке, до того как /api/news вообще
// запрашивался. update/remove/upload — те же операции, что и в useNews(),
// но уже сразу привязанные к этому id и с оптимистичным обновлением item
// в состоянии (без общего reload всего списка).
export function useNewsItem(id) {
  const [state, setState] = useState({ loading: true, error: null, item: null });

  const reload = useCallback(() => {
    if (!id) return;
    setState((prev) => ({ ...prev, loading: true }));
    fetch(`/api/news/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Новость не найдена" : "Не удалось загрузить новость");
        return res.json();
      })
      .then((item) => setState({ loading: false, error: null, item }))
      .catch((err) => setState({ loading: false, error: err.message, item: null }));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const update = useCallback(
    async (patch) => {
      const res = await fetch(`/api/news/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Не удалось сохранить новость");
      const doc = await res.json();
      setState({ loading: false, error: null, item: doc });
      return doc;
    },
    [id]
  );

  const remove = useCallback(async () => {
    const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Не удалось удалить новость");
  }, [id]);

  const upload = useCallback(async (file) => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/news/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Не удалось загрузить картинку");
    const data = await res.json();
    return data.url;
  }, []);

  // Счётчик просмотров — раз за вкладку на новость (sessionStorage-отметка),
  // чтобы автор, который зашёл проверить свежую публикацию и обновляет
  // страницу или листает вкладки туда-сюда, не накручивал себе цифру.
  const incrementView = useCallback(() => {
    if (!id) return;
    const key = `news-viewed:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/news/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id]);

  return { ...state, reload, update, remove, upload, incrementView };
}
