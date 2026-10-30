import { useEffect, useRef, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAnnouncements } from "../lib/useAnnouncements.js";
import ImageLightboxModal from "../components/ImageLightboxModal.jsx";
import AnnouncementFormModal from "../components/AnnouncementFormModal.jsx";
import AnnouncementAdminList from "../components/AnnouncementAdminList.jsx";

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const GAP_X = 24; // соответствует прежнему gap-x-6
const GAP_Y = 12; // соответствует прежнему gap-y-3

const getColumnCount = () => {
  if (typeof window === "undefined") return 1;
  if (window.innerWidth >= 768) return 3;
  if (window.innerWidth >= 640) return 2;
  return 1;
};

// Раскладка — «каменная кладка», посчитанная в JS, но БЕЗ выбора «в самую
// короткую колонку» (так делают Pinterest/react-masonry-css) — при таком
// выборе позиция карточки зависит от высоты ЧУЖИХ карточек над ней, и при
// изменении контента (или просто на разных экранах, где высоты чуть иные)
// карточки внешне «скачут» не в том порядке, в каком стоят в данных (жалоба
// пользователя — см. историю правок файла). Здесь колонка карточки — это
// просто её позиция по порядку (index % columns): 1-я карточка в колонку 0,
// 2-я в 1, 3-я в 2 (при трёх колонках), 4-я снова в 0 и т.д., т.е. строго
// слева направо построчно, как и в обычном CSS grid. Отличие от обычного
// grid — высота каждой колонки копится НЕЗАВИСИМО (это и есть масонри), а
// не по самой высокой карточке в «строке», поэтому под короткой карточкой
// нет зазора: следующая карточка в этой же колонке встаёт сразу под ней.
function useMasonryLayout(items, containerRef) {
  const [columns, setColumns] = useState(getColumnCount);
  const [containerWidth, setContainerWidth] = useState(0);
  const [heights, setHeights] = useState({}); // id -> px

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
      setColumns(getColumnCount());
    });
    ro.observe(el);
    return () => ro.disconnect();
    // containerRef сам по себе не меняется между рендерами (это объект),
    // поэтому без items.length в зависимостях эффект выполнился бы один раз
    // при монтировании — а в тот момент, пока объявления ещё не загрузились
    // (items=[]), контейнер ещё не отрендерен (см. JSX ниже) и
    // containerRef.current равен null; ResizeObserver на несуществующий узел
    // не подключался бы вообще, и раскладка так и осталась бы нулевой.
    // items.length здесь — сигнал «контейнер только что появился в DOM,
    // подключись заново».
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0]);

  const setHeight = (id, height) => {
    setHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }));
  };

  const columnWidth = columns > 0 ? (containerWidth - GAP_X * (columns - 1)) / columns : 0;

  const positions = {};
  const colHeights = new Array(columns).fill(0);
  if (columnWidth > 0) {
    items.forEach((item, i) => {
      const col = i % columns;
      const top = colHeights[col];
      const left = col * (columnWidth + GAP_X);
      positions[item._id] = { left, top, width: columnWidth };
      const h = heights[item._id] ?? columnWidth; // пока высота не измерена — примерно квадрат, чтобы не съезжало слишком сильно
      colHeights[col] = top + h + GAP_Y;
    });
  }
  const containerHeight = Math.max(0, ...colHeights) - (items.length ? GAP_Y : 0);

  return { positions, containerHeight, columnWidth, setHeight };
}

// Карточка объявления — целиком перетаскиваемая (useSortable вешается на
// сам корневой div, без отдельной «ручки»): клику по картинке/кнопкам это
// не мешает — dnd-kit различает клик и перетаскивание по activationConstraint
// (см. dndSensors ниже — сортировка стартует только после сдвига на 4px,
// обычный тап/клик через этот порог не проходит и доходит до onClick как
// обычно). Позиция (left/top/width) приходит сверху из useMasonryLayout —
// карточка абсолютно спозиционирована, transform от dnd-kit накладывается
// поверх на время перетаскивания.
function SortableAnnouncementCard({ item, index, position, onMeasure, onOpen, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._id });
  const cardRef = useRef(null);
  const setRefs = (el) => {
    setNodeRef(el);
    cardRef.current = el;
  };

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => onMeasure(item._id, entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item._id]);

  const style = {
    position: "absolute",
    left: position.left,
    top: position.top,
    width: position.width,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      className="group cursor-grab touch-none active:cursor-grabbing"
    >
      <button type="button" onClick={() => onOpen(index)} className="block w-full">
        <img src={item.imageUrl} alt={item.title} className="block w-full rounded-2xl" />
      </button>

      <div className="pointer-events-none absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          aria-label="Редактировать"
          className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-white/90 text-muted shadow-sm hover:text-maroon"
        >
          <EditIcon />
        </button>
        <button
          type="button"
          onClick={(e) => onDelete(item._id, e)}
          aria-label="Удалить"
          className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-white/90 text-muted shadow-sm hover:text-maroon"
        >
          <TrashIcon />
        </button>
      </div>

      <p className="pt-2 text-sm text-ink">{item.title}</p>
    </div>
  );
}

// Страница «Все объявления» (переход по клику на заголовок «Объявления» на
// главной, см. Announcements.jsx) — здесь они НЕ в виде «историй»
// (фиксированный вырезанный 9:16 прямоугольник), а просто своими
// картинками в естественных пропорциях. Раскладка — «каменная кладка» с
// фиксированной по порядку колонкой (см. useMasonryLayout выше): карточки
// естественной высоты без обрезки, без пустот под короткими карточками, и
// при этом порядок карточек всегда буквально совпадает с порядком items
// (полем order на сервере, общим с лентой «историй» на главной,
// Announcements.jsx) — новая карточка всегда достраивается в конец текущей
// раскладки, а не занимает место уже стоящих и не зависит от чужих высот.
// Подпись — под картинкой, а не поверх неё. Редактировать/удалить можно
// прямо тут (иконки поверх картинки, на десктопе — по наведению, на
// телефоне — всегда, как и в остальных местах сайта, см. DaySchedule.jsx).
// Перетаскивание — сама карточка целиком (см. SortableAnnouncementCard), а
// не отдельная ручка. Клик по картинке открывает её ПРОСТО как картинку
// (ImageLightboxModal — без рамки-«истории», полосы прогресса и
// автолистания, в естественных пропорциях), не тем компонентом-«историей»,
// что на главной (AnnouncementStoryModal) — здесь это не нужно.
//
// Управление (раньше жило на главной, см. историю Announcements.jsx) —
// целиком здесь: кнопка «Управление» разворачивает компактный список
// (AnnouncementAdminList, общий с прежней главной) — второй, равноправный
// способ поменять порядок теми же данными, что и перетаскивание карточек
// выше; оба пишут в то же поле order на сервере, поэтому не конфликтуют.
export default function AnnouncementsPage() {
  const { loading, items, create, update, remove, upload, reorder } = useAnnouncements({ all: true });
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef(null);

  const [editingItem, setEditingItem] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const formTriggerRef = useRef(null);
  const [listError, setListError] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  const containerRef = useRef(null);
  const { positions, containerHeight, columnWidth, setHeight } = useMasonryLayout(items, containerRef);

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i._id === active.id);
    const newIndex = items.findIndex((i) => i._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorder(arrayMove(items, oldIndex, newIndex).map((i) => i._id));
  };

  const openAt = (index) => {
    setActiveIndex(index);
    requestAnimationFrame(() => triggerRef.current?.click());
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormKey((k) => k + 1);
    requestAnimationFrame(() => formTriggerRef.current?.click());
  };
  const openEditModal = (item) => {
    setEditingItem(item);
    setFormKey((k) => k + 1);
    requestAnimationFrame(() => formTriggerRef.current?.click());
  };

  const handleFormSubmit = async ({ title, file, expiresAt }) => {
    const imageUrl = await upload(file);
    if (editingItem) await update(editingItem._id, { title, imageUrl, expiresAt });
    else await create({ title, imageUrl, expiresAt });
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await remove(id).catch((err) => setListError(err.message));
  };

  // Удаление из компактного списка управления — без stopPropagation, там нет
  // клика по карточке под кнопкой, который нужно было бы гасить.
  const handleDeleteFromList = async (id) => {
    await remove(id).catch((err) => setListError(err.message));
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl text-maroon">Объявления</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdminOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-maroon/30 bg-white/60 px-3 py-2 text-sm text-maroon transition-colors hover:bg-white"
          >
            <EditIcon />
            Управление
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1 rounded-full bg-maroon px-4 py-2 text-sm text-white transition-colors hover:bg-maroon-dark"
          >
            <PlusIcon /> Добавить
          </button>
        </div>
      </div>

      {adminOpen && (
        <div className="mb-6 rounded-2xl border border-maroon/20 bg-white/70 p-4">
          {listError && <p className="mb-2 text-xs text-maroon">{listError}</p>}
          {items.length === 0 ? (
            <p className="text-sm text-muted">Объявлений пока нет.</p>
          ) : (
            <AnnouncementAdminList items={items} onEdit={openEditModal} onDelete={handleDeleteFromList} onReorder={reorder} />
          )}
        </div>
      )}

      {!adminOpen && listError && <p className="mb-4 text-sm text-maroon">{listError}</p>}
      {loading && <p className="text-center text-muted">Загрузка…</p>}
      {!loading && items.length === 0 && <p className="text-center text-muted">Объявлений пока нет.</p>}

      {items.length > 0 && (
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i._id)} strategy={rectSortingStrategy}>
            <div ref={containerRef} className="relative" style={{ height: containerHeight }}>
              {columnWidth > 0 &&
                items.map((item, index) => (
                  <SortableAnnouncementCard
                    key={item._id}
                    item={item}
                    index={index}
                    position={positions[item._id]}
                    onMeasure={setHeight}
                    onOpen={openAt}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {items.length > 0 && (
        <ImageLightboxModal items={items} activeIndex={activeIndex} setActiveIndex={setActiveIndex} triggerRef={triggerRef} />
      )}

      <AnnouncementFormModal key={formKey} triggerRef={formTriggerRef} editingItem={editingItem} onSubmit={handleFormSubmit} />
    </section>
  );
}
