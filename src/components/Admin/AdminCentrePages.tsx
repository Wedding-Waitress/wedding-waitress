import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getCacheGeneration, registerCache } from "@/lib/cacheRegistry";
import styles from "./AdminCentrePages.module.css";

type Customer = {
  id: string;
  full_name: string;
  email: string | null;
  mobile: string | null;
  signup_date: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  customer_type: string;
  account_status: string;
  plan_name: string | null;
  plan_status: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  event_count: number;
  guest_count?: number;
  table_count?: number;
  seated_guest_count?: number;
  feature_usage_count?: number;
  media_item_count?: number;
  media_storage_bytes?: number;
  team_member_count?: number;
  active_team_member_count?: number;
};
type Subscription = {
  id: string;
  user_id: string;
  customer_name: string;
  email: string | null;
  plan_name: string;
  price_aud: number;
  subscription_status: string;
  payment_status: string;
  started_at: string;
  expires_at: string;
  created_at: string;
  is_read_only: boolean;
  vendor_approval_status: string;
};
type EventRow = {
  id: string;
  user_id: string;
  name: string;
  event_type: string;
  effective_date: string | null;
  venue: string | null;
  created_at: string;
  owner_name: string;
  owner_email: string | null;
  guest_count: number;
  invitations_sent: number;
  attending_count: number;
  plan_name: string | null;
  event_status: string;
  seated_guest_count?: number;
  unseated_guest_count?: number;
  dietary_guest_count?: number;
  declined_count?: number;
  table_count?: number;
  seating_capacity?: number;
  invite_attempt_count?: number;
  invite_success_count?: number;
  sms_invite_count?: number;
  email_invite_count?: number;
  sms_usage_count?: number;
  email_usage_count?: number;
  media_photo_count?: number;
  media_video_count?: number;
  media_storage_bytes?: number;
  guestbook_recording_count?: number;
  guestbook_text_count?: number;
  photo_booth_capture_count?: number;
  qr_scan_count?: number;
  feature_count?: number;
};
type Lifecycle = {
  account_owner_id: string;
  customer_name: string;
  email: string | null;
  status: string;
  deletion_requested_at: string | null;
  purge_after: string | null;
  reactivated_at: string | null;
  stripe_cancellation_succeeded: boolean | null;
  deletion_processing_error: string | null;
  updated_at: string;
  previous_plan: string | null;
  purge_status: string;
};
type Payment = {
  id: string;
  user_id: string;
  customer_name: string;
  email: string | null;
  payment_type: string;
  amount_paid: number;
  payment_date: string;
  status: string;
  stripe_reference: string | null;
  payment_method: string | null;
};
type Snapshot = {
  reporting_version?: number;
  generated_at: string;
  platform_totals?: {
    customers: number;
    events: number;
    tables: number;
    guests: number;
    seated_guests: number;
    invitations_sent: number;
    media_items: number;
    media_storage_bytes: number;
    guestbook_entries: number;
    photo_booth_captures: number;
    feature_configurations: number;
  };
  customers: Customer[];
  subscriptions: Subscription[];
  events: EventRow[];
  lifecycle: Lifecycle[];
  payments: Payment[];
  recent_admin_actions: Array<{
    id: string;
    action: string;
    target_type: string;
    target_id: string;
    result: string;
    created_at: string;
  }>;
  configuration: {
    account_lifecycle: boolean;
    admin_actions: boolean;
    stripe_live_data: boolean;
    platform_reporting?: boolean;
  };
};
const empty: Snapshot = {
  generated_at: "",
  customers: [],
  subscriptions: [],
  events: [],
  lifecycle: [],
  payments: [],
  recent_admin_actions: [],
  configuration: {
    account_lifecycle: false,
    admin_actions: false,
    stripe_live_data: false,
  },
};
const SNAPSHOT_FRESH_MS = 30_000;
let snapshotCache: Snapshot | null = null;
let snapshotCachedAt = 0;
let snapshotRequest: Promise<Snapshot> | null = null;
registerCache(() => {
  snapshotCache = null;
  snapshotCachedAt = 0;
  snapshotRequest = null;
});

const requestAdminSnapshot = () => {
  if (snapshotRequest) return snapshotRequest;
  const generation = getCacheGeneration();
  snapshotRequest = (async () => {
      let { data: result, error } = await supabase.rpc("get_admin_platform_snapshot" as never);
      if (error && (error as { code?: string }).code === "42883") {
        ({ data: result, error } = await supabase.rpc("get_admin_centre_snapshot" as never));
      }
      if (error) throw error;
      if (generation !== getCacheGeneration()) throw new Error("Admin request superseded by an account change.");
      snapshotCache = (result || empty) as unknown as Snapshot;
      snapshotCachedAt = Date.now();
      return snapshotCache;
    })()
    .finally(() => { snapshotRequest = null; });
  return snapshotRequest;
};
const date = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const money = (value: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    value || 0,
  );
const tone = (value: string) =>
  ["active", "succeeded", "completed", "reactivated", "recorded"].includes(
    value,
  )
    ? "good"
    : [
          "failed",
          "suspended",
          "past_due",
          "unpaid",
          "permanently_deleted",
        ].includes(value)
      ? "bad"
      : ["pending", "pending_approval", "scheduled_for_deletion"].includes(
            value,
          )
        ? "warn"
        : "neutral";
const words = (value: string) => value.split("_").join(" ");
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span
    className={styles.badge}
    data-tone={tone(String(children).toLowerCase())}
  >
    {words(String(children))}
  </span>
);
const Metric = ({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: React.ReactNode;
  attention?: boolean;
}) => (
  <div className={styles.metric} data-attention={attention}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

function useAdminSnapshot() {
  const [data, setData] = useState<Snapshot>(snapshotCache ?? empty);
  const [loading, setLoading] = useState(!snapshotCache);
  const [unavailable, setUnavailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (force = false) => {
    const fresh = snapshotCache && Date.now() - snapshotCachedAt < SNAPSHOT_FRESH_MS;
    if (!force && fresh) {
      setData(snapshotCache);
      setLoading(false);
      return;
    }
    setLoading(!snapshotCache);
    setRefreshing(!!snapshotCache);
    setUnavailable(false);
    try {
      setData(await requestAdminSnapshot());
    } catch (error) {
      console.error("[Admin Centre] snapshot unavailable", {
        code: (error as { code?: string }).code,
        message: error instanceof Error ? error.message : String(error),
      });
      setUnavailable(true);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, loading, unavailable, refreshing, reload: () => void load(true) };
}
const State = ({
  loading,
  unavailable,
  reload,
}: {
  loading: boolean;
  unavailable: boolean;
  reload: () => void;
}) =>
  loading ? (
    <div className={styles.loading} role="status">
      Loading current operational data…
    </div>
  ) : unavailable ? (
    <div className={styles.unavailable} role="alert">
      <strong>Admin data is temporarily unavailable</strong>
      <span>
        The protected Admin Centre database migration must be applied before
        production use. Diagnostic detail has been written to the secure
        console.
      </span>
      <div>
        <button className={styles.button} onClick={reload}>
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  ) : null;
const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className={styles.section}>
    <div className={styles.sectionHeader}>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
    {children}
  </section>
);

const SnapshotFreshness = ({
  generatedAt,
  refreshing,
  reload,
}: {
  generatedAt: string;
  refreshing: boolean;
  reload: () => void;
}) => (
  <div className={styles.freshness} role="status">
    <span>Reporting snapshot {generatedAt ? `updated ${date(generatedAt)}` : "ready"}</span>
    <button className={styles.button} type="button" onClick={reload} disabled={refreshing}>
      <RefreshCw size={14} className={refreshing ? styles.spinning : undefined} />
      {refreshing ? "Refreshing…" : "Refresh"}
    </button>
  </div>
);

type Action = {
  action: string;
  targetId: string;
  targetName: string;
  destructive?: boolean;
  strong?: boolean;
};
function AdminActionDialog({
  value,
  onClose,
  onSuccess,
}: {
  value: Action | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setReason("");
    setConfirmed(false);
    setTyped("");
    setError("");
  }, [value]);
  if (!value) return null;
  const ready =
    reason.trim().length >= 5 &&
    (!value.strong || (confirmed && typed === "PERMANENTLY DELETE"));
  const submit = async () => {
    setBusy(true);
    setError("");
    const { data, error: invokeError } = await supabase.functions.invoke(
      "admin-account-action",
      {
        body: {
          action: value.action,
          target_id: value.targetId,
          reason: reason.trim(),
          admin_grant: sessionStorage.getItem("ww_admin_grant"),
          admin_grant_signature: sessionStorage.getItem("ww_admin_grant_sig"),
        },
      },
    );
    if (invokeError || (data as { error?: string } | null)?.error) {
      setError(
        (data as { error?: string } | null)?.error ||
          "The action could not be confirmed. No success was recorded.",
      );
      setBusy(false);
      return;
    }
    setBusy(false);
    onClose();
    onSuccess();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{words(value.action)}</DialogTitle>
          <DialogDescription>
            Target: {value.targetName}. This action runs only through the
            protected administrator service and creates an audit entry.
          </DialogDescription>
        </DialogHeader>
        <div className={styles.dialogText}>
          {value.destructive && (
            <p className={styles.warning}>
              <ShieldAlert size={16} /> This changes customer access. Confirm
              the record and provide a clear operational reason.
            </p>
          )}
          {value.strong && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{" "}
                I understand this is irreversible.
              </label>
              <label>
                Type PERMANENTLY DELETE
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                />
              </label>
            </>
          )}
          <label>
            Administrator reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required for the secure audit record"
            />
          </label>
          {error && (
            <p role="alert" className={styles.warning}>
              {error}
            </p>
          )}
          <div className={styles.actionRow}>
            <button className={styles.button} onClick={onClose}>
              Cancel
            </button>
            <button
              className={`${styles.button} ${value.destructive ? styles.danger : styles.green}`}
              disabled={!ready || busy}
              onClick={() => void submit()}
            >
              {busy ? "Confirming…" : "Confirm action"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const AdminOverviewPage = () => {
  const { data, loading, unavailable, refreshing, reload } = useAdminSnapshot();
  const now = Date.now(),
    week = 7 * 864e5,
    monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).getTime();
  const trials = data.subscriptions.filter(
    (s) =>
      /starter|trial/i.test(s.plan_name) ||
      s.subscription_status === "trialing",
  );
  const paid = data.subscriptions.filter(
    (s) => s.subscription_status === "active" && !trials.includes(s),
  );
  const upcoming = data.events.filter(
    (e) => e.effective_date && new Date(e.effective_date).getTime() >= now,
  );
  const closed = data.lifecycle.filter(
    (l) => l.status === "scheduled_for_deletion",
  );
  const attention = [
    ...data.subscriptions
      .filter((s) => ["past_due", "unpaid"].includes(s.subscription_status))
      .map((s) => ({
        text: `Payment attention: ${s.customer_name}`,
        to: "/admin/subscriptions-payments",
      })),
    ...data.subscriptions
      .filter((s) => s.subscription_status === "pending_approval")
      .map((s) => ({
        text: `Vendor Pro approval: ${s.customer_name}`,
        to: "/admin/subscriptions-payments",
      })),
    ...data.customers
      .filter((c) => c.account_status === "suspended")
      .map((c) => ({
        text: `Suspended account: ${c.full_name}`,
        to: "/admin/customers",
      })),
    ...data.lifecycle
      .filter(
        (l) =>
          l.deletion_processing_error ||
          l.stripe_cancellation_succeeded === false,
      )
      .map((l) => ({
        text: `Account closure attention: ${l.customer_name}`,
        to: "/admin/account-lifecycle",
      })),
  ];
  const completedPayments = data.payments.filter(
    (p) => p.status === "completed" || p.status === "succeeded",
  );
  return (
    <div className={styles.page} data-admin-page>
      <State loading={loading} unavailable={unavailable} reload={reload} />
      {!loading && !unavailable && <SnapshotFreshness generatedAt={data.generated_at} refreshing={refreshing} reload={reload} />}
      {!loading && !unavailable && (
        <>
          <Section title="Customer overview">
            <div className={styles.metrics}>
              <Metric
                label="Total registered customers"
                value={
                  data.customers.length +
                  data.lifecycle.filter((l) => l.status !== "reactivated")
                    .length
                }
              />
              <Metric
                label="New customers this week"
                value={
                  data.customers.filter(
                    (c) =>
                      c.signup_date &&
                      now - new Date(c.signup_date).getTime() <= week,
                  ).length
                }
              />
              <Metric
                label="New customers this month"
                value={
                  data.customers.filter(
                    (c) =>
                      c.signup_date &&
                      new Date(c.signup_date).getTime() >= monthStart,
                  ).length
                }
              />
              <Metric
                label="Active customers"
                value={
                  data.customers.filter((c) => c.account_status === "active")
                    .length
                }
              />
              <Metric
                label="Suspended customers"
                value={
                  data.customers.filter((c) => c.account_status === "suspended")
                    .length
                }
              />
              <Metric label="Closed customers" value={closed.length} />
              <Metric
                label="Awaiting permanent deletion"
                value={closed.length}
              />
            </div>
          </Section>
          <Section
            title="Trial overview"
            description="Trial accounts are kept separate from active paid customers."
          >
            <div className={styles.metrics}>
              <Metric
                label="Active free trials"
                value={
                  trials.filter((s) =>
                    ["active", "trialing"].includes(s.subscription_status),
                  ).length
                }
              />
              <Metric
                label="Expiring within 7 days"
                value={
                  trials.filter(
                    (s) =>
                      new Date(s.expires_at).getTime() - now <= week &&
                      new Date(s.expires_at).getTime() >= now,
                  ).length
                }
              />
              <Metric
                label="Expired trials"
                value={
                  trials.filter((s) => new Date(s.expires_at).getTime() < now)
                    .length
                }
              />
              <Metric label="Active paid customers" value={paid.length} />
            </div>
          </Section>
          <Section title="Plan overview">
            <div className={styles.metrics}>
              {["Essential", "Premium", "Unlimited", "Vendor Pro"].map(
                (plan) => (
                  <Metric
                    key={plan}
                    label={`${plan} customers`}
                    value={
                      data.subscriptions.filter(
                        (s) =>
                          s.plan_name === plan &&
                          s.subscription_status === "active",
                      ).length
                    }
                  />
                ),
              )}
              <Metric
                label="Pending Vendor Pro approvals"
                value={
                  data.subscriptions.filter(
                    (s) => s.vendor_approval_status === "pending",
                  ).length
                }
              />
              <Metric
                label="Cancelled plans"
                value={
                  data.subscriptions.filter(
                    (s) => s.subscription_status === "cancelled",
                  ).length
                }
              />
              <Metric
                label="Expired plans"
                value={
                  data.subscriptions.filter(
                    (s) => s.subscription_status === "expired",
                  ).length
                }
              />
              <Metric
                label="Past-due or unpaid"
                value={
                  data.subscriptions.filter((s) =>
                    ["past_due", "unpaid"].includes(s.subscription_status),
                  ).length
                }
                attention
              />
            </div>
          </Section>
          <Section
            title="Financial overview"
            description="Recorded database payments only; live Stripe refunds and disputes are intentionally not estimated."
          >
            <div className={styles.metrics}>
              <Metric
                label="Sales collected this month"
                value={money(
                  completedPayments
                    .filter(
                      (p) => new Date(p.payment_date).getTime() >= monthStart,
                    )
                    .reduce((a, p) => a + Number(p.amount_paid), 0),
                )}
              />
              <Metric
                label="Sales collected this year"
                value={money(
                  completedPayments
                    .filter(
                      (p) =>
                        new Date(p.payment_date).getFullYear() ===
                        new Date().getFullYear(),
                    )
                    .reduce((a, p) => a + Number(p.amount_paid), 0),
                )}
              />
              <Metric
                label="A$100 RSVP bundle purchases"
                value={
                  data.payments.filter(
                    (p) =>
                      p.payment_type === "rsvp_bundle" &&
                      Number(p.amount_paid) === 100,
                  ).length
                }
              />
              <Metric
                label="SMS top-up purchases"
                value={
                  data.payments.filter((p) => p.payment_type === "sms_top_up")
                    .length
                }
              />
              <Metric
                label="Failed payments"
                value={
                  data.payments.filter((p) => p.status === "failed").length
                }
              />
              <Metric
                label="Payments requiring attention"
                value={
                  data.subscriptions.filter((s) =>
                    ["past_due", "unpaid"].includes(s.subscription_status),
                  ).length
                }
                attention
              />
            </div>
          </Section>
          <Section title="Event overview">
            <div className={styles.metrics}>
              <Metric label="Total events" value={data.events.length} />
              <Metric
                label="Active events"
                value={
                  data.events.filter((e) => e.event_status === "active").length
                }
              />
              <Metric label="Upcoming events" value={upcoming.length} />
              <Metric
                label="Within 7 days"
                value={
                  upcoming.filter(
                    (e) => new Date(e.effective_date!).getTime() - now <= week,
                  ).length
                }
              />
              <Metric
                label="Within 30 days"
                value={
                  upcoming.filter(
                    (e) =>
                      new Date(e.effective_date!).getTime() - now <= 30 * 864e5,
                  ).length
                }
              />
              <Metric
                label="Completed events"
                value={
                  data.events.filter((e) => e.event_status === "completed")
                    .length
                }
              />
              <Metric
                label="Total guests managed"
                value={data.events.reduce(
                  (a, e) => a + Number(e.guest_count),
                  0,
                )}
              />
            </div>
          </Section>
          {data.platform_totals && (
            <Section title="Platform feature usage" description="Authoritative operational counts only; private customer content is not included.">
              <div className={styles.metrics}>
                <Metric label="Tables configured" value={data.platform_totals.tables} />
                <Metric label="Seated guests" value={data.platform_totals.seated_guests} />
                <Metric label="RSVP invitations recorded" value={data.platform_totals.invitations_sent} />
                <Metric label="Feature configurations" value={data.platform_totals.feature_configurations} />
                <Metric label="Photo / video items" value={data.platform_totals.media_items} />
                <Metric label="Guestbook entries" value={data.platform_totals.guestbook_entries} />
                <Metric label="Photo-booth captures" value={data.platform_totals.photo_booth_captures} />
              </div>
            </Section>
          )}
          <Section title="Needs Attention">
            {attention.length ? (
              <ul className={styles.attentionList}>
                {attention.slice(0, 10).map((item, index) => (
                  <li key={`${item.text}-${index}`}>
                    <AlertTriangle size={16} />
                    <Link to={item.to}>{item.text}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.empty}>
                No reliable operational issues currently require attention.
              </div>
            )}
          </Section>
          <Section title="Recent activity">
            <ul className={styles.activityList}>
              {[
                ...data.customers
                  .slice(0, 4)
                  .map((c) => ({
                    label: `Customer registered: ${c.full_name || c.email}`,
                    at: c.signup_date,
                  })),
                ...data.events
                  .slice(0, 4)
                  .map((e) => ({
                    label: `Event created: ${e.name}`,
                    at: e.created_at,
                  })),
                ...data.recent_admin_actions
                  .slice(0, 4)
                  .map((a) => ({
                    label: `Administrator action: ${a.action}`,
                    at: a.created_at,
                  })),
              ]
                .sort(
                  (a, b) =>
                    new Date(b.at || 0).getTime() -
                    new Date(a.at || 0).getTime(),
                )
                .slice(0, 8)
                .map((a, i) => (
                  <li key={`${a.label}-${i}`}>
                    <span>{a.label}</span>
                    <span className={styles.subtle}>{date(a.at)}</span>
                  </li>
                ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
};

export const AdminCustomersPage = () => {
  const { data, loading, unavailable, refreshing, reload } = useAdminSnapshot();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [verified, setVerified] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const rows = useMemo(
    () =>
      data.customers
        .filter(
          (c) =>
            (!search ||
              `${c.full_name} ${c.email}`
                .toLowerCase()
                .includes(search.toLowerCase())) &&
            (type === "all" || c.customer_type === type) &&
            (plan === "all" || c.plan_name === plan) &&
            (status === "all" || c.account_status === status) &&
            (verified === "all" ||
              (verified === "verified") === !!c.email_confirmed_at),
        )
        .sort(
          (a, b) =>
            new Date(b.signup_date || 0).getTime() -
            new Date(a.signup_date || 0).getTime(),
        ),
    [data.customers, search, type, plan, status, verified],
  );
  const slice = rows.slice(page * 25, page * 25 + 25);
  return (
    <div className={styles.page} data-admin-page>
      <State loading={loading} unavailable={unavailable} reload={reload} />
      {!loading && !unavailable && <SnapshotFreshness generatedAt={data.generated_at} refreshing={refreshing} reload={reload} />}
      {!loading && !unavailable && (
        <>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              aria-label="Search customers"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            <select
              className={styles.select}
              aria-label="Customer type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All customer types</option>
              <option value="host">Couples & Event Hosts</option>
              <option value="vendor">Vendors & Venues</option>
            </select>
            <select
              className={styles.select}
              aria-label="Plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="all">All plans</option>
              {[
                ...new Set(
                  data.customers.map((c) => c.plan_name).filter(Boolean),
                ),
              ].map((p) => (
                <option key={p!}>{p}</option>
              ))}
            </select>
            <select
              className={styles.select}
              aria-label="Account status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All access states</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              className={styles.select}
              aria-label="Email verification"
              value={verified}
              onChange={(e) => setVerified(e.target.value)}
            >
              <option value="all">Any verification</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email verification</th>
                  <th>Type</th>
                  <th>Sign-up / Last active</th>
                  <th>Plan</th>
                  <th>Events</th>
                  <th>Account</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.full_name || "No name"}</strong>
                      <span className={styles.subtle}>{c.email}</span>
                    </td>
                    <td>
                      <Badge>
                        {c.email_confirmed_at ? "verified" : "unverified"}
                      </Badge>
                    </td>
                    <td>
                      {c.customer_type === "vendor"
                        ? "Vendor / Venue"
                        : "Couple / Event Host"}
                    </td>
                    <td>
                      {date(c.signup_date)}
                      <span className={styles.subtle}>
                        Last active {date(c.last_sign_in_at)}
                      </span>
                    </td>
                    <td>
                      {c.plan_name || "No plan"}
                      <span className={styles.subtle}>
                        {c.plan_status || "—"}
                      </span>
                    </td>
                    <td>{c.event_count}</td>
                    <td>
                      <Badge>{c.account_status}</Badge>
                    </td>
                    <td>
                      <div className={styles.actionRow}>
                        <button
                          className={styles.button}
                          onClick={() => setSelected(c)}
                        >
                          <Eye size={13} />
                          View
                        </button>
                        <button
                          className={`${styles.button} ${c.account_status === "suspended" ? styles.green : styles.danger}`}
                          onClick={() =>
                            setAction({
                              action:
                                c.account_status === "suspended"
                                  ? "restore"
                                  : "suspend",
                              targetId: c.id,
                              targetName: c.full_name || c.email || c.id,
                              destructive: c.account_status !== "suspended",
                            })
                          }
                        >
                          {c.account_status === "suspended"
                            ? "Restore"
                            : "Suspend"}
                        </button>
                        <button
                          className={`${styles.button} ${styles.danger}`}
                          onClick={() =>
                            setAction({
                              action: "close_account",
                              targetId: c.id,
                              targetName: c.full_name || c.email || c.id,
                              destructive: true,
                            })
                          }
                        >
                          Close Account
                        </button>
                        <button
                          className={styles.button}
                          onClick={() =>
                            setAction({
                              action: "force_sign_out",
                              targetId: c.id,
                              targetName: c.full_name || c.email || c.id,
                              destructive: true,
                            })
                          }
                        >
                          Force Sign-Out
                        </button>
                        {!c.email_confirmed_at && (
                          <button
                            className={styles.button}
                            onClick={() =>
                              setAction({
                                action: "resend_email_verification",
                                targetId: c.id,
                                targetName: c.full_name || c.email || c.id,
                              })
                            }
                          >
                            Resend Verification
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!slice.length && (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      No customers match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button
              className={styles.button}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page + 1} · {rows.length} records
            </span>
            <button
              className={styles.button}
              disabled={(page + 1) * 25 >= rows.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {selected && (
        <Dialog open onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selected.full_name || "Customer record"}
              </DialogTitle>
              <DialogDescription>{selected.email}</DialogDescription>
            </DialogHeader>
            <div className={styles.dialogText}>
              <p>
                <strong>Account ID:</strong> {selected.id}
              </p>
              <p>
                <strong>Phone:</strong> {selected.mobile || "Not provided"}
              </p>
              <p>
                <strong>Type:</strong> {selected.customer_type}
              </p>
              <p>
                <strong>Plan:</strong> {selected.plan_name || "No plan"} ·{" "}
                {selected.plan_status || "—"}
              </p>
              <p>
                <strong>Plan dates:</strong> {date(selected.plan_started_at)} –{" "}
                {date(selected.plan_expires_at)}
              </p>
              <p>
                <strong>Events:</strong> {selected.event_count}
              </p>
              <p>
                <strong>Platform usage:</strong> {selected.table_count ?? 0} tables · {selected.guest_count ?? 0} guests · {selected.seated_guest_count ?? 0} seated
              </p>
              <p>
                <strong>Configured features:</strong> {selected.feature_usage_count ?? 0} across this customer's events
              </p>
              <p>
                <strong>Media:</strong> {selected.media_item_count ?? 0} uploaded items
              </p>
              <p>
                <strong>Team access:</strong> {selected.active_team_member_count ?? 0} active of {selected.team_member_count ?? 0} recorded seats
              </p>
              <p>
                <strong>Last sign-in:</strong> {date(selected.last_sign_in_at)}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <AdminActionDialog
        value={action}
        onClose={() => setAction(null)}
        onSuccess={reload}
      />
    </div>
  );
};

export const AdminSubscriptionsPaymentsPage = () => {
  const { data, loading, unavailable, refreshing, reload } = useAdminSnapshot();
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [action, setAction] = useState<Action | null>(null);
  const rows = data.subscriptions.filter(
    (s) =>
      (!search ||
        `${s.customer_name} ${s.email}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (plan === "all" || s.plan_name === plan) &&
      (status === "all" || s.subscription_status === status),
  );
  return (
    <div className={styles.page} data-admin-page>
      <State loading={loading} unavailable={unavailable} reload={reload} />
      {!loading && !unavailable && <SnapshotFreshness generatedAt={data.generated_at} refreshing={refreshing} reload={reload} />}
      {!loading && !unavailable && (
        <>
          <Section title="Subscription summary">
            <div className={styles.metrics}>
              <Metric
                label="Active free trials"
                value={
                  data.subscriptions.filter(
                    (s) =>
                      /starter|trial/i.test(s.plan_name) &&
                      ["active", "trialing"].includes(s.subscription_status),
                  ).length
                }
              />
              <Metric
                label="Active paid plans"
                value={
                  data.subscriptions.filter(
                    (s) =>
                      s.subscription_status === "active" &&
                      !/starter|trial/i.test(s.plan_name),
                  ).length
                }
              />
              <Metric
                label="Expiring plans"
                value={
                  data.subscriptions.filter(
                    (s) =>
                      new Date(s.expires_at).getTime() >= Date.now() &&
                      new Date(s.expires_at).getTime() - Date.now() <=
                        30 * 864e5,
                  ).length
                }
              />
              <Metric
                label="Expired plans"
                value={
                  data.subscriptions.filter(
                    (s) => s.subscription_status === "expired",
                  ).length
                }
              />
              <Metric
                label="Cancelled plans"
                value={
                  data.subscriptions.filter(
                    (s) => s.subscription_status === "cancelled",
                  ).length
                }
              />
              <Metric
                label="Past-due plans"
                value={
                  data.subscriptions.filter((s) =>
                    ["past_due", "unpaid"].includes(s.subscription_status),
                  ).length
                }
                attention
              />
              <Metric
                label="Pending Vendor Pro"
                value={
                  data.subscriptions.filter(
                    (s) => s.vendor_approval_status === "pending",
                  ).length
                }
              />
            </div>
          </Section>
          <Section title="Subscriptions">
            <div className={styles.toolbar}>
              <input
                className={styles.input}
                aria-label="Search subscriptions"
                placeholder="Customer name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className={styles.select}
                aria-label="Subscription plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                <option value="all">All plans</option>
                {[...new Set(data.subscriptions.map((s) => s.plan_name))].map(
                  (p) => (
                    <option key={p}>{p}</option>
                  ),
                )}
              </select>
              <select
                className={styles.select}
                aria-label="Subscription status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                {[
                  ...new Set(
                    data.subscriptions.map((s) => s.subscription_status),
                  ),
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Subscription</th>
                    <th>Payment</th>
                    <th>Start</th>
                    <th>Expiry / renewal</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.customer_name}
                        <span className={styles.subtle}>{s.email}</span>
                      </td>
                      <td>{s.plan_name}</td>
                      <td>
                        <Badge>{s.subscription_status}</Badge>
                      </td>
                      <td>
                        <Badge>{s.payment_status}</Badge>
                      </td>
                      <td>{date(s.started_at)}</td>
                      <td>{date(s.expires_at)}</td>
                      <td>{money(s.price_aud)}</td>
                      <td>
                        <div className={styles.actionRow}>
                          <Link
                            className={styles.button}
                            to={`/admin/customers?customer=${s.user_id}`}
                          >
                            View Customer
                          </Link>
                          {s.vendor_approval_status === "pending" && (
                            <>
                              <button
                                className={`${styles.button} ${styles.green}`}
                                onClick={() =>
                                  setAction({
                                    action: "approve_vendor",
                                    targetId: s.id,
                                    targetName: `${s.customer_name} · ${s.plan_name}`,
                                  })
                                }
                              >
                                Approve
                              </button>
                              <button
                                className={`${styles.button} ${styles.danger}`}
                                onClick={() =>
                                  setAction({
                                    action: "reject_vendor",
                                    targetId: s.id,
                                    targetName: `${s.customer_name} · ${s.plan_name}`,
                                    destructive: true,
                                  })
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={8} className={styles.empty}>
                        No subscriptions match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
          <Section
            title="Recorded payments"
            description="Only references safely recorded in the Wedding Waitress database are shown."
          >
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Payment method</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={`${p.payment_type}-${p.id}`}>
                      <td>
                        {p.customer_name}
                        <span className={styles.subtle}>{p.email}</span>
                      </td>
                      <td>{words(p.payment_type)}</td>
                      <td>
                        <Badge>{p.status}</Badge>
                      </td>
                      <td>{money(p.amount_paid)}</td>
                      <td>{date(p.payment_date)}</td>
                      <td>
                        {p.payment_method
                          ? `Recorded · ${p.payment_method}`
                          : "Not stored"}
                      </td>
                      <td>
                        {p.stripe_reference ? (
                          <code>…{p.stripe_reference.slice(-8)}</code>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                  {!data.payments.length && (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        No recorded payments.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!data.configuration.stripe_live_data && (
              <p className={styles.subtle}>
                Live Stripe refunds, disputes, invoices and payment methods
                require a separately deployed protected Stripe reporting
                function; they are not estimated here.
              </p>
            )}
          </Section>
        </>
      )}
      <AdminActionDialog
        value={action}
        onClose={() => setAction(null)}
        onSuccess={reload}
      />
    </div>
  );
};

export const AdminEventsPage = () => {
  const { data, loading, unavailable, refreshing, reload } = useAdminSnapshot();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("date");
  const [selected, setSelected] = useState<EventRow | null>(null);
  const rows = useMemo(
    () =>
      data.events
        .filter(
          (e) =>
            (!search ||
              `${e.name} ${e.owner_name} ${e.owner_email}`
                .toLowerCase()
                .includes(search.toLowerCase())) &&
            (status === "all" || e.event_status === status) &&
            (type === "all" || e.event_type === type),
        )
        .sort((a, b) =>
          sort === "guests"
            ? b.guest_count - a.guest_count
            : sort === "created"
              ? new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
              : new Date(a.effective_date || "9999").getTime() -
                new Date(b.effective_date || "9999").getTime(),
        ),
    [data.events, search, status, type, sort],
  );
  const guests = data.events.reduce((a, e) => a + e.guest_count, 0);
  return (
    <div className={styles.page} data-admin-page>
      <State loading={loading} unavailable={unavailable} reload={reload} />
      {!loading && !unavailable && <SnapshotFreshness generatedAt={data.generated_at} refreshing={refreshing} reload={reload} />}
      {!loading && !unavailable && (
        <>
          <Section title="Event summary">
            <div className={styles.metrics}>
              <Metric label="Total events" value={data.events.length} />
              <Metric
                label="Active events"
                value={
                  data.events.filter((e) => e.event_status === "active").length
                }
              />
              <Metric
                label="Upcoming events"
                value={
                  data.events.filter((e) => e.event_status === "upcoming")
                    .length
                }
              />
              <Metric
                label="Completed events"
                value={
                  data.events.filter((e) => e.event_status === "completed")
                    .length
                }
              />
              <Metric label="Total guests" value={guests} />
              <Metric
                label="Average guests per event"
                value={
                  data.events.length
                    ? Math.round(guests / data.events.length)
                    : 0
                }
              />
            </div>
          </Section>
          <Section
            title="Events"
            description="Operational and primarily read-only."
          >
            <div className={styles.toolbar}>
              <input
                className={styles.input}
                aria-label="Search events"
                placeholder="Event or customer name/email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className={styles.select}
                aria-label="Event type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="all">All event types</option>
                {[...new Set(data.events.map((e) => e.event_type))].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <select
                className={styles.select}
                aria-label="Event status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
              <select
                className={styles.select}
                aria-label="Sort events"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="date">Event date</option>
                <option value="guests">Guest count</option>
                <option value="created">Creation date</option>
              </select>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Owner</th>
                    <th>Date / venue</th>
                    <th>Guests</th>
                    <th>RSVP</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {e.name}
                        <span className={styles.subtle}>{e.event_type}</span>
                      </td>
                      <td>
                        {e.owner_name}
                        <span className={styles.subtle}>{e.owner_email}</span>
                      </td>
                      <td>
                        {date(e.effective_date)}
                        <span className={styles.subtle}>
                          {e.venue || "No venue provided"}
                        </span>
                      </td>
                      <td>{e.guest_count}</td>
                      <td>
                        {e.attending_count} attending
                        <span className={styles.subtle}>
                          {e.invitations_sent} invitations recorded
                        </span>
                      </td>
                      <td>{e.plan_name || "—"}</td>
                      <td>
                        <Badge>{e.event_status}</Badge>
                      </td>
                      <td>{date(e.created_at)}</td>
                      <td>
                        <button
                          className={styles.button}
                          onClick={() => setSelected(e)}
                        >
                          <Eye size={13} />
                          View Event
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={9} className={styles.empty}>
                        No events match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
      {selected && (
        <Dialog open onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
              <DialogDescription>Operational event details</DialogDescription>
            </DialogHeader>
            <div className={styles.dialogText}>
              <p>
                <strong>Owner:</strong> {selected.owner_name} ·{" "}
                {selected.owner_email}
              </p>
              <p>
                <strong>Date and venue:</strong> {date(selected.effective_date)}{" "}
                · {selected.venue || "Not provided"}
              </p>
              <p>
                <strong>Guests:</strong> {selected.guest_count}
              </p>
              <p>
                <strong>Tables and seating:</strong> {selected.table_count ?? 0} tables · {selected.seating_capacity ?? 0} capacity · {selected.seated_guest_count ?? 0} seated · {selected.unseated_guest_count ?? 0} unseated
              </p>
              <p>
                <strong>Dietary records:</strong> {selected.dietary_guest_count ?? 0} guests (count only)
              </p>
              <p>
                <strong>RSVP invitations recorded:</strong>{" "}
                {selected.invitations_sent}
              </p>
              <p>
                <strong>Attending:</strong> {selected.attending_count}
              </p>
              <p>
                <strong>Messaging:</strong> {selected.sms_usage_count ?? selected.sms_invite_count ?? 0} SMS · {selected.email_usage_count ?? selected.email_invite_count ?? 0} email records
              </p>
              <p>
                <strong>Feature usage:</strong> {selected.feature_count ?? 0} configured modules · {selected.qr_scan_count ?? 0} QR scans
              </p>
              <p>
                <strong>Media:</strong> {selected.media_photo_count ?? 0} photos · {selected.media_video_count ?? 0} videos · {selected.photo_booth_capture_count ?? 0} photo-booth captures · {(selected.guestbook_text_count ?? 0) + (selected.guestbook_recording_count ?? 0)} guestbook entries
              </p>
              <p>
                <strong>Plan:</strong> {selected.plan_name || "—"}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export const AdminAccountLifecyclePage = () => {
  const { data, loading, unavailable, refreshing, reload } = useAdminSnapshot();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [action, setAction] = useState<Action | null>(null);
  const rows = data.lifecycle.filter(
    (l) =>
      (!search ||
        `${l.customer_name} ${l.email}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (status === "all" || l.status === status),
  );
  return (
    <div className={styles.page} data-admin-page>
      <State loading={loading} unavailable={unavailable} reload={reload} />
      {!loading && !unavailable && <SnapshotFreshness generatedAt={data.generated_at} refreshing={refreshing} reload={reload} />}
      {!loading && !unavailable && (
        <>
          <Section title="Lifecycle summary">
            <div className={styles.metrics}>
              <Metric
                label="Closed accounts"
                value={
                  data.lifecycle.filter(
                    (l) => l.status === "scheduled_for_deletion",
                  ).length
                }
              />
              <Metric
                label="Within recovery period"
                value={
                  data.lifecycle.filter(
                    (l) =>
                      l.status === "scheduled_for_deletion" &&
                      new Date(l.purge_after || 0).getTime() > Date.now(),
                  ).length
                }
              />
              <Metric
                label="Reactivated accounts"
                value={
                  data.lifecycle.filter((l) => l.status === "reactivated")
                    .length
                }
              />
              <Metric
                label="Awaiting permanent deletion"
                value={
                  data.lifecycle.filter(
                    (l) => l.status === "scheduled_for_deletion",
                  ).length
                }
              />
              <Metric
                label="Failed Stripe cancellations"
                value={
                  data.lifecycle.filter(
                    (l) => l.stripe_cancellation_succeeded === false,
                  ).length
                }
                attention
              />
              <Metric
                label="Failed data purges"
                value={
                  data.lifecycle.filter((l) => l.purge_status === "failed")
                    .length
                }
                attention
              />
              <Metric
                label="Permanently deleted"
                value={
                  data.lifecycle.filter(
                    (l) => l.status === "permanently_deleted",
                  ).length
                }
              />
            </div>
          </Section>
          <Section title="Account lifecycle">
            <div className={styles.toolbar}>
              <input
                className={styles.input}
                aria-label="Search lifecycle records"
                placeholder="Name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className={styles.select}
                aria-label="Lifecycle status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All lifecycle statuses</option>
                <option value="scheduled_for_deletion">
                  Closed / recovery
                </option>
                <option value="reactivated">Reactivated</option>
                <option value="permanently_deleted">Permanently deleted</option>
              </select>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Previous plan</th>
                    <th>Status</th>
                    <th>Closure</th>
                    <th>Recovery deadline</th>
                    <th>Reactivated</th>
                    <th>Stripe</th>
                    <th>Purge</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.account_owner_id}>
                      <td>
                        {l.customer_name || "De-identified account"}
                        <span className={styles.subtle}>
                          {l.email || l.account_owner_id}
                        </span>
                      </td>
                      <td>{l.previous_plan || "—"}</td>
                      <td>
                        <Badge>{l.status}</Badge>
                      </td>
                      <td>{date(l.deletion_requested_at)}</td>
                      <td>{date(l.purge_after)}</td>
                      <td>{date(l.reactivated_at)}</td>
                      <td>
                        <Badge>
                          {l.stripe_cancellation_succeeded === true
                            ? "succeeded"
                            : l.stripe_cancellation_succeeded === false
                              ? "failed"
                              : "not required"}
                        </Badge>
                      </td>
                      <td>
                        <Badge>{l.purge_status}</Badge>
                        {l.deletion_processing_error && (
                          <span className={styles.subtle}>
                            Attention required
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionRow}>
                          {l.status === "scheduled_for_deletion" && (
                            <button
                              className={`${styles.button} ${styles.green}`}
                              onClick={() =>
                                setAction({
                                  action: "reactivate_account",
                                  targetId: l.account_owner_id,
                                  targetName:
                                    l.customer_name ||
                                    l.email ||
                                    l.account_owner_id,
                                })
                              }
                            >
                              Reactivate
                            </button>
                          )}
                          {l.stripe_cancellation_succeeded === false && (
                            <button
                              className={styles.button}
                              onClick={() =>
                                setAction({
                                  action: "retry_stripe_cancellation",
                                  targetId: l.account_owner_id,
                                  targetName:
                                    l.customer_name || l.account_owner_id,
                                })
                              }
                            >
                              Retry Stripe
                            </button>
                          )}
                          {l.status === "scheduled_for_deletion" && (
                            <button
                              className={styles.button}
                              onClick={() =>
                                setAction({
                                  action: "delay_permanent_deletion",
                                  targetId: l.account_owner_id,
                                  targetName:
                                    l.customer_name || l.account_owner_id,
                                })
                              }
                            >
                              Delay deletion
                            </button>
                          )}
                          <button
                            className={styles.button}
                            onClick={() =>
                              setAction({
                                action: "add_note",
                                targetId: l.account_owner_id,
                                targetName:
                                  l.customer_name || l.account_owner_id,
                              })
                            }
                          >
                            Add note
                          </button>
                          {l.status === "scheduled_for_deletion" && (
                            <button
                              className={`${styles.button} ${styles.danger}`}
                              onClick={() =>
                                setAction({
                                  action: "permanently_delete_now",
                                  targetId: l.account_owner_id,
                                  targetName:
                                    l.customer_name || l.account_owner_id,
                                  destructive: true,
                                  strong: true,
                                })
                              }
                            >
                              Permanently Delete Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={9} className={styles.empty}>
                        No account lifecycle records match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
      <AdminActionDialog
        value={action}
        onClose={() => setAction(null)}
        onSuccess={reload}
      />
    </div>
  );
};
