export const publicSharedAccessibilitySources = [
  'Copyright ©', 'Australian flag', 'Footer', 'Wedding Waitress home',
  'Open menu', 'Close menu', 'Open products menu', 'Open event types menu',
  'See How It Works', 'Play hero video', 'Pause hero video', 'Play', 'Pause',
  'Homepage video controls', 'Turn sound on', 'Mute sound', 'Sound on', 'Muted',
  'Wedding Waitress on Instagram', 'Wedding Waitress on Facebook', 'Wedding Waitress on YouTube',
  'Choose language',
] as const;
const row = (text: string) => text.split('|');
export const publicSharedAccessibilityRows: Record<string, readonly string[]> = {
  en: publicSharedAccessibilitySources,
  zh: row('版权所有 ©|澳大利亚国旗|页脚|Wedding Waitress 首页|打开菜单|关闭菜单|打开产品菜单|打开活动类型菜单|查看使用方法|播放首页视频|暂停首页视频|播放|暂停|Wedding Waitress 的 Instagram 页面|Wedding Waitress 的 Facebook 页面|Wedding Waitress 的 YouTube 页面'),
  it: row('Copyright ©|Bandiera australiana|Piè di pagina|Pagina iniziale di Wedding Waitress|Apri menu|Chiudi menu|Apri menu prodotti|Apri menu tipi di evento|Scopri come funziona|Riproduci video iniziale|Metti in pausa il video iniziale|Riproduci|Pausa|Wedding Waitress su Instagram|Wedding Waitress su Facebook|Wedding Waitress su YouTube'),
  ar: row('حقوق النشر ©|العلم الأسترالي|تذييل الصفحة|الصفحة الرئيسية لـ Wedding Waitress|فتح القائمة|إغلاق القائمة|فتح قائمة المنتجات|فتح قائمة أنواع الفعاليات|اطّلع على طريقة العمل|تشغيل فيديو الصفحة الرئيسية|إيقاف فيديو الصفحة الرئيسية مؤقتاً|تشغيل|إيقاف مؤقت|Wedding Waitress على Instagram|Wedding Waitress على Facebook|Wedding Waitress على YouTube'),
  vi: row('Bản quyền ©|Quốc kỳ Úc|Chân trang|Trang chủ Wedding Waitress|Mở trình đơn|Đóng trình đơn|Mở trình đơn sản phẩm|Mở trình đơn loại sự kiện|Xem cách hoạt động|Phát video trang chủ|Tạm dừng video trang chủ|Phát|Tạm dừng|Wedding Waitress trên Instagram|Wedding Waitress trên Facebook|Wedding Waitress trên YouTube'),
  hi: row('कॉपीराइट ©|ऑस्ट्रेलियाई झंडा|पादलेख|Wedding Waitress का मुखपृष्ठ|मेन्यू खोलें|मेन्यू बंद करें|उत्पाद मेन्यू खोलें|आयोजन प्रकार मेन्यू खोलें|देखें यह कैसे काम करता है|मुखपृष्ठ वीडियो चलाएँ|मुखपृष्ठ वीडियो रोकें|चलाएँ|रोकें|Instagram पर Wedding Waitress|Facebook पर Wedding Waitress|YouTube पर Wedding Waitress'),
  tr: row('Telif hakkı ©|Avustralya bayrağı|Alt bilgi|Wedding Waitress ana sayfası|Menüyü aç|Menüyü kapat|Ürün menüsünü aç|Etkinlik türleri menüsünü aç|Nasıl çalıştığını görün|Ana sayfa videosunu oynat|Ana sayfa videosunu duraklat|Oynat|Duraklat|Instagram’da Wedding Waitress|Facebook’ta Wedding Waitress|YouTube’da Wedding Waitress'),
  de: row('Copyright ©|Australische Flagge|Fußbereich|Wedding Waitress Startseite|Menü öffnen|Menü schließen|Produktmenü öffnen|Menü für Veranstaltungsarten öffnen|So funktioniert es|Startseitenvideo abspielen|Startseitenvideo pausieren|Abspielen|Pause|Wedding Waitress auf Instagram|Wedding Waitress auf Facebook|Wedding Waitress auf YouTube'),
  es: row('Derechos de autor ©|Bandera de Australia|Pie de página|Inicio de Wedding Waitress|Abrir menú|Cerrar menú|Abrir menú de productos|Abrir menú de tipos de evento|Ver cómo funciona|Reproducir vídeo de inicio|Pausar vídeo de inicio|Reproducir|Pausar|Wedding Waitress en Instagram|Wedding Waitress en Facebook|Wedding Waitress en YouTube'),
  fr: row('Copyright ©|Drapeau australien|Pied de page|Accueil de Wedding Waitress|Ouvrir le menu|Fermer le menu|Ouvrir le menu des produits|Ouvrir le menu des types d’événement|Voir le fonctionnement|Lire la vidéo d’accueil|Mettre la vidéo d’accueil en pause|Lire|Pause|Wedding Waitress sur Instagram|Wedding Waitress sur Facebook|Wedding Waitress sur YouTube'),
  nl: row('Copyright ©|Australische vlag|Voettekst|Wedding Waitress startpagina|Menu openen|Menu sluiten|Productmenu openen|Menu met evenementtypen openen|Bekijk hoe het werkt|Startpaginavideo afspelen|Startpaginavideo pauzeren|Afspelen|Pauzeren|Wedding Waitress op Instagram|Wedding Waitress op Facebook|Wedding Waitress op YouTube'),
  ja: row('著作権 ©|オーストラリア国旗|フッター|Wedding Waitress ホーム|メニューを開く|メニューを閉じる|製品メニューを開く|イベントの種類のメニューを開く|使い方を見る|ホーム動画を再生|ホーム動画を一時停止|再生|一時停止|Wedding Waitress の Instagram|Wedding Waitress の Facebook|Wedding Waitress の YouTube'),
  el: row('Πνευματικά δικαιώματα ©|Αυστραλιανή σημαία|Υποσέλιδο|Αρχική σελίδα Wedding Waitress|Άνοιγμα μενού|Κλείσιμο μενού|Άνοιγμα μενού προϊόντων|Άνοιγμα μενού τύπων εκδήλωσης|Δείτε πώς λειτουργεί|Αναπαραγωγή βίντεο αρχικής σελίδας|Παύση βίντεο αρχικής σελίδας|Αναπαραγωγή|Παύση|Wedding Waitress στο Instagram|Wedding Waitress στο Facebook|Wedding Waitress στο YouTube'),
};
const languageLabels: Record<string, string> = {
  it: 'Scegli lingua', ar: 'اختر اللغة', zh: '选择语言', vi: 'Chọn ngôn ngữ',
  hi: 'भाषा चुनें', tr: 'Dil seçin', de: 'Sprache wählen', es: 'Elegir idioma',
  fr: 'Choisir la langue', nl: 'Taal kiezen', ja: '言語を選択', el: 'Επιλογή γλώσσας',
};
const heroVideoControlLabels: Record<string, readonly string[]> = {
  zh: ['主页视频控件', '打开声音', '静音', '声音开启', '已静音'],
  it: ['Controlli video della pagina iniziale', 'Attiva audio', 'Disattiva audio', 'Audio attivo', 'Disattivato'],
  ar: ['عناصر التحكم بفيديو الصفحة الرئيسية', 'تشغيل الصوت', 'كتم الصوت', 'الصوت قيد التشغيل', 'مكتوم'],
  vi: ['Các nút điều khiển video trang chủ', 'Bật âm thanh', 'Tắt tiếng', 'Đã bật âm thanh', 'Đã tắt tiếng'],
  hi: ['होमपेज वीडियो नियंत्रण', 'ध्वनि चालू करें', 'ध्वनि म्यूट करें', 'ध्वनि चालू', 'म्यूट किया गया'],
  tr: ['Ana sayfa video kontrolleri', 'Sesi aç', 'Sesi kapat', 'Ses açık', 'Sessiz'],
  de: ['Videosteuerung der Startseite', 'Ton einschalten', 'Ton stummschalten', 'Ton an', 'Stumm'],
  es: ['Controles de vídeo de la página de inicio', 'Activar sonido', 'Silenciar sonido', 'Sonido activado', 'Silenciado'],
  fr: ["Commandes vidéo de la page d’accueil", 'Activer le son', 'Couper le son', 'Son activé', 'Muet'],
  nl: ['Videobediening startpagina', 'Geluid inschakelen', 'Geluid dempen', 'Geluid aan', 'Gedempt'],
  ja: ['ホームページ動画コントロール', '音声をオン', 'ミュート', '音声オン', 'ミュート中'],
  el: ['Στοιχεία ελέγχου βίντεο αρχικής σελίδας', 'Ενεργοποίηση ήχου', 'Σίγαση ήχου', 'Ήχος ενεργός', 'Σε σίγαση'],
};
for (const [language, labels] of Object.entries(heroVideoControlLabels)) {
  const existing = publicSharedAccessibilityRows[language];
  publicSharedAccessibilityRows[language] = [...existing.slice(0, 13), ...labels, ...existing.slice(13)];
}
for (const [language, label] of Object.entries(languageLabels)) publicSharedAccessibilityRows[language] = [...publicSharedAccessibilityRows[language], label];
