// Духовенство собора. `role` — должность под именем (позже будет задаваться в админке). Фото кладём в public/clergy/ и указываем в `photo`
// (например "/clergy/kuznetsov.webp", пропорция ~3:4); без фото рисуется заглушка.
export const ARCHBISHOP = {
  rank: "Митрополит",
  rankNote: "Волгоградский и Камышинский",
  name: "Феодор",
  role: "Правящий архиерей",
  photo: "/clergy/feodor.webp",
};

// Фото — с личных сайтов клириков (*.cerkov.ru), 200×300; у остальных там фото нет.
// Источник: https://volgeparhia.ru/duxovenstvo/ — Александровское благочиние,
// клирики Кафедрального собора св. Александра Невского.
const R = "Клирик собора";

export const PRIESTS = [
  { rank: "Протоиерей", name: "Александр Сазонов", role: "Старший священник", photo: "/clergy/sazonov.webp" },
  { rank: "Протоиерей", name: "Николай Лисный", role: R, photo: "/clergy/lisny.webp" },
  { rank: "Иерей", name: "Алексей Сапожников", role: R, photo: "/clergy/sapozhnikov.webp" },
  { rank: "Иерей", name: "Роман Блинков", role: R, photo: "/clergy/blinkov.webp" },
  { rank: "Иерей", name: "Александр Тимонин", role: R, photo: "" },
  { rank: "Иерей", name: "Димитрий Левчук", role: R, photo: "" },
  { rank: "Иерей", name: "Александр Кабанов", role: R, photo: "/clergy/kabanov-a.webp" },
  { rank: "Иерей", name: "Валерий Гусаков", role: R, photo: "/clergy/gusakov.webp" },
];

export const DEACONS = [
  { rank: "Протодиакон", name: "Лев Волков", role: R, photo: "/clergy/volkov.webp" },
  { rank: "Диакон", name: "Алексей Пантелеев", role: R, photo: "" },
  { rank: "Диакон", name: "Анатолий Назаренко", role: R, photo: "" },
  { rank: "Диакон", name: "Дмитрий Ромашов", role: R, photo: "/clergy/romashov-d.webp" },
  { rank: "Диакон", name: "Николай Сопит", role: R, photo: "" },
  { rank: "Диакон", name: "Макарий Кульков", role: R, photo: "" },
];
