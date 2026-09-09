// Align narrow fixture labels with their long edge, keeping text right-way up.
export function receptionLabelRotation(width:number,height:number,rotation:number):number {
 if(Math.max(width,height)<Math.min(width,height)*2)return -rotation;
 const axis=rotation+(height>width?-90:0);
 const readable=((axis+90)%180+180)%180-90;
 return readable-rotation;
}
