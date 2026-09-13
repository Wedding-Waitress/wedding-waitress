// Country-level Netlify geolocation only. Never return IP, city or coordinates.
export default function customerCountry(_request:Request,context:{geo?:{country?:{code?:string}}}):Response{
 const code=context.geo?.country?.code?.toUpperCase();
 const countryCode=code&&/^[A-Z]{2}$/.test(code)&&!['XX','ZZ'].includes(code)?code:null;
 return Response.json({country_code:countryCode,source:'netlify-country'},
  {headers:{'Cache-Control':'private, no-store','Content-Type':'application/json'}});
}
export const config={path:'/api/customer-country',method:'GET'};
