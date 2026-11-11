import React,{useEffect,useMemo,useRef,useState} from 'react';
import s from './PhotoCalloutDocument.module.css';

// The same high-resolution title image is shown and captured for PDF. This
// retains the loaded Manrope font and avoids canvas text-baseline differences.
export function PhotoCardTitle({title}:{title:string}) {
 const ref=useRef<HTMLHeadingElement>(null);const [width,setWidth]=useState(200);const [fontReady,setFontReady]=useState(false);
 useEffect(()=>{const el=ref.current;if(!el)return;const resize=new ResizeObserver(()=>setWidth(el.clientWidth||200));resize.observe(el);let active=true;document.fonts.load('700 18px Manrope').then(()=>document.fonts.ready).then(()=>{if(active)setFontReady(true);});return()=>{active=false;resize.disconnect();};},[]);
 const lines=useMemo(()=>{const ctx=document.createElement('canvas').getContext('2d');if(ctx)ctx.font='700 18px Manrope';const measure=(text:string)=>ctx?ctx.measureText(text).width:text.length*11;const result:string[]=[];let line='';for(const word of title.trim().split(/\s+/)){if(measure(word)<=width){if(!line)line=word;else if(measure(line+' '+word)<=width)line+=' '+word;else{result.push(line);line=word;}}else{if(line)result.push(line);line='';for(const char of Array.from(word)){if(line&&measure(line+char)>width){result.push(line);line='';}line+=char;}}}if(line||!result.length)result.push(line);return result.map(x=>x.trim());},[title,width,fontReady]);
 const source=useMemo(()=>{const canvas=document.createElement('canvas');const density=4;canvas.width=Math.ceil(width*density);canvas.height=lines.length*24*density;const ctx=canvas.getContext('2d');if(!ctx)return '';ctx.scale(density,density);ctx.font='700 18px Manrope';ctx.fillStyle='#2f1b14';ctx.textBaseline='alphabetic';lines.forEach((line,index)=>ctx.fillText(line,0,18+index*24));return canvas.toDataURL('image/png');},[width,lines,fontReady]);
 return <h4 ref={ref} className={s.title} aria-label={title}><img src={source} alt="" width={width} height={lines.length*24} style={{display:'block',width:'100%',height:lines.length*24,objectFit:'fill'}}/></h4>;
}
