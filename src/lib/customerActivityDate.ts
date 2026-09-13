// Recorded events only. Never substitute the current clock for missing history.
export function effectiveCustomerActivity(...values:(string|null|undefined)[]):string|null{
 const valid=values.filter((value):value is string=>!!value&&Number.isFinite(Date.parse(value)));
 return valid.sort((a,b)=>Date.parse(b)-Date.parse(a))[0]||null;
}
