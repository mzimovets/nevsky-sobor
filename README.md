# Собор — сайт прихода

Стек: Vite + React 19 + HeroUI v3 + Tailwind v4 на фронте, Express + NeDB на бэке.
Дизайн (шрифты, цвета) взят с [petrkhimki.ru](https://petrkhimki.ru) — референс, с
разрешения владельца собора.

## Разработка

```bash
npm install
npm run server   # Express на :4500 (отдельный терминал)
npm run dev      # Vite dev-сервер на :3100, проксирует /api на :4500
```

## Расписание

Главная и страница «Расписание» берут данные с публичного сайта-редактора
[schedule.nevsky-sobor.ru](https://schedule.nevsky-sobor.ru) (`GET /schedule`,
формат: массив дней с `heading`/`prayerTimes`/`saintsOfDay` как HTML-строками
из редактора; тот же формат отдаёт локальный сервер [a_nevsky_react](../a_nevsky_react)).
Наш сервер проксирует и кэширует их в NeDB (`server/database.db`): если
источник недоступен, отдаётся последняя сохранённая копия, а не ошибка.

Адрес источника — `SCHEDULE_SOURCE_URL` (по умолчанию
`https://schedule.nevsky-sobor.ru/schedule`; для локальной разработки против
своего a_nevsky_react — `http://localhost:4400/schedule`).

**Живое обновление:** фронт поллит `/api/schedule` раз в 20с (и сразу при
возврате на вкладку/фокусе) и применяет новые данные без перезагрузки — как
в самом редакторе (`useLiveSchedule.js`, см. `ButtonSave.jsx` в a_nevsky_react).
Сервер коалесцирует параллельные запросы (не чаще раза в 8с к апстриму), чтобы
несколько открытых вкладок не долбили источник.

**Страница `/raspisanie`** рендерит расписание как постер — 1:1 копия
экспорта с schedule.nevsky-sobor.ru (`src/components/Poster.jsx`): та же
фоновая картинка с рамкой (`public/poster/background.png`) и те же шрифты
(Pompadur/Izhitsa, Font/STIXGeneral), скопированные из a_nevsky_react.
Постер имеет фиксированный размер 911×1288 и масштабируется под ширину
экрана через CSS `transform: scale()` (`PosterScaled.jsx`) — как в
мобильном превью самого редактора.

## Шрифты

- **Arsenal** — из Google Fonts (подключён в `index.html`).
- **Slovic** — демо-версия платного шрифта, файлы скопированы с
  petrkhimki.ru в `public/fonts/slovic/`. Владелец разрешил ориентироваться
  на дизайн его сайта; если понадобится лицензионная копия шрифта или замена
  на другой — файлы и `@font-face` в `src/styles/theme.css` лежат в одном месте.

## Что сделано (MVP)

- Главная: хиро-блок + 3 ближайших дня расписания
- /raspisanie: полное расписание

## Дальше по референсу (не реализовано)

О храме, Записки (заказ треб), Воскресная школа, Объявления, Новости.
