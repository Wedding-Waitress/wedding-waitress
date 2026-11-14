/** An escaped image representation lets written memories use the existing gallery image renderer. */
export function guestbookMemoryPoster(message: string, name?: string | null): string {
 const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
 const chars=Array.from(message || '♫'), lines:string[]=[];
 for(let i=0;i<chars.length&&lines.length<24;i+=36)lines.push(chars.slice(i,i+36).join(''));
 if(chars.length>864)lines[23]+='…';
 const text=lines.map((line,i)=>'<text x="600" y="'+(240+i*48)+'" text-anchor="middle">'+esc(line)+'</text>').join('');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="#321c13"/><rect x="45" y="45" width="1110" height="1510" rx="20" fill="none" stroke="#967a59" stroke-width="3"/><g fill="#fff8ed" font-family="sans-serif" font-size="43">'+text+'<text x="600" y="1480" text-anchor="middle" font-size="32">'+esc((name||'').slice(0,70))+'</text></g></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
