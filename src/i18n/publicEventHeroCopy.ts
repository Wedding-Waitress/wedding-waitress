export const publicEventHeroSources = [
  'Plan the whole wedding from one connected place',
  'Bring the engagement celebration together beautifully',
  'Make the party easy to organise and easy to enjoy',
  'Keep attendees, suppliers and the venue working from one plan',
  'Organise the season without losing the celebration',
  'A calm place for the practical details of remembering someone',
  'Engagement parties', 'Birthdays and parties', 'Seasonal events', 'Memorials and celebrations of life',
] as const;
const row = (text: string) => text.split('|');
export const publicEventHeroRows: Record<string, readonly string[]> = {
  en: publicEventHeroSources,
  it: row('Pianifica tutto il matrimonio in un unico spazio collegato|Organizza splendidamente la festa di fidanzamento|Una festa facile da organizzare e da vivere|Partecipanti, fornitori e location lavorano dallo stesso piano|Organizza la stagione senza perdere la festa|Uno spazio sereno per i dettagli pratici del ricordo|Feste di fidanzamento|Compleanni e feste|Eventi stagionali|Commemorazioni e celebrazioni della vita'),
  ar: row('خطّط حفل الزفاف كله في مكان واحد متصل|اجمع احتفال الخطوبة بصورة جميلة|اجعل الحفل سهل التنظيم وممتعًا|اجعل الحضور والموردين والمكان يعملون من خطة واحدة|نظّم الموسم دون فقدان بهجة الاحتفال|مكان هادئ لتفاصيل تذكّر شخص عزيز|حفلات الخطوبة|أعياد الميلاد والحفلات|فعاليات موسمية|تأبين واحتفاء بالحياة'),
  zh: row('在同一个互相连接的平台规划整场婚礼|优美地筹办订婚庆祝|让派对易于组织、轻松享受|让参加者、供应商和场地按照同一计划工作|安排季节活动，不失庆祝乐趣|平静安排缅怀亲友的实际事务|订婚派对|生日和派对|季节性活动|追思与生命纪念'),
  vi: row('Lập kế hoạch toàn bộ đám cưới ở một nơi kết nối|Kết nối lễ đính hôn thật đẹp|Để bữa tiệc dễ tổ chức và tận hưởng|Để người tham dự, nhà cung cấp và địa điểm theo cùng kế hoạch|Tổ chức mùa lễ mà vẫn giữ niềm vui|Nơi bình yên cho chi tiết tưởng nhớ người thân|Tiệc đính hôn|Sinh nhật và tiệc|Sự kiện theo mùa|Tưởng niệm và tôn vinh cuộc đời'),
  hi: row('एक जुड़ी हुई जगह पर पूरी शादी की योजना बनाएँ|सगाई का उत्सव सुंदर ढंग से जोड़ें|पार्टी आयोजित करना और आनंद लेना आसान बनाएँ|प्रतिभागी, आपूर्तिकर्ता और स्थल एक योजना से काम करें|उत्सव का आनंद रखते हुए मौसम की योजना बनाएँ|किसी की स्मृति के व्यावहारिक विवरण के लिए शांत जगह|सगाई की पार्टियाँ|जन्मदिन और पार्टियाँ|मौसमी कार्यक्रम|स्मृति सभाएँ और जीवन का सम्मान'),
  tr: row('Tüm düğünü tek bağlantılı yerde planlayın|Nişan kutlamasını güzelce bir araya getirin|Partiyi düzenlemek ve keyfini çıkarmak kolay olsun|Katılımcılar, tedarikçiler ve mekân tek plandan çalışsın|Kutlamayı kaybetmeden sezonu düzenleyin|Birini anmanın pratik ayrıntıları için sakin bir yer|Nişan partileri|Doğum günleri ve partiler|Mevsimlik etkinlikler|Anma ve yaşamı kutlama'),
  de: row('Die ganze Hochzeit an einem verbundenen Ort planen|Die Verlobungsfeier schön zusammenbringen|Die Party leicht organisieren und genießen|Teilnehmer, Dienstleister und Veranstaltungsort nutzen einen Plan|Die Saison organisieren, ohne die Feier zu verlieren|Ein ruhiger Ort für praktische Details des Gedenkens|Verlobungsfeiern|Geburtstage und Partys|Saisonale Veranstaltungen|Gedenkfeiern und Feiern des Lebens'),
  es: row('Planifica toda la boda en un espacio conectado|Organiza una hermosa celebración de compromiso|Haz que la fiesta sea fácil de organizar y disfrutar|Asistentes, proveedores y lugar siguen un plan|Organiza la temporada sin perder la celebración|Un espacio tranquilo para los detalles de recordar a alguien|Fiestas de compromiso|Cumpleaños y fiestas|Eventos de temporada|Homenajes y celebraciones de la vida'),
  fr: row('Planifiez tout le mariage dans un espace connecté|Réunissez joliment la célébration des fiançailles|Une fête facile à organiser et à apprécier|Participants, prestataires et lieu suivent un seul plan|Organisez la saison sans perdre la fête|Un espace calme pour les détails pratiques du souvenir|Fêtes de fiançailles|Anniversaires et fêtes|Événements saisonniers|Commémorations et célébrations de la vie'),
  nl: row('Plan de hele bruiloft op één verbonden plek|Breng de verlovingsviering mooi samen|Maak het feest makkelijk te organiseren en te genieten|Deelnemers, leveranciers en locatie volgen één plan|Organiseer het seizoen zonder het feest te verliezen|Een rustige plek voor praktische herdenkingsdetails|Verlovingsfeesten|Verjaardagen en feesten|Seizoensevenementen|Herdenkingen en vieringen van het leven'),
  ja: row('ひとつにつながった場所で結婚式全体を計画|婚約祝いを美しくまとめる|準備も楽しむことも簡単なパーティーに|参加者、業者、会場が同じ計画で進める|お祝いの楽しさを保って季節を計画|大切な人を偲ぶための実務を落ち着いて整える場所|婚約パーティー|誕生日とパーティー|季節のイベント|追悼と人生を偲ぶ集い'),
  el: row('Σχεδιάστε όλο τον γάμο σε έναν συνδεδεμένο χώρο|Συνδυάστε όμορφα τη γιορτή αρραβώνα|Κάντε το πάρτι εύκολο στην οργάνωση και απόλαυση|Συμμετέχοντες, προμηθευτές και χώρος ακολουθούν ένα πλάνο|Οργανώστε την εποχή χωρίς να χαθεί η γιορτή|Ένας ήρεμος χώρος για τις πρακτικές λεπτομέρειες μνήμης|Πάρτι αρραβώνων|Γενέθλια και πάρτι|Εποχικές εκδηλώσεις|Μνημόσυνα και τιμή της ζωής'),
};
