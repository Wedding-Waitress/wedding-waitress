export const publicFeatureFaqSources = [
  'Can I upgrade?', 'Available upgrade options are shown through the account and checkout flow. If you are unsure which plan you need, contact Wedding Waitress before purchasing.',
  'Can I create invitations, Save the Date and Thank You cards?', 'Yes. All three card types are available in the Invitations & Cards designer, with supported text, background, QR and personalisation controls.',
  'Does Wedding Waitress include ceremony and reception floor plans?', 'Yes. The Floor Plan product provides separate ceremony and reception planning views based on the options supported in each layout.',
  'How does Live Slideshow work at a wedding?', 'Open the Live Slideshow on a venue touchscreen, tablet, laptop or desktop display. Guests can approach the device, search their name and find their table or seat.',
  'What is included in Photo & Video Sharing?', 'It brings together guest photo and short-video uploads, a gallery, digital guestbook, digital photo booth and live slideshow in one principal product.',
  'Can I share my Run Sheet and DJ & MC Questionnaire?', 'Both products include their own supported sharing and PDF controls so you can prepare information for the relevant venue and suppliers.',
  'What is the refund policy?', 'Paid plans are generally non-refundable once activated. Please review the current Terms of Service for the complete approved policy and contact support if you believe there has been an error.',
  'Frequently asked questions', 'Clear information about the platform, plans and the way guests and suppliers use Wedding Waitress.', 'Still need help? ', 'Contact Wedding Waitress',
] as const;
const row = (text: string) => text.trim().split('\n');
export const publicFeatureFaqRows: Record<string, readonly string[]> = {
  en: publicFeatureFaqSources,
  it: row(`Posso passare a un piano superiore?
Le opzioni disponibili sono mostrate nell’account e durante il checkout. Se non sei sicuro del piano necessario, contatta Wedding Waitress prima dell’acquisto.
Posso creare inviti, annunci della data e biglietti di ringraziamento?
Sì. Tutti e tre i tipi sono disponibili nel designer Inviti e biglietti, con controlli supportati per testo, sfondo, QR e personalizzazione.
Wedding Waitress include planimetrie per cerimonia e ricevimento?
Sì. Il prodotto Planimetrie offre viste separate per cerimonia e ricevimento, in base alle opzioni supportate da ogni layout.
Come funziona la presentazione dal vivo a un matrimonio?
Aprila sul touchscreen della location, su tablet, portatile o schermo desktop. Gli ospiti possono avvicinarsi, cercare il proprio nome e trovare il tavolo o posto.
Che cosa include la condivisione di foto e video?
Riunisce caricamenti di foto e brevi video degli ospiti, galleria, libro degli ospiti digitale, cabina fotografica digitale e presentazione dal vivo in un prodotto principale.
Posso condividere il programma e il questionario per DJ e presentatore?
Entrambi includono i propri controlli supportati di condivisione e PDF per preparare informazioni per la location e i fornitori interessati.
Qual è la politica dei rimborsi?
I piani pagati sono generalmente non rimborsabili dopo l’attivazione. Consulta i Termini di servizio attuali per la politica completa approvata e contatta l’assistenza se ritieni che ci sia stato un errore.
Domande frequenti
Informazioni chiare sulla piattaforma, sui piani e su come ospiti e fornitori utilizzano Wedding Waitress.
Hai ancora bisogno di aiuto?
Contatta Wedding Waitress`),
  ar: row(`هل يمكنني الترقية؟
تظهر خيارات الترقية المتاحة في الحساب ومسار إتمام الشراء. إذا لم تكن متأكدًا من الخطة المناسبة، تواصل مع Wedding Waitress قبل الشراء.
هل يمكنني إنشاء الدعوات وبطاقات إعلان الموعد والشكر؟
نعم. تتوفر أنواع البطاقات الثلاثة في مصمم الدعوات والبطاقات، مع أدوات النص والخلفية وQR والتخصيص المدعومة.
هل يشمل Wedding Waitress مخططات قاعة المراسم والاستقبال؟
نعم. يوفر منتج مخططات القاعة عرضين منفصلين لتخطيط المراسم والاستقبال بحسب الخيارات المدعومة في كل تصميم.
كيف يعمل عرض الصور المباشر في الزفاف؟
افتحه على شاشة لمس في المكان أو جهاز لوحي أو محمول أو شاشة كمبيوتر مكتبي. يستطيع الضيوف الاقتراب من الجهاز والبحث عن أسمائهم وإيجاد طاولاتهم أو مقاعدهم.
ما الذي تتضمنه مشاركة الصور والفيديو؟
تجمع تحميل صور الضيوف والفيديوهات القصيرة والمعرض ودفتر الضيوف الرقمي وكابينة التصوير الرقمية وعرض الصور المباشر في منتج رئيسي واحد.
هل يمكنني مشاركة جدول الفعالية واستبيان منسق الموسيقى ومقدم الحفل؟
يتضمن كل منتج أدوات المشاركة وPDF المدعومة الخاصة به، لإعداد معلومات للمكان والموردين المعنيين.
ما سياسة الاسترداد؟
الخطط المدفوعة عمومًا غير قابلة للاسترداد بعد التفعيل. راجع شروط الخدمة الحالية للاطلاع على السياسة المعتمدة كاملةً، وتواصل مع الدعم إذا كنت تعتقد أن خطأ قد حدث.
الأسئلة الشائعة
معلومات واضحة عن المنصة والخطط وكيفية استخدام الضيوف والموردين لـ Wedding Waitress.
هل ما زلت تحتاج إلى مساعدة؟
تواصل مع Wedding Waitress`),
  zh: row(`可以升级套餐吗？
可用的升级选项会显示在账户和结账流程中。如果不确定需要哪个套餐，请在购买前联系 Wedding Waitress。
可以制作邀请函、婚期预告卡和感谢卡吗？
可以。这三类卡片均可在邀请函与卡片设计器中制作，支持文字、背景、二维码和个性化控制。
Wedding Waitress 包含仪式和婚宴平面图吗？
包含。平面布局图产品提供独立的仪式和婚宴规划视图，具体依据每种布局支持的选项。
实时幻灯片在婚礼上如何使用？
在场地触摸屏、平板、笔记本或桌面显示器上打开实时幻灯片。宾客可走近设备，搜索姓名并找到自己的餐桌或座位。
照片与视频分享包含什么？
一个主要产品汇集了宾客照片和短视频上传、相册、数字留言簿、数字照相亭和实时幻灯片。
可以分享活动流程表及 DJ 与主持人问卷吗？
两种产品都有各自支持的分享和 PDF 控制，可用于为相关场地和供应商准备信息。
退款政策是什么？
付费套餐激活后通常不可退款。请查看当前服务条款中的完整获批政策；如果您认为发生了错误，请联系支持团队。
常见问题
有关平台、套餐及宾客和供应商如何使用 Wedding Waitress 的清晰说明。
仍然需要帮助？
联系 Wedding Waitress`),
  vi: row(`Tôi có thể nâng cấp không?
Các tùy chọn nâng cấp có sẵn hiển thị trong tài khoản và quy trình thanh toán. Nếu chưa rõ cần gói nào, hãy liên hệ Wedding Waitress trước khi mua.
Tôi có thể tạo thiệp mời, thiệp báo ngày và thiệp cảm ơn không?
Có. Cả ba loại có trong trình thiết kế Thiệp mời và thiệp, với công cụ văn bản, nền, QR và cá nhân hóa được hỗ trợ.
Wedding Waitress có sơ đồ lễ cưới và tiệc cưới không?
Có. Sản phẩm sơ đồ mặt bằng có hai chế độ riêng cho lễ và tiệc cưới, dựa trên tùy chọn được hỗ trợ trong từng bố cục.
Trình chiếu trực tiếp hoạt động như thế nào tại đám cưới?
Mở trên màn hình cảm ứng tại địa điểm, máy tính bảng, máy tính xách tay hoặc màn hình máy tính để bàn. Khách đến thiết bị, tìm tên và thấy bàn hoặc ghế của mình.
Chia sẻ ảnh và video bao gồm những gì?
Sản phẩm chính này kết hợp tải ảnh và video ngắn của khách, thư viện, sổ lưu bút số, buồng chụp ảnh số và trình chiếu trực tiếp.
Tôi có thể chia sẻ lịch trình và bảng câu hỏi DJ, MC không?
Cả hai có công cụ chia sẻ và PDF riêng được hỗ trợ, giúp chuẩn bị thông tin cho địa điểm và nhà cung cấp liên quan.
Chính sách hoàn tiền là gì?
Gói trả phí thường không được hoàn tiền sau khi kích hoạt. Hãy xem Điều khoản dịch vụ hiện tại để biết chính sách đầy đủ đã được phê duyệt và liên hệ hỗ trợ nếu bạn cho rằng có lỗi.
Câu hỏi thường gặp
Thông tin rõ ràng về nền tảng, gói và cách khách mời, nhà cung cấp sử dụng Wedding Waitress.
Bạn vẫn cần hỗ trợ?
Liên hệ Wedding Waitress`),
  hi: row(`क्या मैं अपग्रेड कर सकता हूँ?
उपलब्ध अपग्रेड विकल्प खाते और चेकआउट प्रक्रिया में दिखते हैं। यदि सही प्लान को लेकर संशय है, तो खरीदने से पहले Wedding Waitress से संपर्क करें।
क्या मैं निमंत्रण, तारीख की सूचना और धन्यवाद कार्ड बना सकता हूँ?
हाँ। निमंत्रण और कार्ड डिज़ाइनर में तीनों प्रकार उपलब्ध हैं, समर्थित टेक्स्ट, पृष्ठभूमि, QR और निजीकरण नियंत्रणों के साथ।
क्या Wedding Waitress में समारोह और स्वागत-समारोह के फ़्लोर प्लान हैं?
हाँ। फ़्लोर प्लान उत्पाद हर लेआउट में समर्थित विकल्पों के अनुसार समारोह और स्वागत-समारोह की अलग योजना दृश्य देता है।
शादी में लाइव स्लाइडशो कैसे काम करता है?
इसे स्थल की टचस्क्रीन, टैबलेट, लैपटॉप या डेस्कटॉप डिस्प्ले पर खोलें। अतिथि उपकरण के पास आकर अपना नाम खोजते हैं और मेज़ या सीट पाते हैं।
फ़ोटो और वीडियो साझा करने में क्या शामिल है?
यह एक मुख्य उत्पाद में अतिथियों की फ़ोटो और छोटे वीडियो अपलोड, गैलरी, डिजिटल अतिथि-पुस्तिका, डिजिटल फ़ोटो बूथ और लाइव स्लाइडशो जोड़ता है।
क्या मैं समय-सारणी और DJ व संचालक की प्रश्नावली साझा कर सकता हूँ?
दोनों उत्पादों में अपने समर्थित साझाकरण और PDF नियंत्रण हैं, ताकि संबंधित स्थल और प्रदाताओं के लिए जानकारी तैयार कर सकें।
रिफ़ंड नीति क्या है?
भुगतान वाले प्लान सक्रिय होने के बाद सामान्यतः गैर-वापसीयोग्य होते हैं। पूरी स्वीकृत नीति के लिए वर्तमान सेवा शर्तें देखें और यदि आपको त्रुटि लगती है तो सहायता से संपर्क करें।
अक्सर पूछे जाने वाले प्रश्न
प्लेटफ़ॉर्म, प्लान और अतिथियों व प्रदाताओं द्वारा Wedding Waitress के उपयोग की स्पष्ट जानकारी।
क्या अभी भी मदद चाहिए?
Wedding Waitress से संपर्क करें`),
  tr: row(`Yükseltme yapabilir miyim?
Mevcut yükseltme seçenekleri hesapta ve ödeme akışında gösterilir. Hangi plana ihtiyacınız olduğundan emin değilseniz satın almadan önce Wedding Waitress’e ulaşın.
Davetiyeler, tarih duyuruları ve teşekkür kartları oluşturabilir miyim?
Evet. Üç kart türü de desteklenen metin, arka plan, QR ve kişiselleştirme kontrolleriyle Davetiyeler ve kartlar tasarımcısında bulunur.
Wedding Waitress tören ve resepsiyon yerleşim planları içerir mi?
Evet. Yerleşim planı ürünü, her düzende desteklenen seçeneklere göre ayrı tören ve resepsiyon planlama görünümleri sunar.
Düğünde canlı slayt gösterisi nasıl kullanılır?
Mekândaki dokunmatik ekran, tablet, dizüstü bilgisayar veya masaüstü ekranda açın. Misafirler cihaza yaklaşıp adlarını arayarak masalarını veya yerlerini bulabilir.
Fotoğraf ve video paylaşımına neler dahil?
Tek ana üründe misafir fotoğrafları ve kısa video yüklemeleri, galeri, dijital ziyaretçi defteri, dijital fotoğraf kabini ve canlı slayt gösterisi birleşir.
Etkinlik akışını ve DJ ile sunucu anketini paylaşabilir miyim?
Her iki ürün, ilgili mekân ve tedarikçilere bilgi hazırlamanız için kendi desteklenen paylaşım ve PDF kontrollerini içerir.
İade politikası nedir?
Ücretli planlar etkinleştirildikten sonra genellikle iade edilmez. Tam onaylı politika için güncel Hizmet Şartları’nı inceleyin; hata olduğunu düşünüyorsanız destekle iletişime geçin.
Sık sorulan sorular
Platform, planlar ve misafirlerle tedarikçilerin Wedding Waitress’i kullanma şekli hakkında açık bilgiler.
Hâlâ yardıma mı ihtiyacınız var?
Wedding Waitress’e ulaşın`),
  de: row(`Kann ich ein Upgrade durchführen?
Verfügbare Upgrade-Optionen werden im Konto und im Bezahlvorgang angezeigt. Wenn Sie unsicher sind, welches Paket Sie benötigen, kontaktieren Sie Wedding Waitress vor dem Kauf.
Kann ich Einladungen, Terminankündigungen und Dankeskarten erstellen?
Ja. Alle drei Kartentypen sind im Designer für Einladungen und Karten verfügbar, mit unterstützten Text-, Hintergrund-, QR- und Personalisierungsfunktionen.
Enthält Wedding Waitress Raumpläne für Zeremonie und Empfang?
Ja. Das Raumplan-Produkt bietet getrennte Planungsansichten für Zeremonie und Empfang, entsprechend den unterstützten Optionen des jeweiligen Layouts.
Wie funktioniert die Live-Diashow bei einer Hochzeit?
Öffnen Sie sie auf einem Touchscreen am Veranstaltungsort, Tablet, Laptop oder Desktop-Bildschirm. Gäste können zum Gerät gehen, ihren Namen suchen und ihren Tisch oder Platz finden.
Was enthält die Foto- und Videofreigabe?
Sie vereint Gästefotos und kurze Video-Uploads, Galerie, digitales Gästebuch, digitale Fotobox und Live-Diashow in einem Hauptprodukt.
Kann ich Ablaufplan und DJ- und Moderatoren-Fragebogen teilen?
Beide Produkte haben eigene unterstützte Freigabe- und PDF-Funktionen, damit Sie Informationen für den jeweiligen Veranstaltungsort und Dienstleister vorbereiten können.
Wie lautet die Erstattungsrichtlinie?
Bezahlte Pakete sind nach Aktivierung grundsätzlich nicht erstattungsfähig. Lesen Sie die aktuellen Nutzungsbedingungen für die vollständige genehmigte Richtlinie und kontaktieren Sie den Support, wenn Sie einen Fehler vermuten.
Häufig gestellte Fragen
Klare Informationen zur Plattform, zu Paketen und dazu, wie Gäste und Dienstleister Wedding Waitress nutzen.
Brauchen Sie noch Hilfe?
Wedding Waitress kontaktieren`),
  es: row(`¿Puedo mejorar mi plan?
Las opciones disponibles se muestran en la cuenta y el proceso de pago. Si no sabes qué plan necesitas, contacta con Wedding Waitress antes de comprar.
¿Puedo crear invitaciones, avisos de fecha y tarjetas de agradecimiento?
Sí. Los tres tipos están en el diseñador de Invitaciones y tarjetas, con controles compatibles de texto, fondo, QR y personalización.
¿Wedding Waitress incluye planos de ceremonia y recepción?
Sí. El producto Planos ofrece vistas independientes para ceremonia y recepción, según las opciones compatibles de cada distribución.
¿Cómo funciona la presentación en directo en una boda?
Ábrela en una pantalla táctil del lugar, tableta, portátil o pantalla de escritorio. Los invitados se acercan, buscan su nombre y encuentran su mesa o asiento.
¿Qué incluye compartir fotos y vídeos?
Reúne las fotos y vídeos cortos de invitados, una galería, un libro de visitas digital, un fotomatón digital y una presentación en directo en un producto principal.
¿Puedo compartir mi programa y cuestionario para DJ y maestro de ceremonias?
Ambos tienen sus propios controles compatibles de compartir y PDF para preparar información para el lugar y los proveedores pertinentes.
¿Cuál es la política de reembolso?
Los planes pagados generalmente no son reembolsables una vez activados. Consulta los Términos de servicio actuales para la política completa aprobada y contacta con soporte si crees que ha habido un error.
Preguntas frecuentes
Información clara sobre la plataforma, los planes y cómo invitados y proveedores utilizan Wedding Waitress.
¿Aún necesitas ayuda?
Contacta con Wedding Waitress`),
  fr: row(`Puis-je passer à une formule supérieure ?
Les options disponibles sont affichées dans le compte et le parcours de paiement. Si vous hésitez sur la formule, contactez Wedding Waitress avant l’achat.
Puis-je créer invitations, annonces de date et cartes de remerciement ?
Oui. Les trois types figurent dans le designer Invitations et cartes, avec les commandes de texte, fond, QR et personnalisation prises en charge.
Wedding Waitress inclut-il des plans de cérémonie et de réception ?
Oui. Le produit Plans de salle propose des vues distinctes pour la cérémonie et la réception, selon les options prises en charge par chaque disposition.
Comment fonctionne le diaporama en direct lors d’un mariage ?
Ouvrez-le sur un écran tactile du lieu, une tablette, un ordinateur portable ou un écran de bureau. Les invités peuvent s’approcher, rechercher leur nom et trouver leur table ou place.
Que comprend le partage de photos et vidéos ?
Il réunit les photos et courtes vidéos des invités, une galerie, un livre d’or numérique, un photomaton numérique et un diaporama en direct dans un produit principal.
Puis-je partager mon déroulé et mon questionnaire DJ et animateur ?
Les deux produits ont leurs propres commandes de partage et PDF prises en charge, pour préparer des informations destinées au lieu et aux prestataires concernés.
Quelle est la politique de remboursement ?
Les formules payantes sont généralement non remboursables après activation. Consultez les Conditions de service actuelles pour la politique complète approuvée et contactez l’assistance si vous pensez qu’une erreur s’est produite.
Questions fréquentes
Des informations claires sur la plateforme, les formules et l’utilisation de Wedding Waitress par les invités et prestataires.
Besoin d’aide supplémentaire ?
Contacter Wedding Waitress`),
  nl: row(`Kan ik upgraden?
Beschikbare upgrades staan in het account en het betaalproces. Weet je niet welk pakket je nodig hebt, neem dan vóór aankoop contact op met Wedding Waitress.
Kan ik uitnodigingen, datumkaarten en bedankkaarten maken?
Ja. Alle drie zijn beschikbaar in de ontwerper voor Uitnodigingen en kaarten, met ondersteunde tekst-, achtergrond-, QR- en personalisatieopties.
Heeft Wedding Waitress plattegronden voor ceremonie en receptie?
Ja. Het product Plattegronden biedt afzonderlijke planningsweergaven voor ceremonie en receptie, op basis van de opties die elke indeling ondersteunt.
Hoe werkt de live-diavoorstelling op een bruiloft?
Open die op een touchscreen op de locatie, tablet, laptop of desktopscherm. Gasten kunnen naar het apparaat gaan, hun naam zoeken en hun tafel of plek vinden.
Wat is inbegrepen bij foto’s en video’s delen?
Dit hoofdproduct combineert gastfoto’s en korte video-uploads, een galerij, digitaal gastenboek, digitale fotocabine en live-diavoorstelling.
Kan ik mijn draaiboek en vragenlijst voor DJ en ceremoniemeester delen?
Beide producten hebben eigen ondersteunde deel- en PDF-opties, zodat je informatie kunt voorbereiden voor de betreffende locatie en leveranciers.
Wat is het terugbetalingsbeleid?
Betaalde pakketten zijn na activering doorgaans niet restitueerbaar. Lees de huidige servicevoorwaarden voor het volledige goedgekeurde beleid en neem contact op met support als je een fout vermoedt.
Veelgestelde vragen
Duidelijke informatie over het platform, pakketten en hoe gasten en leveranciers Wedding Waitress gebruiken.
Nog hulp nodig?
Neem contact op met Wedding Waitress`),
  ja: row(`アップグレードできますか？
利用可能なアップグレードはアカウントと決済手順に表示されます。必要なプランがわからない場合は、購入前に Wedding Waitress へお問い合わせください。
招待状、日程案内、サンクスカードを作れますか？
はい。招待状とカードのデザイナーで三種類すべてを利用でき、対応する文字、背景、QR、個別設定の操作ができます。
Wedding Waitress に挙式と披露宴の会場図はありますか？
はい。会場レイアウト製品は、各配置で対応する選択肢に基づき、挙式と披露宴の独立した計画画面を提供します。
結婚式でライブスライドショーをどう使いますか？
会場のタッチスクリーン、タブレット、ノートパソコン、デスクトップ画面で開きます。ゲストは端末に近づき、自分の名前を検索してテーブルや席を見つけられます。
写真と動画の共有には何が含まれますか？
ゲストの写真や短い動画のアップロード、ギャラリー、デジタルゲストブック、デジタル写真ブース、ライブスライドショーを一つの主要製品にまとめています。
進行表と DJ・司会者の質問票を共有できますか？
どちらも独自の対応する共有・PDF 操作を備え、関係する会場や業者向けの情報を準備できます。
返金ポリシーはどうなっていますか？
有料プランは有効化後、通常返金できません。承認されたポリシー全体は現在の利用規約をご確認ください。誤りがあったと思われる場合はサポートにお問い合わせください。
よくある質問
プラットフォーム、プラン、ゲストや業者による Wedding Waitress の使い方についてのわかりやすい情報。
さらにサポートが必要ですか？
Wedding Waitress に問い合わせる`),
  el: row(`Μπορώ να αναβαθμίσω;
Οι διαθέσιμες αναβαθμίσεις εμφανίζονται στον λογαριασμό και στη διαδικασία πληρωμής. Αν δεν είστε βέβαιοι ποιο πρόγραμμα χρειάζεστε, επικοινωνήστε με το Wedding Waitress πριν αγοράσετε.
Μπορώ να δημιουργήσω προσκλήσεις, ανακοινώσεις ημερομηνίας και ευχαριστήριες κάρτες;
Ναι. Και οι τρεις τύποι είναι διαθέσιμοι στον σχεδιαστή Προσκλήσεις και κάρτες, με υποστηριζόμενα εργαλεία κειμένου, φόντου, QR και εξατομίκευσης.
Το Wedding Waitress περιλαμβάνει κατόψεις τελετής και δεξίωσης;
Ναι. Το προϊόν Κατόψεις προσφέρει ξεχωριστές προβολές τελετής και δεξίωσης, σύμφωνα με τις επιλογές που υποστηρίζει κάθε διάταξη.
Πώς λειτουργεί η ζωντανή προβολή σε έναν γάμο;
Ανοίξτε την σε οθόνη αφής του χώρου, τάμπλετ, φορητό υπολογιστή ή επιτραπέζια οθόνη. Οι καλεσμένοι πλησιάζουν, αναζητούν το όνομά τους και βρίσκουν τραπέζι ή θέση.
Τι περιλαμβάνει η κοινή χρήση φωτογραφιών και βίντεο;
Συνδυάζει φωτογραφίες και σύντομα βίντεο καλεσμένων, συλλογή, ψηφιακό βιβλίο επισκεπτών, ψηφιακό φωτογραφικό θάλαμο και ζωντανή προβολή σε ένα κύριο προϊόν.
Μπορώ να μοιραστώ το πρόγραμμα και το ερωτηματολόγιο DJ και παρουσιαστή;
Και τα δύο προϊόντα διαθέτουν δικά τους υποστηριζόμενα εργαλεία κοινοποίησης και PDF για την προετοιμασία πληροφοριών για τον χώρο και τους σχετικούς προμηθευτές.
Ποια είναι η πολιτική επιστροφών;
Τα πληρωμένα προγράμματα γενικά δεν επιστρέφονται μετά την ενεργοποίηση. Δείτε τους τρέχοντες Όρους υπηρεσίας για ολόκληρη την εγκεκριμένη πολιτική και επικοινωνήστε με την υποστήριξη αν πιστεύετε ότι έγινε λάθος.
Συχνές ερωτήσεις
Σαφείς πληροφορίες για την πλατφόρμα, τα προγράμματα και τη χρήση του Wedding Waitress από καλεσμένους και προμηθευτές.
Χρειάζεστε ακόμη βοήθεια;
Επικοινωνήστε με το Wedding Waitress`),
};
