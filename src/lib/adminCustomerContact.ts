import { getCountries, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
const countries=new Set<string>(getCountries());
export function recordedCustomerCountry(value?:string|null):CountryCode|undefined {
 const code=value?.trim().toUpperCase(); return code&&countries.has(code)?code as CountryCode:undefined;
}
export function customerCountryLabel(value?:string|null):string {
 const code=recordedCustomerCountry(value); if(!code)return 'Not available';
 return new Intl.DisplayNames(['en-AU'],{type:'region'}).of(code)||code;
}
export function customerMobileLabel(value?:string|null,country?:string|null):{text:string;ambiguous:boolean} {
 const raw=value?.trim(); if(!raw)return {text:'Not provided',ambiguous:false};
 const explicit=recordedCustomerCountry(country);
 if(!raw.startsWith('+')&&!explicit)return {text:raw,ambiguous:true};
 const phone=parsePhoneNumberFromString(raw,{defaultCountry:explicit,extract:false});
 return phone?.isValid()?{text:phone.formatInternational(),ambiguous:false}:{text:raw,ambiguous:!raw.startsWith('+')};
}
