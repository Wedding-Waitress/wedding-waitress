# Admin Centre platform-data synchronisation audit

Date: 19 August 2026  
Scope: authenticated Wedding Waitress features and the five existing Admin Centre destinations.

## Reporting contract

`public.get_admin_platform_snapshot()` is the single protected initial request. It performs set-based aggregates in PostgreSQL and returns counts, statuses, ownership and storage totals only. It does not return guest names, guest contact details, dietary text, questionnaire answers, run-sheet content, guestbook messages, captions, media paths or media URLs. The function is `SECURITY DEFINER`, fixes its `search_path`, checks `is_owner_admin()`, revokes public/anonymous execution and grants execution only to authenticated users who pass that server-side check.

The browser keeps one 30-second in-memory snapshot, deduplicates concurrent requests, displays stale data while revalidating, offers an explicit Refresh button, and clears caches on logout, account change, administrator permission loss and signed-grant expiry. All five routes consume the same snapshot; changing routes does not create per-record queries.

## Feature-to-source mapping

| Wedding Waitress feature | Authoritative source | Ownership key | Admin destination | Reported metric/status | Sync status and genuine gaps |
|---|---|---|---|---|---|
| Dashboard | `events`; `get_events_with_guest_count()` for the customer dashboard | `events.user_id` | Overview, Events | Event totals, state, effective date and owner | Fully synchronised from `events`; dashboard UI visits are not recorded and are not reported. |
| My Events | `events` | `events.user_id` (team-created events are stored against the account owner) | Overview, Customers, Events | Event count, date, venue, type and status | Fully synchronised. |
| Tables | `tables` | `tables.event_id` → `events.id`; `tables.user_id` | Customers, Events | Table count and summed `limit_seats` capacity | Fully synchronised. |
| Guest List | `guests` | `guests.event_id` → `events.id`; `guests.user_id` | Overview, Customers, Events | Guests, seated and unseated counts | Fully synchronised; private guest identity/contact fields are deliberately excluded. |
| QR Code Seating Chart | `dynamic_qr_codes`, `qr_code_settings`, `qr_scan_logs`, plus `tables`/`guests` | `event_id` | Overview, Events | Configuration present and QR scan count | Fully synchronised for stored configuration/scans. A generated/downloaded chart is not itself logged, so export counts cannot be reported. |
| Seating Chart Signs | `signage_settings` | `event_id`, `user_id` | Overview, Events | Configuration present | Fully synchronised for saved designs. Print/download usage is not recorded. |
| Invitations & Cards | `invitation_card_settings`, `invitation_designs`, `invitation_templates`, `guests.rsvp_*`, `rsvp_invite_logs`, `sms_send_logs`, `communication_usage` | Primarily `event_id`; customer libraries by `user_id` | Overview, Events | Configuration, invitations recorded, RSVP responses, SMS/email records | Fully synchronised for persisted settings and delivery/response records. Opens, physical prints and unlogged external email activity cannot be reported. |
| Name Place Cards | `place_card_settings` | `event_id`, `user_id` | Overview, Events | Configuration present | Fully synchronised for saved designs. Generated/printed card counts are not recorded separately. |
| Individual Table Charts | Derived from `tables` and `guests.table_id/seat_no`; no separate operational record | `event_id` | Events | Tables, capacity and seated/unseated guests | Data inputs are fully synchronised. Preview, PDF and print actions are intentionally not inferred because no reliable usage record exists. |
| Floor Plan | `reception_floor_plans`; ceremony layout in `ceremony_floor_plans` | `event_id`, `user_id` | Overview, Events | Reception floor-plan configuration present | Reception reporting is fully synchronised. The initial aggregate does not expose layout JSON, vendor notes or private geometry. |
| Dietary Requirements | `guests.dietary`, `dietary_chart_settings` | `guests.event_id`; settings `event_id`/`user_id` | Overview, Events | Count of guests with a non-empty dietary record and chart configuration | Fully synchronised counts; dietary text is sensitive and is deliberately excluded. |
| Full Seating Chart | Derived from `guests`/`tables`, with `full_seating_chart_settings` | `event_id`, `user_id` | Overview, Events | Configuration, guests, tables and seating totals | Fully synchronised inputs. Preview/export actions are not recorded. |
| Live Slideshow | `live_view_module_settings`, `events`, `guests`, `tables` | `event_id` | Overview, Events | Configuration present and current event totals | Fully synchronised configuration/data. Live Slideshow sessions and screen impressions are not reliably recorded. |
| DJ & MC Questionnaire | `dj_mc_questionnaires`, `dj_mc_sections`, `dj_mc_items`, `dj_mc_share_tokens` | Questionnaire `event_id`/`user_id`; child rows through questionnaire/section | Overview, Events | Questionnaire configured | Fully synchronised presence. Answers, notes, songs and recordings remain private and are not returned. |
| Run Sheet | `running_sheets`, `running_sheet_items`, `running_sheet_share_tokens` | Sheet `event_id`/`user_id`; items through `sheet_id` | Overview, Events | Run sheet configured | Fully synchronised presence. Timeline content and responsible-person details are not returned. |
| Photo & Video Sharing | `event_media_galleries`, `event_media_items` | `event_id`; gallery `user_id` | Overview, Customers, Events | Uploaded photo/video counts and summed `byte_size` | Fully synchronised for database-registered uploads. Abandoned storage objects without a finalised database record are not treated as legitimate usage. |
| Digital Guestbook | `event_guestbook_messages`; `event_media_items.is_guestbook` | `event_id` | Overview, Events | Text-entry and recording counts | Fully synchronised counts. Message text, uploader names and recordings are excluded. |
| Digital Photo Booth | `event_media_galleries.photo_booth_enabled`; `event_media_items.is_photo_booth` | `event_id` | Overview, Events | Configuration and uploaded capture count | Fully synchronised for finalised captures. Failed/unfinalised captures are not reported as completed usage. |
| Live Slideshow | `event_media_galleries.slideshow_enabled` and slideshow configuration columns | `event_id` | Overview, Events | Configuration present | Fully synchronised configuration. Playback sessions and audience impressions are not reliably recorded. |
| Account Centre | `profiles`, `auth.users`, `account_members`, `account_invitations`, `user_subscriptions`, `subscription_plans`, `event_purchases`, `additional_event_purchases`, `rsvp_invite_purchases`, `account_lifecycle` | Account owner/user IDs | Customers, Subscriptions & Payments, Account Lifecycle | Identity/status, team seats, plan/entitlement, recorded purchases and lifecycle state | Fully synchronised for stored records. Live Stripe invoices, refunds, disputes and payment methods remain unavailable until a separate protected Stripe reporting integration is deployed; they are not estimated. |

Global invitation, signage, place-card, floor-plan and photo-booth template libraries describe available catalogue content, not customer usage. They remain outside customer/event counts unless a customer-owned settings row records use.

## Corrections made from the audit

- Replaced per-event correlated reporting with grouped aggregates joined once per source.
- Added table/capacity, seating, dietary-count, RSVP-delivery, communication, QR, media/storage, guestbook, photo-booth, team-seat and feature-configuration reporting.
- Added authoritative platform totals independent of table pagination.
- Added customer-level aggregate usage and a privacy-minimised event detail breakdown.
- Added one visible in-app refresh action with request deduplication and background revalidation.
- Added cache clearing for administrator permission loss and grant expiry.
- Kept lifecycle records separate from the active customer list.

## Query and privacy characteristics

- Before: one browser RPC, but event/customer fields used repeated correlated subqueries and covered only events/guests/subscriptions.
- After migration: one browser RPC; PostgreSQL scans each reporting source into grouped CTEs and joins those aggregates by `event_id`/owner. Route changes reuse the same snapshot and make zero extra snapshot requests while it is fresh.
- Development fallback: when the new forward migration is not yet applied, the client safely falls back once to the existing protected RPC. This fallback is temporary and does not weaken authorisation.
- No N+1 browser requests are introduced. Main tables retain 25-row UI pagination and contain aggregates rather than complete private feature records.

## Read-only comparison checklist

For a representative owner and event, compare the returned event object with read-only counts from the same sources:

```sql
select count(*) from public.events where user_id = :owner_id;
select count(*), coalesce(sum(limit_seats),0) from public.tables where event_id = :event_id;
select count(*), count(*) filter (where table_id is not null),
       count(*) filter (where rsvp='attending'),
       count(*) filter (where rsvp_invite_sent_at is not null or rsvp_invite_status<>'not_sent')
from public.guests where event_id = :event_id;
select count(*) filter (where upload_status='uploaded'),
       coalesce(sum(byte_size) filter (where upload_status='uploaded'),0),
       count(*) filter (where upload_status='uploaded' and is_photo_booth),
       count(*) filter (where upload_status='uploaded' and is_guestbook)
from public.event_media_items where event_id = :event_id;
```

These comparisons must be run through an owner-admin session after the local migration is applied. This task deliberately does not apply the migration remotely or use service-role credentials.

