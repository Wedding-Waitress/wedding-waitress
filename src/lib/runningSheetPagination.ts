export interface RunSheetBlock { top:number; bottom:number; keepTogether:boolean }
/** Slice intrinsic document pixels without skipping content or stranding a heading. */
export function paginateRunSheet(contentHeight:number,blocks:RunSheetBlock[],firstCapacity:number,nextCapacity:number,findGap:(limit:number,start:number)=>number){
 const slices:{start:number;height:number}[]=[];let cursor=0;
 while(cursor<contentHeight){const capacity=slices.length?nextCapacity:firstCapacity;let end=Math.min(contentHeight,cursor+capacity);
  const crossing=blocks.find(block=>block.keepTogether&&block.top<end&&block.bottom>end&&block.bottom-block.top<=nextCapacity);
  if(crossing&&crossing.top>cursor+1)end=crossing.top;
  if(end<contentHeight&&end>cursor+1){const gap=findGap(end,cursor);if(gap>cursor&&gap<=end)end=gap;}
  if(end<=cursor)end=Math.min(contentHeight,cursor+capacity);
  slices.push({start:cursor,height:end-cursor});cursor=end;
 }
 return slices;
}
