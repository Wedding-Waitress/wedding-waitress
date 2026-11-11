type Check = { state: string; detail: string };
type Env = (name: string) => string | undefined;
type Result = { checked_at: string; checks: Record<string, Check> };
const unavailable = (state: string, detail: string): Check => ({ state, detail });

/** Read-only probes: no emails, SMS, payments or provider settings are created. */
export async function readAdminProviderHealth(env: Env, send: typeof fetch = fetch): Promise<Result> {
  const checks: Record<string, Check> = {};
  const get = async (url: string, authorization: string) => {
    try {
      const response = await send(url, { method: 'GET', headers: { Authorization: authorization }, signal: AbortSignal.timeout(5000), redirect: 'error' });
      if (!response.ok) { await response.body?.cancel(); return { error: response.status === 401 ? 'authentication_failed' : response.status === 403 ? 'read_permission_missing' : response.status === 429 ? 'rate_limited' : 'unavailable', data: null }; }
      return { error: null, data: await response.json() };
    } catch { return { error: 'unreachable', data: null }; }
  };
  const resend = env('RESEND_API_KEY');
  if (!resend) {
    checks.email_provider = unavailable('missing', 'Email provider credentials are missing.');
    checks.email_webhook = unavailable('unknown', 'Webhook registration could not be checked.');
  } else {
    const domains = await get('https://api.resend.com/domains?limit=100', 'Bearer ' + resend);
    if (domains.error) checks.email_provider = unavailable(domains.error, 'Email provider read access could not be confirmed. Sending permissions may be different.');
    else if (!Array.isArray(domains.data?.data)) checks.email_provider = unavailable('unknown', 'The domain response was incomplete.');
    else {
      const domain = domains.data.data.find((row: { name?: string }) => row.name === 'weddingwaitress.com.au');
      checks.email_provider = domain?.status === 'verified' ? unavailable('verified', 'Provider reached and the sending domain is verified.') : unavailable(domain ? 'attention' : domains.data.has_more ? 'unknown' : 'missing', 'A verified sending domain was not confirmed.');
    }
    if (domains.error) checks.email_webhook = unavailable('unknown', 'Webhook registration requires provider read access.');
    else {
      const hooks = await get('https://api.resend.com/webhooks', 'Bearer ' + resend);
      if (hooks.error) checks.email_webhook = unavailable(hooks.error, 'Webhook registration could not be checked.');
      else if (!Array.isArray(hooks.data?.data)) checks.email_webhook = unavailable('unknown', 'The webhook response was incomplete.');
      else {
        const endpoint = env('SUPABASE_URL')?.replace(/\/$/, '') + '/functions/v1/email-delivery-webhook';
        const matching = hooks.data.data.filter((row: { endpoint?: string }) => row.endpoint === endpoint);
        const required = ['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed'];
        const configured = matching.some((row: { status?: string; events?: string[] }) => row.status === 'enabled' && required.every(event => row.events?.includes(event)));
        checks.email_webhook = unavailable(configured ? 'verified' : matching.length ? 'attention' : hooks.data.has_more ? 'unknown' : 'missing', configured ? 'Enabled endpoint and all required delivery events are registered.' : 'An enabled endpoint with every required delivery event was not confirmed.');
      }
    }
  }
  const sid = env('TWILIO_ACCOUNT_SID'), token = env('TWILIO_AUTH_TOKEN');
  if (!sid || !token || !/^AC[0-9a-f]{32}$/i.test(sid)) checks.sms_provider = unavailable('missing', 'SMS account credentials are missing or invalid.');
  else {
    const account = await get('https://api.twilio.com/2010-04-01/Accounts/' + sid + '.json', 'Basic ' + btoa(sid + ':' + token));
    checks.sms_provider = account.error ? unavailable(account.error, 'SMS provider read access could not be confirmed.') : account.data?.status === 'active' ? unavailable('verified', 'Provider reached and the SMS account is active. Handset delivery was not tested.') : unavailable('attention', 'The SMS account was not confirmed active.');
  }
  checks.stripe_reporting = env('STRIPE_READ_ONLY_KEY') ? unavailable('unknown', 'Dedicated reporting credentials are present; live reconciliation is checked in billing.') : unavailable('missing', 'Dedicated read-only Stripe reporting credentials are missing.');
  return { checked_at: new Date().toISOString(), checks };
}
