/** Service-client only. The actor must come from verified Auth, never request data. */
export async function requirePlanningEventOwner(db: any, actor: string, eventId: string): Promise<string> {
  const { data, error } = await db.rpc('internal_team_event_owner', { p_actor: actor, p_event: eventId });
  if (error || typeof data !== 'string' || !data) throw new Error('Event not found or unauthorized');
  return data;
}
