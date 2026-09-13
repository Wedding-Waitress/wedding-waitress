import React from 'react';
import {ChevronDown} from 'lucide-react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import styles from './AdminCentrePages.module.css';
export function AdminCustomerAccountStatus({status,detail,customerName}:{status:'Active'|'Deleted'|'Suspended';detail?:string;customerName:string}) {
 return <div style={{display:'inline-flex',alignItems:'center',gap:4}}>
  <span className={`${styles.badge} ${styles.accountStatusBadge}`} data-account-status data-access-colour={status==='Active'?'green':'red'}>{status}</span>
  {detail&&<Popover><PopoverTrigger asChild><button type="button" aria-label={`Account details for ${customerName}`} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:28,height:28,border:'1px solid #d8bc91',borderRadius:6,background:'#fffaf2',color:'#2f1b14'}}><ChevronDown size={14} aria-hidden="true"/></button></PopoverTrigger>
   <PopoverContent align="start" collisionPadding={12} sideOffset={6} aria-label={`Account status details for ${customerName}`} style={{width:320,maxWidth:'calc(100vw - 24px)',padding:12,background:'#fffaf2',color:'#2f1b14',borderColor:'#d8bc91',fontSize:13,lineHeight:1.5,overflowWrap:'anywhere'}}>{detail}</PopoverContent>
  </Popover>}
 </div>;
}
