export const publicEngagementWorkflowSources = [
  'Create the engagement event',
  'Record the date, venue, timing and expected guest capacity.',
  'Invite and organise',
  'Build the guest list, track responses and collect details needed by the venue.',
  'Shape the room',
  'Create tables or a floor plan when the party format calls for assigned places.',
  'Share the celebration',
  'Use QR access so guests can contribute photos, videos and well wishes.',
] as const;
const row = (text: string) => text.split('|');
export const publicEngagementWorkflowRows: Record<string, readonly string[]> = {
  en: publicEngagementWorkflowSources,
  it: row('Crea l’evento di fidanzamento|Registra data, location, orari e numero previsto di ospiti.|Invita e organizza|Crea la lista ospiti, segui le risposte e raccogli i dettagli necessari alla location.|Dai forma alla sala|Crea tavoli o una planimetria quando la festa richiede posti assegnati.|Condividi la celebrazione|Usa l’accesso QR per permettere agli ospiti di condividere foto, video e auguri.'),
  ar: row('أنشئ حدث الخطوبة|سجّل التاريخ والمكان والمواعيد وسعة الضيوف المتوقعة.|ادعُ الضيوف ونظّم التفاصيل|أنشئ قائمة الضيوف وتابع الردود واجمع التفاصيل التي يحتاجها المكان.|رتّب القاعة|أنشئ طاولات أو مخططاً للقاعة عندما يتطلب شكل الحفلة أماكن مخصصة.|شارك الاحتفال|استخدم الوصول عبر QR ليتمكن الضيوف من المساهمة بالصور والفيديوهات والتهاني.'),
  zh: row('创建订婚活动|记录日期、场地、时间和预计宾客容量。|邀请并整理|建立宾客名单，跟踪回复并收集场地所需的信息。|安排会场|如果派对需要指定座位，可创建桌位或平面图。|分享庆祝时刻|让宾客通过 QR 访问，分享照片、视频和祝福。'),
  vi: row('Tạo sự kiện đính hôn|Ghi ngày, địa điểm, thời gian và sức chứa khách dự kiến.|Mời khách và tổ chức|Tạo danh sách khách, theo dõi phản hồi và thu thập chi tiết địa điểm cần.|Sắp xếp không gian|Tạo bàn hoặc sơ đồ mặt bằng khi hình thức tiệc cần chỗ ngồi được phân công.|Chia sẻ niềm vui|Dùng truy cập QR để khách đóng góp ảnh, video và lời chúc.'),
  hi: row('सगाई का आयोजन बनाएँ|तारीख, स्थान, समय और अपेक्षित मेहमान क्षमता दर्ज करें।|निमंत्रण दें और व्यवस्थित करें|मेहमान सूची बनाएँ, जवाबों पर नज़र रखें और स्थान के लिए ज़रूरी जानकारी जुटाएँ।|कमरे की व्यवस्था करें|पार्टी में तय स्थानों की आवश्यकता होने पर मेज़ें या फ़्लोर प्लान बनाएँ।|उत्सव साझा करें|QR पहुँच से मेहमानों को फ़ोटो, वीडियो और शुभकामनाएँ साझा करने दें।'),
  tr: row('Nişan etkinliğini oluşturun|Tarihi, mekânı, saatleri ve beklenen konuk kapasitesini kaydedin.|Davet edin ve düzenleyin|Konuk listesini oluşturun, yanıtları izleyin ve mekânın ihtiyaç duyduğu ayrıntıları toplayın.|Salonu düzenleyin|Parti biçimi ayrılmış yerler gerektiriyorsa masalar veya kat planı oluşturun.|Kutlamayı paylaşın|Konukların fotoğraf, video ve iyi dileklerini paylaşması için QR erişimini kullanın.'),
  de: row('Erstellen Sie die Verlobungsfeier|Erfassen Sie Datum, Veranstaltungsort, Zeiten und erwartete Gästekapazität.|Laden Sie ein und organisieren Sie|Erstellen Sie die Gästeliste, verfolgen Sie Antworten und sammeln Sie die vom Veranstaltungsort benötigten Details.|Gestalten Sie den Raum|Erstellen Sie Tische oder einen Grundriss, wenn das Feierformat feste Plätze erfordert.|Teilen Sie die Feier|Nutzen Sie QR-Zugang, damit Gäste Fotos, Videos und gute Wünsche beitragen können.'),
  es: row('Crea el evento de compromiso|Registra fecha, recinto, horarios y capacidad prevista de invitados.|Invita y organiza|Crea la lista de invitados, sigue las respuestas y recoge los datos que necesita el recinto.|Organiza el espacio|Crea mesas o un plano cuando el formato de la fiesta requiera lugares asignados.|Comparte la celebración|Utiliza acceso QR para que los invitados aporten fotos, vídeos y buenos deseos.'),
  fr: row('Créez la fête de fiançailles|Notez date, lieu, horaires et capacité d’accueil prévue.|Invitez et organisez|Créez la liste d’invités, suivez les réponses et recueillez les détails nécessaires au lieu.|Organisez la salle|Créez des tables ou un plan lorsque le format de la fête nécessite des places attribuées.|Partagez la célébration|Utilisez l’accès QR pour que les invités contribuent avec photos, vidéos et vœux.'),
  nl: row('Maak het verlovingsevenement aan|Noteer datum, locatie, tijden en verwachte gastencapaciteit.|Nodig uit en organiseer|Maak de gastenlijst, volg reacties en verzamel gegevens die de locatie nodig heeft.|Richt de ruimte in|Maak tafels of een plattegrond wanneer het feest toegewezen plaatsen vereist.|Deel het feest|Gebruik QR-toegang zodat gasten foto’s, video’s en gelukwensen kunnen bijdragen.'),
  ja: row('婚約祝いのイベントを作成|日付、会場、時間、予定ゲスト定員を記録します。|招待して整理|ゲストリストを作り、回答を追跡し、会場が必要とする情報を集めます。|会場を整える|指定席が必要なパーティーでは、テーブルや会場レイアウトを作成します。|お祝いを共有|QR アクセスを使い、ゲストが写真、動画、お祝いの言葉を投稿できるようにします。'),
  el: row('Δημιουργήστε την εκδήλωση αρραβώνα|Καταγράψτε ημερομηνία, χώρο, ώρες και αναμενόμενη χωρητικότητα καλεσμένων.|Προσκαλέστε και οργανώστε|Δημιουργήστε τη λίστα καλεσμένων, παρακολουθήστε απαντήσεις και συλλέξτε τις λεπτομέρειες που χρειάζεται ο χώρος.|Διαμορφώστε την αίθουσα|Δημιουργήστε τραπέζια ή κάτοψη όταν η μορφή του πάρτι απαιτεί καθορισμένες θέσεις.|Μοιραστείτε τη γιορτή|Χρησιμοποιήστε πρόσβαση QR για να συνεισφέρουν οι καλεσμένοι φωτογραφίες, βίντεο και ευχές.'),
};
