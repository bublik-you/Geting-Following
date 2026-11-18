export type Venue = 'burger' | 'tea';
export type MediaCategory =
  Venue | 'team' | 'observations' | 'screenshots' | 'extra';
export type Media = { file: string; alt: string };
export type Field = { label: string; value: string };
export type Metric = { label: string; unit: string; value: number | null };
export type Recommendation = {
  title: string;
  fields: Field[];
  effect: number | null;
  effort: number | null;
};
export const fields = (...labels: string[]): Field[] =>
  labels.map((label) => ({ label, value: '' }));

export const venues = {
  burger: {
    name: 'Burger King',
    address: 'ул. Геодезическая, 13/13а',
    color: '#f4a769',
    icon: 'burger',
    photo: '',
  },
  tea: {
    name: 'Молочай',
    address: 'ул. Геодезическая, 4/1 · ТЦ «Амстердам», этаж −1',
    color: '#b9dd94',
    icon: 'cup',
    photo: '',
  },
} as const;

export const team: {
  name: string;
  fields: Field[];
  avatar: string;
  photo: string;
}[] = [
  {
    name: '',
    fields: fields('Роль в исследовании', 'Задачи', 'Участие в исследовании'),
    avatar: '',
    photo: '',
  },
  {
    name: '',
    fields: fields('Роль в исследовании', 'Задачи', 'Участие в исследовании'),
    avatar: '',
    photo: '',
  },
  {
    name: '',
    fields: fields('Роль в исследовании', 'Задачи', 'Участие в исследовании'),
    avatar: '',
    photo: '',
  },
  {
    name: '',
    fields: fields('Роль в исследовании', 'Задачи', 'Участие в исследовании'),
    avatar: '',
    photo: '',
  },
];

function researchTemplate() {
  return {
    context: fields(
      'Описание точки',
      'Цель исследования',
      'Дата и часы наблюдений',
      'Задачи на неделю',
    ),
    method: fields(
      'Окна наблюдений',
      'Роли исследователей',
      'Инструменты сбора',
      'Измеряемые метрики',
      'Что было разрешено',
      'Что было запрещено',
    ),
    portrait: fields(
      'Портрет целевой аудитории',
      'Альтернативы клиента',
      'Критерии успеха',
    ),
    jobs: fields('Job story 1', 'Job story 2', 'Job story 3', 'Job story 4'),
    journey: [
      'Вход',
      'Выбор',
      'Заказ',
      'Ожидание',
      'Получение',
      'Завершение',
    ].map((label) => ({
      label,
      fields: fields(
        'Действие клиента',
        'Ожидание',
        'Наблюдение команды',
        'Возможное затруднение',
        'Значимость этапа',
      ),
    })),
    metrics: [
      { label: 'Количество визитов', unit: 'виз.', value: null },
      { label: 'Количество покупок', unit: 'пок.', value: null },
      { label: 'Конверсия в покупку', unit: '%', value: null },
      { label: 'Среднее время ожидания', unit: 'мин', value: null },
      { label: 'Доля дополнительных продаж', unit: '%', value: null },
      { label: 'Время обслуживания', unit: 'мин', value: null },
    ] as Metric[],
    observations: Array.from({ length: 4 }, () => ({
      title: '',
      photo: '',
      point: null as { x: number; y: number } | null,
      fields: fields(
        'Факт',
        'Источник подтверждения',
        'Почему это важно',
        'Влияние на клиентский опыт',
      ),
    })),
    recommendations: Array.from({ length: 6 }, (): Recommendation => ({
      title: '',
      effect: null,
      effort: null,
      fields: fields(
        'Какую проблему решает',
        'Что изменить',
        'Влияние на 1–2 метрики',
        'Сложность реализации',
        'Приоритет',
      ),
    })),
    quickWins: Array.from({ length: 3 }, () => ({
      hour: null as number | null,
      title: '',
      value: '',
    })),
    risks: fields(
      'Ограничения наблюдения',
      'Возможные ошибки измерения',
      'Непроверенные предположения',
      'Дополнительные данные',
      'Риски внедрения',
    ),
  };
}

export const research: Record<Venue, ReturnType<typeof researchTemplate>> = {
  burger: researchTemplate(),
  tea: researchTemplate(),
};

export const conclusions = fields('Вывод 1', 'Вывод 2', 'Вывод 3');
export const summary = fields(
  'Цель и охват',
  'Метод исследования',
  'Основные наблюдения',
  'Ключевые метрики',
  'Рекомендации',
  'Следующие шаги',
);

export const media: Record<MediaCategory, Media[]> = {
  burger: [],
  tea: [],
  team: [],
  observations: [],
  screenshots: [],
  extra: [],
};

export const appendix: { title: string; file: string; text: string }[] = [
  { title: 'Чек-листы наблюдений', file: '', text: '' },
  { title: 'Сырые наблюдения', file: '', text: '' },
  { title: 'Обезличенные цитаты', file: '', text: '' },
  { title: 'Дополнительные графики', file: '', text: '' },
  { title: 'Подтверждающие материалы', file: '', text: '' },
];

export function localFile(file: string) {
  const path = file.trim();
  if (!path || /(^\/|[:\\?#]|(?:^|\/)\.\.(?:\/|$))/.test(path)) return '';
  return (
    import.meta.env.BASE_URL +
    'media/' +
    path.split('/').map(encodeURIComponent).join('/')
  );
}
