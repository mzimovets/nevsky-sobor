import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";

const BoldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
const ItalicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M10 4h8M6 20h8M14 4 10 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const UnderlineIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 4v7a6 6 0 0 0 12 0V4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 15l6-6M10 6l1.3-1.3a4 4 0 1 1 5.7 5.7L15.7 12M14 18l-1.3 1.3a4 4 0 1 1-5.7-5.7L8.3 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="9" cy="6" r="1.3" fill="currentColor" />
    <circle cx="15" cy="6" r="1.3" fill="currentColor" />
    <circle cx="9" cy="12" r="1.3" fill="currentColor" />
    <circle cx="15" cy="12" r="1.3" fill="currentColor" />
    <circle cx="9" cy="18" r="1.3" fill="currentColor" />
    <circle cx="15" cy="18" r="1.3" fill="currentColor" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const DuplicateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="8" y="8" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
    <path d="M4 16V5a1 1 0 0 1 1-1h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ArrowDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlignIcon = ({ side }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d={
        side === "left"
          ? "M4 6h16M4 12h10M4 18h13"
          : side === "right"
            ? "M4 6h16M10 12h10M7 18h13"
            : side === "center"
              ? "M4 6h16M7 12h10M5.5 18h13"
              : "M4 6h16M4 12h16M4 18h16"
      }
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const TEXT_COLORS = ["", "#532a27", "#a7715b", "#684128", "#b02e2e", "#1f6f43", "#1f5fa8"];

// Картинка с необязательной подписью, обтеканием текста и шириной —
// расширение стандартного @tiptap/extension-image. width — не обрезка
// (высота считается сама, картинка не кадрируется), а просто во сколько
// процентов ширины колонки она показывается; для left/right это ещё и
// ширина той половины, вокруг которой обтекает текст (см.
// .article-figure в theme.css).
const CaptionedImage = Image.extend({
  name: "captionedImage",
  addAttributes() {
    return {
      ...this.parent?.(),
      align: { default: "center" },
      width: { default: 100 },
      caption: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure.article-figure",
        priority: 60,
        getAttrs: (el) => {
          const img = el.querySelector("img");
          if (!img) return false;
          const figcaption = el.querySelector("figcaption");
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") || null,
            align: el.getAttribute("data-align") || "center",
            width: Number(el.getAttribute("data-width")) || 100,
            caption: figcaption ? figcaption.textContent : null,
          };
        },
      },
    ];
  },
  renderHTML({ node }) {
    const { src, alt, align, width, caption } = node.attrs;
    return [
      "figure",
      { class: "article-figure", "data-align": align || "center", "data-width": width || 100, style: `width:${width || 100}%` },
      ["img", { src, alt: alt || "" }],
      ...(caption ? [["figcaption", {}, caption]] : []),
    ];
  },
});

function ToolbarButton({ onClick, active, disabled, label, small, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid shrink-0 place-items-center rounded-md transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-30 ${
        small ? "h-7 w-7" : "h-8 w-8"
      } ${active ? "bg-maroon text-white hover:bg-maroon-dark" : "text-ink"}`}
    >
      {children}
    </button>
  );
}

// Пункты меню «/» — набор типов блока, как в Notion: набираешь «/», видишь
// подсказку, стрелками/мышью выбираешь, Enter/клик — вставляет. Список и
// фильтрация — см. SlashMenu ниже; сами действия просто дергают команды
// редактора (или открывают диалог выбора файла для картинки).
function buildSlashItems(openImagePicker) {
  return [
    { key: "text", title: "Текст", hint: "Обычный абзац", run: (e) => e.chain().focus().setParagraph().run() },
    { key: "h2", title: "Заголовок", hint: "Крупный подзаголовок", run: (e) => e.chain().focus().setNode("heading", { level: 2 }).run() },
    { key: "h3", title: "Подзаголовок", hint: "Поменьше", run: (e) => e.chain().focus().setNode("heading", { level: 3 }).run() },
    { key: "bullet", title: "Маркированный список", hint: "Список с точками", run: (e) => e.chain().focus().toggleBulletList().run() },
    { key: "ordered", title: "Нумерованный список", hint: "Список с цифрами", run: (e) => e.chain().focus().toggleOrderedList().run() },
    { key: "quote", title: "Цитата", hint: "Выделенный текст-врезка", run: (e) => e.chain().focus().toggleBlockquote().run() },
    { key: "divider", title: "Разделитель", hint: "Горизонтальная линия", run: (e) => e.chain().focus().setHorizontalRule().run() },
    { key: "image", title: "Картинка", hint: "Загрузить с компьютера", run: () => openImagePicker() },
  ];
}

function SlashMenu({ items, query, activeIndex, position, onPick }) {
  const filtered = items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));
  if (!filtered.length) return null;
  return (
    <div
      className="fixed z-30 w-64 overflow-hidden rounded-xl border border-line bg-white shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((item, i) => (
        <button
          key={item.key}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(item)}
          className={`flex w-full flex-col items-start px-3 py-2 text-left transition-colors ${
            i === Math.min(activeIndex, filtered.length - 1) ? "bg-cream" : "hover:bg-cream/60"
          }`}
        >
          <span className="text-sm text-ink">{item.title}</span>
          <span className="text-xs text-muted">{item.hint}</span>
        </button>
      ))}
    </div>
  );
}

// Полноценный блочный редактор в духе Notion: вместо фиксированного тулбара
// сверху (был раньше — «редактор из 2007») — набираешь «/» и выбираешь тип
// блока (SlashMenu), выделяешь текст — появляется плавающая панель
// форматирования (BubbleMenu из @tiptap/react), у каждого блока при
// наведении слева — «+» (новый блок под ним) и «⋮⋮» (дублировать/удалить/
// передвинуть — см. BlockGutter), у картинки при выделении — своя панель
// (обтекание/ширина/подпись/замена). content — начальный HTML, onChange —
// зовётся с editor.getHTML() при каждом изменении, uploadImage(file) —
// загрузка на сервер (см. useNews.js).
export default function RichTextEditor({ content, onChange, uploadImage }) {
  const fileInputRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const wrapRef = useRef(null);
  const [hoverBlock, setHoverBlock] = useState(null); // { top, height, el }
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);

  const [slash, setSlash] = useState(null); // { query, range, position, activeIndex }
  const slashRef = useRef(null);
  slashRef.current = slash;

  const slashItems = useMemo(() => buildSlashItems(() => fileInputRef.current?.click()), []);

  // useEditor с пустым списком deps создаёт Editor ОДИН раз и больше не
  // пересоздаёт (стандартное поведение @tiptap/react) — значит замыкания
  // внутри editorProps (handleKeyDown ниже) навсегда останутся с состоянием
  // первого рендера, если читать его напрямую. Поэтому текущее состояние
  // слеш-меню читаем только через slashRef (см. выше) — сам же editor
  // (стабильный объект) и slashItems (мемоизированы) трогать так можно,
  // они не «протухают».
  //
  // ArrowUp/ArrowDown/Enter/Escape над открытым меню перехватываем именно
  // тут, а не React-обработчиком onKeyDown на обёртке: ProseMirror вешает
  // свой обработчик клавиш прямо на contentEditable и получает событие
  // раньше React (который слушает делегированно на корне) — к моменту, когда
  // событие дошло бы до React, ProseMirror уже успел бы сам создать новый
  // абзац по Enter или сдвинуть курсор по стрелке. handleKeyDown — ровно тот
  // хук ProseMirror, что даёт перехватить событие ДО этого (true — «обработал
  // сам, дальше не пускать»).
  const handleEditorKeyDown = (view, event) => {
    const current = slashRef.current;
    if (!current) return false;
    const filtered = slashItems.filter((i) => i.title.toLowerCase().includes(current.query.toLowerCase()));
    if (!filtered.length) return false;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSlash((s) => s && { ...s, activeIndex: (s.activeIndex + 1) % filtered.length });
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSlash((s) => s && { ...s, activeIndex: (s.activeIndex - 1 + filtered.length) % filtered.length });
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const item = filtered[Math.min(current.activeIndex, filtered.length - 1)];
      editor.chain().focus().deleteRange(current.range).run();
      item.run(editor);
      setSlash(null);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setSlash(null);
      return true;
    }
    return false;
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === "heading" ? "Заголовок" : "Пишите текст или наберите «/» для команд…"),
      }),
      CaptionedImage,
    ],
    content: content || "",
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current?.(ed.getHTML());
      updateSlashState(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => updateSlashState(ed),
    editorProps: {
      attributes: { class: "article-content tiptap min-h-[240px] focus:outline-none" },
      handleKeyDown: handleEditorKeyDown,
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content && editor.isEmpty) editor.commands.setContent(content, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Слеш-команда — не отдельный плагин ProseMirror, а просто разбор текста
  // непосредственно перед курсором на каждое изменение: если это «/…» в
  // самом начале текущего блока (или после пробела), считаем, что человек
  // печатает команду, и показываем меню рядом с курсором (coordsAtPos —
  // координаты каретки в вьюпорте, без сторонних библиотек позиционирования).
  const updateSlashState = (ed) => {
    const { $from, empty } = ed.state.selection;
    if (!empty || $from.parent.type.name !== "paragraph") {
      setSlash(null);
      return;
    }
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
    const match = /(?:^|\s)\/([^\s/]*)$/.exec(textBefore);
    if (!match) {
      setSlash(null);
      return;
    }
    const from = $from.pos - match[0].length + (match[0].startsWith(" ") ? 1 : 0);
    const coords = ed.view.coordsAtPos($from.pos);
    setSlash({
      query: match[1],
      range: { from, to: $from.pos },
      position: { top: coords.bottom + 4, left: coords.left },
      activeIndex: 0,
    });
  };

  const pickSlashItem = (item) => {
    const current = slashRef.current;
    if (!editor || !current) return;
    editor.chain().focus().deleteRange(current.range).run();
    item.run(editor);
    setSlash(null);
  };

  // Гутер слева от блока под курсором — «+» вставляет новый пустой блок
  // сразу под ним (и открывает «/»-меню в нём же, набирая «/» программно —
  // человек продолжает выбор мышью/стрелками как обычно), «⋮⋮» открывает
  // мини-меню с дублировать/удалить/переместить. Всё через прямую работу с
  // позициями ProseMirror (posAtDOM + границы узла на глубине 1 — блоки
  // документа как раз и лежат на этой глубине), а не через NodeView на
  // каждый тип блока: тот путь потребовал бы переписать вообще все узлы
  // (параграф/заголовок/список/цитату) под React NodeView ради одной этой
  // фичи — несоразмерно тяжелее для того же результата.
  const getBlockRange = (el) => {
    const pos = editor.view.posAtDOM(el, 0);
    const $pos = editor.state.doc.resolve(pos);
    return { start: $pos.before(1), end: $pos.after(1) };
  };

  const handleWrapMouseMove = (e) => {
    if (!editor || blockMenuOpen) return;
    const contentEl = editor.view.dom;
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const y = e.clientY;
    const el = Array.from(contentEl.children).find((c) => {
      const r = c.getBoundingClientRect();
      return y >= r.top && y <= r.bottom;
    });
    if (!el) {
      setHoverBlock(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setHoverBlock({ top: r.top - wrapRect.top, height: r.height, el });
  };

  const addBlockBelow = () => {
    if (!editor || !hoverBlock) return;
    const { end } = getBlockRange(hoverBlock.el);
    editor.chain().focus().insertContentAt(end, { type: "paragraph" }).run();
    editor.commands.setTextSelection(end + 1);
    editor.chain().focus().insertContent("/").run();
  };

  const duplicateBlock = () => {
    if (!editor || !hoverBlock) return;
    const { start, end } = getBlockRange(hoverBlock.el);
    const node = editor.state.doc.nodeAt(start);
    if (!node) return;
    editor.chain().focus().insertContentAt(end, node.toJSON()).run();
    setBlockMenuOpen(false);
  };

  const deleteBlock = () => {
    if (!editor || !hoverBlock) return;
    const { start, end } = getBlockRange(hoverBlock.el);
    editor.chain().focus().deleteRange({ from: start, to: end }).run();
    setBlockMenuOpen(false);
    setHoverBlock(null);
  };

  const moveBlock = (dir) => {
    if (!editor || !hoverBlock) return;
    const { start, end } = getBlockRange(hoverBlock.el);
    const doc = editor.state.doc;
    const $start = doc.resolve(start);
    const index = $start.index(0);
    const targetIndex = index + dir;
    if (targetIndex < 0 || targetIndex >= doc.childCount) return;
    const node = doc.nodeAt(start);
    if (!node) return;
    const tr = editor.state.tr;
    tr.delete(start, end);
    // Позицию вставки считаем заново по уже изменённому документу (после
    // удаления блока индексы соседей не сдвигаются, а вот их position —
    // да): суммируем размеры всех узлов до targetIndex.
    const afterDelete = tr.doc;
    let pos = 0;
    for (let i = 0; i < targetIndex; i += 1) pos += afterDelete.child(i).nodeSize;
    tr.insert(pos, node);
    editor.view.dispatch(tr);
    editor.commands.focus();
    setBlockMenuOpen(false);
  };

  const setColor = (hex) => {
    if (hex) editor.chain().focus().setColor(hex).run();
    else editor.chain().focus().unsetColor().run();
  };

  const toggleLink = () => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Ссылка (пусто — убрать)", prev || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const insertImage = async (file) => {
    if (!file || !editor) return;
    const url = await uploadImage(file);
    editor.chain().focus().insertContent({ type: "captionedImage", attrs: { src: url, align: "center", width: 100 } }).run();
  };

  const replaceSelectedImage = async (file) => {
    if (!file || !editor) return;
    const url = await uploadImage(file);
    editor.chain().focus().updateAttributes("captionedImage", { src: url }).run();
  };

  const editImageCaption = () => {
    if (!editor.isActive("captionedImage")) return;
    const prev = editor.getAttributes("captionedImage").caption || "";
    const next = window.prompt("Подпись к картинке (пусто — убрать)", prev);
    if (next === null) return;
    editor.chain().focus().updateAttributes("captionedImage", { caption: next.trim() || null }).run();
  };

  if (!editor) return null;

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleWrapMouseMove}
      onMouseLeave={() => !blockMenuOpen && setHoverBlock(null)}
      className="relative w-full rounded-xl border border-line bg-white px-4 py-4 sm:pl-14"
    >
      {/* Гутер «+»/«⋮⋮» слева от блока под курсором — скрыт на маленьких
          экранах (там нет места слева, обычный тап по тексту важнее). */}
      {hoverBlock && (
        <div
          className="absolute left-2 z-20 hidden items-center gap-0.5 sm:flex"
          style={{ top: hoverBlock.top + hoverBlock.height / 2 - 14 }}
        >
          <ToolbarButton label="Добавить блок ниже" small onClick={addBlockBelow}>
            <PlusIcon />
          </ToolbarButton>
          <div className="relative">
            <ToolbarButton label="Действия с блоком" small onClick={() => setBlockMenuOpen((v) => !v)} active={blockMenuOpen}>
              <GripIcon />
            </ToolbarButton>
            {blockMenuOpen && (
              <div className="absolute left-0 top-8 z-30 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
                <button type="button" onClick={() => moveBlock(-1)} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-cream">
                  <ArrowUpIcon /> Выше
                </button>
                <button type="button" onClick={() => moveBlock(1)} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-cream">
                  <ArrowDownIcon /> Ниже
                </button>
                <button type="button" onClick={duplicateBlock} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-cream">
                  <DuplicateIcon /> Дублировать
                </button>
                <button type="button" onClick={deleteBlock} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-maroon hover:bg-cream">
                  <TrashIcon /> Удалить
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editor && (
        <BubbleMenu editor={editor} shouldShow={({ state }) => !state.selection.empty && !editor.isActive("captionedImage")}>
          <div className="flex items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-lg">
            <ToolbarButton label="Жирный" small active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <BoldIcon />
            </ToolbarButton>
            <ToolbarButton label="Курсив" small active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton
              label="Подчёркнутый"
              small
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon />
            </ToolbarButton>
            <ToolbarButton label="Ссылка" small active={editor.isActive("link")} onClick={toggleLink}>
              <LinkIcon />
            </ToolbarButton>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
            {TEXT_COLORS.map((hex) => (
              <button
                key={hex || "reset"}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setColor(hex)}
                title={hex || "Обычный цвет"}
                className={`h-5 w-5 shrink-0 rounded-full border transition-transform hover:scale-110 ${
                  editor.isActive("textStyle", { color: hex }) || (!hex && !editor.getAttributes("textStyle").color)
                    ? "border-maroon ring-2 ring-maroon/40"
                    : "border-line"
                }`}
                style={{ background: hex || "repeating-conic-gradient(#ccc 0 90deg, #fff 0 180deg) 0 0/6px 6px" }}
              />
            ))}
          </div>
        </BubbleMenu>
      )}

      {editor && (
        <BubbleMenu editor={editor} shouldShow={({ editor: ed }) => ed.isActive("captionedImage")}>
          <div className="flex items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-lg">
            <ToolbarButton
              label="Слева, текст обтекает"
              small
              active={editor.isActive("captionedImage", { align: "left" })}
              onClick={() => editor.chain().focus().updateAttributes("captionedImage", { align: "left" }).run()}
            >
              <AlignIcon side="left" />
            </ToolbarButton>
            <ToolbarButton
              label="По центру"
              small
              active={editor.isActive("captionedImage", { align: "center" })}
              onClick={() => editor.chain().focus().updateAttributes("captionedImage", { align: "center" }).run()}
            >
              <AlignIcon side="center" />
            </ToolbarButton>
            <ToolbarButton
              label="Справа, текст обтекает"
              small
              active={editor.isActive("captionedImage", { align: "right" })}
              onClick={() => editor.chain().focus().updateAttributes("captionedImage", { align: "right" }).run()}
            >
              <AlignIcon side="right" />
            </ToolbarButton>
            <ToolbarButton
              label="Во всю ширину"
              small
              active={editor.isActive("captionedImage", { align: "full" })}
              onClick={() => editor.chain().focus().updateAttributes("captionedImage", { align: "full", width: 100 }).run()}
            >
              <AlignIcon side="full" />
            </ToolbarButton>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
            {[33, 50, 75, 100].map((w) => (
              <button
                key={w}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().updateAttributes("captionedImage", { width: w }).run()}
                className={`rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-black/5 ${
                  editor.isActive("captionedImage", { width: w }) ? "bg-maroon text-white hover:bg-maroon-dark" : "text-ink"
                }`}
              >
                {w}%
              </button>
            ))}
            <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={editImageCaption}
              className="rounded-md px-2 py-1 text-xs text-ink transition-colors hover:bg-black/5"
            >
              Подпись
            </button>
            <label className="cursor-pointer rounded-md px-2 py-1 text-xs text-ink transition-colors hover:bg-black/5">
              Заменить
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  e.target.value = "";
                  replaceSelectedImage(file);
                }}
              />
            </label>
          </div>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />

      {slash && (
        <SlashMenu
          items={slashItems}
          query={slash.query}
          activeIndex={slash.activeIndex}
          position={slash.position}
          onPick={pickSlashItem}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          e.target.value = "";
          insertImage(file);
        }}
      />
    </div>
  );
}
