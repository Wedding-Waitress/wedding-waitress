export const publicEventIndexSources = [
  'Choose your occasion',
  'Start with the gathering in front of you',
  'Each guide connects practical products to the people, place and pace of that event.',
  'One flexible platform',
  'The workflow changes with the occasion',
  'Your event, your workflow',
  'Bring the details together before the day begins',
  'Start free with up to 20 guests and explore the complete connected platform.',
] as const;
const row = (text: string) => text.split('|');
export const publicEventIndexRows: Record<string, readonly string[]> = {
  en: publicEventIndexSources,
  it: row('Scegli l’occasione|Parti dall’incontro che stai organizzando|Ogni guida collega prodotti pratici alle persone, al luogo e al ritmo dell’evento.|Un’unica piattaforma flessibile|Il percorso cambia con l’occasione|Il tuo evento, il tuo percorso|Riunisci i dettagli prima che inizi la giornata|Inizia gratis con un massimo di 20 ospiti ed esplora la piattaforma completa e collegata.'),
  ar: row('اختر مناسبتك|ابدأ باللقاء الذي تنظّمه|يربط كل دليل المنتجات العملية بالأشخاص والمكان وإيقاع الحدث.|منصة واحدة مرنة|تتغير خطوات العمل حسب المناسبة|حدثك، وطريقتك في العمل|اجمع التفاصيل قبل بدء اليوم|ابدأ مجاناً مع ما يصل إلى 20 ضيفاً واستكشف المنصة الكاملة المترابطة.'),
  zh: row('选择您的场合|从您正在筹备的聚会开始|每份指南将实用产品与活动的人员、地点和节奏联系起来。|一个灵活的平台|流程随场合而变化|您的活动，您的流程|在当天开始前整理所有细节|免费开始，最多添加 20 位宾客，探索完整的互联平台。'),
  vi: row('Chọn dịp của bạn|Bắt đầu từ buổi gặp bạn đang tổ chức|Mỗi hướng dẫn kết nối sản phẩm thiết thực với con người, địa điểm và nhịp độ sự kiện.|Một nền tảng linh hoạt|Quy trình thay đổi theo dịp|Sự kiện của bạn, quy trình của bạn|Tập hợp chi tiết trước khi ngày bắt đầu|Bắt đầu miễn phí với tối đa 20 khách và khám phá toàn bộ nền tảng kết nối.'),
  hi: row('अपना अवसर चुनें|जिस मिलन की तैयारी है, वहीं से शुरू करें|हर मार्गदर्शिका उपयोगी उत्पादों को आयोजन के लोगों, स्थान और गति से जोड़ती है।|एक लचीला प्लेटफ़ॉर्म|अवसर के अनुसार कार्यप्रवाह बदलता है|आपका आयोजन, आपका कार्यप्रवाह|दिन शुरू होने से पहले विवरण एक साथ लाएँ|अधिकतम 20 मेहमानों के साथ मुफ़्त शुरू करें और पूरा जुड़ा प्लेटफ़ॉर्म देखें।'),
  tr: row('Durumunuzu seçin|Düzenlediğiniz buluşmayla başlayın|Her rehber pratik ürünleri etkinliğin insanlarına, yerine ve temposuna bağlar.|Tek bir esnek platform|İş akışı duruma göre değişir|Sizin etkinliğiniz, sizin akışınız|Gün başlamadan ayrıntıları birleştirin|En fazla 20 konukla ücretsiz başlayın ve bağlantılı platformun tamamını keşfedin.'),
  de: row('Wählen Sie Ihren Anlass|Beginnen Sie mit der Zusammenkunft, die Sie planen|Jeder Leitfaden verbindet praktische Produkte mit Menschen, Ort und Ablauf der Veranstaltung.|Eine flexible Plattform|Der Ablauf verändert sich mit dem Anlass|Ihre Veranstaltung, Ihr Ablauf|Bringen Sie die Details vor Tagesbeginn zusammen|Starten Sie kostenlos mit bis zu 20 Gästen und entdecken Sie die vollständige vernetzte Plattform.'),
  es: row('Elige tu ocasión|Empieza por la reunión que estás organizando|Cada guía conecta productos prácticos con las personas, el lugar y el ritmo del evento.|Una plataforma flexible|El proceso cambia con la ocasión|Tu evento, tu proceso|Reúne los detalles antes de que empiece el día|Empieza gratis con hasta 20 invitados y explora toda la plataforma conectada.'),
  fr: row('Choisissez votre occasion|Commencez par le rassemblement que vous préparez|Chaque guide relie des produits pratiques aux personnes, au lieu et au rythme de l’événement.|Une plateforme flexible|Le parcours change selon l’occasion|Votre événement, votre organisation|Réunissez les détails avant le début de la journée|Commencez gratuitement avec jusqu’à 20 invités et découvrez toute la plateforme connectée.'),
  nl: row('Kies uw gelegenheid|Begin met de bijeenkomst die u organiseert|Elke gids verbindt praktische producten met de mensen, plek en het tempo van het evenement.|Eén flexibel platform|De werkwijze verandert met de gelegenheid|Uw evenement, uw werkwijze|Breng de details samen voordat de dag begint|Start gratis met maximaal 20 gasten en ontdek het volledige verbonden platform.'),
  ja: row('機会を選ぶ|準備している集まりから始める|各ガイドは実用的な製品をイベントの人、場所、進行につなげます。|一つの柔軟なプラットフォーム|機会に合わせて進め方を変える|あなたのイベント、あなたの進め方|当日が始まる前に詳細をまとめる|最大 20 名のゲストと無料で始め、連携したプラットフォーム全体をお試しください。'),
  el: row('Επιλέξτε την περίστασή σας|Ξεκινήστε με τη συγκέντρωση που οργανώνετε|Κάθε οδηγός συνδέει πρακτικά προϊόντα με ανθρώπους, χώρο και ρυθμό εκδήλωσης.|Μία ευέλικτη πλατφόρμα|Η ροή αλλάζει ανάλογα με την περίσταση|Η εκδήλωσή σας, η ροή σας|Συγκεντρώστε τα στοιχεία πριν αρχίσει η ημέρα|Ξεκινήστε δωρεάν με έως 20 καλεσμένους και εξερευνήστε ολόκληρη τη συνδεδεμένη πλατφόρμα.'),
};
