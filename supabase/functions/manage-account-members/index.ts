import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  DEFAULT_ACCOUNT_SEATS, isTeamAction, isValidEmail, normalizeEmail, resolveSeatLimit,
  publicErrorMessage, safeRedirectOrigin,
} from './core.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (Deno.env.get('TEAM_ACCESS_ENABLED') !== 'true') {
    return json({ error: 'Team access is not available in this environment' }, 503)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Server configuration error' }, 500)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Authentication required' }, 401)

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: userResult, error: userError } = await callerClient.auth.getUser()
  const caller = userResult?.user
  if (userError || !caller?.id || !caller.email) return json({ error: 'Authentication required' }, 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!isTeamAction(body.action)) return json({ error: 'Invalid team action' }, 400)

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: integrationReady, error: readinessError } = await admin.rpc('internal_team_access_ready')
  if (readinessError || integrationReady !== true) {
    return json({ error: 'Team access is not available in this environment' }, 503)
  }

  try {
    if (body.action === 'accept') {
      const { data, error } = await admin.rpc('internal_accept_account_invitation', {
        p_user_id: caller.id,
        p_user_email: caller.email,
      })
      if (error) return json({ error: publicErrorMessage(error.message) }, error.code === '42501' ? 403 : 400)
      return json({ success: true, membership: data })
    }

    const { data: master, error: masterError } = await admin
      .from('account_members')
      .select('id')
      .eq('account_owner_id', caller.id)
      .eq('member_user_id', caller.id)
      .eq('role', 'master')
      .is('access_disabled_at', null)
      .not('accepted_at', 'is', null)
      .maybeSingle()
    if (masterError || !master) return json({ error: 'Only the master account holder can manage users' }, 403)

    const { data: subscription } = await admin
      .from('user_subscriptions')
      .select('plan_id, subscription_plans(name,max_users)')
      .eq('user_id', caller.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const joinedPlan = Array.isArray(subscription?.subscription_plans)
      ? subscription?.subscription_plans[0]
      : subscription?.subscription_plans
    const seatLimit = resolveSeatLimit(joinedPlan ?? null) || DEFAULT_ACCOUNT_SEATS

    if (body.action === 'list') {
      await admin.from('account_invitations')
        .update({ status: 'expired', token: null, token_hash: null })
        .eq('account_owner_id', caller.id).eq('status', 'pending').lte('expires_at', new Date().toISOString())

      const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }] = await Promise.all([
        admin.from('account_members')
          .select('id,member_user_id,member_email,role,invited_at,accepted_at')
          .eq('account_owner_id', caller.id).is('access_disabled_at', null).order('invited_at'),
        admin.from('account_invitations')
          .select('id,email,created_at,expires_at,status')
          .eq('account_owner_id', caller.id).eq('status', 'pending').gt('expires_at', new Date().toISOString()).order('created_at'),
      ])
      if (membersError || invitationsError) throw membersError ?? invitationsError

      const hydratedMembers = await Promise.all((members ?? []).map(async (member) => {
        if (member.member_email) return member
        if (member.member_user_id === caller.id) return { ...member, member_email: caller.email }
        const { data } = await admin.auth.admin.getUserById(member.member_user_id)
        return { ...member, member_email: data.user?.email ?? 'Account user' }
      }))
      const usedSeats = hydratedMembers.length + (invitations?.length ?? 0)
      return json({
        members: hydratedMembers,
        invitations: invitations ?? [],
        seats: { used: usedSeats, maximum: seatLimit, remaining: Math.max(0, seatLimit - usedSeats) },
      })
    }

    if (body.action === 'invite') {
      if (!isValidEmail(body.email)) return json({ error: 'A valid email address is required' }, 400)
      const email = normalizeEmail(body.email)
      const { data: invitation, error: invitationError } = await admin.rpc('internal_create_account_invitation', {
        p_owner_id: caller.id,
        p_owner_email: caller.email,
        p_email: email,
        p_seat_limit: seatLimit,
      })
      if (invitationError) return json({ error: publicErrorMessage(invitationError.message) }, invitationError.code === '42501' ? 403 : 400)

      const redirectOrigin = safeRedirectOrigin(Deno.env.get('TEAM_INVITE_REDIRECT_ORIGIN'))
      if (!redirectOrigin) {
        await admin.rpc('internal_revoke_account_invitation', { p_owner_id: caller.id, p_invitation_id: invitation.id })
        return json({ error: 'Team invitations are not configured for this environment' }, 503)
      }
      // The authenticated email address is the claim credential. There is no
      // separate account token to expose in URLs, referrers or analytics.
      const redirectTo = `${redirectOrigin}/accept-team-invitation`
      const { data: authLink, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink', email, options: { redirectTo },
      })
      if (linkError || !authLink?.properties?.action_link) {
        await admin.rpc('internal_revoke_account_invitation', { p_owner_id: caller.id, p_invitation_id: invitation.id })
        return json({ error: 'The secure sign-in link could not be created' }, 502)
      }

      const { data: emailResult, error: emailError } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'account-team-invitation',
          recipientEmail: email,
          idempotencyKey: `account-team-invite-${invitation.id}`,
          templateData: { accountHolderEmail: caller.email, acceptUrl: authLink.properties.action_link, expiresAt: invitation.expires_at },
        },
      })
      if (emailError || emailResult?.success !== true) {
        await admin.rpc('internal_revoke_account_invitation', { p_owner_id: caller.id, p_invitation_id: invitation.id })
        return json({ error: 'The invitation email could not be sent' }, 502)
      }
      return json({ success: true, invitation: { id: invitation.id, email, expires_at: invitation.expires_at } }, 201)
    }

    if (body.action === 'revoke-invitation') {
      const invitationId = typeof body.invitationId === 'string' ? body.invitationId : ''
      const { data, error } = await admin.rpc('internal_revoke_account_invitation', {
        p_owner_id: caller.id, p_invitation_id: invitationId,
      })
      if (error) return json({ error: publicErrorMessage(error.message) }, 400)
      if (!data) return json({ error: 'Pending invitation not found' }, 404)
      return json({ success: true })
    }

    const memberId = typeof body.memberId === 'string' ? body.memberId : ''
    const { data, error } = await admin.rpc('internal_remove_account_member', {
      p_owner_id: caller.id, p_member_id: memberId,
    })
    if (error) return json({ error: publicErrorMessage(error.message) }, 400)
    if (!data) return json({ error: 'Team member not found or cannot be removed' }, 404)
    return json({ success: true })
  } catch (error) {
    console.error('manage-account-members failed', error)
    return json({ error: 'The team access request could not be completed' }, 500)
  }
})
