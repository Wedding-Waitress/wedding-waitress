import {expect,it} from 'vitest';
import {receptionLabelRotation} from './receptionLabelOrientation';
it('turns a tall door label with the door and keeps it readable',()=>{expect(receptionLabelRotation(24,260,0)).toBe(-90);expect(receptionLabelRotation(24,260,90)+90).toBe(0);expect(receptionLabelRotation(24,260,180)+180).toBe(-90)});
it('adapts when resized from tall to wide and leaves square labels upright',()=>{expect(receptionLabelRotation(260,24,0)).toBe(0);expect(receptionLabelRotation(100,100,45)).toBe(-45)});
