import {DEFAULT_QR_SETTINGS,type QRCodeSettings} from '@/hooks/useQRCodeSettings';
export interface QRPreviewColors {background:string;foreground:string;dotsColor:string;markerBorderColor:string;markerCenterColor:string}
export interface QRPreviewShapes {dotsShape:QRCodeSettings['dots_shape'];markerBorderShape:QRCodeSettings['marker_border_shape'];markerCenterShape:QRCodeSettings['marker_center_shape']}
// Exact rendering policy used by the existing QR designer. Saved-record absence
// must be handled by the caller, not interpreted as a historical default design.
export function qrPreviewSettings(eventId:string,colors:QRPreviewColors,shapes:QRPreviewShapes,logo:{url:string|null;size:number}):QRCodeSettings {
 return {...DEFAULT_QR_SETTINGS,event_id:eventId,user_id:'',background_color:colors.background,foreground_color:colors.foreground,
  dots_color:colors.dotsColor,marker_border_color:colors.markerBorderColor,marker_center_color:colors.markerCenterColor,
  dots_shape:shapes.dotsShape,marker_border_shape:shapes.markerBorderShape,marker_center_shape:shapes.markerCenterShape,
  center_image_url:logo.url||undefined,center_image_size:logo.size,shape:shapes.dotsShape,pattern:'basic',pattern_style:'default',
  corner_style:'square',border_style:'none',border_width:0,border_color:colors.foreground,has_scan_text:false,scan_text:'',gradient_type:'none',
  gradient_colors:[],background_image_url:undefined,shadow_enabled:false,shadow_color:'#000000',shadow_blur:10,background_opacity:1,
  output_size:512,output_format:'png',color_palette:'custom',advanced_settings:{}} as QRCodeSettings;
}
