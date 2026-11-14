export const publicGeneralFaqSources = [
  'What is Wedding Waitress?', 'Wedding Waitress is an all-in-one wedding planning and guest-experience platform for guests, RSVPs, seating, stationery, venue references, event-day planning and shared memories.',
  'Is it only for weddings?', 'Weddings are the platform’s main focus. It can also support engagements, birthdays, corporate events, workshops, seminars and other organised events.',
  'What is included?', 'Couple plans include access to the complete Wedding Waitress platform. You choose a plan according to the guest capacity you need.',
  'Do guests need an app?', 'No. Guest-facing QR, gallery and lookup experiences open in a compatible web browser.',
  'How does QR seating work?', 'You create a unique event QR code. Guests scan it, search their name and view the table or seat information you have assigned and chosen to display.',
  'Can I print seating signs and stationery?', 'Wedding Waitress includes supported print-ready PDF exports for products such as seating signs, charts, invitations and place cards. Available formats are shown inside each product.',
] as const;
const row = (text: string) => text.trim().split('\n');
export const publicGeneralFaqRows: Record<string, readonly string[]> = {
  en: publicGeneralFaqSources,
  it: row(`Che cos’è Wedding Waitress?
Wedding Waitress è una piattaforma completa per organizzare matrimoni e gestire l’esperienza degli ospiti: ospiti, RSVP, posti, materiali stampati, riferimenti della location, programma del giorno e ricordi condivisi.
È solo per matrimoni?
I matrimoni sono il focus principale della piattaforma. Supporta anche fidanzamenti, compleanni, eventi aziendali, workshop, seminari e altri eventi organizzati.
Che cosa è incluso?
I piani per coppie includono l’accesso alla piattaforma Wedding Waitress completa. Scegli il piano in base al numero di ospiti di cui hai bisogno.
Gli ospiti hanno bisogno di un’app?
No. Le esperienze QR, galleria e ricerca per gli ospiti si aprono in un browser web compatibile.
Come funziona la ricerca dei posti tramite QR?
Crei un codice QR unico per l’evento. Gli ospiti lo scansionano, cercano il proprio nome e vedono le informazioni di tavolo o posto che hai assegnato e scelto di mostrare.
Posso stampare cartelli dei posti e materiali?
Wedding Waitress offre esportazioni PDF pronte per la stampa nei formati supportati, per prodotti come cartelli dei posti, piani, inviti e segnaposto. I formati disponibili sono indicati in ogni prodotto.`),
  ar: row(`ما Wedding Waitress؟
Wedding Waitress منصة متكاملة لتخطيط الزفاف وتجربة الضيوف، تشمل الضيوف وتأكيدات الحضور والمقاعد والمطبوعات ومراجع المكان وخطة يوم الفعالية والذكريات المشتركة.
هل هي مخصصة للزفاف فقط؟
حفلات الزفاف هي محور المنصة الأساسي. ويمكنها أيضًا دعم الخطوبة وأعياد الميلاد وفعاليات الشركات وورش العمل والندوات وغيرها من الفعاليات المنظمة.
ما الذي تتضمنه الخطط؟
تتضمن خطط الأزواج الوصول إلى منصة Wedding Waitress المتكاملة. تختار الخطة بحسب عدد الضيوف الذي تحتاج إليه.
هل يحتاج الضيوف إلى تطبيق؟
لا. تُفتح تجارب QR والمعرض والبحث الخاصة بالضيوف في متصفح ويب متوافق.
كيف يعمل الجلوس باستخدام QR؟
تنشئ رمز QR فريدًا للفعالية. يمسحه الضيوف ويبحثون عن أسمائهم، ثم يرون معلومات الطاولة أو المقعد التي عيّنتها واخترت عرضها.
هل يمكنني طباعة لافتات الجلوس والمطبوعات؟
يتضمن Wedding Waitress تصدير ملفات PDF جاهزة للطباعة بالصيَغ المدعومة لمنتجات مثل لافتات الجلوس والمخططات والدعوات وبطاقات المقاعد. تظهر الصيَغ المتاحة داخل كل منتج.`),
  zh: row(`什么是 Wedding Waitress？
Wedding Waitress 是一站式婚礼筹划与宾客体验平台，涵盖宾客、出席回复、座位、印刷品、场地参考资料、活动当天安排和共享回忆。
它只适用于婚礼吗？
婚礼是平台的主要重点。它也可支持订婚、生日、企业活动、工作坊、研讨会及其他有组织的活动。
包含哪些功能？
新人套餐包含完整 Wedding Waitress 平台的使用权限。您可根据所需的宾客人数选择套餐。
宾客需要应用程序吗？
不需要。宾客的扫码、相册和查询体验在兼容的网页浏览器中打开。
二维码座位查询如何使用？
您创建一个活动专属二维码。宾客扫码后搜索自己的姓名，即可查看您已分配并选择展示的餐桌或座位信息。
可以打印座位标牌和婚礼印刷品吗？
Wedding Waitress 为座位标牌、座位图、邀请函和席位卡等产品提供支持格式的可打印 PDF 导出。每个产品内部会显示可用格式。`),
  vi: row(`Wedding Waitress là gì?
Wedding Waitress là nền tảng toàn diện cho kế hoạch đám cưới và trải nghiệm khách mời, gồm khách mời, RSVP, chỗ ngồi, ấn phẩm, tài liệu địa điểm, kế hoạch ngày sự kiện và kỷ niệm chung.
Nền tảng chỉ dành cho đám cưới sao?
Đám cưới là trọng tâm chính. Nền tảng cũng hỗ trợ đính hôn, sinh nhật, sự kiện doanh nghiệp, hội thảo thực hành, hội nghị và các sự kiện được tổ chức khác.
Gói bao gồm những gì?
Gói cặp đôi bao gồm quyền truy cập nền tảng Wedding Waitress đầy đủ. Bạn chọn gói theo số lượng khách mời cần hỗ trợ.
Khách mời có cần ứng dụng không?
Không. Trải nghiệm QR, thư viện và tra cứu dành cho khách mời mở trong trình duyệt web tương thích.
Chỗ ngồi QR hoạt động như thế nào?
Bạn tạo mã QR riêng cho sự kiện. Khách quét mã, tìm tên và xem thông tin bàn hoặc ghế mà bạn đã phân bổ và chọn hiển thị.
Tôi có thể in bảng chỗ ngồi và ấn phẩm không?
Wedding Waitress có chức năng xuất PDF sẵn để in với các định dạng được hỗ trợ cho bảng chỗ ngồi, sơ đồ, thiệp mời và thẻ chỗ ngồi. Mỗi sản phẩm hiển thị định dạng có sẵn.`),
  hi: row(`Wedding Waitress क्या है?
Wedding Waitress शादी की योजना और अतिथियों के अनुभव का एक संपूर्ण प्लेटफ़ॉर्म है। इसमें अतिथि, उपस्थिति पुष्टि, बैठने की व्यवस्था, मुद्रित सामग्री, स्थल संदर्भ, कार्यक्रम के दिन की योजना और साझा यादें शामिल हैं।
क्या यह केवल शादियों के लिए है?
शादियाँ प्लेटफ़ॉर्म का मुख्य केंद्र हैं। यह सगाई, जन्मदिन, कॉर्पोरेट कार्यक्रम, कार्यशालाओं, सेमिनारों और अन्य आयोजित कार्यक्रमों में भी उपयोगी है।
क्या शामिल है?
जोड़ों के प्लान में पूरे Wedding Waitress प्लेटफ़ॉर्म का उपयोग शामिल है। आप आवश्यक अतिथि क्षमता के अनुसार प्लान चुनते हैं।
क्या अतिथियों को ऐप चाहिए?
नहीं। अतिथियों की QR, गैलरी और खोज सुविधाएँ संगत वेब ब्राउज़र में खुलती हैं।
QR से सीट खोजने की सुविधा कैसे काम करती है?
आप कार्यक्रम का एक अनूठा QR कोड बनाते हैं। अतिथि उसे स्कैन करते हैं, अपना नाम खोजते हैं और आपके द्वारा तय की गई तथा दिखाई जाने के लिए चुनी गई मेज़ या सीट की जानकारी देखते हैं।
क्या मैं बैठने के संकेत-पट्ट और मुद्रित सामग्री प्रिंट कर सकता हूँ?
Wedding Waitress में बैठने के संकेत-पट्ट, चार्ट, निमंत्रण और नाम कार्ड जैसे उत्पादों के लिए समर्थित प्रिंट-तैयार PDF निर्यात हैं। उपलब्ध प्रारूप हर उत्पाद में दिखाए जाते हैं।`),
  tr: row(`Wedding Waitress nedir?
Wedding Waitress; misafirler, katılım yanıtları, oturma düzeni, basılı materyaller, mekân referansları, etkinlik günü planlaması ve paylaşılan anılar için kapsamlı bir düğün planlama ve misafir deneyimi platformudur.
Yalnızca düğünler için mi?
Düğünler platformun ana odağıdır. Nişanları, doğum günlerini, kurumsal etkinlikleri, atölyeleri, seminerleri ve diğer düzenli etkinlikleri de destekler.
Neler dahil?
Çift planları tüm Wedding Waitress platformuna erişim içerir. İhtiyaç duyduğunuz misafir kapasitesine göre bir plan seçersiniz.
Misafirlerin uygulamaya ihtiyacı var mı?
Hayır. Misafirlere yönelik QR, galeri ve arama deneyimleri uyumlu bir web tarayıcısında açılır.
QR oturma düzeni nasıl çalışır?
Etkinliğe özel bir QR kodu oluşturursunuz. Misafirler kodu tarar, adlarını arar ve atadığınız, gösterilmesini seçtiğiniz masa veya koltuk bilgilerini görür.
Oturma tabelalarını ve basılı materyalleri yazdırabilir miyim?
Wedding Waitress; oturma tabelaları, planlar, davetiyeler ve yer kartları gibi ürünler için desteklenen baskıya hazır PDF dışa aktarımları sunar. Kullanılabilir biçimler her ürünün içinde gösterilir.`),
  de: row(`Was ist Wedding Waitress?
Wedding Waitress ist eine umfassende Plattform für Hochzeitsplanung und Gästeerlebnis mit Gästen, Zu- und Absagen, Sitzordnung, Drucksachen, Unterlagen für den Veranstaltungsort, Tagesplanung und gemeinsamen Erinnerungen.
Ist sie nur für Hochzeiten gedacht?
Hochzeiten stehen im Mittelpunkt. Die Plattform unterstützt auch Verlobungen, Geburtstage, Firmenveranstaltungen, Workshops, Seminare und andere organisierte Veranstaltungen.
Was ist enthalten?
Pakete für Paare enthalten Zugang zur gesamten Wedding Waitress-Plattform. Sie wählen nach der benötigten Gästekapazität.
Brauchen Gäste eine App?
Nein. QR-, Galerie- und Suchangebote für Gäste öffnen sich in einem kompatiblen Webbrowser.
Wie funktioniert die Platzsuche mit QR-Code?
Sie erstellen einen eigenen QR-Code für Ihre Veranstaltung. Gäste scannen ihn, suchen ihren Namen und sehen die Tisch- oder Platzinformationen, die Sie zugewiesen und zur Anzeige ausgewählt haben.
Kann ich Sitzplatzschilder und Drucksachen ausdrucken?
Wedding Waitress bietet unterstützte druckfertige PDF-Exporte für Produkte wie Sitzplatzschilder, Pläne, Einladungen und Tischkarten. Verfügbare Formate werden im jeweiligen Produkt angezeigt.`),
  es: row(`¿Qué es Wedding Waitress?
Wedding Waitress es una plataforma integral de planificación de bodas y experiencia de invitados para gestionar invitados, RSVP, asientos, papelería, referencias del lugar, planificación del día y recuerdos compartidos.
¿Es solo para bodas?
Las bodas son el enfoque principal. También puede apoyar compromisos, cumpleaños, eventos corporativos, talleres, seminarios y otros eventos organizados.
¿Qué está incluido?
Los planes para parejas incluyen acceso a toda la plataforma Wedding Waitress. Eliges un plan según la capacidad de invitados que necesitas.
¿Los invitados necesitan una aplicación?
No. Las experiencias QR, galería y búsqueda para invitados se abren en un navegador web compatible.
¿Cómo funciona la asignación de asientos QR?
Creas un código QR exclusivo del evento. Los invitados lo escanean, buscan su nombre y ven la información de mesa o asiento que has asignado y elegido mostrar.
¿Puedo imprimir carteles de asientos y papelería?
Wedding Waitress incluye exportaciones PDF listas para imprimir en formatos compatibles para carteles, planos, invitaciones y tarjetas de sitio. Los formatos disponibles se muestran dentro de cada producto.`),
  fr: row(`Qu’est-ce que Wedding Waitress ?
Wedding Waitress est une plateforme complète de préparation de mariage et d’expérience des invités pour les invités, RSVP, places, papeterie, références du lieu, organisation du jour et souvenirs partagés.
Est-ce uniquement pour les mariages ?
Les mariages sont sa priorité. La plateforme prend aussi en charge fiançailles, anniversaires, événements d’entreprise, ateliers, séminaires et autres événements organisés.
Qu’est-ce qui est inclus ?
Les formules pour couples donnent accès à toute la plateforme Wedding Waitress. Vous choisissez selon le nombre d’invités nécessaire.
Les invités ont-ils besoin d’une application ?
Non. Les expériences QR, galerie et recherche pour les invités s’ouvrent dans un navigateur web compatible.
Comment fonctionne le placement par QR code ?
Vous créez un QR code unique pour l’événement. Les invités le scannent, recherchent leur nom et voient les informations de table ou de place que vous avez affectées et choisi d’afficher.
Puis-je imprimer la signalétique des places et la papeterie ?
Wedding Waitress propose des exports PDF prêts à imprimer dans les formats pris en charge pour les panneaux, plans, invitations et marque-places. Les formats disponibles sont indiqués dans chaque produit.`),
  nl: row(`Wat is Wedding Waitress?
Wedding Waitress is een compleet platform voor trouwplanning en gastenervaring met gasten, RSVP’s, zitplaatsen, drukwerk, locatieoverzichten, planning van de evenementdag en gedeelde herinneringen.
Is het alleen voor bruiloften?
Bruiloften zijn de belangrijkste focus. Het platform ondersteunt ook verlovingen, verjaardagen, bedrijfsevenementen, workshops, seminars en andere georganiseerde evenementen.
Wat is inbegrepen?
Pakketten voor stellen geven toegang tot het complete Wedding Waitress-platform. Je kiest op basis van de benodigde gastencapaciteit.
Hebben gasten een app nodig?
Nee. QR-, galerij- en zoekervaringen voor gasten openen in een geschikte webbrowser.
Hoe werkt het zitplan met QR-code?
Je maakt een unieke QR-code voor het evenement. Gasten scannen die, zoeken hun naam en bekijken de toegewezen tafel- of zitplaatsgegevens die jij hebt gekozen om te tonen.
Kan ik zitplaatsborden en drukwerk afdrukken?
Wedding Waitress bevat ondersteunde drukklare PDF-exports voor zitplaatsborden, plannen, uitnodigingen en naamkaartjes. De beschikbare formaten staan in elk product.`),
  ja: row(`Wedding Waitress とは何ですか？
Wedding Waitress は、ゲスト、出席回答、座席、ペーパーアイテム、会場資料、当日の計画、共有の思い出をまとめた婚礼プランニングとゲスト体験のプラットフォームです。
結婚式専用ですか？
結婚式が主な対象です。婚約祝い、誕生日、企業イベント、ワークショップ、セミナーなどの企画されたイベントにも対応できます。
何が含まれていますか？
カップル向けプランには Wedding Waitress 全体へのアクセスが含まれます。必要なゲスト数に応じてプランを選びます。
ゲストはアプリが必要ですか？
いいえ。ゲスト向けの QR、ギャラリー、検索体験は対応するウェブブラウザーで開きます。
QR による座席確認はどのように使いますか？
イベント専用の QR コードを作成します。ゲストはスキャンして自分の名前を検索し、あなたが割り当て、表示するよう選択したテーブルや座席の情報を確認します。
座席サインやペーパーアイテムを印刷できますか？
Wedding Waitress は、座席サイン、座席図、招待状、席札などの製品に対応する印刷用 PDF の書き出しを備えています。利用可能な形式は各製品内に表示されます。`),
  el: row(`Τι είναι το Wedding Waitress;
Το Wedding Waitress είναι μια ολοκληρωμένη πλατφόρμα σχεδιασμού γάμου και εμπειρίας καλεσμένων για καλεσμένους, RSVP, θέσεις, έντυπα, οδηγούς χώρου, οργάνωση ημέρας και κοινές αναμνήσεις.
Είναι μόνο για γάμους;
Οι γάμοι είναι η κύρια εστίαση. Υποστηρίζει επίσης αρραβώνες, γενέθλια, εταιρικές εκδηλώσεις, εργαστήρια, σεμινάρια και άλλες οργανωμένες εκδηλώσεις.
Τι περιλαμβάνεται;
Τα προγράμματα για ζευγάρια δίνουν πρόσβαση σε όλη την πλατφόρμα Wedding Waitress. Επιλέγετε σύμφωνα με τη χωρητικότητα καλεσμένων που χρειάζεστε.
Χρειάζονται οι καλεσμένοι εφαρμογή;
Όχι. Οι εμπειρίες QR, συλλογής και αναζήτησης για καλεσμένους ανοίγουν σε συμβατό πρόγραμμα περιήγησης.
Πώς λειτουργεί το πλάνο θέσεων QR;
Δημιουργείτε έναν μοναδικό κωδικό QR για την εκδήλωση. Οι καλεσμένοι τον σαρώνουν, αναζητούν το όνομά τους και βλέπουν το τραπέζι ή τη θέση που έχετε ορίσει και επιλέξει να εμφανίζεται.
Μπορώ να εκτυπώσω πινακίδες θέσεων και έντυπα;
Το Wedding Waitress περιλαμβάνει υποστηριζόμενες εξαγωγές PDF έτοιμες για εκτύπωση για πινακίδες, πλάνα, προσκλήσεις και κάρτες θέσεων. Οι διαθέσιμες μορφές εμφανίζονται μέσα σε κάθε προϊόν.`),
};
