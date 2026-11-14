export const publicSignupCountrySources = ['Country *','Choose or type your country','Choose a country from the list.','Your details could not be saved. Please try again.'] as const;
export const publicSignupCountryRows:Record<string,readonly string[]>={
 en:publicSignupCountrySources,
 de:['Land *','Land auswählen oder eingeben','Wählen Sie ein Land aus der Liste.','Ihre Angaben konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.'],
 es:['País *','Selecciona o escribe tu país','Selecciona un país de la lista.','No se pudieron guardar tus datos. Inténtalo de nuevo.'],
 fr:['Pays *','Choisissez ou saisissez votre pays','Choisissez un pays dans la liste.','Vos informations n’ont pas pu être enregistrées. Veuillez réessayer.'],
 it:['Paese *','Seleziona o digita il tuo paese','Seleziona un paese dall’elenco.','Non è stato possibile salvare i tuoi dati. Riprova.'],
 nl:['Land *','Kies of typ je land','Kies een land uit de lijst.','Je gegevens konden niet worden opgeslagen. Probeer het opnieuw.'],
 ja:['国・地域 *','国・地域を選択または入力','リストから国・地域を選択してください。','情報を保存できませんでした。もう一度お試しください。'],
 ar:['الدولة *','اختر دولتك أو اكتب اسمها','اختر دولة من القائمة.','تعذّر حفظ بياناتك. يرجى المحاولة مرة أخرى.'],
 vi:['Quốc gia *','Chọn hoặc nhập quốc gia của bạn','Chọn một quốc gia trong danh sách.','Không thể lưu thông tin của bạn. Vui lòng thử lại.'],
 zh:['国家或地区 *','选择或输入您的国家或地区','请从列表中选择国家或地区。','无法保存您的信息。请重试。'],
 tr:['Ülke *','Ülkenizi seçin veya yazın','Listeden bir ülke seçin.','Bilgileriniz kaydedilemedi. Lütfen tekrar deneyin.'],
 el:['Χώρα *','Επιλέξτε ή πληκτρολογήστε τη χώρα σας','Επιλέξτε μια χώρα από τη λίστα.','Δεν ήταν δυνατή η αποθήκευση των στοιχείων σας. Δοκιμάστε ξανά.'],
 hi:['देश *','अपना देश चुनें या लिखें','सूची से कोई देश चुनें।','आपकी जानकारी सेव नहीं हो सकी। कृपया फिर से कोशिश करें।'],
};
export function signupCountryCopy(language:string,index:number):string{return (publicSignupCountryRows[language.split('-')[0]]||publicSignupCountryRows.en)[index];}
