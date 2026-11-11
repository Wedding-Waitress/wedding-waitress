export const TRIAL_LIMIT_EVENT='ww:trial-limit-reached';
export function notifyTrialTableLimit(error?:unknown):boolean{
 if(error && !(typeof error==='object'&&'message' in error&&String(error.message).includes('WW_TRIAL_TABLE_LIMIT_REACHED')))return false;
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(TRIAL_LIMIT_EVENT,{detail:{kind:'tables'}}));
 return true;
}
