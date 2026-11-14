export const publicEventSentenceSources = [
  'Plan around the realities of {{event}}',
  'Planning {{event}}',
  'Plan {{event}} in one connected place',
] as const;
const row = (text: string) => text.split('|');
export const publicEventSentenceRows: Record<string, readonly string[]> = {
  en: publicEventSentenceSources,
  it: row('Organizza {{event}} tenendo conto delle esigenze reali|Organizzare {{event}}|Organizza {{event}} in un unico spazio collegato'),
  ar: row('خطّط لهذه المناسبة وفق الاحتياجات الفعلية: {{event}}|تخطيط {{event}}|نظّم {{event}} في مكان واحد مترابط'),
  zh: row('根据实际需求筹划{{event}}|筹划{{event}}|在一个互联平台筹划{{event}}'),
  vi: row('Tổ chức {{event}} theo nhu cầu thực tế|Lên kế hoạch cho {{event}}|Tổ chức {{event}} trong một không gian kết nối'),
  hi: row('{{event}} की वास्तविक ज़रूरतों के अनुसार योजना बनाएँ|{{event}} की योजना|{{event}} की योजना एक जुड़े हुए स्थान पर बनाएँ'),
  tr: row('{{event}} için gerçek ihtiyaçlara göre plan yapın|{{event}} planlaması|{{event}} için tek bir bağlantılı yerde plan yapın'),
  de: row('Planen Sie {{event}} nach den tatsächlichen Bedürfnissen|Planung für {{event}}|Planen Sie {{event}} an einem vernetzten Ort'),
  es: row('Planifica {{event}} según las necesidades reales|Planificación de {{event}}|Planifica {{event}} en un único lugar conectado'),
  fr: row('Préparez {{event}} selon les besoins réels|Préparation de {{event}}|Préparez {{event}} dans un seul espace connecté'),
  nl: row('Plan {{event}} op basis van de werkelijke behoeften|Planning voor {{event}}|Plan {{event}} op één verbonden plek'),
  ja: row('実際のニーズに合わせて{{event}}を準備|{{event}}の準備|一つの連携した場所で{{event}}を準備'),
  el: row('Σχεδιάστε {{event}} σύμφωνα με τις πραγματικές ανάγκες|Σχεδιασμός για {{event}}|Σχεδιάστε {{event}} σε έναν συνδεδεμένο χώρο'),
};
