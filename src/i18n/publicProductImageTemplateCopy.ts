export const publicProductImageTemplateSources = ['{{image}} product demonstration'] as const;
export const publicProductImageTemplateRows: Record<string, readonly string[]> = {
  en: publicProductImageTemplateSources,
  zh: ['{{image}}：工具演示'], it: ['{{image}}: dimostrazione dello strumento'],
  ar: ['{{image}} — عرض توضيحي للأداة'], vi: ['{{image}}: minh họa công cụ'],
  hi: ['{{image}} — उपकरण का प्रदर्शन'], tr: ['{{image}}: araç gösterimi'],
  de: ['{{image}}: Werkzeugdemonstration'], es: ['{{image}}: demostración de la herramienta'],
  fr: ['{{image}} : démonstration de l’outil'], nl: ['{{image}}: demonstratie van het hulpmiddel'],
  ja: ['{{image}}：ツールのデモ'], el: ['{{image}}: επίδειξη εργαλείου'],
};
