import {afterEach,describe,it,expect} from 'vitest';
import {isDarkNeutralBorder,updateSoftInterfaceBorders} from './softInterfaceBorders';
afterEach(()=>{document.body.innerHTML='';});
describe('existing dark interface border normalization',()=>{
 it.each(['rgb(0, 0, 0)','rgb(71, 44, 29)','rgb(112, 69, 47)','rgba(150, 122, 89, 0.8)'])('recognizes %s',color=>expect(isDarkNeutralBorder(color)).toBe(true));
 it.each(['transparent','rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0.1)','rgb(205, 185, 158)','rgb(220, 38, 38)','rgb(22, 163, 74)','rgb(30, 64, 175)'])('preserves %s',color=>expect(isDarkNeutralBorder(color)).toBe(false));
 it('changes only visible dark sides and does not add borders',()=>{
  document.body.innerHTML='<div id="root"><button id="none" style="border:0">Plain</button><div id="side" style="border-top:2px solid black;border-bottom:1px solid red">Panel</div></div>';
  updateSoftInterfaceBorders();
  expect(document.getElementById('none')?.hasAttribute('data-ww-soft-border-top')).toBe(false);
  expect(document.getElementById('side')?.hasAttribute('data-ww-soft-border-top')).toBe(true);
  expect(document.getElementById('side')?.hasAttribute('data-ww-soft-border-bottom')).toBe(false);
 });
 it('preserves printed artwork, color selections and validation borders, including portal artwork',()=>{
  document.body.innerHTML='<div id="root"><div data-print-mirror-document><div id="paper" style="border:1px solid black">Document</div></div><input id="error" aria-invalid="true" style="border:1px solid black"/><input id="color" type="color" style="border:1px solid black"/></div><div role="dialog"><button id="portal" style="border:1px solid black">Action</button><div data-dashboard-artwork><div id="art" style="border:1px solid black">Artwork</div></div></div>';
  updateSoftInterfaceBorders();
  for(const id of ['paper','error','color','art'])expect(document.getElementById(id)?.hasAttribute('data-ww-soft-border-top')).toBe(false);
  expect(document.getElementById('portal')?.hasAttribute('data-ww-soft-border-top')).toBe(true);
 });
 it('re-evaluates changed states rather than retaining a prior neutral-border annotation',()=>{
  document.body.innerHTML='<div id="root"><button id="action" style="border:1px solid black">Action</button></div>';
  updateSoftInterfaceBorders();const button=document.getElementById('action')!;
  expect(button.hasAttribute('data-ww-soft-border-top')).toBe(true);
  button.style.borderColor='red';updateSoftInterfaceBorders(button);
  expect(button.hasAttribute('data-ww-soft-border-top')).toBe(false);
 });
});
