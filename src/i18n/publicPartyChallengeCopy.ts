export const publicPartyChallengeSources = [
  'Different circles come together',
  'Organise family, friends and other groups while keeping contact details and responses clear.',
  'Hosts juggle many small details',
  'Coordinate food needs, table arrangements, suppliers and the order of important moments.',
  'Memories can become scattered',
  'Give everyone a shared contribution point rather than chasing photos afterwards.',
] as const;
const row = (text: string) => text.split('|');
export const publicPartyChallengeRows: Record<string, readonly string[]> = {
  en: publicPartyChallengeSources,
  it: row('Gruppi diversi si incontrano|Organizza famiglia, amici e altri gruppi mantenendo chiari contatti e risposte.|Gli organizzatori gestiscono tanti piccoli dettagli|Coordina esigenze alimentari, disposizione dei tavoli, fornitori e ordine dei momenti importanti.|I ricordi possono disperdersi|Offri a tutti un punto comune dove contribuire invece di rincorrere le foto dopo la festa.'),
  ar: row('مجموعات مختلفة تجتمع|نظّم العائلة والأصدقاء والمجموعات الأخرى مع إبقاء تفاصيل التواصل والردود واضحة.|المضيفون يتابعون تفاصيل صغيرة كثيرة|نسّق الاحتياجات الغذائية وترتيب الطاولات والموردين وتسلسل اللحظات المهمة.|الذكريات قد تتفرق|امنح الجميع نقطة مشتركة للمساهمة بدلاً من البحث عن الصور بعد ذلك.'),
  zh: row('不同圈子的宾客聚在一起|整理家人、朋友及其他群体，并让联系方式和回复保持清晰。|主办方要兼顾许多小细节|协调饮食需求、桌位安排、供应商以及重要时刻的顺序。|回忆可能散落各处|为所有人提供共同的投稿入口，无需在活动后四处收集照片。'),
  vi: row('Nhiều nhóm cùng tụ họp|Sắp xếp gia đình, bạn bè và nhóm khác, giữ thông tin liên lạc và phản hồi rõ ràng.|Người tổ chức phải lo nhiều chi tiết nhỏ|Phối hợp nhu cầu ăn uống, bàn, nhà cung cấp và thứ tự khoảnh khắc quan trọng.|Kỷ niệm có thể bị phân tán|Cho mọi người một nơi đóng góp chung thay vì tìm ảnh sau sự kiện.'),
  hi: row('अलग-अलग समूह एक साथ आते हैं|संपर्क और जवाब स्पष्ट रखते हुए परिवार, दोस्तों और अन्य समूहों को व्यवस्थित करें।|मेज़बान कई छोटे विवरण सँभालते हैं|खाने की ज़रूरतें, मेज़ों की व्यवस्था, आपूर्तिकर्ता और महत्वपूर्ण पलों का क्रम समन्वित करें।|यादें बिखर सकती हैं|बाद में फ़ोटो ढूँढने के बजाय सबको योगदान का एक साझा स्थान दें।'),
  tr: row('Farklı çevreler bir araya gelir|İletişim bilgilerini ve yanıtları net tutarak aileyi, arkadaşları ve diğer grupları düzenleyin.|Ev sahipleri pek çok küçük ayrıntıyı yönetir|Beslenme ihtiyaçlarını, masa düzenlerini, tedarikçileri ve önemli anların sırasını koordine edin.|Anılar dağılabilir|Sonradan fotoğraf peşinde koşmak yerine herkese ortak bir paylaşım noktası verin.'),
  de: row('Verschiedene Kreise kommen zusammen|Organisieren Sie Familie, Freunde und weitere Gruppen mit klaren Kontaktdaten und Antworten.|Gastgeber jonglieren viele kleine Details|Koordinieren Sie Ernährungsbedürfnisse, Tischanordnung, Dienstleister und die Reihenfolge wichtiger Momente.|Erinnerungen können sich verstreuen|Geben Sie allen einen gemeinsamen Ort für Beiträge, statt später Fotos hinterherzulaufen.'),
  es: row('Se reúnen distintos círculos|Organiza familia, amigos y otros grupos manteniendo claros los contactos y las respuestas.|Los anfitriones manejan muchos detalles pequeños|Coordina necesidades alimentarias, mesas, proveedores y el orden de los momentos importantes.|Los recuerdos pueden dispersarse|Ofrece a todos un punto común para aportar recuerdos en vez de buscar fotos después.'),
  fr: row('Des cercles différents se réunissent|Organisez famille, amis et autres groupes avec des coordonnées et réponses claires.|Les hôtes gèrent de nombreux petits détails|Coordonnez besoins alimentaires, disposition des tables, prestataires et ordre des moments importants.|Les souvenirs peuvent se disperser|Offrez à tous un point de contribution commun plutôt que de rechercher les photos après.'),
  nl: row('Verschillende kringen komen samen|Organiseer familie, vrienden en andere groepen met duidelijke contactgegevens en reacties.|Organisatoren beheren veel kleine details|Stem voedingsbehoeften, tafelindelingen, leveranciers en de volgorde van belangrijke momenten af.|Herinneringen kunnen verspreid raken|Geef iedereen één gedeelde plek voor bijdragen in plaats van achteraf foto’s te verzamelen.'),
  ja: row('さまざまなつながりの人が集まります|連絡先と回答を明確にしながら、家族、友人、その他のグループを整理します。|主催者は多くの小さな詳細を管理します|食事の要望、テーブル配置、業者、大切な場面の順序を調整します。|思い出は散らばりがちです|後で写真を探し回らずに済むよう、全員が投稿できる共通の場所を用意します。'),
  el: row('Διαφορετικοί κύκλοι συναντιούνται|Οργανώστε οικογένεια, φίλους και άλλες ομάδες με σαφή στοιχεία επικοινωνίας και απαντήσεις.|Οι οικοδεσπότες διαχειρίζονται πολλές μικρές λεπτομέρειες|Συντονίστε διατροφικές ανάγκες, τραπέζια, προμηθευτές και τη σειρά σημαντικών στιγμών.|Οι αναμνήσεις μπορεί να σκορπιστούν|Δώστε σε όλους ένα κοινό σημείο συνεισφοράς αντί να αναζητάτε φωτογραφίες μετά.'),
};
