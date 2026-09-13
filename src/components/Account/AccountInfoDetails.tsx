import React from 'react';

export interface AccountInfoDetailsProps {
  accountId: string;
  fullName: string;
  email: string;
  pendingEmail?: string | null;
  mobile: string;
  role: string;
  verification: string;
  createdAt?: string | null;
}

// Shared display only: no authentication, profile queries or editing side effects.
export function AccountInfoDetails({accountId,fullName,email,pendingEmail,mobile,role,verification,createdAt}:AccountInfoDetailsProps) {
  return <dl className="space-y-3 text-sm">
    <Row label="Account ID" value={accountId}/>
    <Row label="Name" value={fullName}/>
    <Row label="Login email" value={email}/>
    {pendingEmail&&<Row label="Pending login email" value={`${pendingEmail} — awaiting verification`}/>}
    <Row label="Phone" value={mobile}/>
    <Row label="Account role" value={role}/>
    <Row label="Email verification" value={verification}/>
    {createdAt&&<Row label="Member since" value={new Date(createdAt).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'})}/>}
  </dl>;
}

const Row:React.FC<{label:string;value:string}>=({label,value})=>(
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50 last:border-0">
    <dt className="text-muted-foreground font-medium">{label}</dt>
    <dd className="text-foreground font-medium break-all">{value}</dd>
  </div>
);
