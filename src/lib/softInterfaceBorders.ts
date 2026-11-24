/** Normalize existing dark interface outlines, including page-specific CSS and
 * portalled controls. Do not introduce borders or alter document/artwork output. */
export const SOFT_BORDER_EXCLUSIONS = [
 '[data-print-mirror-document]','[data-print-mirror-presentation]',
 '[data-dashboard-artwork]','[data-reception-room-canvas]',
 '[data-slideshow-preview-stage]','[data-signage-fit-preview]',
 '[data-a4-preview-page]','[data-dietary-a4-preview]',
 '.ww-itc-preview','.ww-placecards-preview','.ww-invitations-preview',
 '.dietary-a4-preview','#qr-preview','[class*="previewStage"]',
 '[class*="previewCanvas"]','[class*="previewSheet"]','[class*="previewViewport"]',
 '[class*="boothCapturePreview"]','[data-keep-border-color]',
 'svg','canvas','img','video','iframe','[role="progressbar"]','[role="slider"]',
 '[role="switch"]','[type="checkbox"]','[type="radio"]','[type="range"]','[type="color"]',
].join(',');
const SIDES=['top','right','bottom','left'] as const;
const PORTALS='[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[data-radix-popper-content-wrapper],[data-sonner-toaster]';

export function isDarkNeutralBorder(color:string) {
 const match=color.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
 if(!match)return false;
 const [r,g,b]=match.slice(1,4).map(Number),alpha=match[4]===undefined?1:Number(match[4]);
 if(alpha<0.45)return false;
 const neutral=Math.max(r,g,b)-Math.min(r,g,b)<=16&&Math.max(r,g,b)<=150;
 const espresso=r<=180&&g<=160&&b<=145&&r>=g&&g>=b&&r-b>=10&&g>=r*0.45;
 return neutral||espresso;
}

export function updateSoftInterfaceBorders(scope:ParentNode=document.body) {
 const elements=Array.from(scope.querySelectorAll<HTMLElement>('*'));
 if(scope instanceof HTMLElement)elements.unshift(scope);
 for(const element of elements){
  if(!(element instanceof HTMLElement)||(!element.closest('#root')&&!element.closest(PORTALS)))continue;
  // Remove our screen-only annotations before measuring the current author CSS.
  for(const side of SIDES)element.removeAttribute(`data-ww-soft-border-${side}`);
  if(element.closest(SOFT_BORDER_EXCLUSIONS))continue;
  // Some neutral cards (including the six budget totals) carry semantic tone
  // metadata. Judge the actual border color, while preserving invalid controls.
  if(element.closest('[aria-invalid="true"]'))continue;
  if(/(?:^|\s)(?:\S*:)?border-(?:red|rose|green|emerald|blue|sky|amber|yellow|orange|destructive|success|warning)(?:-|\s|$)/.test(element.className))continue;
  const style=getComputedStyle(element);
  // Snapshot all sides before annotations change the computed style object.
  const borders=SIDES.map(side=>({side,width:parseFloat(style.getPropertyValue(`border-${side}-width`)),kind:style.getPropertyValue(`border-${side}-style`),color:style.getPropertyValue(`border-${side}-color`)}));
  for(const {side,width,kind,color} of borders){
   if(width>0&&kind!=='none'&&kind!=='hidden'&&isDarkNeutralBorder(color))
    element.setAttribute(`data-ww-soft-border-${side}`,'');
  }
 }
}

/** Lazy pages, editor rows, dialogs, hover and error states keep their own rules.
 * Only qualifying visible border sides get the shared screen treatment. */
export function startSoftInterfaceBorders(){
 let frame=0,stopped=false;
 const pending=new Set<ParentNode>();
 const flush=()=>{frame=0;const scopes=[...pending];pending.clear();
  for(const scope of scopes)if(!scopes.some(other=>other!==scope&&other instanceof Element&&other.contains(scope as Node)))updateSoftInterfaceBorders(scope);
 };
 const schedule=(scope:ParentNode=document.body)=>{if(stopped)return;pending.add(scope);if(!frame)frame=requestAnimationFrame(flush);};
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='attributes')schedule(record.target as Element);
   else for(const node of record.addedNodes)if(node instanceof HTMLElement)schedule(node);
  }
 });
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','aria-invalid','data-state','data-tone','data-status']});
 const stylesObserver=new MutationObserver(()=>schedule());
 stylesObserver.observe(document.head,{childList:true,subtree:true,characterData:true});
 const interaction=(event:Event)=>{if(event.target instanceof HTMLElement)schedule(event.target);};
 const resize=()=>schedule();
 for(const event of ['pointerover','pointerout','focusin','focusout','change'])document.addEventListener(event,interaction,true);
 window.addEventListener('resize',resize);
 updateSoftInterfaceBorders();
 void document.fonts?.ready.then(resize);
 return()=>{stopped=true;observer.disconnect();stylesObserver.disconnect();window.removeEventListener('resize',resize);
  for(const event of ['pointerover','pointerout','focusin','focusout','change'])document.removeEventListener(event,interaction,true);
  if(frame)cancelAnimationFrame(frame);
  document.querySelectorAll<HTMLElement>('[data-ww-soft-border-top],[data-ww-soft-border-right],[data-ww-soft-border-bottom],[data-ww-soft-border-left]').forEach(element=>SIDES.forEach(side=>element.removeAttribute(`data-ww-soft-border-${side}`)));
 };
}
