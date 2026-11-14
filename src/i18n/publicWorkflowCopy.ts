// Public explanations only. The authoritative dashboard workflow stays English.
export const publicWorkflowSources = [
  'Create and manage your event first. When complete, continue to the Event Budget Planner.',
  'Plan and manage the event budget. When complete, continue to Tables.',
  'Create the Head Table and remaining guest tables. When complete, continue to Guest List.',
  'Add and manage guests and allocate them to tables. When complete, continue to the QR Code Seating Chart.',
  'Design and Prepare Everything',
  'Create invitations, cards, signage, floor plans, place cards, seating references and kitchen-ready dietary lists from the same event data.',
  'Share With Guests and Run Your Day',
  'Help guests find seats, brief your DJ and MC, share the run sheet, and bring guest photos, messages and the live slideshow together.',
  'Stage ', 'Begin with the details you already know',
  'Try the complete platform for seven days with up to 20 guests. No credit card required.',
  'Wedding Waitress keeps the information you add connected, so each step supports the stationery, seating, supplier and guest experiences that follow.',
] as const;
const row = (text: string) => text.trim().split('\n');
export const publicWorkflowRows: Record<string, readonly string[]> = {
  en: publicWorkflowSources,
  it: row(`Crea e gestisci prima il tuo evento. Poi passa al pianificatore del budget dell’evento.
Pianifica e gestisci il budget dell’evento. Poi passa ai tavoli.
Crea il tavolo principale e gli altri tavoli degli ospiti. Poi passa alla lista ospiti.
Aggiungi e gestisci gli ospiti e assegnali ai tavoli. Poi passa al piano dei posti con codice QR.
Progetta e prepara tutto
Crea inviti, biglietti, segnaletica, planimetrie, segnaposto, riferimenti dei posti e liste alimentari per la cucina dagli stessi dati dell’evento.
Condividi con gli ospiti e gestisci la giornata
Aiuta gli ospiti a trovare i posti, informa il DJ e il presentatore, condividi il programma e riunisci foto, messaggi e presentazione dal vivo.
Fase
Inizia dai dettagli che già conosci
Prova la piattaforma completa per sette giorni con un massimo di 20 ospiti. Nessuna carta di credito richiesta.
Wedding Waitress mantiene collegate le informazioni che aggiungi, così ogni fase supporta i materiali stampati, i posti, i fornitori e le esperienze degli ospiti che seguono.`),
  ar: row(`أنشئ فعاليتك وأدرها أولًا. عند الانتهاء، انتقل إلى مخطط ميزانية الفعالية.
خطّط ميزانية الفعالية وأدرها. عند الانتهاء، انتقل إلى الطاولات.
أنشئ الطاولة الرئيسية وبقية طاولات الضيوف. عند الانتهاء، انتقل إلى قائمة الضيوف.
أضف الضيوف وأدرهم ووزّعهم على الطاولات. عند الانتهاء، انتقل إلى مخطط الجلوس برمز QR.
صمّم كل التفاصيل وجهّزها
أنشئ الدعوات والبطاقات واللافتات ومخططات القاعة وبطاقات الأسماء ومراجع الجلوس وقوائم الاحتياجات الغذائية للمطبخ من بيانات الفعالية نفسها.
شارك مع الضيوف وأدر يومك
ساعد الضيوف على إيجاد المقاعد، وأطلع منسق الموسيقى ومقدم الحفل على التفاصيل، وشارك جدول الفعالية، واجمع صور الضيوف ورسائلهم وعرض الصور المباشر.
المرحلة
ابدأ بالتفاصيل التي تعرفها بالفعل
جرّب المنصة كاملة لمدة سبعة أيام مع ما يصل إلى 20 ضيفًا. لا حاجة إلى بطاقة ائتمان.
يربط Wedding Waitress المعلومات التي تضيفها، بحيث تدعم كل خطوة المطبوعات والمقاعد والموردين وتجارب الضيوف التي تليها.`),
  zh: row(`先创建并管理您的活动。完成后，前往活动预算规划工具。
规划和管理活动预算。完成后，前往餐桌安排。
创建主桌和其他宾客餐桌。完成后，前往宾客名单。
添加并管理宾客，将他们安排到餐桌。完成后，前往二维码座位图。
设计并准备所有细节
根据同一套活动数据制作邀请函、卡片、标牌、平面图、席位卡、座位参考表及供厨房使用的饮食需求清单。
与宾客分享并协调当天的活动
帮助宾客找到座位，向 DJ 和主持人提供说明，分享活动流程表，并汇集宾客照片、留言和实时幻灯片。
阶段
从您已知的细节开始
免费试用完整平台七天，最多添加 20 位宾客。无需信用卡。
Wedding Waitress 将您添加的信息连接起来，让每个步骤都支持后续的印刷品、座位安排、供应商和宾客体验。`),
  vi: row(`Trước tiên, tạo và quản lý sự kiện. Khi hoàn tất, chuyển sang công cụ lập ngân sách sự kiện.
Lập kế hoạch và quản lý ngân sách sự kiện. Khi hoàn tất, chuyển sang bàn.
Tạo bàn chính và các bàn khách mời còn lại. Khi hoàn tất, chuyển sang danh sách khách mời.
Thêm, quản lý và phân bổ khách mời vào bàn. Khi hoàn tất, chuyển sang sơ đồ chỗ ngồi mã QR.
Thiết kế và chuẩn bị mọi thứ
Tạo thiệp mời, thiệp, bảng hướng dẫn, sơ đồ mặt bằng, thẻ chỗ ngồi, bảng tham khảo chỗ ngồi và danh sách nhu cầu ăn uống cho bếp từ cùng dữ liệu sự kiện.
Chia sẻ với khách mời và điều phối ngày sự kiện
Giúp khách tìm chỗ ngồi, hướng dẫn DJ và MC, chia sẻ lịch trình, kết nối ảnh, lời nhắn và trình chiếu trực tiếp.
Giai đoạn
Bắt đầu từ các chi tiết bạn đã biết
Dùng thử nền tảng đầy đủ trong bảy ngày với tối đa 20 khách mời. Không cần thẻ tín dụng.
Wedding Waitress kết nối thông tin bạn thêm vào, để mỗi bước hỗ trợ ấn phẩm, chỗ ngồi, nhà cung cấp và trải nghiệm khách mời ở các bước tiếp theo.`),
  hi: row(`पहले अपना कार्यक्रम बनाएँ और प्रबंधित करें। पूरा होने पर कार्यक्रम बजट योजनाकार पर जाएँ।
कार्यक्रम का बजट बनाएँ और प्रबंधित करें। पूरा होने पर मेज़ों पर जाएँ।
मुख्य मेज़ और अतिथियों की बाकी मेज़ें बनाएँ। पूरा होने पर अतिथि सूची पर जाएँ।
अतिथियों को जोड़ें, प्रबंधित करें और मेज़ों पर बाँटें। पूरा होने पर QR कोड बैठने के चार्ट पर जाएँ।
हर चीज़ डिज़ाइन करें और तैयार करें
कार्यक्रम की एक ही जानकारी से निमंत्रण, कार्ड, संकेत-पट्ट, फ़्लोर प्लान, नाम कार्ड, बैठने के संदर्भ और रसोई के लिए आहार सूचियाँ बनाएँ।
अतिथियों से साझा करें और अपना दिन संचालित करें
अतिथियों को सीट खोजने में मदद करें, DJ और संचालक को जानकारी दें, कार्यक्रम की समय-सारणी साझा करें और अतिथियों की फ़ोटो, संदेश और लाइव स्लाइडशो एक जगह लाएँ।
चरण
उन विवरणों से शुरुआत करें जिन्हें आप पहले से जानते हैं
अधिकतम 20 अतिथियों के साथ पूरा प्लेटफ़ॉर्म सात दिनों तक आज़माएँ। क्रेडिट कार्ड की आवश्यकता नहीं है।
Wedding Waitress आपकी जोड़ी गई जानकारी को जुड़ा रखता है, ताकि हर चरण आगे की मुद्रित सामग्री, बैठने की व्यवस्था, प्रदाताओं और अतिथियों के अनुभव को सहारा दे।`),
  tr: row(`Önce etkinliğinizi oluşturun ve yönetin. Tamamlayınca etkinlik bütçesi planlayıcısına geçin.
Etkinlik bütçesini planlayın ve yönetin. Tamamlayınca masalara geçin.
Ana masayı ve diğer misafir masalarını oluşturun. Tamamlayınca misafir listesine geçin.
Misafirleri ekleyin, yönetin ve masalara yerleştirin. Tamamlayınca QR kodlu oturma planına geçin.
Her şeyi tasarlayın ve hazırlayın
Aynı etkinlik verilerinden davetiyeler, kartlar, tabelalar, yerleşim planları, yer kartları, oturma referansları ve mutfak için beslenme listeleri oluşturun.
Misafirlerle paylaşın ve gününüzü yönetin
Misafirlerin yerlerini bulmasına yardımcı olun, DJ ve sunucunuzu bilgilendirin, etkinlik akışını paylaşın; misafir fotoğraflarını, mesajlarını ve canlı slayt gösterisini bir araya getirin.
Aşama
Zaten bildiğiniz ayrıntılarla başlayın
Tüm platformu en fazla 20 misafirle yedi gün deneyin. Kredi kartı gerekmez.
Wedding Waitress eklediğiniz bilgileri bağlantılı tutar; böylece her adım sonraki basılı materyalleri, oturma düzenini, tedarikçileri ve misafir deneyimlerini destekler.`),
  de: row(`Erstellen und verwalten Sie zuerst Ihre Veranstaltung. Wechseln Sie danach zum Budgetplaner für Veranstaltungen.
Planen und verwalten Sie das Veranstaltungsbudget. Wechseln Sie danach zu den Tischen.
Erstellen Sie den Haupttisch und die übrigen Gästetische. Wechseln Sie danach zur Gästeliste.
Fügen Sie Gäste hinzu, verwalten Sie sie und weisen Sie ihnen Tische zu. Wechseln Sie danach zum Sitzplan mit QR-Code.
Gestalten und bereiten Sie alles vor
Erstellen Sie Einladungen, Karten, Schilder, Raumpläne, Tischkarten, Sitzübersichten und Ernährungslisten für die Küche aus denselben Veranstaltungsdaten.
Teilen Sie Informationen und organisieren Sie Ihren Tag
Helfen Sie Gästen bei der Platzsuche, informieren Sie DJ und Moderator, teilen Sie den Ablaufplan und verbinden Sie Gästefotos, Nachrichten und die Live-Diashow.
Etappe
Beginnen Sie mit den Details, die Sie bereits kennen
Testen Sie die gesamte Plattform sieben Tage mit bis zu 20 Gästen. Keine Kreditkarte erforderlich.
Wedding Waitress hält Ihre Informationen verbunden, sodass jeder Schritt die folgenden Drucksachen, Sitzpläne, Dienstleister und Gästeerlebnisse unterstützt.`),
  es: row(`Primero crea y gestiona tu evento. Cuando termines, continúa con el planificador del presupuesto.
Planifica y gestiona el presupuesto del evento. Cuando termines, continúa con las mesas.
Crea la mesa principal y las demás mesas de invitados. Cuando termines, continúa con la lista de invitados.
Añade y gestiona invitados y asígnalos a mesas. Cuando termines, continúa con el plano de asientos con código QR.
Diseña y prepara todo
Crea invitaciones, tarjetas, señalización, planos, tarjetas de sitio, referencias de asientos y listas alimentarias para cocina a partir de los mismos datos del evento.
Comparte con los invitados y coordina tu día
Ayuda a los invitados a encontrar asiento, informa a tu DJ y maestro de ceremonias, comparte el programa y reúne fotos, mensajes y la presentación en directo.
Etapa
Empieza con los detalles que ya conoces
Prueba la plataforma completa durante siete días con hasta 20 invitados. No necesitas tarjeta de crédito.
Wedding Waitress mantiene conectada la información que añades, para que cada paso apoye la papelería, los asientos, los proveedores y las experiencias de invitados que siguen.`),
  fr: row(`Créez et gérez d’abord votre événement. Ensuite, passez au planificateur du budget.
Planifiez et gérez le budget de l’événement. Ensuite, passez aux tables.
Créez la table principale et les autres tables des invités. Ensuite, passez à la liste d’invités.
Ajoutez et gérez les invités, puis affectez-les aux tables. Ensuite, passez au plan de table par QR code.
Concevez et préparez tout
Créez invitations, cartes, signalétique, plans, marque-places, références des places et listes alimentaires pour la cuisine à partir des mêmes données.
Partagez avec les invités et coordonnez votre journée
Aidez les invités à trouver leur place, informez votre DJ et animateur, partagez le déroulé et réunissez les photos, messages et diaporama en direct.
Étape
Commencez par les détails que vous connaissez déjà
Essayez toute la plateforme pendant sept jours avec jusqu’à 20 invités. Aucune carte bancaire requise.
Wedding Waitress relie les informations que vous ajoutez, afin que chaque étape soutienne la papeterie, les places, les prestataires et les expériences des invités qui suivent.`),
  nl: row(`Maak en beheer eerst je evenement. Ga daarna verder naar de budgetplanner.
Plan en beheer het evenementbudget. Ga daarna verder naar de tafels.
Maak de hoofdtafel en de overige gastentafels. Ga daarna verder naar de gastenlijst.
Voeg gasten toe, beheer ze en wijs ze toe aan tafels. Ga daarna verder naar het zitplan met QR-code.
Ontwerp en bereid alles voor
Maak uitnodigingen, kaarten, borden, plattegronden, naamkaartjes, zitoverzichten en dieetlijsten voor de keuken met dezelfde evenementgegevens.
Deel met gasten en organiseer je dag
Help gasten hun plek te vinden, informeer je DJ en ceremoniemeester, deel het draaiboek en breng gastfoto’s, berichten en de live-diavoorstelling samen.
Stap
Begin met de details die je al kent
Probeer het hele platform zeven dagen met maximaal 20 gasten. Geen creditcard nodig.
Wedding Waitress houdt je informatie verbonden, zodat elke stap het volgende drukwerk, de zitplaatsen, leveranciers en gastenervaringen ondersteunt.`),
  ja: row(`まずイベントを作成して管理します。完了したらイベント予算プランナーへ進みます。
イベントの予算を計画して管理します。完了したらテーブルへ進みます。
メインテーブルとその他のゲストテーブルを作成します。完了したらゲストリストへ進みます。
ゲストを追加・管理し、テーブルに割り当てます。完了したら QR コードの座席図へ進みます。
すべてをデザインして準備
同じイベントデータから招待状、カード、サイン、会場図、席札、座席一覧、厨房向けの食事要件リストを作成します。
ゲストと共有して当日を進行
ゲストの席探しを助け、DJ と司会者に説明し、進行表を共有して、ゲストの写真やメッセージ、ライブスライドショーをまとめます。
段階
すでにわかっている詳細から始める
最大 20 名のゲストでプラットフォーム全体を七日間お試しください。クレジットカードは不要です。
Wedding Waitress は入力した情報をつなぎ、各ステップがその後のペーパーアイテム、座席、業者やゲストの体験を支えます。`),
  el: row(`Δημιουργήστε και διαχειριστείτε πρώτα την εκδήλωσή σας. Έπειτα συνεχίστε στον σχεδιαστή προϋπολογισμού.
Σχεδιάστε και διαχειριστείτε τον προϋπολογισμό. Έπειτα συνεχίστε στα τραπέζια.
Δημιουργήστε το κεντρικό τραπέζι και τα υπόλοιπα τραπέζια καλεσμένων. Έπειτα συνεχίστε στη λίστα καλεσμένων.
Προσθέστε και διαχειριστείτε καλεσμένους και τοποθετήστε τους στα τραπέζια. Έπειτα συνεχίστε στο πλάνο θέσεων με QR.
Σχεδιάστε και προετοιμάστε τα πάντα
Δημιουργήστε προσκλήσεις, κάρτες, πινακίδες, κατόψεις, κάρτες θέσεων, οδηγούς θέσεων και διατροφικές λίστες για την κουζίνα από τα ίδια δεδομένα.
Μοιραστείτε με τους καλεσμένους και οργανώστε την ημέρα σας
Βοηθήστε τους καλεσμένους να βρουν θέση, ενημερώστε DJ και παρουσιαστή, μοιραστείτε το πρόγραμμα και συνδέστε φωτογραφίες, μηνύματα και ζωντανή προβολή.
Στάδιο
Ξεκινήστε με τις λεπτομέρειες που ήδη γνωρίζετε
Δοκιμάστε ολόκληρη την πλατφόρμα για επτά ημέρες με έως 20 καλεσμένους. Δεν απαιτείται πιστωτική κάρτα.
Το Wedding Waitress συνδέει τις πληροφορίες που προσθέτετε, ώστε κάθε βήμα να υποστηρίζει τα έντυπα, τις θέσεις, τους προμηθευτές και τις εμπειρίες καλεσμένων που ακολουθούν.`),
};
