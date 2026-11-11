export const publicEventSeoTitleSources = [
  'All-in-One Wedding Planning Software | Wedding Waitress',
  'Engagement Party Planning Tools | Wedding Waitress',
  'Birthday & Party Planning Tools | Wedding Waitress',
  'Corporate Event Guest & Venue Planning | Wedding Waitress',
  'Christmas & Seasonal Event Planning Tools | Wedding Waitress',
  'Memorial & Celebration of Life Planning | Wedding Waitress',
] as const;
const titles = (text: string) => text.split('|').map(title => `${title} | Wedding Waitress`);
export const publicEventSeoTitleRows: Record<string, readonly string[]> = {
  en: publicEventSeoTitleSources,
  it: titles('Software completo per organizzare matrimoni|Strumenti per feste di fidanzamento|Strumenti per compleanni e feste|Ospiti e location per eventi aziendali|Strumenti per eventi natalizi e stagionali|Organizzare commemorazioni e celebrazioni della vita'),
  ar: titles('برنامج متكامل لتخطيط الزفاف|أدوات تخطيط حفلات الخطوبة|أدوات تخطيط أعياد الميلاد والحفلات|تخطيط الضيوف والأماكن لأحداث الشركات|أدوات تخطيط عيد الميلاد والأحداث الموسمية|تخطيط التأبين والاحتفاء بالحياة'),
  zh: titles('一站式婚礼筹划软件|订婚派对筹划工具|生日与派对筹划工具|企业活动宾客与场地筹划|圣诞与季节活动筹划工具|追悼与生命纪念筹划'),
  vi: titles('Phần mềm tổ chức đám cưới toàn diện|Công cụ tổ chức tiệc đính hôn|Công cụ tổ chức sinh nhật và tiệc|Tổ chức khách và địa điểm sự kiện doanh nghiệp|Công cụ tổ chức Giáng sinh và sự kiện theo mùa|Tổ chức tưởng niệm và tôn vinh cuộc đời'),
  hi: titles('संपूर्ण शादी योजना सॉफ़्टवेयर|सगाई पार्टी के योजना उपकरण|जन्मदिन और पार्टी के योजना उपकरण|व्यावसायिक आयोजन के मेहमान और स्थान की योजना|क्रिसमस और मौसमी आयोजन के उपकरण|स्मृति सभा और जीवन उत्सव की योजना'),
  tr: titles('Kapsamlı düğün planlama yazılımı|Nişan partisi planlama araçları|Doğum günü ve parti planlama araçları|Kurumsal etkinlik konuk ve mekân planlaması|Noel ve mevsimsel etkinlik planlama araçları|Anma ve yaşamı kutlama planlaması'),
  de: titles('Umfassende Hochzeitsplanungssoftware|Werkzeuge für Verlobungsfeiern|Werkzeuge für Geburtstage und Feiern|Gäste- und Veranstaltungsortplanung für Unternehmen|Werkzeuge für Weihnachts- und saisonale Veranstaltungen|Planung von Gedenkfeiern und Lebenswürdigungen'),
  es: titles('Software integral de planificación de bodas|Herramientas para fiestas de compromiso|Herramientas para cumpleaños y fiestas|Invitados y recintos para eventos corporativos|Herramientas para Navidad y eventos de temporada|Planificación de homenajes y celebraciones de vida'),
  fr: titles('Logiciel complet de préparation de mariage|Outils pour fêtes de fiançailles|Outils pour anniversaires et fêtes|Invités et lieux pour événements d’entreprise|Outils pour Noël et événements saisonniers|Préparation de commémorations et célébrations de vie'),
  nl: titles('Complete software voor bruiloftsplanning|Planningshulpmiddelen voor verlovingsfeesten|Planningshulpmiddelen voor verjaardagen en feesten|Gasten en locaties voor bedrijfsevenementen|Planningshulpmiddelen voor Kerst en seizoensevenementen|Planning voor herdenkingen en levensvieringen'),
  ja: titles('総合的な結婚式準備ソフトウェア|婚約祝いの準備ツール|誕生日とパーティーの準備ツール|企業イベントのゲストと会場の準備|クリスマスと季節イベントの準備ツール|追悼と人生を偲ぶ集まりの準備'),
  el: titles('Ολοκληρωμένο λογισμικό σχεδιασμού γάμου|Εργαλεία για πάρτι αρραβώνα|Εργαλεία για γενέθλια και πάρτι|Καλεσμένοι και χώροι εταιρικών εκδηλώσεων|Εργαλεία για Χριστούγεννα και εποχικές εκδηλώσεις|Σχεδιασμός μνημόσυνων και εορτασμών ζωής'),
};
