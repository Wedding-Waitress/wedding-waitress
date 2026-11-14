export const publicEventSectionSources = [
  'What needs attention',
  'Connected products',
  'A practical toolkit for this event',
  'Choose the products that match your format. They work from the same event information.',
  'From first details to a ready event',
  'Practical benefits',
  'Clarity for hosts, guests and suppliers',
  'Example workflow',
  'Related event types',
  'Explore another planning guide',
  'Explore all event types →',
  'Try Wedding Waitress free for seven days with up to 20 guests. No credit card required.',
  'Common questions',
] as const;
const row = (text: string) => text.split('|');
export const publicEventSectionRows: Record<string, readonly string[]> = {
  en: publicEventSectionSources,
  it: row('Cosa richiede attenzione|Prodotti collegati|Strumenti pratici per questo evento|Scegli i prodotti adatti al tuo formato. Utilizzano le stesse informazioni dell’evento.|Dai primi dettagli a un evento pronto|Vantaggi pratici|Chiarezza per organizzatori, ospiti e fornitori|Esempio di organizzazione|Tipi di evento correlati|Esplora un’altra guida organizzativa|Esplora tutti i tipi di evento →|Prova Wedding Waitress gratis per sette giorni con un massimo di 20 ospiti. Non serve una carta di credito.'),
  ar: row('ما يحتاج إلى الاهتمام|منتجات مترابطة|أدوات عملية لهذا الحدث|اختر المنتجات التي تناسب شكل حدثك. تعمل جميعها من معلومات الحدث نفسها.|من التفاصيل الأولى إلى حدث جاهز|فوائد عملية|وضوح للمنظمين والضيوف والموردين|مثال على سير العمل|أنواع أحداث ذات صلة|استكشف دليلاً آخر للتخطيط|استكشف جميع أنواع الفعاليات →|جرّب Wedding Waitress مجاناً لمدة سبعة أيام مع ما يصل إلى 20 ضيفاً. لا حاجة إلى بطاقة ائتمان.'),
  zh: row('需要关注的事项|相互关联的产品|适合此活动的实用工具|选择适合您活动形式的产品。它们使用同一份活动信息。|从最初细节到活动准备就绪|实际优势|让主办方、宾客和供应商清楚了解安排|流程示例|相关活动类型|探索另一份筹划指南|探索所有活动类型 →|免费试用 Wedding Waitress 七天，最多可添加 20 位宾客。无需信用卡。'),
  vi: row('Những việc cần chú ý|Các sản phẩm kết nối|Bộ công cụ thiết thực cho sự kiện này|Chọn sản phẩm phù hợp với hình thức sự kiện. Các sản phẩm dùng chung thông tin sự kiện.|Từ những chi tiết đầu tiên đến sự kiện sẵn sàng|Lợi ích thiết thực|Thông tin rõ ràng cho người tổ chức, khách và nhà cung cấp|Ví dụ quy trình|Các loại sự kiện liên quan|Khám phá hướng dẫn tổ chức khác|Khám phá tất cả loại sự kiện →|Dùng thử Wedding Waitress miễn phí trong bảy ngày với tối đa 20 khách. Không cần thẻ tín dụng.'),
  hi: row('किन बातों पर ध्यान दें|आपस में जुड़े उत्पाद|इस आयोजन के लिए उपयोगी उपकरण|अपने आयोजन के स्वरूप के अनुसार उत्पाद चुनें। वे एक ही आयोजन की जानकारी का उपयोग करते हैं।|शुरुआती विवरण से तैयार आयोजन तक|व्यावहारिक लाभ|मेज़बानों, मेहमानों और आपूर्तिकर्ताओं के लिए स्पष्ट जानकारी|कार्यप्रवाह का उदाहरण|संबंधित आयोजन प्रकार|एक और योजना मार्गदर्शिका देखें|सभी प्रकार के कार्यक्रम देखें →|अधिकतम 20 मेहमानों के साथ Wedding Waitress सात दिनों तक मुफ़्त आज़माएँ। क्रेडिट कार्ड की आवश्यकता नहीं।'),
  tr: row('Dikkat gerektiren konular|Bağlantılı ürünler|Bu etkinlik için pratik araçlar|Etkinlik biçiminize uygun ürünleri seçin. Hepsi aynı etkinlik bilgileriyle çalışır.|İlk ayrıntılardan hazır bir etkinliğe|Pratik faydalar|Ev sahipleri, konuklar ve tedarikçiler için netlik|Örnek iş akışı|İlgili etkinlik türleri|Başka bir planlama rehberini keşfedin|Tüm etkinlik türlerini keşfedin →|Wedding Waitress’i en fazla 20 konukla yedi gün ücretsiz deneyin. Kredi kartı gerekmez.'),
  de: row('Was Aufmerksamkeit braucht|Vernetzte Produkte|Praktische Werkzeuge für diese Veranstaltung|Wählen Sie die Produkte passend zu Ihrem Veranstaltungsformat. Alle nutzen dieselben Veranstaltungsinformationen.|Von den ersten Details zur fertigen Veranstaltung|Praktische Vorteile|Klarheit für Gastgeber, Gäste und Dienstleister|Beispielablauf|Verwandte Veranstaltungsarten|Entdecken Sie einen weiteren Planungsleitfaden|Alle Veranstaltungsarten entdecken →|Testen Sie Wedding Waitress sieben Tage kostenlos mit bis zu 20 Gästen. Keine Kreditkarte erforderlich.'),
  es: row('Qué necesita atención|Productos conectados|Herramientas prácticas para este evento|Elige los productos adecuados para tu formato. Todos utilizan la misma información del evento.|De los primeros detalles a un evento preparado|Ventajas prácticas|Claridad para anfitriones, invitados y proveedores|Ejemplo de organización|Tipos de eventos relacionados|Explora otra guía de planificación|Explora todos los tipos de evento →|Prueba Wedding Waitress gratis durante siete días con hasta 20 invitados. No necesitas tarjeta de crédito.'),
  fr: row('Les points à préparer|Produits connectés|Des outils pratiques pour cet événement|Choisissez les produits adaptés à votre format. Ils utilisent les mêmes informations de l’événement.|Des premiers détails à un événement prêt|Avantages pratiques|Des informations claires pour les organisateurs, invités et prestataires|Exemple d’organisation|Types d’événements associés|Découvrez un autre guide de préparation|Découvrir tous les types d’événement →|Essayez Wedding Waitress gratuitement pendant sept jours avec jusqu’à 20 invités. Aucune carte bancaire requise.'),
  nl: row('Wat aandacht nodig heeft|Verbonden producten|Praktische hulpmiddelen voor dit evenement|Kies de producten die passen bij uw evenement. Ze gebruiken dezelfde evenementinformatie.|Van de eerste details tot een voorbereid evenement|Praktische voordelen|Duidelijkheid voor organisatoren, gasten en leveranciers|Voorbeeld van een werkwijze|Gerelateerde evenementtypen|Ontdek een andere planningsgids|Ontdek alle soorten evenementen →|Probeer Wedding Waitress zeven dagen gratis met maximaal 20 gasten. Geen creditcard nodig.'),
  ja: row('準備で気を配ること|連携する製品|このイベントに役立つツール|イベントの形式に合う製品を選んでください。同じイベント情報を使って連携します。|最初の詳細から準備完了まで|実用的なメリット|主催者、ゲスト、業者にわかりやすい情報|進め方の例|関連するイベントの種類|別の準備ガイドを見る|すべてのイベントの種類を見る →|Wedding Waitress を最大 20 名のゲストと七日間無料でお試しください。クレジットカードは不要です。'),
  el: row('Τι χρειάζεται προσοχή|Συνδεδεμένα προϊόντα|Πρακτικά εργαλεία για αυτή την εκδήλωση|Επιλέξτε τα προϊόντα που ταιριάζουν στη μορφή σας. Χρησιμοποιούν τις ίδιες πληροφορίες εκδήλωσης.|Από τις πρώτες λεπτομέρειες σε μια έτοιμη εκδήλωση|Πρακτικά οφέλη|Σαφήνεια για διοργανωτές, καλεσμένους και προμηθευτές|Παράδειγμα ροής εργασίας|Σχετικοί τύποι εκδηλώσεων|Εξερευνήστε έναν ακόμη οδηγό σχεδιασμού|Εξερευνήστε όλους τους τύπους εκδηλώσεων →|Δοκιμάστε το Wedding Waitress δωρεάν για επτά ημέρες με έως 20 καλεσμένους. Δεν απαιτείται πιστωτική κάρτα.'),
};
const commonQuestionLabels: Record<string, string> = {
  it: 'Domande frequenti', ar: 'أسئلة شائعة', zh: '常见问题', vi: 'Câu hỏi thường gặp',
  hi: 'सामान्य प्रश्न', tr: 'Sık sorulan sorular', de: 'Häufige Fragen', es: 'Preguntas frecuentes',
  fr: 'Questions fréquentes', nl: 'Veelgestelde vragen', ja: 'よくある質問', el: 'Συχνές ερωτήσεις',
};
for (const [language, label] of Object.entries(commonQuestionLabels)) {
  publicEventSectionRows[language] = [...publicEventSectionRows[language], label];
}

const productActionLabels: Record<string, readonly string[]> = {
  en: ['See useful products', 'View product'],
  it: ['Scopri i prodotti utili', 'Visualizza prodotto'],
  ar: ['اطّلع على المنتجات المفيدة', 'عرض المنتج'],
  zh: ['查看实用产品', '查看产品'],
  vi: ['Xem các sản phẩm hữu ích', 'Xem sản phẩm'],
  hi: ['उपयोगी उत्पाद देखें', 'उत्पाद देखें'],
  tr: ['Yararlı ürünleri görün', 'Ürünü görüntüle'],
  de: ['Hilfreiche Produkte ansehen', 'Produkt ansehen'],
  es: ['Ver productos útiles', 'Ver producto'],
  fr: ['Voir les produits utiles', 'Voir le produit'],
  nl: ['Bekijk handige producten', 'Bekijk product'],
  ja: ['役立つ製品を見る', '製品を見る'],
  el: ['Δείτε χρήσιμα προϊόντα', 'Προβολή προϊόντος'],
};
export const publicEventActionSources = productActionLabels.en;
export const publicEventActionRows = productActionLabels;
