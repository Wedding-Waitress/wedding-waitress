// ISO 3166-1 alpha-2 country/territory identifiers. Labels come from the
// browser's locale data, so country names follow the selected public language.
export const signupCountryCodes = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ');
const countrySet = new Set(signupCountryCodes);
export function signupCountryCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return countrySet.has(code) ? code : null;
}
export function signupCountryOptions(language = 'en') {
  const localized = new Intl.DisplayNames([language, 'en'], {type:'region'});
  const english = new Intl.DisplayNames(['en'], {type:'region'});
  return signupCountryCodes.map(code=>({code,name:localized.of(code)||english.of(code)||code,englishName:english.of(code)||code}))
    .sort((a,b)=>a.name.localeCompare(b.name,language));
}
export function resolveSignupCountry(value: string, language = 'en'): string | null {
  const code=signupCountryCode(value);if(code)return code;
  const normalized=value.trim().normalize('NFKC').toLocaleLowerCase(language);
  return signupCountryOptions(language).find(country=>[country.name,country.englishName].some(name=>name.normalize('NFKC').toLocaleLowerCase(language)===normalized))?.code||null;
}
