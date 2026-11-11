export const publicEngagementChallengeSources = [
  'The list grows quickly',
  'Keep couples, families and friends organised as invitations and responses arrive.',
  'A party still needs structure',
  'Capture venue timing, tables, food requirements and important moments without over-planning the celebration.',
  'Everyone wants the photos',
  'Give guests one simple place to contribute moments from the night.',
] as const;
const row = (text: string) => text.split('|');
export const publicEngagementChallengeRows: Record<string, readonly string[]> = {
  en: publicEngagementChallengeSources,
  it: row('La lista cresce rapidamente|Tieni organizzati coppie, famiglie e amici mentre arrivano inviti e risposte.|Anche una festa richiede organizzazione|Registra orari della location, tavoli, esigenze alimentari e momenti importanti senza pianificare troppo la festa.|Tutti vogliono le foto|Offri agli ospiti un unico spazio semplice per condividere i momenti della serata.'),
  ar: row('القائمة تكبر بسرعة|نظّم الأزواج والعائلات والأصدقاء مع إرسال الدعوات ووصول الردود.|حتى الحفلة تحتاج إلى تنظيم|سجّل مواعيد المكان والطاولات والاحتياجات الغذائية واللحظات المهمة دون الإفراط في التخطيط للاحتفال.|الجميع يريد الصور|امنح الضيوف مكاناً واحداً بسيطاً للمساهمة بلحظات من السهرة.'),
  zh: row('名单会迅速增加|随着邀请发出和回复到来，清楚整理情侣、家人和朋友。|派对也需要安排|记录场地时间、桌位、饮食需求和重要时刻，无需过度筹划庆祝活动。|大家都想要照片|为宾客提供一个简单的地方，分享当晚的精彩时刻。'),
  vi: row('Danh sách tăng nhanh|Sắp xếp các cặp đôi, gia đình và bạn bè khi gửi lời mời và nhận phản hồi.|Bữa tiệc vẫn cần tổ chức|Ghi thời gian địa điểm, bàn, nhu cầu ăn uống và khoảnh khắc quan trọng mà không lập kế hoạch quá mức.|Ai cũng muốn có ảnh|Cho khách một nơi đơn giản để chia sẻ những khoảnh khắc trong đêm.'),
  hi: row('सूची तेज़ी से बढ़ती है|निमंत्रण भेजने और जवाब आने के साथ जोड़ों, परिवारों और दोस्तों को व्यवस्थित रखें।|पार्टी में भी व्यवस्था ज़रूरी है|उत्सव की बहुत अधिक योजना बनाए बिना स्थान का समय, मेज़ें, खाने की ज़रूरतें और महत्वपूर्ण पल दर्ज करें।|हर कोई फ़ोटो चाहता है|मेहमानों को शाम के पल साझा करने के लिए एक सरल स्थान दें।'),
  tr: row('Liste hızla büyür|Davetler ve yanıtlar geldikçe çiftleri, aileleri ve arkadaşları düzenli tutun.|Bir parti de düzen gerektirir|Kutlamayı gereğinden fazla planlamadan mekân saatlerini, masaları, beslenme ihtiyaçlarını ve önemli anları kaydedin.|Herkes fotoğrafları ister|Konuklara gecenin anlarını paylaşabilecekleri tek ve kolay bir yer verin.'),
  de: row('Die Liste wächst schnell|Behalten Sie Paare, Familien und Freunde im Überblick, wenn Einladungen und Antworten eingehen.|Auch eine Feier braucht Struktur|Erfassen Sie Veranstaltungszeiten, Tische, Ernährungsbedürfnisse und wichtige Momente, ohne die Feier zu überplanen.|Alle möchten die Fotos|Geben Sie Gästen einen einfachen gemeinsamen Ort, um Momente des Abends beizutragen.'),
  es: row('La lista crece rápido|Organiza parejas, familias y amigos conforme se envían invitaciones y llegan respuestas.|Una fiesta también necesita estructura|Anota horarios del recinto, mesas, necesidades alimentarias y momentos importantes sin planificar en exceso la celebración.|Todos quieren las fotos|Ofrece a los invitados un único lugar sencillo para compartir momentos de la noche.'),
  fr: row('La liste grandit vite|Organisez couples, familles et amis à mesure que les invitations partent et que les réponses arrivent.|Une fête a aussi besoin de structure|Notez horaires du lieu, tables, besoins alimentaires et moments importants sans trop planifier la célébration.|Tout le monde veut les photos|Offrez aux invités un espace unique et simple pour partager les moments de la soirée.'),
  nl: row('De lijst groeit snel|Houd stellen, families en vrienden overzichtelijk terwijl uitnodigingen worden verstuurd en reacties binnenkomen.|Ook een feest heeft structuur nodig|Leg locatietijden, tafels, voedingsbehoeften en belangrijke momenten vast zonder het feest te veel te plannen.|Iedereen wil de foto’s|Geef gasten één eenvoudige plek om momenten van de avond te delen.'),
  ja: row('リストはすぐに増えます|招待を送り回答が届く中で、カップル、家族、友人を整理します。|パーティーにも段取りが必要です|お祝いを細かく決めすぎずに、会場の時間、テーブル、食事の要望、大切な場面を記録します。|みんな写真が欲しいものです|ゲストが夜の思い出を投稿できる、わかりやすい一つの場所を用意します。'),
  el: row('Η λίστα μεγαλώνει γρήγορα|Οργανώστε ζευγάρια, οικογένειες και φίλους καθώς στέλνονται προσκλήσεις και φτάνουν απαντήσεις.|Και ένα πάρτι χρειάζεται δομή|Καταγράψτε ώρες χώρου, τραπέζια, διατροφικές ανάγκες και σημαντικές στιγμές χωρίς υπερβολικό σχεδιασμό.|Όλοι θέλουν τις φωτογραφίες|Δώστε στους καλεσμένους έναν απλό κοινό χώρο για να μοιραστούν στιγμές της βραδιάς.'),
};
