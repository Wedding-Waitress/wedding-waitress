export const publicMediaSectionLabelSources = [
  'Five connected experiences', 'Let guests contribute, interact and enjoy the moments together',
  'Sharing', 'Gallery', 'Guestbook', 'Photo Booth', 'Photo & Video Gallery',
  'Digital Guestbook', 'Digital Photo Booth', 'Photo and video features',
] as const;
const row = (text: string) => text.split('|');
export const publicMediaSectionLabelRows: Record<string, readonly string[]> = {
  en: publicMediaSectionLabelSources,
  it: row('Cinque esperienze collegate|Lascia che gli ospiti contribuiscano, interagiscano e vivano insieme i momenti|Condivisione|Galleria|Libro degli ospiti|Cabina fotografica|Galleria foto e video|Libro degli ospiti digitale|Cabina fotografica digitale|Funzioni foto e video'),
  ar: row('خمس تجارب متصلة|دع الضيوف يشاركون ويتفاعلون ويستمتعون باللحظات معًا|مشاركة|معرض|سجل الضيوف|كشك الصور|معرض الصور والفيديو|سجل ضيوف رقمي|كشك صور رقمي|ميزات الصور والفيديو'),
  zh: row('五种互相连接的体验|让宾客一起分享、互动并享受精彩时刻|分享|相册|留言簿|拍照亭|照片与视频相册|数字留言簿|数字拍照亭|照片与视频功能'),
  vi: row('Năm trải nghiệm kết nối|Để khách cùng đóng góp, tương tác và tận hưởng khoảnh khắc|Chia sẻ|Thư viện|Sổ lưu bút|Buồng chụp ảnh|Thư viện ảnh và video|Sổ lưu bút số|Buồng chụp ảnh số|Tính năng ảnh và video'),
  hi: row('पाँच जुड़े अनुभव|अतिथियों को साझा करने, संवाद और साथ आनंद लेने दें|साझा करना|गैलरी|अतिथि-पुस्तक|फ़ोटो बूथ|फ़ोटो और वीडियो गैलरी|डिजिटल अतिथि-पुस्तक|डिजिटल फ़ोटो बूथ|फ़ोटो और वीडियो सुविधाएँ'),
  tr: row('Beş bağlantılı deneyim|Misafirler katkıda bulunsun, etkileşsin ve anların keyfini birlikte çıkarsın|Paylaşım|Galeri|Misafir defteri|Fotoğraf kabini|Fotoğraf ve video galerisi|Dijital misafir defteri|Dijital fotoğraf kabini|Fotoğraf ve video özellikleri'),
  de: row('Fünf verbundene Erlebnisse|Lassen Sie Gäste beitragen, interagieren und Momente gemeinsam genießen|Teilen|Galerie|Gästebuch|Fotobox|Foto- und Videogalerie|Digitales Gästebuch|Digitale Fotobox|Foto- und Videofunktionen'),
  es: row('Cinco experiencias conectadas|Deja que los invitados compartan, interactúen y disfruten juntos|Compartir|Galería|Libro de visitas|Cabina de fotos|Galería de fotos y vídeos|Libro de visitas digital|Cabina de fotos digital|Funciones de fotos y vídeos'),
  fr: row('Cinq expériences connectées|Laissez les invités contribuer, interagir et profiter ensemble|Partage|Galerie|Livre d’or|Photomaton|Galerie photo et vidéo|Livre d’or numérique|Photomaton numérique|Fonctions photo et vidéo'),
  nl: row('Vijf verbonden ervaringen|Laat gasten bijdragen, contact maken en samen genieten|Delen|Galerij|Gastenboek|Fotocabine|Foto- en videogalerij|Digitaal gastenboek|Digitale fotocabine|Foto- en videofuncties'),
  ja: row('五つのつながった体験|ゲストと一緒に共有し、交流して、思い出を楽しむ|共有|ギャラリー|ゲストブック|フォトブース|写真と動画のギャラリー|デジタルゲストブック|デジタルフォトブース|写真と動画の機能'),
  el: row('Πέντε συνδεδεμένες εμπειρίες|Αφήστε καλεσμένους να συνεισφέρουν, να αλληλεπιδρούν και να απολαμβάνουν μαζί|Κοινοποίηση|Συλλογή|Βιβλίο επισκεπτών|Φωτογραφικός θάλαμος|Συλλογή φωτογραφιών και βίντεο|Ψηφιακό βιβλίο επισκεπτών|Ψηφιακός φωτογραφικός θάλαμος|Λειτουργίες φωτογραφιών και βίντεο'),
};
