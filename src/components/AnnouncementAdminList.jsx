import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
const DragHandleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="9" cy="6" r="1.3" fill="currentColor" />
    <circle cx="15" cy="6" r="1.3" fill="currentColor" />
    <circle cx="9" cy="12" r="1.3" fill="currentColor" />
    <circle cx="15" cy="12" r="1.3" fill="currentColor" />
    <circle cx="9" cy="18" r="1.3" fill="currentColor" />
    <circle cx="15" cy="18" r="1.3" fill="currentColor" />
  </svg>
);

const formatExpiry = (expiresAt) => {
  if (!expiresAt) return "бессрочно";
  return `до ${new Date(expiresAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
};

// Строка в панели управления — перетаскивание через @dnd-kit/sortable: при
// перетягивании одной карточки на другую та плавно уступает место (анимация
// сдвига — встроенное поведение verticalListSortingStrategy, см. рендер
// ниже), а не резко перескакивает.
function SortableAnnouncementRow({ item, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg bg-white p-1">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Перетащить для изменения порядка"
        className="grid h-8 w-8 shrink-0 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing"
      >
        <DragHandleIcon />
      </button>
      <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">{item.title}</p>
        <p className="text-xs text-muted">{formatExpiry(item.expiresAt)}</p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(item)}
        aria-label="Редактировать"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-maroon"
      >
        <EditIcon />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item._id)}
        aria-label="Удалить"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-maroon"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// Компактный список объявлений с перетаскиванием для изменения порядка —
// общий для панели управления и на главной (было — см. Announcements.jsx),
// и на странице /announcements (см. AnnouncementsPage.jsx), где карточки
// вдобавок можно перетаскивать и прямо в основной раскладке, а этот список —
// второй, равноправный способ поменять порядок теми же данными (order на
// сервере общий).
export default function AnnouncementAdminList({ items, onEdit, onDelete, onReorder }) {
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i._id === active.id);
    const newIndex = items.findIndex((i) => i._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex).map((i) => i._id));
  };

  if (!items.length) return null;

  return (
    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i._id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <SortableAnnouncementRow key={item._id} item={item} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
