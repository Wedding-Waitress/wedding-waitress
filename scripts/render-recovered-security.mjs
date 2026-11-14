// Reproducible SQL renderer from the read-only catalog snapshot, not a DB client.
export const quote = text => '"'+text.replaceAll('"','""')+'"';
const literal = text => "'"+text.replaceAll("'","''")+"'";
export const shapeQuery = `SELECT jsonb_build_object('columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',co.conname,'definition',pg_get_constraintdef(co.oid,true)) order by co.conname),'[]'::jsonb) from pg_constraint co where co.conrelid=c.oid),'indexes',(select coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid) order by ci.relname),'[]'::jsonb) from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=c.oid)) FROM pg_class c join pg_namespace n on n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=TABLE_NAME`;
export function renderSecurity(evidence) {
  const lines=['-- Reconcile six recovered tables with read-only live catalog evidence (2026-10-22).',
    '-- Definitions only: no customer rows or ownership changes; table grants stay in the ACL baseline.',
    '-- Missing or different table structure aborts; never guess or drop table data.',
    'BEGIN;', 'SET LOCAL search_path=pg_catalog,public,extensions;'];
  for(const t of evidence.tables.tables) {
    const expected=JSON.stringify({columns:t.columns,constraints:t.constraints,indexes:t.indexes});
    lines.push(`DO $recovery$ DECLARE actual jsonb; BEGIN ${shapeQuery.replace('where co.conrelid=c.oid',"where co.conrelid=c.oid and co.contype<>'n'").replace(' FROM pg_class c join',' INTO actual FROM pg_class c join').replace('TABLE_NAME',literal(t.name))}; IF actual IS DISTINCT FROM ${literal(expected)}::jsonb THEN RAISE EXCEPTION 'Recovered table ${t.name} differs from reviewed schema; reconcile in a disposable environment first'; END IF; END $recovery$;`);
    lines.push(`ALTER TABLE public.${quote(t.name)} ${t.rls?'ENABLE':'DISABLE'} ROW LEVEL SECURITY;`, `ALTER TABLE public.${quote(t.name)} ${t.forceRls?'FORCE':'NO FORCE'} ROW LEVEL SECURITY;`);
    lines.push(`DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT polname FROM pg_policy WHERE polrelid='public.${t.name}'::regclass LOOP EXECUTE format('DROP POLICY %I ON public.${t.name}',item.polname); END LOOP; END $recovery$;`);
    for(const p of t.policies) {
      const command={'*':'ALL',r:'SELECT',a:'INSERT',w:'UPDATE',d:'DELETE'}[p.command];
      lines.push(`CREATE POLICY ${quote(p.name)} ON public.${quote(t.name)} AS ${p.permissive?'PERMISSIVE':'RESTRICTIVE'} FOR ${command} TO ${p.roles.map(r=>r==='public'?'PUBLIC':quote(r)).join(', ')}${p.using?' USING ('+p.using+')':''}${p.check?' WITH CHECK ('+p.check+')':''};`);
    }
    lines.push(`DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.${t.name}'::regclass AND NOT tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.${t.name}',item.tgname); END LOOP; END $recovery$;`);
    for(const trigger of t.triggers) lines.push(trigger+';');
  }
  // Original recoveries restore these signatures, and these definitions capture
  // their current bodies, secured search paths and explicit EXECUTE privileges.
  for(const f of evidence.tables.functions.filter(f=>f.name!=='update_updated_at_column')) {
    lines.push(f.definition+';');
    const signature=`public.${quote(f.name)}(${f.arguments})`;
    lines.push(`REVOKE EXECUTE ON FUNCTION ${signature} FROM PUBLIC,anon,authenticated,service_role;`);
    const allowed=['','anon','authenticated','service_role'].filter(role=>f.acl.includes((role?role:'')+'=X/') && (role || f.acl.includes('{=X/') || f.acl.includes(',=X/'))).map(role=>role||'PUBLIC');
    if(allowed.length)lines.push(`GRANT EXECUTE ON FUNCTION ${signature} TO ${allowed.join(', ')};`);
  }
  lines.push("NOTIFY pgrst, 'reload schema';",'COMMIT;','');
  return lines.join('\n');
}
