import { describe, expect, it } from 'vitest';
import { signageImageCrop } from './signageImageFit';
const papers = [{label:'A0',widthMm:841,heightMm:1189},{label:'A1',widthMm:594,heightMm:841},{label:'A2',widthMm:420,heightMm:594},{label:'A3',widthMm:297,heightMm:420}];
describe('sign background fitting', () => {
  it.each(papers)('$label preserves an exact-proportion image without a crop prompt', paper => {
    expect(signageImageCrop(paper.widthMm * 2,paper.heightMm * 2,paper)).toEqual({width:100,height:100,left:0,top:0,needsApproval:false});
  });
  for(const paper of papers) {
    it.each([[1200,600],[600,1200],[800,800]])(`${paper.label} previews the precise retained region of a %s x %s image`, (w,h) => {
      const crop=signageImageCrop(w,h,paper);
      expect(crop.needsApproval).toBe(true);
      expect(crop.width * w / (crop.height * h)).toBeCloseTo(paper.widthMm/paper.heightMm,8);
      expect(crop.width + crop.left * 2).toBeCloseTo(100,8);
      expect(crop.height + crop.top * 2).toBeCloseTo(100,8);
    });
  }
});
