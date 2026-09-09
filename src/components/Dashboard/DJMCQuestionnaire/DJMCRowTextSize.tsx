import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export function DJMCRowTextSize({value,onChange}:{value:'standard'|'larger';onChange:(value:'standard'|'larger')=>void}) {
 return <Select value={value} onValueChange={value=>onChange(value as 'standard'|'larger')}>
  <SelectTrigger aria-label="Row Text Size" className="w-auto gap-2 border-primary focus:ring-primary print:hidden"><span>Row Text Size</span><SelectValue/></SelectTrigger>
  <SelectContent className="ww-djmc-portal"><SelectItem value="standard">Standard</SelectItem><SelectItem value="larger">Larger</SelectItem></SelectContent>
 </Select>;
}
