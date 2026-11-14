import { publicGstRows, publicGstSources } from './publicGstCopy';
// Existing public FAQ wording translated without changing prices, limits or access rules.
const basePlanFaqSources = [
  'How does the seven-day free trial work?', 'The trial gives you seven days to explore the platform with up to 20 guests.',
  'Do I need a credit card for the trial?', 'No. A credit card is not required to start the seven-day trial.',
  'How long does a couple plan last?', 'Each couple plan covers one event and provides exactly 12 months of active planning access. You can extend for one month or any number of whole months at A$22 per month, paid upfront.',
  'Is the couple-plan price a subscription?', 'No. Essential, Premium and Ultimate are one-event plans with 12 months of access, not monthly couple subscriptions.',
  'Is GST added?', 'Prices are shown in Australian dollars and exclude GST. GST is calculated at checkout.',
  'How do the guest limits work?', 'Essential supports up to 100 guests, Premium up to 200 and Ultimate up to 400. The trial supports up to 20 guests.',
  'What happens to access after 12 months?', 'Planning, data and download access ends when your paid period expires. Your saved account, including photos and videos, remains recoverable for six calendar months. A paid extension during that recovery period restores access from payment time. If you do not extend by the recovery deadline, the recoverable account and content are permanently removed from Wedding Waitress.',
] as const;
const row = (text: string) => text.trim().split('\n');
const basePlanFaqRows: Record<string, readonly string[]> = {
  en: basePlanFaqSources,
  it: row(`Come funziona la prova gratuita di sette giorni?
La prova ti offre sette giorni per esplorare la piattaforma con un massimo di 20 ospiti.
Serve una carta di credito per la prova?
No. Non è richiesta una carta di credito per iniziare la prova di sette giorni.
Quanto dura un piano per una coppia?
Ogni piano per una coppia copre un evento e offre esattamente 12 mesi di accesso attivo alla pianificazione. Puoi prolungarlo di un mese o di un qualsiasi numero di mesi interi, a A$22 al mese, pagati in anticipo.
Il prezzo del piano per coppie è un abbonamento?
No. Essential, Premium e Ultimate sono piani per un evento con 12 mesi di accesso, non abbonamenti mensili per coppie.
Viene aggiunta la GST?
I prezzi sono espressi in dollari australiani ed escludono la GST. La GST viene calcolata al checkout.
Come funzionano i limiti degli ospiti?
Essential supporta fino a 100 ospiti, Premium fino a 200 e Ultimate fino a 400. La prova supporta fino a 20 ospiti.
Che cosa succede all’accesso dopo 12 mesi?
L’accesso alla pianificazione, ai dati e ai download termina alla scadenza del periodo pagato. L’account salvato, comprese foto e video, rimane recuperabile per sei mesi di calendario. Un’estensione pagata durante tale periodo ripristina l’accesso dal momento del pagamento. Senza estensione entro il termine di recupero, l’account e i contenuti recuperabili vengono rimossi definitivamente da Wedding Waitress.`),
  ar: row(`كيف تعمل التجربة المجانية لمدة سبعة أيام؟
تمنحك التجربة سبعة أيام لاستكشاف المنصة مع ما يصل إلى 20 ضيفًا.
هل أحتاج إلى بطاقة ائتمان للتجربة؟
لا. لا تحتاج إلى بطاقة ائتمان لبدء التجربة التي تستمر سبعة أيام.
ما مدة خطة الأزواج؟
تغطي كل خطة للأزواج فعالية واحدة وتوفر 12 شهرًا بالضبط من الوصول الفعّال إلى التخطيط. يمكنك التمديد لشهر واحد أو لأي عدد من الأشهر الكاملة مقابل A$22 شهريًا تُدفع مقدمًا.
هل سعر خطة الأزواج اشتراك؟
لا. Essential وPremium وUltimate خطط لفعالية واحدة مع 12 شهرًا من الوصول، وليست اشتراكات شهرية للأزواج.
هل تُضاف ضريبة GST؟
تُعرض الأسعار بالدولار الأسترالي ولا تشمل ضريبة GST. تُحسب الضريبة عند إتمام الشراء.
كيف تعمل حدود عدد الضيوف؟
تدعم Essential ما يصل إلى 100 ضيف، وPremium حتى 200، وUltimate حتى 400. تدعم التجربة حتى 20 ضيفًا.
ماذا يحدث للوصول بعد 12 شهرًا؟
ينتهي الوصول إلى التخطيط والبيانات والتنزيلات عند انتهاء الفترة المدفوعة. يبقى حسابك المحفوظ، بما فيه الصور والفيديو، قابلًا للاستعادة لمدة ستة أشهر تقويمية. يعيد التمديد المدفوع خلال فترة الاستعادة الوصول من وقت الدفع. إذا لم تمدّد قبل موعد انتهاء الاستعادة، يُحذف الحساب والمحتوى القابلان للاستعادة نهائيًا من Wedding Waitress.`),
  zh: row(`七天免费试用如何使用？
试用期为您提供七天时间体验平台，最多添加 20 位宾客。
试用需要信用卡吗？
不需要。开始七天试用无需信用卡。
新人套餐的期限是多久？
每个新人套餐适用于一场活动，并提供整整 12 个月的有效筹划权限。您可按一个月或任意整数月延长，每月 A$22，需预付。
新人套餐的价格是订阅费用吗？
不是。Essential、Premium 和 Ultimate 是适用于一场活动、提供 12 个月权限的套餐，不是新人月度订阅。
是否另加 GST？
价格以澳大利亚元显示，不含 GST。GST 在结账时计算。
宾客人数上限如何规定？
Essential 最多支持 100 位宾客，Premium 为 200 位，Ultimate 为 400 位。试用最多支持 20 位宾客。
12 个月后使用权限会怎样？
付费期限结束时，筹划、数据和下载权限终止。保存的账户（包括照片和视频）仍可在六个自然月内恢复。在恢复期内付费延长，可从付款时间起恢复权限。如果未在恢复期限前延长，可恢复的账户和内容将从 Wedding Waitress 永久删除。`),
  vi: row(`Dùng thử miễn phí bảy ngày hoạt động như thế nào?
Bạn có bảy ngày khám phá nền tảng với tối đa 20 khách mời.
Tôi có cần thẻ tín dụng để dùng thử không?
Không. Bạn không cần thẻ tín dụng để bắt đầu dùng thử bảy ngày.
Gói dành cho cặp đôi có thời hạn bao lâu?
Mỗi gói cặp đôi áp dụng cho một sự kiện và cung cấp đúng 12 tháng truy cập lập kế hoạch. Bạn có thể gia hạn một tháng hoặc bất kỳ số tháng nguyên nào với giá A$22 mỗi tháng, trả trước.
Giá gói cặp đôi có phải là phí đăng ký định kỳ không?
Không. Essential, Premium và Ultimate là gói cho một sự kiện với 12 tháng truy cập, không phải đăng ký hàng tháng cho cặp đôi.
Có cộng thêm GST không?
Giá hiển thị bằng đô la Úc và chưa bao gồm GST. GST được tính khi thanh toán.
Giới hạn khách mời hoạt động như thế nào?
Essential hỗ trợ tối đa 100 khách, Premium tối đa 200 và Ultimate tối đa 400. Dùng thử hỗ trợ tối đa 20 khách.
Quyền truy cập sẽ thế nào sau 12 tháng?
Quyền lập kế hoạch, dữ liệu và tải xuống kết thúc khi thời hạn trả phí hết hạn. Tài khoản đã lưu, gồm ảnh và video, vẫn có thể khôi phục trong sáu tháng theo lịch. Gia hạn trả phí trong thời gian này khôi phục quyền truy cập từ lúc thanh toán. Nếu không gia hạn trước hạn khôi phục, tài khoản và nội dung có thể khôi phục sẽ bị xóa vĩnh viễn khỏi Wedding Waitress.`),
  hi: row(`सात दिन का मुफ़्त परीक्षण कैसे काम करता है?
परीक्षण में आपको अधिकतम 20 अतिथियों के साथ प्लेटफ़ॉर्म जानने के लिए सात दिन मिलते हैं।
क्या परीक्षण के लिए क्रेडिट कार्ड चाहिए?
नहीं। सात दिन का परीक्षण शुरू करने के लिए क्रेडिट कार्ड की आवश्यकता नहीं है।
जोड़ों का प्लान कितने समय तक चलता है?
हर जोड़े का प्लान एक कार्यक्रम के लिए है और ठीक 12 महीने का सक्रिय योजना उपयोग देता है। आप एक महीने या किसी भी पूर्ण संख्या में महीनों के लिए इसे A$22 प्रति माह की दर से बढ़ा सकते हैं। भुगतान अग्रिम है।
क्या जोड़ों के प्लान की कीमत सदस्यता शुल्क है?
नहीं। Essential, Premium और Ultimate एक कार्यक्रम के लिए 12 महीने के उपयोग वाले प्लान हैं, जोड़ों की मासिक सदस्यताएँ नहीं।
क्या GST जोड़ा जाता है?
कीमतें ऑस्ट्रेलियाई डॉलर में दिखाई जाती हैं और उनमें GST शामिल नहीं है। GST की गणना चेकआउट पर होती है।
अतिथियों की सीमाएँ कैसे काम करती हैं?
Essential में अधिकतम 100, Premium में 200 और Ultimate में 400 अतिथि हैं। परीक्षण में अधिकतम 20 अतिथि हैं।
12 महीने बाद उपयोग का क्या होता है?
भुगतान वाली अवधि खत्म होने पर योजना, डेटा और डाउनलोड का उपयोग समाप्त हो जाता है। फ़ोटो और वीडियो सहित आपका सहेजा गया खाता छह कैलेंडर महीनों तक बहाल किया जा सकता है। इस अवधि में भुगतान करके अवधि बढ़ाने पर उपयोग भुगतान के समय से बहाल होता है। बहाली की समय-सीमा तक अवधि नहीं बढ़ाने पर बहाल किए जा सकने वाले खाते और सामग्री को Wedding Waitress से स्थायी रूप से हटा दिया जाता है।`),
  tr: row(`Yedi günlük ücretsiz deneme nasıl çalışır?
Deneme, platformu en fazla 20 misafirle keşfetmeniz için yedi gün sunar.
Deneme için kredi kartı gerekir mi?
Hayır. Yedi günlük denemeyi başlatmak için kredi kartı gerekmez.
Çift planı ne kadar sürer?
Her çift planı bir etkinliği kapsar ve tam 12 ay aktif planlama erişimi sağlar. Bir ay veya istediğiniz sayıda tam ay için aylık A$22 karşılığında peşin ödeme yaparak uzatabilirsiniz.
Çift planının fiyatı bir abonelik ücreti mi?
Hayır. Essential, Premium ve Ultimate, 12 aylık erişim sunan tek etkinlik planlarıdır; aylık çift abonelikleri değildir.
GST eklenir mi?
Fiyatlar Avustralya doları cinsinden gösterilir ve GST hariçtir. GST ödeme sırasında hesaplanır.
Misafir sınırları nasıl çalışır?
Essential en fazla 100, Premium 200 ve Ultimate 400 misafiri destekler. Deneme en fazla 20 misafiri destekler.
12 aydan sonra erişime ne olur?
Ücretli süreniz dolduğunda planlama, veri ve indirme erişimi biter. Fotoğraf ve videolar dahil kayıtlı hesabınız altı takvim ayı boyunca kurtarılabilir. Bu sürede ücretli uzatma, ödeme anından itibaren erişimi geri getirir. Kurtarma son tarihine kadar uzatmazsanız kurtarılabilir hesap ve içerikler Wedding Waitress’ten kalıcı olarak kaldırılır.`),
  de: row(`Wie funktioniert die siebentägige kostenlose Testphase?
Sie haben sieben Tage, um die Plattform mit bis zu 20 Gästen kennenzulernen.
Brauche ich eine Kreditkarte für die Testphase?
Nein. Für den Beginn der siebentägigen Testphase ist keine Kreditkarte erforderlich.
Wie lange gilt ein Paket für Paare?
Jedes Paket für Paare gilt für eine Veranstaltung und bietet genau 12 Monate aktiven Planungszugang. Sie können um einen Monat oder beliebig viele ganze Monate für A$22 pro Monat verlängern, im Voraus bezahlt.
Ist der Preis des Pakets für Paare ein Abonnement?
Nein. Essential, Premium und Ultimate sind Pakete für eine Veranstaltung mit 12 Monaten Zugang, keine monatlichen Paar-Abonnements.
Wird GST hinzugefügt?
Die Preise werden in australischen Dollar ohne GST angezeigt. GST wird beim Bezahlen berechnet.
Wie funktionieren die Gästegrenzen?
Essential unterstützt bis zu 100 Gäste, Premium bis zu 200 und Ultimate bis zu 400. Die Testphase unterstützt bis zu 20 Gäste.
Was passiert mit dem Zugang nach 12 Monaten?
Planungs-, Daten- und Downloadzugang enden mit Ablauf des bezahlten Zeitraums. Ihr gespeichertes Konto einschließlich Fotos und Videos bleibt sechs Kalendermonate wiederherstellbar. Eine bezahlte Verlängerung in dieser Zeit stellt den Zugang ab Zahlung wieder her. Ohne Verlängerung bis zur Wiederherstellungsfrist werden das wiederherstellbare Konto und seine Inhalte dauerhaft aus Wedding Waitress entfernt.`),
  es: row(`¿Cómo funciona la prueba gratuita de siete días?
La prueba te da siete días para explorar la plataforma con hasta 20 invitados.
¿Necesito tarjeta de crédito para la prueba?
No. No se necesita tarjeta de crédito para iniciar la prueba de siete días.
¿Cuánto dura un plan para parejas?
Cada plan para parejas cubre un evento y ofrece exactamente 12 meses de acceso activo a la planificación. Puedes ampliar un mes o cualquier número de meses completos por A$22 al mes, pagados por adelantado.
¿El precio del plan para parejas es una suscripción?
No. Essential, Premium y Ultimate son planes para un evento con 12 meses de acceso, no suscripciones mensuales para parejas.
¿Se añade GST?
Los precios se muestran en dólares australianos y no incluyen GST. El GST se calcula al pagar.
¿Cómo funcionan los límites de invitados?
Essential admite hasta 100 invitados, Premium hasta 200 y Ultimate hasta 400. La prueba admite hasta 20 invitados.
¿Qué ocurre con el acceso después de 12 meses?
El acceso a planificación, datos y descargas termina cuando vence el período pagado. Tu cuenta guardada, con fotos y vídeos, puede recuperarse durante seis meses naturales. Una ampliación pagada en ese período restablece el acceso desde el momento del pago. Si no amplías antes del plazo de recuperación, la cuenta y el contenido recuperables se eliminan permanentemente de Wedding Waitress.`),
  fr: row(`Comment fonctionne l’essai gratuit de sept jours ?
L’essai vous donne sept jours pour découvrir la plateforme avec jusqu’à 20 invités.
Faut-il une carte bancaire pour l’essai ?
Non. Aucune carte bancaire n’est nécessaire pour commencer l’essai de sept jours.
Combien de temps dure une formule pour couples ?
Chaque formule couvre un événement et offre exactement 12 mois d’accès actif à la planification. Vous pouvez prolonger d’un mois ou de n’importe quel nombre de mois entiers à A$22 par mois, payés à l’avance.
Le prix de la formule pour couples est-il un abonnement ?
Non. Essential, Premium et Ultimate sont des formules pour un événement avec 12 mois d’accès, pas des abonnements mensuels pour couples.
La GST est-elle ajoutée ?
Les prix sont affichés en dollars australiens hors GST. La GST est calculée au paiement.
Comment fonctionnent les limites d’invités ?
Essential accueille jusqu’à 100 invités, Premium jusqu’à 200 et Ultimate jusqu’à 400. L’essai accueille jusqu’à 20 invités.
Que devient l’accès après 12 mois ?
L’accès à la planification, aux données et aux téléchargements prend fin à l’expiration de la période payée. Votre compte enregistré, photos et vidéos comprises, reste récupérable pendant six mois calendaires. Une prolongation payée pendant cette période rétablit l’accès à partir du paiement. Sans prolongation avant la date limite de récupération, le compte et les contenus récupérables sont définitivement supprimés de Wedding Waitress.`),
  nl: row(`Hoe werkt de gratis proefperiode van zeven dagen?
De proefperiode geeft je zeven dagen om het platform te ontdekken met maximaal 20 gasten.
Heb ik een creditcard nodig voor de proefperiode?
Nee. Je hebt geen creditcard nodig om de proefperiode van zeven dagen te starten.
Hoe lang geldt een pakket voor stellen?
Elk pakket geldt voor één evenement en geeft precies 12 maanden actieve planningstoegang. Je kunt met één maand of elk aantal hele maanden verlengen voor A$22 per maand, vooraf betaald.
Is de prijs van het pakket voor stellen een abonnement?
Nee. Essential, Premium en Ultimate zijn pakketten voor één evenement met 12 maanden toegang, geen maandelijkse abonnementen voor stellen.
Wordt GST toegevoegd?
Prijzen worden weergegeven in Australische dollars, exclusief GST. GST wordt bij het afrekenen berekend.
Hoe werken de gastenlimieten?
Essential ondersteunt maximaal 100 gasten, Premium 200 en Ultimate 400. De proefperiode ondersteunt maximaal 20 gasten.
Wat gebeurt er met de toegang na 12 maanden?
Toegang tot planning, gegevens en downloads eindigt wanneer je betaalde periode verloopt. Je opgeslagen account, inclusief foto’s en video’s, blijft zes kalendermaanden herstelbaar. Een betaalde verlenging tijdens deze periode herstelt toegang vanaf het betaalmoment. Als je niet verlengt vóór de hersteltermijn, worden het herstelbare account en de inhoud permanent uit Wedding Waitress verwijderd.`),
  ja: row(`七日間の無料トライアルはどのように利用できますか？
トライアルでは、最大 20 名のゲストとともに七日間プラットフォームを体験できます。
トライアルにクレジットカードは必要ですか？
いいえ。七日間のトライアル開始にクレジットカードは不要です。
カップル向けプランはどのくらい利用できますか？
各プランは一つのイベントを対象とし、ちょうど 12 か月間の有効なプランニング利用権を提供します。一か月または任意の整数月で延長でき、月額 A$22 を前払いします。
カップル向けプランの料金はサブスクリプションですか？
いいえ。Essential、Premium、Ultimate は一つのイベントに対応する 12 か月間のプランであり、カップル向けの月額サブスクリプションではありません。
GST は追加されますか？
料金は豪ドルで表示され、GST は含まれません。GST は決済時に計算されます。
ゲスト数の上限はどのように決まっていますか？
Essential は最大 100 名、Premium は 200 名、Ultimate は 400 名に対応します。トライアルは最大 20 名です。
12 か月後の利用権はどうなりますか？
有料期間が終了すると、プランニング、データ、ダウンロードへのアクセスは終了します。写真や動画を含む保存済みアカウントは、六か月間の暦月で復元可能です。この復元期間中に有料延長すると、支払い時点からアクセスが復元されます。復元期限までに延長しない場合、復元可能なアカウントと内容は Wedding Waitress から完全に削除されます。`),
  el: row(`Πώς λειτουργεί η δωρεάν δοκιμή επτά ημερών;
Η δοκιμή σας δίνει επτά ημέρες για να εξερευνήσετε την πλατφόρμα με έως 20 καλεσμένους.
Χρειάζομαι πιστωτική κάρτα για τη δοκιμή;
Όχι. Δεν απαιτείται πιστωτική κάρτα για την έναρξη της δοκιμής επτά ημερών.
Πόσο διαρκεί ένα πρόγραμμα για ζευγάρια;
Κάθε πρόγραμμα καλύπτει μία εκδήλωση και παρέχει ακριβώς 12 μήνες ενεργής πρόσβασης στον σχεδιασμό. Μπορείτε να παρατείνετε για έναν μήνα ή οποιονδήποτε αριθμό ολόκληρων μηνών με A$22 τον μήνα, πληρωμένα προκαταβολικά.
Η τιμή του προγράμματος για ζευγάρια είναι συνδρομή;
Όχι. Τα Essential, Premium και Ultimate είναι προγράμματα μίας εκδήλωσης με 12 μήνες πρόσβασης, όχι μηνιαίες συνδρομές ζευγαριών.
Προστίθεται GST;
Οι τιμές εμφανίζονται σε αυστραλιανά δολάρια χωρίς GST. Η GST υπολογίζεται στο ταμείο.
Πώς λειτουργούν τα όρια καλεσμένων;
Το Essential υποστηρίζει έως 100 καλεσμένους, το Premium έως 200 και το Ultimate έως 400. Η δοκιμή υποστηρίζει έως 20.
Τι συμβαίνει στην πρόσβαση μετά από 12 μήνες;
Η πρόσβαση σε σχεδιασμό, δεδομένα και λήψεις λήγει όταν τελειώσει η πληρωμένη περίοδος. Ο αποθηκευμένος λογαριασμός, μαζί με φωτογραφίες και βίντεο, παραμένει ανακτήσιμος για έξι ημερολογιακούς μήνες. Μια πληρωμένη παράταση σε αυτό το διάστημα επαναφέρει την πρόσβαση από τη στιγμή της πληρωμής. Αν δεν παρατείνετε έως την προθεσμία ανάκτησης, ο ανακτήσιμος λογαριασμός και το περιεχόμενο αφαιρούνται οριστικά από το Wedding Waitress.`),
};
export const publicPlanFaqSources = basePlanFaqSources.map((text,index) => index === 5 ? text + ' ' + publicGstSources[0] : index === 9 ? publicGstSources[4] : text);
export const publicPlanFaqRows: Record<string, readonly string[]> = Object.fromEntries(Object.entries(basePlanFaqRows).map(([language,texts]) => [language,texts.map((text,index) => index === 5 ? text + ' ' + publicGstRows[language][0] : index === 9 ? publicGstRows[language][4] : text)]));
