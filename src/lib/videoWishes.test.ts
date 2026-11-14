import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {VideoWishesRecorder,recordingMime} from './videoWishesRecorder';
import {validateProcessedWish,validateStoredWish} from '../../supabase/functions/_shared/video-wishes-validation';
import {resolveWishSender} from '../../supabase/functions/_shared/video-wishes-context';
import {categoryOf,publicGalleryItems} from './mediaPrivacy';
import {applySlideshowSettings,DEFAULT_SLIDESHOW_SETTINGS} from './slideshowSettings';
import {publicVideoWishesRows,videoWishesKeys} from '../i18n/publicVideoWishesCopy';

describe('Video Wishes backend validation',()=>{
 const valid={requireSignedURLs:true,readyToStream:true,duration:120,input:{width:1280,height:720},status:{state:'ready'}};
 it('requires a private processed video and accepts the exact limit',()=>{expect(validateProcessedWish(valid,120)).toBe('valid');expect(()=>validateProcessedWish({...valid,duration:120.01},120)).toThrow('VIDEO_TOO_LONG');expect(()=>validateProcessedWish({...valid,input:{width:0,height:0}},120)).toThrow('INVALID_VIDEO');expect(()=>validateProcessedWish({...valid,requireSignedURLs:false},120)).toThrow('PROCESSOR_PRIVACY');});
 it('does not accept an unprocessed upload or a processor error',()=>{expect(validateProcessedWish({...valid,readyToStream:false},120)).toBe('pending');expect(()=>validateProcessedWish({...valid,status:{state:'error'}},120)).toThrow('INVALID_VIDEO');expect(()=>validateProcessedWish({...valid,duration:NaN},120)).toThrow();expect(()=>validateProcessedWish(valid,60)).toThrow();});
 it('checks real stored size and magic bytes instead of client file claims',()=>{const mp4=new Uint8Array([0,0,0,20,102,116,121,112,105,115,111,109]);expect(()=>validateStoredWish(30,30,100,mp4,'video/mp4')).not.toThrow();expect(()=>validateStoredWish(101,30,100,mp4,'video/mp4')).toThrow();expect(()=>validateStoredWish(30,30,100,new Uint8Array(30),'video/mp4')).toThrow('INVALID_VIDEO');expect(()=>validateStoredWish(30,30,100,mp4,'video/webm')).toThrow();});
});
describe('attribution and isolation',()=>{
 const main={id:'a',first_name:'A',last_name:'One',family_group:'Family One'},other={id:'b',first_name:'B',last_name:'Two',family_group:'Family One'};
 const context={recipient:main,members:[main,other]} as any;
 it('defaults to main guest and allows only the authorised family',()=>{expect(resolveWishSender(context,undefined,'Wrong').guest_id).toBe('a');expect(resolveWishSender(context,'b','Wrong').name).toBe('B Two');expect(resolveWishSender(context,'family','Wrong').family_group).toBe('Family One');expect(()=>resolveWishSender(context,'outside','Wrong')).toThrow('not authorised');});
 it('general names never become verified guest identities',()=>{const result=resolveWishSender({recipient:null,members:[]} as any,'general','A One');expect(result.identity_type).toBe('guest_supplied');expect(result.guest_id).toBeNull();expect(()=>resolveWishSender({recipient:null} as any,'a','A One')).toThrow();});
 it('wishes fail closed in legacy galleries and require independent slideshow approval',()=>{const wish={id:'1',kind:'video',source_category:'video_wishes',shared_to_gallery:true,moderation_status:'approved'};expect(categoryOf(wish)).toBe('video_wishes');expect(publicGalleryItems([wish])).toEqual([]);expect(applySlideshowSettings([wish],DEFAULT_SLIDESHOW_SETTINGS)).toEqual([]);expect(applySlideshowSettings([{...wish,shared_to_slideshow:true}],DEFAULT_SLIDESHOW_SETTINGS)).toHaveLength(1);});
 it('covers all 13 languages including placeholders',()=>{expect(Object.keys(publicVideoWishesRows)).toHaveLength(13);for(const row of Object.values(publicVideoWishesRows)){expect(row).toHaveLength(videoWishesKeys.length);expect(row[11]).toContain('{seconds}');expect(row[11]).toContain('{size}');expect(row.every(Boolean)).toBe(true);}});
});
describe('camera lifecycle',()=>{
 let stop:any,stream:any,callbacks:any;
 class FakeRecorder {
  static isTypeSupported=(mime:string)=>mime==='video/webm';
  state='inactive';mimeType='video/webm';ondataavailable:any;onstop:any;onerror:any;
  constructor(_stream:unknown,_options:unknown){}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['video'])});this.onstop?.();}
 }
 beforeEach(()=>{vi.useFakeTimers();stop=vi.fn();stream={getTracks:()=>[{stop}]};callbacks={preview:vi.fn(),elapsed:vi.fn(),recorded:vi.fn(),error:vi.fn()};vi.stubGlobal('MediaRecorder',FakeRecorder);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn().mockResolvedValue(stream)}});});
 afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
 it('does not request access until open, then stops at 120 seconds and releases tracks',async()=>{const recorder=new VideoWishesRecorder(callbacks);expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();await recorder.open();recorder.start();vi.advanceTimersByTime(120000);expect(callbacks.recorded).toHaveBeenCalledOnce();expect(stop).toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);});
 it('releases a late permission response after cancellation',async()=>{let resolve:any;(navigator.mediaDevices.getUserMedia as any).mockImplementation(()=>new Promise(r=>resolve=r));const recorder=new VideoWishesRecorder(callbacks);const pending=recorder.open();recorder.cancel();resolve(stream);await pending;expect(stop).toHaveBeenCalledOnce();expect(callbacks.preview).not.toHaveBeenCalled();});
 it('denial reports the upload fallback without starting a recorder',async()=>{(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(new Error('Denied'));const recorder=new VideoWishesRecorder(callbacks);await recorder.open();expect(callbacks.error).toHaveBeenCalledWith(expect.stringContaining('upload'));expect(callbacks.recorded).not.toHaveBeenCalled();});
 it('supports re-recording and cancellation without submitting',async()=>{const recorder=new VideoWishesRecorder(callbacks);await recorder.open();recorder.start();recorder.cancel();expect(callbacks.recorded).not.toHaveBeenCalled();await recorder.open();recorder.start();recorder.stop();expect(callbacks.recorded).toHaveBeenCalledOnce();expect(recordingMime(FakeRecorder as any)).toBe('video/webm');});
});
