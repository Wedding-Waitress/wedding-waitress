// Guest relationship label for every supported public language.
export const publicGuestRelationLabels: Record<string,string> = {en:'Guest',it:'Ospite',ar:'ضيف',vi:'Khách',zh:'宾客',hi:'अतिथि',tr:'Misafir',de:'Gast',es:'Invitado',fr:'Invité',nl:'Gast',ja:'ゲスト',el:'Καλεσμένος'};

export const publicHostRelationLabels: Record<string, Record<string,string>> = {
  en:{organizer:'Organizer',bride:'Bride',groom:'Groom'},
  it:{organizer:'Organizzatore',bride:'Sposa',groom:'Sposo'},
  ar:{organizer:'منظّم',bride:'عروس',groom:'عريس'},
  vi:{organizer:'Người tổ chức',bride:'Cô dâu',groom:'Chú rể'},
  zh:{organizer:'组织者',bride:'新娘',groom:'新郎'},
  hi:{organizer:'आयोजक',bride:'दुल्हन',groom:'दूल्हा'},
  tr:{organizer:'Organizatör',bride:'Gelin',groom:'Damat'},
  de:{organizer:'Organisator',bride:'Braut',groom:'Bräutigam'},
  es:{organizer:'Organizador',bride:'Novia',groom:'Novio'},
  fr:{organizer:'Organisateur',bride:'Mariée',groom:'Marié'},
  nl:{organizer:'Organisator',bride:'Bruid',groom:'Bruidegom'},
  ja:{organizer:'主催者',bride:'花嫁',groom:'花婿'},
  el:{organizer:'Διοργανωτής',bride:'Νύφη',groom:'Γαμπρός'},
};
