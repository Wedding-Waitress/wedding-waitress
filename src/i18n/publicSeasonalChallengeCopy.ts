export const publicSeasonalChallengeSources = [
  'Availability changes quickly',
  'Keep responses current when end-of-year calendars and family commitments are busy.',
  'Food needs careful coordination',
  'Give caterers a clear view of recorded dietary requirements and assigned places.',
  'The program often has many moments',
  'Coordinate arrivals, meals, presentations, gifts, entertainment and transport in a readable order.',
] as const;
const row = (text: string) => text.split('|');
export const publicSeasonalChallengeRows: Record<string, readonly string[]> = {
  en: publicSeasonalChallengeSources,
  it: row('La disponibilità cambia rapidamente|Mantieni aggiornate le risposte quando gli impegni di fine anno e familiari sono numerosi.|Il cibo richiede un coordinamento attento|Offri al catering una visione chiara delle esigenze alimentari registrate e dei posti assegnati.|Il programma comprende spesso molti momenti|Coordina arrivi, pasti, presentazioni, regali, intrattenimento e trasporti in un ordine leggibile.'),
  ar: row('التفرغ يتغير بسرعة|أبقِ الردود حديثة عندما تزدحم مواعيد نهاية السنة والالتزامات العائلية.|الطعام يحتاج إلى تنسيق دقيق|امنح متعهد الطعام رؤية واضحة للاحتياجات الغذائية المسجلة والأماكن المخصصة.|البرنامج يتضمن غالباً لحظات كثيرة|نسّق الوصول والوجبات والعروض والهدايا والترفيه والنقل بترتيب واضح.'),
  zh: row('可参加时间变化很快|年末日程和家庭安排繁忙时，让回复保持最新。|饮食需要细心协调|让餐饮服务商清楚了解已记录的饮食需求和指定位置。|节目通常有很多环节|以清楚易读的顺序协调抵达、用餐、展示、礼物、娱乐和交通。'),
  vi: row('Lịch rảnh thay đổi nhanh|Cập nhật phản hồi khi lịch cuối năm và việc gia đình bận rộn.|Ăn uống cần phối hợp cẩn thận|Cho đơn vị tiệc biết rõ nhu cầu ăn uống đã ghi và vị trí được phân.|Chương trình thường có nhiều khoảnh khắc|Phối hợp đón khách, bữa ăn, trình bày, quà, giải trí và di chuyển theo thứ tự dễ đọc.'),
  hi: row('उपलब्धता जल्दी बदलती है|वर्ष के अंत की व्यस्त समय-सारणी और पारिवारिक ज़िम्मेदारियों के बीच जवाब अपडेट रखें।|भोजन में सावधानी से समन्वय चाहिए|भोजन सेवा को दर्ज आहार ज़रूरतें और तय स्थान स्पष्ट रूप से बताएँ।|कार्यक्रम में अक्सर कई पल होते हैं|आगमन, भोजन, प्रस्तुतियाँ, उपहार, मनोरंजन और परिवहन का स्पष्ट क्रम बनाएँ।'),
  tr: row('Uygunluk hızla değişir|Yıl sonu takvimleri ve aile sorumlulukları yoğunken yanıtları güncel tutun.|Yemek dikkatli koordinasyon gerektirir|Yemek hizmetine kayıtlı beslenme ihtiyaçlarını ve atanmış yerleri net gösterin.|Program genellikle birçok an içerir|Varışları, yemekleri, sunumları, hediyeleri, eğlenceyi ve ulaşımı okunaklı sırayla koordine edin.'),
  de: row('Verfügbarkeit ändert sich schnell|Halten Sie Antworten aktuell, wenn Jahresendtermine und Familienverpflichtungen zahlreich sind.|Essen braucht sorgfältige Abstimmung|Geben Sie dem Catering einen klaren Überblick über erfasste Ernährungsbedürfnisse und zugewiesene Plätze.|Das Programm enthält oft viele Momente|Ordnen Sie Ankunft, Mahlzeiten, Präsentationen, Geschenke, Unterhaltung und Transport übersichtlich.'),
  es: row('La disponibilidad cambia rápido|Mantén actualizadas las respuestas cuando se acumulan los compromisos familiares y de fin de año.|La comida requiere coordinación cuidadosa|Da al catering una visión clara de necesidades alimentarias registradas y lugares asignados.|El programa suele tener muchos momentos|Coordina llegadas, comidas, presentaciones, regalos, entretenimiento y transporte en un orden claro.'),
  fr: row('Les disponibilités changent vite|Gardez les réponses à jour lorsque les calendriers de fin d’année et engagements familiaux sont chargés.|Les repas demandent une coordination soignée|Donnez au traiteur une vue claire des besoins alimentaires enregistrés et places attribuées.|Le programme compte souvent de nombreux moments|Coordonnez arrivées, repas, présentations, cadeaux, animations et transports dans un ordre lisible.'),
  nl: row('Beschikbaarheid verandert snel|Houd reacties actueel wanneer eindejaarsagenda’s en familieverplichtingen druk zijn.|Eten vraagt zorgvuldige afstemming|Geef cateraars een duidelijk overzicht van geregistreerde voedingsbehoeften en toegewezen plaatsen.|Het programma bevat vaak veel momenten|Stem aankomsten, maaltijden, presentaties, cadeaus, entertainment en vervoer overzichtelijk af.'),
  ja: row('参加できる予定はすぐに変わります|年末の予定や家族の用事が多い時期も、回答を最新に保ちます。|食事は丁寧な調整が必要です|記録済みの食事の要望と指定席をケータリングに明確に伝えます。|プログラムには多くの場面があります|到着、食事、発表、贈り物、余興、移動を読みやすい順番にまとめます。'),
  el: row('Η διαθεσιμότητα αλλάζει γρήγορα|Κρατήστε τις απαντήσεις ενημερωμένες όταν οι υποχρεώσεις τέλους χρονιάς και οικογένειας είναι πολλές.|Το φαγητό χρειάζεται προσεκτικό συντονισμό|Δώστε στο catering σαφή εικόνα καταγεγραμμένων διατροφικών αναγκών και καθορισμένων θέσεων.|Το πρόγραμμα συχνά έχει πολλές στιγμές|Συντονίστε αφίξεις, γεύματα, παρουσιάσεις, δώρα, ψυχαγωγία και μεταφορές σε ευανάγνωστη σειρά.'),
};
