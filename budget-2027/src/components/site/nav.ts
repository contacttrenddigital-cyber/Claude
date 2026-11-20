/** Site map in four groups — the single source for the header, the mobile menu and the footer. */
import type { IconName } from "./Icon";

export interface NavItem {
  href: string;
  label: string;
  hint: string;
  icon: IconName;
}
export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    id: "za-men",
    label: "За мен",
    items: [
      { href: "/kalkulator", label: "Калкулатор на заплатата", hint: "Нетна заплата и осигуровки: 2026 срещу 2027", icon: "calculator" },
      { href: "/zaplati", label: "Заплати", hint: "Минимална заплата и заплати в държавата", icon: "wallet" },
      { href: "/pensii", label: "Пенсии", hint: "Колко струват пенсиите и откъде идват парите", icon: "users" },
      { href: "/osigurovki", label: "Помощи и обезщетения", hint: "Майчинство, детски, безработица", icon: "heart" },
      { href: "/biznes", label: "За фирмите", hint: "Данъци и нови мерки за бизнеса", icon: "briefcase" },
      { href: "/obshtini", label: "Моята община", hint: "Колко получава всяка от 265-те общини", icon: "map" },
    ],
  },
  {
    id: "byudzhetat",
    label: "Бюджетът",
    items: [
      { href: "/prihodi", label: "Приходи", hint: "Откъде идват парите", icon: "coins" },
      { href: "/danatsi", label: "Данъци", hint: "Ставки и промени", icon: "receipt" },
      { href: "/sektori", label: "Къде отиват парите", hint: "Разходите по сектори", icon: "pie" },
      { href: "/defitsit", label: "Дефицит", hint: "Колко не достига", icon: "scale" },
      { href: "/dalg", label: "Дълг", hint: "Колко дължим и колко ни струва", icon: "trend" },
      { href: "/zdraveopazvane", label: "Здравеопазване", hint: "Бюджетът на здравната каса", icon: "cross" },
      { href: "/obrazovanie", label: "Образование", hint: "Училища, университети, учители", icon: "book" },
      { href: "/otbrana", label: "Отбрана", hint: "Разходи и цели в НАТО", icon: "shield" },
      { href: "/investitsii", label: "Инвестиции", hint: "225 проекта по региони", icon: "crane" },
      { href: "/institutsii", label: "Институции", hint: "Колко получава всяко министерство", icon: "building" },
      { href: "/programi", label: "Програми", hint: "За какво харчи всяко министерство", icon: "layers" },
    ],
  },
  {
    id: "analizi",
    label: "Анализи",
    items: [
      { href: "/pod-lupa", label: "Под лупа", hint: "8 неща, на които да обърнеш внимание", icon: "search" },
      { href: "/analizi/asen-vasilev", label: "Проверка на твърдения", hint: "Вярно ли е това, което казват политиците", icon: "check" },
      { href: "/pozitivni-merki", label: "Какво се подобрява", hint: "Облекчения и повече средства", icon: "spark" },
      { href: "/riskove", label: "Рискове", hint: "Какво може да се обърка", icon: "alert" },
      { href: "/prognozi", label: "Прогнози", hint: "Как се промениха очакванията", icon: "trend" },
      { href: "/sravnenia", label: "България в ЕС", hint: "Дефицит и дълг спрямо другите", icon: "globe" },
      { href: "/scenarii", label: "Ами ако…", hint: "Промени данък и виж ефекта", icon: "sliders" },
      { href: "/izpalnenie", label: "Изпълнение 2026", hint: "Колко е похарчено досега", icon: "chart" },
      { href: "/zakonodatelstvo", label: "В парламента", hint: "Докъде е стигнал законът", icon: "gavel" },
    ],
  },
  {
    id: "danni",
    label: "Данни",
    items: [
      { href: "/tablo", label: "Пълно табло", hint: "Всички основни числа на едно място", icon: "grid" },
      { href: "/iztochnitsi", label: "Източници и проверки", hint: "Откъде е всяко число", icon: "file" },
      { href: "/dokumenti", label: "Търсене в документите", hint: "Пълен текст на законопроектите", icon: "search" },
      { href: "/danni", label: "Отворени данни", hint: "CSV и JSON за изтегляне", icon: "download" },
      { href: "/moeto-tablo", label: "Моето табло", hint: "Избери си показатели", icon: "star" },
      { href: "/vizualizatsii", label: "Карти за споделяне", hint: "Изображения с числа", icon: "image" },
      { href: "/rechnik", label: "Речник", hint: "Какво значат термините", icon: "book" },
      { href: "/metodologia", label: "Методология", hint: "Как смятаме", icon: "ruler" },
    ],
  },
];

export const ABOUT: NavItem = { href: "/za-platformata", label: "За платформата", hint: "Кой стои зад сайта и как работи", icon: "info" };
