export const publicFullNameSources = [
  'Ceremony & Reception Floor Plans', 'Invitations, Save the Date & Thank You Cards',
  'QR Code Seating Chart', 'Christmas & Seasonal Events', 'Memorials & Celebrations of Life',
] as const;
const row = (text: string) => text.split('|');
export const publicFullNameRows: Record<string, readonly string[]> = {
  en: publicFullNameSources,
  it: row('Planimetrie della cerimonia e del ricevimento|Inviti, Save the Date e biglietti di ringraziamento|Piano dei posti con codice QR|Eventi natalizi e stagionali|Commemorazioni e celebrazioni della vita'),
  ar: row('مخططات مكان المراسم والاستقبال|دعوات وبطاقات احفظوا الموعد وبطاقات شكر|مخطط جلوس برمز QR|فعاليات عيد الميلاد والفعاليات الموسمية|فعاليات تأبين والاحتفاء بالحياة'),
  zh: row('仪式与婚宴场地平面图|邀请函、预留日期卡和感谢卡|二维码座位图|圣诞与季节性活动|追思与生命纪念活动'),
  vi: row('Sơ đồ mặt bằng lễ cưới và tiệc cưới|Thiệp mời, thiệp báo ngày và thiệp cảm ơn|Sơ đồ chỗ ngồi bằng mã QR|Sự kiện Giáng sinh và theo mùa|Lễ tưởng niệm và tôn vinh cuộc đời'),
  hi: row('समारोह और स्वागत समारोह की स्थल योजनाएँ|निमंत्रण, तारीख सुरक्षित रखने के कार्ड और धन्यवाद कार्ड|QR कोड बैठने का चार्ट|क्रिसमस और मौसमी कार्यक्रम|स्मृति सभाएँ और जीवन का सम्मान समारोह'),
  tr: row('Tören ve resepsiyon mekân planları|Davetiyeler, tarih duyuruları ve teşekkür kartları|QR kodlu oturma planı|Noel ve mevsimlik etkinlikler|Anma ve yaşamı kutlama etkinlikleri'),
  de: row('Raumpläne für Trauung und Empfang|Einladungen, Save-the-Date- und Dankeskarten|Sitzplan mit QR Code|Weihnachts- und saisonale Veranstaltungen|Gedenkfeiern und Feiern des Lebens'),
  es: row('Planos de la ceremonia y la recepción|Invitaciones, tarjetas de reserva de fecha y agradecimiento|Plano de asientos con código QR|Eventos navideños y de temporada|Homenajes y celebraciones de la vida'),
  fr: row('Plans de salle pour cérémonie et réception|Invitations, annonces de date et cartes de remerciement|Plan de table par code QR|Événements de Noël et saisonniers|Commémorations et célébrations de la vie'),
  nl: row('Plattegronden voor ceremonie en receptie|Uitnodigingen, datumkaarten en bedankkaarten|Zitkaart met QR-code|Kerst- en seizoensevenementen|Herdenkingen en vieringen van het leven'),
  ja: row('挙式と披露宴の会場レイアウト|招待状、日程案内カード、お礼状|QR コード座席図|クリスマスと季節のイベント|追悼会と人生を偲ぶ集い'),
  el: row('Κατόψεις τελετής και δεξίωσης|Προσκλήσεις, κάρτες αναγγελίας ημερομηνίας και ευχαριστήριες κάρτες|Πλάνο θέσεων με κωδικό QR|Χριστουγεννιάτικες και εποχικές εκδηλώσεις|Μνημόσυνα και εκδηλώσεις τιμής της ζωής'),
};
