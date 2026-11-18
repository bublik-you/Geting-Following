export interface Chapter {
  title: string;
  menu: string;
  seconds: number;
  cue: string;
  notes: string;
  lines: { text: string; audio?: string }[];
}

export const chapters: Chapter[] = [
  {
    title: 'Исследование клиентского опыта',
    menu: 'Карта',
    seconds: 15,
    cue: 'Открытие',
    notes: '',
    lines: [],
  },
  {
    title: 'Команда исследования',
    menu: 'Команда',
    seconds: 25,
    cue: 'Кто проводил исследование',
    notes: '',
    lines: [{ text: '[Знакомство с командой]' }],
  },
  {
    title: 'Контекст и цель',
    menu: 'Burger King',
    seconds: 30,
    cue: 'Burger King',
    notes: '',
    lines: [
      { text: '[Рассказ об исследовании Burger King]' },
      { text: '[Добавить цель и задачи]' },
    ],
  },
  {
    title: 'Контекст и цель',
    menu: 'Молочай',
    seconds: 30,
    cue: 'Молочай',
    notes: '',
    lines: [
      { text: '[Рассказ об исследовании «Молочая»]' },
      { text: '[Добавить цель и задачи]' },
    ],
  },
  {
    title: 'Метод исследования',
    menu: 'Метод',
    seconds: 35,
    cue: 'Как собирали данные',
    notes: '',
    lines: [{ text: '[Здесь будет объяснение метода]' }],
  },
  {
    title: 'Портрет клиента и JTBD',
    menu: 'Портрет',
    seconds: 35,
    cue: 'Задачи клиента',
    notes: '',
    lines: [{ text: '[Здесь будет рассказ о задачах клиента]' }],
  },
  {
    title: 'Карта клиентского пути',
    menu: 'Путь клиента',
    seconds: 45,
    cue: 'Моменты истины',
    notes: '',
    lines: [{ text: '[Здесь будет разбор клиентского пути]' }],
  },
  {
    title: 'Воронка и метрики',
    menu: 'Метрики',
    seconds: 45,
    cue: 'Количественные результаты',
    notes: '',
    lines: [{ text: '[Здесь будет объяснение данных]' }],
  },
  {
    title: 'Основные наблюдения',
    menu: 'Наблюдения',
    seconds: 40,
    cue: 'Полевые заметки',
    notes: '',
    lines: [{ text: '[Здесь будут основные наблюдения]' }],
  },
  {
    title: 'Рекомендации',
    menu: 'Рекомендации',
    seconds: 40,
    cue: 'Эффект и сложность',
    notes: '',
    lines: [{ text: '[Здесь будет обоснование рекомендаций]' }],
  },
  {
    title: 'Быстрые победы за 48 часов',
    menu: '48 часов',
    seconds: 25,
    cue: 'Первые действия',
    notes: '',
    lines: [{ text: '[Здесь будут мероприятия на первые 48 часов]' }],
  },
  {
    title: 'Риски и допущения',
    menu: 'Риски',
    seconds: 25,
    cue: 'Границы исследования',
    notes: '',
    lines: [{ text: '[Здесь будет пояснение ограничений и рисков]' }],
  },
  {
    title: 'Итоги исследования',
    menu: 'Итоги',
    seconds: 30,
    cue: 'Три вывода',
    notes: '',
    lines: [{ text: '[Здесь будет итог исследования]' }],
  },
];

export const defenseSeconds = chapters.reduce(
  (total, chapter) => total + chapter.seconds,
  0,
);
export const number = (n: number) => String(n).padStart(2, '0');
export const timecode = (n: number) =>
  `${number(Math.floor(n / 60))}:${number(n % 60)}`;
