import { useEffect, useRef, useState } from "react";
import { Modal, Calendar } from "@heroui/react";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import heic2any from "heic2any";
import { useScrollShadows } from "../lib/useScrollShadows.js";

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// Модалка добавления/редактирования объявления: заголовок + картинка любого
// формата (принимает что угодно из image/*, браузер сам решает, что умеет
// показать) — грузится и показывается как есть, без кадрирования: ни зума,
// ни обрезки, ни склеенного canvas — там, где картинка нужна как карточка
// фиксированной формы (история на главной), её кадрирует CSS
// (object-cover/bg-cover) на месте показа, не сам файл.
export default function AnnouncementFormModal({ triggerRef, editingItem, onSubmit }) {
  const [title, setTitle] = useState("");
  const [imgSrc, setImgSrc] = useState(null); // превью — object URL новой картинки либо imageUrl при редактировании
  const [file, setFile] = useState(null); // File, который реально отправим (null при редактировании без замены картинки)
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState(null);
  // Срок показа — по умолчанию бессрочно; дата хранится как YYYY-MM-DD
  // (значение Calendar), в expiresAt превращается в конец этого дня по
  // местному времени только при сохранении (см. handleSubmit).
  const [indefinite, setIndefinite] = useState(true);
  const [expiresDate, setExpiresDate] = useState("");

  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);
  const closeTriggerRef = useRef(null);
  const submitRef = useRef(null);
  const { topShadow, bottomShadow, refCallback: bodyRefCallback, update: updateShadows } = useScrollShadows();

  // Заполняем форму при открытии на редактирование/добавление (см. key на
  // Modal ниже — компонент пересоздаётся заново при каждом открытии).
  useEffect(() => {
    setTitle(editingItem?.title || "");
    setImgSrc(editingItem?.imageUrl || null);
    setFile(null);
    setError(null);
    if (editingItem?.expiresAt) {
      setIndefinite(false);
      setExpiresDate(new Date(editingItem.expiresAt).toISOString().slice(0, 10));
    } else {
      setIndefinite(true);
      setExpiresDate("");
    }
  }, [editingItem]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  // Выбрали «До даты» — календарь появляется ниже видимой области формы
  // (модалка не резиновая), подскролливаем в поле зрения. Цель — кнопка
  // «Сохранить» (а не сам календарь): она идёт последней в форме, и
  // scrollIntoView({block:"end"}) по ней подтягивает к низу экрана заодно и
  // календарь над ней — так видно и то, и другое, а не только календарь с
  // обрезанной под него кнопкой. requestAnimationFrame — чтобы календарь
  // успел смонтироваться и попасть в раскладку.
  useEffect(() => {
    if (indefinite) return;
    requestAnimationFrame(() => submitRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, [indefinite]);

  // HEIC/HEIF (обычный формат фото с iPhone) браузеры, кроме Safari, не
  // умеют показывать в <img> напрямую — перекодируем в JPEG на клиенте
  // перед тем, как класть в превью и отправлять на сервер.
  const isHeic = (f) => /\.hei[cf]$/i.test(f.name) || /^image\/hei[cf]/i.test(f.type);

  const handleFile = async (picked) => {
    if (!picked) return;
    setError(null);
    let workingFile = picked;
    if (isHeic(picked)) {
      setConverting(true);
      try {
        const converted = await heic2any({ blob: picked, toType: "image/jpeg", quality: 0.9 });
        const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
        workingFile = new File([convertedBlob], picked.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
      } catch {
        setError("Не удалось прочитать HEIC-файл — попробуйте другой формат");
        setConverting(false);
        return;
      }
      setConverting(false);
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(workingFile);
    objectUrlRef.current = url;
    setImgSrc(url);
    setFile(workingFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Укажите заголовок");
      return;
    }
    if (!imgSrc) {
      setError("Выберите картинку");
      return;
    }
    if (!editingItem && !file) {
      setError("Выберите картинку");
      return;
    }
    if (!indefinite && !expiresDate) {
      setError("Укажите дату окончания показа или выберите «Бессрочно»");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Конец выбранного дня по местному времени — «показывать по 23:59
      // этой даты включительно», а не «до полуночи в её начале».
      const expiresAt = indefinite ? null : new Date(`${expiresDate}T23:59:59`).getTime();
      await onSubmit({ title: title.trim(), file, expiresAt });
      closeTriggerRef.current?.click();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal>
      <Modal.Trigger ref={triggerRef} className="sr-only" aria-hidden />
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog className="bg-paper">
            <Modal.CloseTrigger ref={closeTriggerRef} className="absolute right-4 top-4 z-10" />
            <Modal.Header>
              <Modal.Heading className="rich-heading text-lg normal-case tracking-normal text-maroon">
                {editingItem ? "Редактировать объявление" : "Новое объявление"}
              </Modal.Heading>
            </Modal.Header>
            {/* flex-1 min-h-0 на обёртке — см. такую же обёртку и объяснение
                в DaySchedule.jsx (попап примечаний/стихов): без неё Body,
                растянутое на весь текст формы, обрежется жёстким
                overflow-clip диалога вместо прокрутки внутри себя. */}
            <div className="relative min-h-0 flex-1">
              <Modal.Body ref={bodyRefCallback} onScroll={updateShadows} className="h-full overscroll-contain">
                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                  {/* Весь прямоугольник — кликабельная кнопка выбора/замены
                      картинки (отдельная кнопка «Выбрать»/«Заменить» рядом
                      больше не нужна); фон — не белый, а полупрозрачный с
                      блюром, чтобы читался как область-приёмник файла, а не
                      как обычная белая карточка. */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex max-h-72 w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-white/20 backdrop-blur-md"
                  >
                    {converting ? (
                      <div className="flex h-40 w-full items-center justify-center text-sm text-muted">Обработка HEIC…</div>
                    ) : imgSrc ? (
                      <img src={imgSrc} alt="" className="max-h-72 w-full object-contain" />
                    ) : (
                      <span className="flex h-40 w-full flex-col items-center justify-center gap-2 text-sm text-muted">
                        Выбрать картинку
                      </span>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  />

                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Текст объявления"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
                  />

                  <div className="flex w-full flex-col gap-2">
                    <label className="text-xs text-muted">Показывать</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-sm text-ink">
                        <input
                          type="radio"
                          checked={indefinite}
                          onChange={() => setIndefinite(true)}
                          className="accent-maroon"
                        />
                        Бессрочно
                      </label>
                      <label className="flex items-center gap-1.5 text-sm text-ink">
                        <input
                          type="radio"
                          checked={!indefinite}
                          onChange={() => setIndefinite(false)}
                          className="accent-maroon"
                        />
                        До даты{!indefinite && expiresDate ? ` — ${expiresDate.split("-").reverse().join(".")}` : ""}
                      </label>
                    </div>
                    {!indefinite && (
                      <div className="flex w-full justify-center">
                        <Calendar
                          aria-label="Дата окончания показа"
                          value={expiresDate ? parseDate(expiresDate) : null}
                          onChange={(date) => setExpiresDate(date ? date.toString() : "")}
                          minValue={today(getLocalTimeZone())}
                        >
                          <Calendar.Header className="flex items-center justify-between px-1">
                            <Calendar.NavButton
                              slot="previous"
                              className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-maroon"
                            >
                              ‹
                            </Calendar.NavButton>
                            <Calendar.Heading className="rich-heading text-sm normal-case tracking-normal text-maroon" />
                            <Calendar.NavButton
                              slot="next"
                              className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-maroon"
                            >
                              ›
                            </Calendar.NavButton>
                          </Calendar.Header>
                          <Calendar.Grid>
                            <Calendar.GridHeader>
                              {(day) => <Calendar.HeaderCell className="text-xs text-muted">{day}</Calendar.HeaderCell>}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>
                              {(date) => (
                                <Calendar.Cell
                                  date={date}
                                  className="rounded-full text-sm text-ink data-[selected=true]:bg-maroon data-[selected=true]:text-white data-[today=true]:font-bold data-[today=true]:text-maroon data-[disabled=true]:text-line data-[outside-month=true]:text-line"
                                />
                              )}
                            </Calendar.GridBody>
                          </Calendar.Grid>
                        </Calendar>
                      </div>
                    )}
                  </div>

                  {error && <p className="text-xs text-maroon">{error}</p>}

                  <button
                    ref={submitRef}
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-full bg-maroon px-4 py-2 text-sm text-white transition-colors hover:bg-maroon-dark disabled:opacity-50"
                  >
                    {saving ? "Сохранение…" : "Сохранить"}
                  </button>
                </form>
              </Modal.Body>
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-8 rounded-t-2xl bg-gradient-to-b from-paper via-paper/80 to-transparent transition-opacity duration-200 ${
                  topShadow ? "opacity-100" : "opacity-0"
                }`}
              />
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-2xl bg-gradient-to-t from-paper via-paper/80 to-transparent transition-opacity duration-200 ${
                  bottomShadow ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
