# PixelPatch Project Guide

## Purpose

PixelPatch is a device-repair service platform connecting clients with gadget repair businesses.

The platform includes:

* Client repair requests
* Repair-shop/business management
* Device and address management
* Repair assessments and quotations
* Employee assignment
* Repair progress tracking
* Payments through Xendit
* Reviews
* Disputes
* Real-time chat through Socket.IO
* AI troubleshooting through OpenAI
* Shop/service discovery
* Business onboarding

This file contains persistent project rules and architectural guidance for AI coding agents working on PixelPatch.

Follow these rules before modifying the project.

---

# 1. Source of truth

The currently active frontend is the Expo / React Native application in the project root.

The older React + Vite web application exists under:

```text
legacy-web/
```

Treat `legacy-web/` primarily as reference material unless a task explicitly asks to modify it.

The backend is located in:

```text
server/
```

The application therefore currently consists primarily of:

```text
PixelPatch/
├── app/
├── components/
├── constants/
├── lib/
├── assets/
├── server/
├── legacy-web/
├── uploads/
├── package.json
├── app.json
└── AGENTS.md
```

Do not assume README documentation is more accurate than the actual implementation.

When behavior is unclear, inspect:

1. Frontend screen
2. API call
3. Express route
4. Controller
5. SQL/query behavior
6. Actual database schema when available

---

# 2. Active frontend architecture

The active frontend uses:

* React
* React Native
* Expo
* Expo Router
* NativeWind
* Tailwind CSS
* Axios
* React Context
* React hooks

The root package uses:

```text
expo-router/entry
```

The project currently uses approximately:

* Expo SDK 57
* React 19
* React Native 0.86
* NativeWind 4
* Tailwind CSS 3

Do not convert the application back to React DOM or React Router.

---

# 3. Important frontend directories

## `app/`

Uses Expo Router file-based routing.

Important areas include:

```text
app/(auth)/
```

Authentication screens and layout.

```text
app/(tabs)/
```

Client-facing application screens.

Includes areas such as:

* Home
* Services
* Repairs
* Chats
* Profile

```text
app/business/
```

Business-facing application.

Includes:

* Dashboard
* Repairs
* Disputes
* Employees
* Services
* Shop profile
* Reviews

```text
app/chat/[id].jsx
```

Conversation history and real-time messaging.

```text
app/repair/[id].jsx
```

Client repair details.

Responsibilities include:

* Viewing repair state
* Quotation approval
* Cancellation
* Payment
* Review submission

```text
app/request/[shopId].jsx
```

Repair-request creation.

```text
app/shop/
app/service/
```

Shop and service information.

Other screens include:

* Devices
* Addresses
* AI assistant
* Business registration/onboarding
* Payment return pages
* Settings
* Help
* About

---

# 4. Shared frontend code

## `components/`

Contains reusable UI components such as:

* Button
* TextField
* DateField
* Modal
* Screen
* AsyncList

Reuse existing components when possible.

Do not duplicate common controls unnecessarily.

---

## `lib/`

Contains shared frontend infrastructure.

Important modules include functionality for:

* API requests
* Authentication
* Session storage
* Google login
* Socket.IO
* Shop context
* Data fetching
* Formatting
* Uploads
* Payments

Prefer these shared helpers instead of implementing duplicate behavior inside individual screens.

---

# 5. Navigation

Use Expo Router navigation in the active application.

Preserve:

* Route groups
* Dynamic route filenames
* Layout files
* Existing route conventions

Do not introduce React Router into the Expo application.

Do not import browser DOM components from `legacy-web/`.

---

# 6. Styling

The active app uses:

* React Native components
* NativeWind
* Tailwind classes through `className`
* Shared values from `constants/theme.js`

Prefer existing project styling patterns.

The application currently primarily targets a light interface.

Do not perform project-wide visual redesigns unless explicitly requested.

## Required responsive UI behavior

Every new or modified UI must adapt to mobile, tablet, and desktop widths on
Android, iOS, and web. This applies to screens, navigation, forms, lists, cards,
dialogs, and shared components. Responsiveness is part of completing a UI task.

Use the shared `lib/useResponsive.js` hook and its `BREAKPOINTS` values for
conditional layouts:

* Mobile: below 768 logical pixels.
* Tablet: 768 through 1199 logical pixels.
* Desktop: 1200 logical pixels and above.

Choose the layout from the available window width, not just `Platform.OS` or a
device name. Web can be phone-sized, and native apps can run on tablets. Keep
layouts responsive to resizing, split-screen use, and orientation changes through
`useWindowDimensions` or the shared hook; do not cache the initial screen width.
Use platform checks separately where native and web behavior genuinely differ.

Preserve the responsive navigation patterns: a collapsible mobile menu, compact
tablet navigation, and full desktop navigation. The native business drawer uses
a mobile overlay and a persistent sidebar on larger screens. Keep destinations,
active states, profile actions, and sign-out reachable at every size.

Use flexible sizing, wrapping, appropriate content-width limits, safe-area
insets, and scrollable content. Avoid fixed dimensions that clip controls,
overlap content, or cause unintended horizontal scrolling. Keep touch controls
usable and allow text to scale without hiding essential actions. Reuse shared
`Screen` and `AsyncList` behavior where appropriate.

Before considering a UI change complete, check representative mobile, tablet,
and desktop widths, including breakpoint boundaries and portrait/landscape
layouts. Verify navigation, readable content, reachable actions, and scrolling.
Lint and a successful build do not prove visual responsiveness; report any
device or visual checks that could not be performed.

---

# 7. Platform compatibility

The Expo application targets:

* Android
* iOS
* Web

Browser-specific functionality must be protected by appropriate platform checks.

Examples include:

* `window`
* `document`
* `localStorage`
* browser File objects
* browser checkout behavior

Native functionality may require alternatives such as:

* SecureStore
* Expo ImagePicker
* Expo WebBrowser
* React Native APIs

Do not introduce browser-only code into shared/native screens without platform protection.

---

# 8. API client

The shared Axios configuration is located in:

```text
lib/api.js
```

It handles:

* API base URL
* `/api` prefix
* bearer token injection
* timeout handling
* error-message normalization

Prefer using the shared API client.

Do not hardcode backend URLs inside screens unless there is a specific reason.

The public API host comes from:

```text
EXPO_PUBLIC_API_URL
```

Axios generally adds:

```text
/api
```

to API calls.

---

# 9. Backend architecture

The backend is located in:

```text
server/
```

It uses:

* Node.js
* Express
* ES modules
* MySQL
* mysql2
* JWT
* bcryptjs
* Socket.IO
* OpenAI API
* Xendit
* Nodemailer

The backend entry point is:

```text
server/server.js
```

The default local backend port is:

```text
5000
```

The HTTP server is shared with Socket.IO.

There is currently no ORM.

SQL is primarily written directly in controllers/routes.

There is no consistently enforced repository/service architecture.

Do not perform a large architectural rewrite unless explicitly requested.

---

# 10. Backend directories

Important backend directories include:

```text
server/routes/
```

Express routes.

```text
server/controllers/
```

Business logic and database operations.

```text
server/config/
```

Database and other configuration.

```text
server/middleware/
```

Authentication and upload middleware.

```text
server/utils/
```

Shared helpers.

```text
server/sockets/chatSocket.js
```

Socket.IO authentication, rooms, message persistence, and broadcasts.

---

# 11. Important API groups

All API routes are mounted underneath `/api`.

Important route groups include:

```text
/auth
```

Authentication.

```text
/users
```

Generic user operations.

```text
/user/profile
/user/devices
```

Client profile/device management.

```text
/devices
/addresses
```

Device/address operations.

```text
/public
```

Public shop and service listings.

```text
/shops
```

Shop information.

```text
/shop-services
```

Shop service configuration.

```text
/business-register
/my-shop
```

Business registration and shop ownership.

```text
/service-requests
```

Repair-request creation.

```text
/client
```

Client repair operations.

```text
/business
```

Business operations including:

* Dashboard
* Employees
* Repair management
* Assignment
* Repair lifecycle
* Payment-link creation

```text
/chat
```

Chat operations.

```text
/ai
```

AI troubleshooting conversations.

```text
/disputes
```

Dispute handling.

```text
/staff
```

The staff portal for shop members with their own account (section 20,
"Shop members").

```text
/upload/photo
```

Photo uploads.

```text
/webhooks/xendit
```

Xendit payment callbacks.

```text
/admin
```

Admin portal (admin role only, enforced by `server/middleware/adminMiddleware.js`,
which re-checks `users.role_id` in the database on every request). Screens
share `components/AdminUI.jsx`; sections with work waiting show a count in the
navigation (`lib/adminSummary.js`).

* `GET /admin/summary`: dashboard to-do counts and navigation badges:
  shops to verify, services to review, disputes needing an admin, repairs
  waiting on a shop for over 2 days (each with the oldest item's time).
  The dispute and repair conditions are `DISPUTE_NEEDS_ADMIN_SQL` and
  `REPAIR_AWAITING_SHOP_SQL` in `controllers/admin/serviceReviewController.js`.
* Users: `GET /admin/users?filter=ALL|CLIENT|BUSINESS|ADMIN|SUSPENDED&q=`,
  `GET /admin/users/:id`, `POST /admin/users/:id/suspend { reason }`,
  `POST /admin/users/:id/reactivate`. Roles are NOT changed here. Admins
  and your own account can't be suspended. See "Suspended accounts" in section 18.
* Repairs (READ-ONLY): `GET /admin/repairs?view=WAITING|OVERDUE|ACTIVE|COMPLETED|CLOSED|ALL&q=`,
  `GET /admin/repairs/:id`. Admins never change a repair's workflow fields.
* Disputes: `GET /admin/disputes?view=NEEDS_ADMIN|IN_PROGRESS|RESOLVED|ALL&q=`,
  `GET /admin/disputes/:id`, `POST /admin/disputes/:id/decide { outcome: REFUND|RESERVICE|DECLINE, note }`.
  See business rule 7 in section 20.
* Warranty claims: `GET /admin/warranty-claims?view=NEEDS_ADMIN|WITH_SHOP|SETTLED|ALL&q=`,
  `GET /admin/warranty-claims/:id`, `POST /admin/warranty-claims/:id/decide { outcome: REPAIR|DECLINE, note }`.
  See business rule 9 in section 20.

Shop-service review:

* `GET /admin/services/shops?status=&q=&limit=&offset=` (shops with per-status counts, most waiting first)
* `GET /admin/services?status=&shop_id=&q=&limit=&offset=` (paged, `{ services, total, counts }`)
* `POST /admin/services/bulk { ids, action: "approve" | "reject", note }` (max 200; reject needs a note)
* `POST /admin/services/:id/approve`, `POST /admin/services/:id/reject`
* `GET /admin/shops?status=PENDING|VERIFIED|ALL&q=&limit=&offset=` (business registrations)
* `POST /admin/shops/:id/approve { approve_services }`, `POST /admin/shops/:id/reject { note }`
* `POST /admin/shops/:id/documents/:attachmentId/link` (5-minute view link for a submitted document)

Admin lists are paged server-side; use `lib/usePagedFetch.js` for new long lists.

Always inspect the mounted router before assuming the full endpoint path from a filename.

---

# 12. Database

PixelPatch uses MySQL through:

```text
mysql2
```

`server/config/db.js` exports a `mysql2` connection pool (since 2026-11-16;
it was a single connection before). `db.query(...)` and
`db.promise().query(...)` work as before.

Controllers currently use a mixture of:

* callbacks
* `db.promise().query`
* promise wrappers

Because each pooled query may run on a different connection, never send
`START TRANSACTION`, `BEGIN`, `COMMIT`, or `ROLLBACK` through `db.query`, and
never call `db.beginTransaction`. For any multi-step write, use:

```js
import { withTransaction } from "../utils/transaction.js";

const result = await withTransaction(async (conn) => {
  const [rows] = await conn.query("...", [params]);
  // every query in here runs on one connection; throw to roll back
  return value;
});
```

Do external calls (OpenAI, Xendit, email) before opening the transaction, not
inside it.

SQL queries should continue to use parameter placeholders such as:

```sql
?
```

Never concatenate untrusted user input into SQL.

---

# 13. Database source-of-truth rule

The currently running PixelPatch MySQL database is authoritative for schema details.

No complete migration/schema system currently exists in the repository.

Therefore:

DO NOT:

* invent columns
* rename columns based solely on assumptions
* create migrations based solely on controller queries
* change enum values without checking the database
* assume inferred foreign-key relationships are guaranteed

Before modifying schema-dependent behavior, inspect the actual database structure whenever possible.

Controllers can reveal expected columns but are not automatically authoritative if the database differs.

---

# 14. Important database tables

Known tables include:

```text
users
user_roles
shops
addresses
shop_services
service_requests
service_request_items
service_request_attachments
request_status_history
request_assessments
request_quotations
request_quotation_parts
payments
payment_details
shop_employees
reviews
disputes
chats
chat_messages
```

Chat messages live in `chat_messages` (there is no `messages` table).

Additional related tables exist; see the Database Schema Reference at the end
of this file for the full verified list.

Always inspect database usage before assuming exact names or columns.

---

# 15. AUTHORITATIVE REPAIR WORKFLOW

This section defines intentional PixelPatch business logic.

It is NOT merely an interpretation of the current UI.

Do not change this lifecycle unless explicitly instructed.

## Step 1 — Client creates repair request

A client creates a repair request.

Initial state:

```text
decision = 'PENDING'
status = 'PENDING'
payment_status = 'PENDING'
client_approved = NULL
```

The repair is awaiting a decision from the business.

---

## Step 2 — Business accepts or rejects

The business reviews the repair request.

Accept:

```text
decision = 'ACCEPTED'
```

Reject:

```text
decision = 'REJECTED'
```

A rejected repair must not continue into assessment, quotation, payment, assignment, or repair work.

---

## Step 3 — Business performs assessment

After accepting the request, the business creates an assessment.

Assessment information belongs in:

```text
request_assessments
```

The assessment is required before quotation creation.

Do not skip this stage.

---

## Step 4 — Business creates quotation

After assessment, the business creates a quotation.

Quotation data belongs in:

```text
request_quotations
```

Quotation information includes at minimum:

* estimated cost
* estimated completion time

Quotation parts may be stored separately.

PixelPatch permits only ONE quotation per repair request.

Do not implement multiple quotation revisions/versions unless explicitly requested.

---

## Step 5 — Client reviews quotation

After receiving the quotation, the client decides whether to continue.

The client may:

* approve the quotation (`client_approved = 1`)
* cancel the repair (`client_approved = 0`)

The repair must not proceed directly from quotation creation to active repair without the required client action.

Once the client approves or cancels, the quotation is locked: the business
can't change its price, parts, warranty or payment terms (see "Payment terms"
in section 20).

Cancellation is allowed while the client has not yet decided
(`client_approved IS NULL`), the request is not rejected, `status` is
`PENDING` or `REVIEW`, and `payment_status` is not `PAID`. Cancelling also sets
a `PENDING` quotation to `CANCELLED`. A cancelled request must not continue:
the business cannot accept, reject, assess, quote, add services, or generate a
payment link for it.

---

## Step 6 — Client pays the deposit

After client approval, the client pays the **deposit**: `deposit_percent` of
the quotation total, online through Xendit (since 2026-11-28; see "Payment
terms" in section 20). At 100% that is the whole amount, one `FULL` payment.
With a 0% deposit nothing is due and the request is ready to start as soon as
the client approves.

When the deposit is settled, `service_requests.deposit_paid_at` is set. The
**balance** (the rest) is paid during step 8, before step 9: online, or in
cash when the quotation allows it, confirmed in the app by the owner or the
assigned member. `payment_status = 'PAID'` means paid in full.

Payment information is stored in `payments` (one row per part, `kind` =
FULL, DEPOSIT or BALANCE). The rules live in `server/utils/paymentPlan.js`.

A browser/application redirect from Xendit does NOT prove payment was successful.

Payment status must come from verified backend/payment information.

---

## Step 7 — Business assigns employee

After the client approved and the deposit is settled (`deposit_paid_at` set), the business may assign an employee to the repair.

Employee assignment belongs to the business repair workflow.

Do not treat employee assignment as client-controlled behavior.

---

## Step 8 — Business starts repair

When repair work begins:

```text
status = 'IN_PROGRESS'
```

Do not begin repair work before the required earlier workflow stages:
accepted, approved by the client, deposit settled, employee assigned.

While the repair is in progress the business can send the client the balance
payment link, or confirm a cash balance.

---

## Step 9 — Business completes repair

When the repair is finished:

```text
status = 'COMPLETED'
```

Completing requires the repair to be paid in full (`payment_status = 'PAID'`),
so the balance is paid before the client gets the device back.

---

## Step 10 — Client review

After completion, the client may leave a review.

Reviews should only apply to appropriate completed repair transactions.

---

# 16. Repair-state rules

PixelPatch intentionally represents repair state using multiple database fields.

The main fields are:

```text
status
decision
payment_status
client_approved
```

DO NOT replace them with one unified status field without explicit instruction.

---

## `status`

Known intended values:

```text
PENDING
REVIEW
IN_PROGRESS
COMPLETED
```

Do not invent additional status values unless explicitly requested and verified against the database.

---

## `decision`

Known values:

```text
PENDING
ACCEPTED
REJECTED
```

---

## `payment_status`

Known values:

```text
PENDING
PAID
FAILED
```

`PAID` means paid in full (deposit and balance). Whether work may start is
`deposit_paid_at` (section 15 Step 6), not `payment_status`.

---

## `client_approved`

Column: `tinyint(1) NULL DEFAULT NULL` (made nullable on 2026-11-16, see
`server/sql/2026-11-16_client_approved_nullable.sql`).

```text
NULL = client has not decided yet (default for new requests)
1    = client approved the quotation
0    = client cancelled the request
```

The Xendit webhook also sets `client_approved = 1` when it marks a payment
`PAID`.

In JavaScript, check for `null` before using `Number(...)`, because
`Number(null) === 0` would make an undecided request look cancelled. Use
`isClientCancelled` from `components/RepairSummary.jsx` on the frontend.

---

# 17. Critical repair-workflow restrictions

When modifying repair code:

DO NOT:

* invent repair states
* reorder lifecycle stages
* skip assessment
* create quotations before assessment
* create multiple quotations for one request
* automatically mark payment successful from redirect URLs
* assign or start repair before client approval and a settled deposit
  (`deposit_paid_at`)
* complete a repair that isn't paid in full
* record cash the shop hasn't confirmed, or take a cash balance on a
  quotation that doesn't allow cash
* allow rejected repairs to continue
* derive workflow solely from UI button labels
* collapse `decision`, `status`, `payment_status`, and `client_approved` into one field

If existing code conflicts with these rules, identify the conflict before changing behavior.

---

# 18. Authentication

Authentication uses JWT.

Login currently creates approximately seven-day JWTs.

JWT payloads contain values such as:

```text
id
role_id
```

Backend HTTP authentication reads:

```text
Authorization: Bearer <token>
```

Socket.IO authentication reads the token from:

```text
handshake.auth.token
```

Passwords use:

```text
bcryptjs
```

## Suspended accounts (since 2026-11-24)

An admin can suspend an account (`users.suspended_at`, `suspended_reason`,
`suspended_by`). A suspended account can't sign in (password or Google), and
its existing 7-day tokens stop working: `authRequired`, `GET /auth/session` and
the chat socket all check `isSuspended` (`server/utils/accountStatus.js`),
which caches each answer for 30 seconds; suspending or reactivating clears it.
API calls answer `401 { code: "ACCOUNT_SUSPENDED" }`, and `lib/api.js` signs
the app out showing that message. A shop whose owner is suspended can't
receive new repair requests. Nothing is deleted; reactivating restores access.
Any new way of authenticating must also check `isSuspended`.

---

# 19. Frontend authentication storage

Authentication state is handled through shared auth context/storage helpers.

Native persistent login uses SecureStore.

Web may use:

* localStorage
* sessionStorage

Do not build separate authentication storage logic into individual screens.

Use the shared authentication infrastructure.

---

# 20. Role IDs

The verified `user_roles` mapping is:

```text
1 = user/client
2 = admin
3 = business
```

Role IDs come from the database and are included in the JWT. Preserve this
mapping in frontend and backend authorization checks.

Each role has its own portal:

* client (1): `app/(tabs)/` and client screens
* admin (2): `app/admin/` (the root layout redirects admins there and keeps
  them out of client and business screens, except settings/help/about/terms/privacy)
* business (3): `app/business/` (also requires owning a shop). Since
  2026-11-23 a business account is ALSO a customer: it can browse the client
  screens and request repairs, chat and pay at other shops, never its own
  (the server refuses requests to, and chats with, the caller's own shop).
  The header shows "My shop" on the customer side and "Browse PixelPatch" in
  the portal; `/business/messages` lists the shop's customer chats and `/chat`
  the owner's own chats as a customer.

Admin APIs must use `adminRequired`, never just the JWT's `role_id`. An admin is
not a business: business routes refuse role 2 even if the admin owns a shop. Before changing it,
inspect the live `user_roles` and `users` tables and confirm the affected
ownership and authorization behavior.

## Becoming a business (since 2026-11-23; documents since 2026-11-24)

1. Only an existing client account (role 1) signs up a shop, from
   `app/become-partner.jsx` (`POST /business-register`, multipart). The form
   has five steps, and the server re-checks every field. Every error names
   its field (`{ message, field }`, e.g. `business_phone`,
   `service.1.price`, `documents.BUSINESS_PERMIT`); the app highlights that
   input in red and jumps to its step. Optional inputs are labelled
   "(optional)".
   * Business: name, email, phone, description of the shop (20 to 1000 characters).
     - The business email must be real: disposable inboxes and domains that
       can't receive mail are refused (`server/utils/emailChecks.js`), and the
       applicant must enter a 6-digit code sent to it
       (`POST /business-register/email-code`, then `/email-verify`, which
       returns a signed 2-hour token sent with the registration). One code a
       minute (the app shows a countdown), 5 codes per 30 minutes per
       account, 5 wrong guesses per code (`server/utils/businessEmailVerification.js`).
     - The business phone can't be used by another shop or another user's
       account (the applicant's own number is allowed):
       `businessPhoneTaken` in `server/utils/phone.js`, checked on Continue
       (`POST /business-register/check-phone`) and again on submit.
   * Location: the shop's address, which MUST be in Zamboanga City (a
     barangay from `server/utils/serviceArea.js`; city/province/region are
     set by the server), plus open days and hours.
   * Services: how customers reach the shop (drop-off, pickup, on-site; at
     least one; saved to `shop_service_types` and each service's `accepts_*`),
     and each service's device, name, description, price and turnaround.
     Devices offered (here and in the business Services screen): Smartphone,
     Tablet, Laptop, PC (`DESKTOP`) and Others, where the shop types the
     device (`shop_services.custom_category`). CONTROLLER and SMARTWATCH are
     no longer offered; existing services keep them
     (`server/utils/serviceCategories.js`, `lib/serviceCategories.js`).
   * Payout: only GCash is offered for now (decided 2026-11-24; PixelPatch may
     support one wallet at first). Maya and bank transfer, including the bank
     name (`shop_payouts.bank_name`), are built but switched off:
     `ENABLED_PAYOUT_METHODS` in `server/utils/payoutMethods.js` and
     `lib/payoutMethods.js`. Also the business TIN (`shop_payouts.tin`), and
     how clients pay the shop by default (online deposit percentage and
     whether cash is accepted; see "Payment terms").
   * Documents: proof of a legitimate business. The business (Mayor's)
     permit is REQUIRED; DTI/SEC registration and BIR Form 2303 are optional.
     PDF/JPG/PNG, 10 MB each. See "Shop documents" below.
   * Agreement: the **Business** Terms of Service and **Business** Privacy
     Policy (`lib/policies/business.js`), opened in a pop-up
     (`components/PolicyModal.jsx`), not a separate page. They are written
     from the business rules and payment terms below: update them when those
     change. Not yet reviewed by a lawyer.
   The shop is saved with `is_verified = 0` and the account STAYS role 1.
2. An admin reviews it in `app/admin/shops.jsx`:
   * approve (`POST /admin/shops/:id/approve`): refused unless a business
     permit is on file. Then `is_verified = 1`, the documents are marked
     `SUCCESS`, the owner becomes role 3 (only if role 1; admins keep role 2),
     optionally the registration's pending services are approved, and the
     owner is emailed.
   * reject (`POST /admin/shops/:id/reject { note }`): the application (shop,
     services, payout, delivery methods, documents and their files, address)
     is deleted, the owner stays a client and is emailed the reason, and may
     apply again.
3. `GET /auth/session` re-reads the role from the database and returns a new
   token. `lib/auth.jsx` calls it once per app start (and the partner page's
   "Check status" button), replacing the token only when the role changed.

`/my-shop` returns `isVerified`; the root layout sends non-business accounts
away from `app/business/` to `/become-partner`, which shows the status.

## Shop documents (since 2026-11-24)

Types, storage and view links live in `server/utils/shopDocuments.js` (keep
`DOCUMENTS` in `app/become-partner.jsx` in sync). Rows: one `attachments` row
per file, one `shop_documents` row per registration (`PENDING`, `SUCCESS` on
approval), and `shop_documents_attachments` linking them
(`attachment_id = attachments.id`, `type` = the document key).

The files are private: they are stored under `uploads/private/shop-documents/`,
which `server.js` never serves. An admin opens one through
`POST /admin/shops/:id/documents/:attachmentId/link`, which returns a signed
`/api/shop-documents/<token>` link valid for 5 minutes. Never put permits
under a public upload path or return `file_path` to the app.

Shops approved before 2026-11-24 have no documents on file.

## Business rules (agreed 2026-11-24, authoritative)

These are the intended rules for repair shops, agreed with the project owner.
Like section 15, they are business logic, not a description of the current UI:
do not change them without explicit instruction. Many are NOT built yet; the
status after each rule says what exists today. When building one, update its
status here.

1. **Shop verification.** Only shops verified by an admin can operate on the
   platform. Verification requires proof of a legitimate business, such as a
   DTI registration or Mayor's permit. Shops must be in Zamboanga City.
   *Status: built (see "Becoming a business"); a business permit is required.*
2. **Subscription plan.** Shops must keep an active monthly or yearly
   subscription to be listed and to receive repair requests. If a
   subscription lapses, the shop is hidden from clients and cannot accept new
   requests, but it must still complete repairs already in progress. Plan
   prices are set by the platform.
   *Status: NOT built. `subscription_plans` and `subscriptions` exist with 0
   rows; listings and request creation do not check subscriptions.*
3. **Service approval.** Every service a shop adds or renames must be approved
   by an admin before clients can see it.
   *Status: built (`shop_services.review_status`, see the schema reference).*
4. **Quotations and warranties.** Each repair request receives one quotation,
   sent only by the main business account. It covers services, parts, any
   possible additional costs, the estimated completion date and any warranty.
   The shop sets its own warranty terms.
   *Status: mostly built (sections 15 and 17; warranties in
   `request_quotation_warranties`, see rule 9). "Possible additional costs"
   has no field yet.*
5. **Cash confirmation.** The shop owner, or the member assigned to the
   repair, confirms receipt of cash balances in the app.
   *Status: built 2026-11-28. "Client paid in cash" on the business and
   staff repair pages (`POST /business/repairs/:id/balance/cash`,
   `POST /staff/repairs/:id/balance/cash`, `confirmCashBalanceFor` in
   `server/utils/paymentPlan.js`). Only for the balance, when the quotation
   allows cash and the repair is in progress. It records a `payments` row
   (`gateway = 'CASH'`, `confirmed_by`), and first expires any open online
   balance link at Xendit so the client can't pay twice.*
6. **Payouts.** Payments made through the platform are held and released in
   full to the shop after the repair is completed and the dispute period has
   passed, less any payment processing fees.
   The dispute period is **7 days** after the repair is completed: if no
   dispute is opened in that time, the payout is released.
   *Status: NOT built. `shop_payouts` stores the account (status `PENDING`,
   never verified); nothing holds or releases money.*
7. **Dispute response.** Shops must respond to a dispute within a set time.
   If they don't, the dispute goes to an admin for resolution.
   The shop has **2 days** from when the dispute is opened.
   *Status: admin side built (2026-11-24). A dispute needs an admin when the
   client declined the shop's offer (`REJECTED`) or it's been `OPEN` for over
   2 days; it then appears in Admin → Disputes and on the dashboard. The
   admin decides refund, re-service, or decline: the dispute becomes
   `RESOLVED` with `proposed_resolution` = the decision (`NULL` = complaint
   declined), and the explanation is added to `dispute_edits` as `ADMIN`.
   NOT built: notifying the shop before the 2 days run out, emails about
   the decision, and actually moving refund money.*
8. **Staff and technicians.** Shop owners may add staff and technicians as
   members of their shop, similar to contributors on GitHub. Members have
   limited access: they can view only the repairs assigned to them and
   confirm payments related to those repairs. Only the main business account
   can send quotations and assign repairs to members, and it keeps full
   control of the shop's services, members, payouts and disputes. When a
   member is removed, their open repairs return to the main account for
   reassignment, and their past repairs stay on the shop's record. The
   platform does not vet individual members, and the shop is responsible for
   their actions.
   Agreed 2026-11-27: members may also **start and complete** their own
   repairs. Removing is two steps, because a started repair can't be
   reassigned: **Remove access** works at once (the member can't sign in to
   the shop, their chats return to the owner, their unfinished repairs stay
   under their name for the owner to finish); **Deactivate** still needs
   their repairs finished first, and also removes access.
   *Status: built 2026-11-28 (see "Shop members" below), including
   confirming cash balances for their repairs (rule 5).*
9. **Warranties and warranty claims** (agreed 2026-11-28). A warranty is the
   shop's promise that its work and the parts it fitted will hold up for a
   set time. It never covers new damage (drops, water, opened elsewhere).
   * **Optional.** The shop decides whether to offer one; "no warranty" is
     allowed and PixelPatch sets no minimum.
   * **One length per job** (e.g. 3 months), not per item, plus what it
     covers (parts, labour or both) and a short note of exclusions. Set in
     the quotation and locked on approval (section 15 Step 5).
   * **Starts** when the repair is completed (`completed_at`) and ends that
     length later. A warranty repair does not restart or extend it.
   * **Claims.** While the warranty is active, the client can request
     warranty service from the repair page, describing the problem (photos
     optional). The claim works for online and cash jobs, and a review does
     not block it. It is separate from disputes: a dispute (7 days, online
     payments) is about the job or the charge being wrong; a claim is about
     the problem coming back later.
   * **The shop responds** within 2 days (like disputes): accept or decline
     with a reason.
   * **Accepting creates a new, linked repair request** for the same device,
     which goes through the normal workflow. Covered items cost ₱0; anything
     not covered is quoted and approved by the client as usual.
   * **Declined, or no answer within 2 days:** the client can escalate it to
     an admin, who decides (like rule 7).
   * Money for the original job has usually already been paid out (rule 6),
     so a claim ends in a free repair, a refund the shop pays directly, or
     action on the shop's account. Tell clients this where they see the
     warranty.
   Agreed details (2026-11-28): the client chooses how the shop gets the
   device for the warranty repair (starting with the original method); the
   warranty repair starts already `ACCEPTED`, so it goes straight to
   assessment; the admin's only decisions are "order the repair" or
   "decline".
   *Status: built 2026-11-28 (`server/sql/2026-11-28_warranties.sql`).*
   * **Terms:** `validateWarranty` / `warrantyInfo` in
     `server/utils/warranty.js` (mirror: `lib/warranty.js`): 1 to 3 years
     at most, `coverage` PARTS/LABOUR/BOTH, `exclusions` up to 300
     characters. The shop's usual warranty is `shops.default_warranty_*`
     (`PUT /business/shop/warranty`, Shop profile), copied into new
     quotations like the payment-term defaults. Controls:
     `components/WarrantyFields.jsx`. The client's repair page shows a
     warranty card with the end date once completed (`warranty_info`).
   * **Claims:** `server/utils/warrantyClaims.js` (shared rules) and
     `controllers/warrantyClaimController.js`:
     `POST /client/repairs/:id/warranty-claims` (multipart: `problem`,
     `delivery_method`, `pickup_address_id`, `preferred_date`, up to 5
     `photos`; form: `app/warranty-claim/[id].jsx`),
     `POST /client/warranty-claims/:id/escalate`,
     `POST /business/warranty-claims/:id/accept` and `/decline { reason }`.
     One claim at a time per repair, and none while its warranty repair is
     still open. The shop may still accept a claim it declined, until it's
     escalated. The problem and the shop's reason go through
     `maskContactInfo`, like chat. Each step adds a SYSTEM line to the
     original repair's chat. Statuses: OPEN, ACCEPTED (`linked_request_id`
     = the warranty repair), DECLINED, ESCALATED, CLOSED (an admin declined).
   * **Warranty repair:** `createWarrantyRepair` makes a new request for the
     same device and shop, `decision = 'ACCEPTED'` and `status = 'REVIEW'`
     (as an accepted request), with no services (so
     covered work is ₱0) and the claim's photos. It then follows sections
     15-17 as usual. A ₱0 quotation is paid in full as soon as the client
     approves it (`settleRequestPayments`). Repair details return
     `warranty_claims`/`warrantyClaims` and `warranty_of`/`warrantyOf`; the
     business list flags `open_warranty_claims` and `is_warranty_repair`.
   * **Admin:** `app/admin/warranty.jsx`, `controllers/admin/warrantyAdminController.js`;
     `warranty_claims_need_admin` in `/admin/summary` (dashboard and
     navigation badge).
   * NOT built: emails or push notifications about claims (they show in the
     repair chat and on the repair pages), and anything that moves money:
     a refund the shop pays is arranged outside PixelPatch.*

## Shop members (since 2026-11-28)

* **Invite:** on Employees, the owner invites an employee record by email
  (`POST /business/employees/:id/invite`; `DELETE` cancels). The employee
  signs in or signs up with that email (signup verifies emails) and accepts
  from the banner (`components/StaffInviteBanner.jsx`,
  `POST /staff/invites/:id/accept|decline`). The invite email is best effort.
  Older accounts made before email verification are the one weak spot.
* **Who can join:** a role 1 account that owns no shop and works at no shop.
  ONE shop per account (`shop_employees.user_id` is unique). role_id never
  changes: access comes only from the membership (`server/utils/staff.js`
  `membershipFor`, usable when the shop is verified and its owner isn't
  suspended). Members can't register their own shop, book repairs at, chat
  with, or be recommended (AI) their own shop (`ownOrStaffShopIds`).
* **Staff portal** (`app/staff/`, API `/api/staff`, `staffRequired`): only
  the repairs assigned to them (`request_assignments.employee_id`), start and
  complete (rules shared with the owner in `server/utils/repairLifecycle.js`),
  the client's phone under the same rule as the owner (`clientPhoneFor`),
  and only the repair chats handed to them. No quotations, assignment,
  payment links, services, payouts, disputes or reviews. `lib/staff.jsx`
  holds the membership; the root layout keeps non-members out of `/staff`.
* **Remove access** (`POST /business/employees/:id/remove-access`) and
  deactivate both unlink the account and return their chats.

## Payment terms (agreed 2026-11-24, authoritative)

PixelPatch takes **no commission** on repairs. It earns from shop
subscriptions (rule 2). So cash costs the platform nothing; online payment
exists to protect clients (disputes, backjobs), not to earn fees.

Every job is paid in two parts:

* **Online deposit:** a whole-number percentage (0-100%) of the quotation
  total, paid online (Xendit) before work starts. Always online.
* **Balance:** the rest, paid when the repair is done: online, or in cash if
  the quotation allows it. With a 100% deposit there is no balance, so cash
  can't apply.

Clients can always pay online. Online money is held by PixelPatch and released
to the shop 7 days after completion (rule 6), so it can be refunded through a
dispute. Cash goes straight to the shop: a cash dispute can only end in a
backjob, a refund the shop pays directly, or action on the shop's account.
Tell clients this where they see the terms.

Who sets what:

* **Shop defaults** (`shops.accepts_cash`, `shops.default_deposit_percent`),
  chosen at registration (Payout step) and changed in the business profile
  (`PUT /business/shop/payment-terms`). Shown to clients on the shop page.
* **Each quotation** (`request_quotations.deposit_percent`, `allow_cash`)
  copies the defaults when it is created; the shop may change them for that
  job. A quotation can't allow cash if the shop doesn't accept cash. Changing
  the defaults never changes a quotation already sent.
* A shop that accepts cash may set a 0% deposit (an all-cash job).

**Quotations lock on approval.** Once the client approves (or cancels), the
quotation's price, parts, warranty and payment terms can't be changed
(`updateQuotation` refuses with 409). Only the estimated completion date can
still be set (`PUT .../quotation/completion`), because payment needs one.

Rules live in `server/utils/paymentTerms.js` and `lib/paymentTerms.js` (keep
them in sync); the controls are `components/PaymentTermsFields.jsx`, and the
client view is `QuotationSection` in `components/RepairSummary.jsx`.

**How payment follows the terms (since 2026-11-28).** Rules in
`server/utils/paymentPlan.js` (amounts mirror `quotationAmounts` in
`lib/paymentTerms.js`; keep them in sync). Applied by
`server/sql/2026-11-28_partial_payments.sql`.

1. The client approves. A 0% deposit is settled at once (a ₱0 total is paid
   in full at once).
2. The shop sends the deposit link (`POST /business/repairs/:id/payments/generate-link`
   charges whatever is due now). The Xendit webhook marks that `payments`
   row `PAID` and sets `deposit_paid_at`. Assignment and start need it.
3. Once the repair is `IN_PROGRESS`, the same button sends the balance link,
   or the owner/assigned member confirms cash (business rule 5).
4. When the balance is paid, `payment_status = 'PAID'` and the quotation is
   `PAID`; only then can the repair be completed.

The total charged is the quotation's `estimated_cost` (what the client
approved), not a recount of current service prices. Every repair response
includes the plan (`payment_plan` for the client, `paymentPlan` for the
business and staff); `components/PaymentProgress.jsx` shows it. Payment
links are sent by the owner only; the client pays from their repair page.

Payouts (rule 6) must skip `gateway = 'CASH'` rows: that money went straight
to the shop.

---

# 21. Business ownership is separate from role ID

Business/shop ownership can be resolved through:

```text
/my-shop
```

A user's ownership of a shop must not automatically be treated as equivalent to an arbitrary role-ID assumption.

Authorization should verify appropriate ownership where necessary.

---

# 22. Business frontend

The business application lives under:

```text
app/business/
```

Its layout uses a responsive drawer.

Business sections include approximately:

* Dashboard
* Repair
* Disputes
* Employees
* Services
* Reviews
* Shop profile

Business UI should remain separate from client navigation where appropriate.

Do not copy old `legacy-web` business components directly into Expo.

Port behavior using React Native components instead.

---

# 23. Shop context

Business screens use shared shop context to determine the authenticated user's shop.

Ownership lookup uses:

```text
/api/my-shop
```

Prefer this shared shop state over repeatedly building new ownership queries in frontend screens.

---

# 24. Payments

PixelPatch uses Xendit.

Payment generation occurs on the backend.

The frontend may launch checkout differently depending on platform:

Web:

* browser navigation

Native:

* Expo WebBrowser

Payment state is ultimately backend-controlled.

Never treat a successful return URL as definitive proof of payment.

The webhook marks the matching `payments` row paid (never a `CASH` row, and
only for the invoice id stored in `gateway_ref`), then calls
`settleRequestPayments` to update `deposit_paid_at`, `payment_status` and the
quotation (section 15 Step 6).

Check actual webhook behavior before expanding payment state handling.

---

# 25. Chat

PixelPatch uses Socket.IO for real-time chat.

Socket authentication uses JWT.

Conversation rooms use patterns similar to:

```text
chat_<id>
```

Typical socket events include:

```text
join
leave
send_message
new_message
```

Messages are persisted in MySQL.

REST message history and Socket.IO live delivery are separate mechanisms.

When debugging chat, inspect both.

Clean up socket listeners when React components unmount.

## Chats per repair, handover and badges (since 2026-11-28)

* A client has ONE General chat per shop (`chats.request_id IS NULL`,
  questions before booking, always the owner's) and ONE chat per repair
  (`request_id` set, created the first time it's opened: `findOrCreateChat`
  in `controllers/chatController.js`). "Message shop" on the shop page or
  from the AI assistant opens General; on a repair page it opens that
  repair's chat (`POST /chat/start { shop_id, request_id }`; the owner uses
  `POST /business/repairs/:id/chat`). Existing chats became General chats.
* **Access** (`server/utils/chatAccess.js`, used by the socket and every
  REST chat endpoint): CLIENT (the chat's client), OWNER (reads every chat of
  the shop; can't send while the chat is handed over: 409 / ack
  `CHAT_HANDED_OVER`), STAFF (only the member the chat is handed to).
* **Handover:** the owner hands a REPAIR chat to the employee assigned to
  that repair, once they've joined (`POST /business/chats/:id/transfer`),
  and takes it back (`/take-back`). Reassigning the repair, removing access
  or deactivating returns it to the owner (`returnChatsToOwner`). Each
  change adds a SYSTEM message ("TechFix Pro handed this chat to Juan
  (Technician).") and emits `chat_updated` to the room.
* **Badges:** messages are saved with `sender_kind` (CLIENT, OWNER, STAFF,
  SYSTEM) and `sender_label` ("Juan · Technician", "Maria · Owner"), kept
  as written so history stays right after people leave. Clients see shop
  staff by first name and role only (last names are not returned).
* `GET /chat` returns each chat's `viewer_role`; the one inbox screen
  (`app/(tabs)/chat.jsx`) shows CLIENT chats on `/chat`, OWNER on
  `/business/messages`, STAFF on `/staff/messages`, grouped by shop or
  client. `GET /chat/:id` gives the chat screen its state (role, can send,
  handler, transfer target).

## Repair cards in chat (since 2026-11-28)

When a shop accepts a repair request (`confirmRepair`), or a warranty repair
is created (business rule 9), PixelPatch posts a **"Repair confirmed"** card
in that repair's chat, like an order confirmation: repair number, device
(photo or icon), services, delivery method and address (the client's for
pickup/on-site, the shop's for drop-off), preferred date, price note, the
start of the problem description, and **View details** (opens the repair as
client, owner or staff).

* It is a SYSTEM message with `chat_messages.card` (JSON, `type:
  "REPAIR_CONFIRMED"`); `message_text` keeps a plain line for inbox previews.
  Built by `server/utils/repairCards.js` (`postRepairConfirmation`, best
  effort), drawn by `components/RepairChatCard.jsx` in `app/chat/[id].jsx`.
  `GET /chat/:id/messages` and the socket send `card` parsed.
* A snapshot of that moment: it doesn't change when the repair does.
* Never put phone numbers or emails in a card (see below).

## Keeping clients and shops on PixelPatch (since 2026-11-27)

Clients and shops talk only through PixelPatch chat, so the job, payment
and any dispute stay protected (and shops keep a reason to subscribe).

* **Chat filter** (`server/utils/contactFilter.js`, `maskContactInfo`):
  phone numbers (also spaced out, written as words in English, Tagalog or
  Chavacano, or with look-alike letters such as "O9I7"), emails (also "at
  gmail dot com"), links, @handles and "add me on FB" / "my Viber is ..."
  invitations become `[contact info hidden]`. Kept: names, prices, dates,
  times, addresses/landmarks, model numbers, IMEI, serial numbers, error
  codes. It runs on BOTH send paths (socket `send_message`, `POST
  /chat/send`) before the message is saved (only the hidden version is
  stored), and again on read (`GET /chat/:id/messages`, the `/chat` preview)
  for older messages. The sender gets `masked: true` and a `notice`, shown
  once in `app/chat/[id].jsx`. No strikes or blocking. Any new way to send a
  message between a client and a shop must use it. After changing it, run
  `npm --prefix server run chat:filter-test` (no external calls) and add a
  case.
* **Shop page:** `GET /shops/:id` returns `phone_number` and `email` only to
  the shop's owner (checked from the token), and hides contact details in
  the description for everyone else. Clients see "Message the shop" instead
  of Call/Email. Never add a shop's phone or email to a client-facing
  response.
* **Client phone, like a delivery app:** the business repair detail
  (`GET /business/repairs/details/:id`) includes `clientPhone` only for an
  ACCEPTED PICKUP or ONSITE repair that the client hasn't cancelled, until 3
  days after `completed_at` (`clientPhoneFor` in
  `controllers/repairController.js`). Never for drop-off. Shops never get the
  client's email. Clients never get the shop's phone; they use chat.
* The Business Terms ("Talking to clients"), client Terms and Privacy Policy
  say all of this; update them when it changes.
* It's a deterrent, not a wall: photos (e.g. a business card) and numbers
  split across many messages get through. Service descriptions and reviews
  are not filtered (services are reviewed by an admin).

---

# 26. AI troubleshooting

The AI troubleshooting assistant (`app/assistant.jsx`) uses the OpenAI API
from the server only; the app never calls OpenAI and never sees the prompt.
Rebuilt on 2026-11-26 from the "AI assistant improvement brief". Model:
`gpt-4o-mini` (`OPENAI_MODEL` overrides it).

Server code lives in `server/utils/ai/`:

* `prompt.js`: the system prompt (scope lock, DIY safety rules, diagnosis
  flow, languages, privacy) and the `find_shops` tool. A reply that copies the
  prompt is replaced (`leaksPrompt`).
* `assistant.js`: one turn. Sends the last 16 messages (plus the first user
  message when older ones are cut), `max_completion_tokens` 450, and
  `store: false` (OpenAI doesn't keep the request for its dashboard or evals).
* `redact.js`: every message sent to OpenAI (user AND assistant, history
  included) and every shop summary is filtered first. It removes emails
  (also "x at gmail dot com"), phone numbers, card and long ID numbers,
  passwords, PINs and OTP codes, account names (Apple ID, username), IMEI,
  serial and government ID numbers, links, @handles, IP addresses, street
  addresses and house numbers, "my name is ..." / "ako si ...", and
  birthdates. Kept on purpose: the barangay or city, and every device
  detail the assistant needs (brand, model, model number such as SM-A546E or
  A2643, specs, OS and build/firmware versions, error codes). Only the
  device's IMEI, serial and MAC address are removed. No account data (profile
  name, email, phone, saved addresses, devices) is ever sent to OpenAI; keep
  it that way. After changing it, run `npm --prefix server run
  ai:redact-test` (no external calls), and add a case for what you changed.
* `findShops.js`: the only source of recommended shops: verified, owner not
  suspended, in Zamboanga City (a blank city with a Zamboanga barangay
  counts), an APPROVED service for the device, never the caller's own shop.
  Shops with a service matching the problem first, by rating computed from
  `reviews`. The subscription check (business rule 2) is NOT applied yet;
  add it where `SHOP_FILTERS` is marked.
* `guards.js`: checks that don't trust the model. Hazards (battery, water,
  opening the device, parts, soldering) and requests for a person always end
  with shop cards. The user's latest language is passed as a hint. A Spanish
  reply (to Chavacano) is rewritten in Tagalog.
* `limits.js`: 20 messages per 10 minutes and 100 a day per user, counted in
  `ai_usage` (deleting chats doesn't reset it). Token use is logged there.

When the model calls `find_shops`, its reply comes in the tool's
`message_to_user` and the server looks the shops up itself. The model never
sees shop data, so it can't invent or misquote a shop. Cards show name,
Verified, rating and review count, the matching service and starting price,
"Warranty terms come with the quote", and Message shop / Request repair
(`components/AssistantShops.jsx`). Message shop opens the shop chat with the
assistant's summary as an editable draft (`/chat/[id]?draft=`); Request
repair pre-fills `/request/[shopId]` (`issue`, `serviceId`, `deviceType`).

Endpoints (all `authRequired`, owner-only):

* `POST /ai/analyze { text, conversation_id? }`: max 2000 characters.
  `429 { code: "AI_RATE_LIMIT" }`, or `429 { code: "AI_DAILY_LIMIT", shops,
  handoff }` (the app shows a pop-up with those shops and a Home button).
  OpenAI failures: `503 { code: "AI_UNAVAILABLE" }` with a friendly message.
* `POST /ai/shops { conversation_id? }`: shops for "Talk to a shop instead",
  without calling OpenAI.
* `PUT /ai/messages/:id/feedback { feedback: "UP" | "DOWN" | null }`.
* `/ai/conversations` (list, messages, rename, delete). Delete removes the
  messages from the database.

After changing the prompt or guards, run `npm --prefix server run ai:test`
(`server/scripts/aiPromptTest.js`; calls OpenAI, about a cent per run) and
read the replies.

There are no embeddings, vector database or RAG; `find_shops` is the only tool.

---

# 27. Uploads

Frontend uploads use:

```text
lib/upload.js
```

Native uploads commonly use descriptors such as:

```js
{
  uri,
  name,
  type
}
```

Browser behavior may use File/Blob objects.

Backend MIME filtering and upload paths should be inspected before changing upload handling.

Do not assume browser and native upload behavior are identical.

## Upload security (since 2026-11-26)

`/uploads` is served from the same address as the website, so a file that a
browser treats as a page (HTML, SVG) would run with the site's access, which
includes the token in localStorage. Before this fix `POST /upload/photo`
accepted any file from anyone, signed in or not. Rules now:

* Photos go through `server/middleware/upload.js` (`upload.single/array`):
  PNG or JPEG only, 10 MB each. The saved name is random and its extension
  comes from the type, never from the uploader's file name. After saving,
  `requireFileTypes` (`server/utils/fileSignatures.js`) checks the file's
  first bytes really are an image; otherwise every file of the request is
  deleted and the API answers 400 `INVALID_FILE`.
* Shop documents (`utils/shopDocuments.js`) get the same content check
  (real PDF, JPEG or PNG).
* `server.js` serves only `.png/.jpg/.jpeg` under `/uploads` (anything else
  is a 404, including files uploaded before the fix), with `nosniff` and a
  sandboxing Content-Security-Policy.
* `POST /upload/photo` requires sign-in.
* Never add an upload that keeps the uploader's extension or trusts the
  claimed MIME type alone.

Other input rules: SQL values always go through `?` placeholders (dynamic SQL
pieces must be fixed strings chosen by code); `users.photo_url` must be an
`/uploads/...` path or an `https://` URL; the server's final error handler
answers JSON and never returns stack traces or raw database errors.

---

# 28. Environment variables

Never expose actual secret values.

Document names only.

## Expo

```text
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
```

Remember:

Anything beginning with:

```text
EXPO_PUBLIC_
```

is client-accessible and must not contain secrets.

---

## Backend

Known server variables include:

```text
PORT

DB_HOST
DB_USER
DB_PASS
DB_NAME

JWT_SECRET

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_IDS

OPENAI_API_KEY
OPENAI_MODEL        (optional, default gpt-4o-mini)

EMAIL_USER
EMAIL_PASS

XENDIT_SECRET_KEY
XENDIT_WEBHOOK_TOKEN
XENDIT_SUCCESS_URL
XENDIT_FAILURE_URL
```

Do not print secret values in logs, documentation, chat output, or source files.

---

## Legacy Vite

The old frontend may use:

```text
VITE_API_URL
```

Do not introduce `VITE_*` variables into Node backend code.

---

# 29. Local development

Typical project commands are:

Install active frontend:

```bash
npm install
```

Install backend:

```bash
npm --prefix server install
```

Start Expo:

```bash
npm start
```

Start Expo Go:

```bash
npm run start:go
```

Start Android:

```bash
npm run android
```

Start web:

```bash
npm run web
```

Start backend:

```bash
npm run server
```

Check Expo dependencies:

```bash
npx expo install --check
```

Check Expo project:

```bash
npx expo-doctor
```

Run lint:

```bash
npm run lint
```

Legacy frontend:

```bash
npm --prefix legacy-web install
npm --prefix legacy-web run dev
```

---

# 30. Local backend URLs

Backend normally runs locally on:

```text
http://localhost:5000
```

API routes are generally underneath:

```text
http://localhost:5000/api
```

For Android Emulator, the host machine may be reached through:

```text
http://10.0.2.2:5000
```

For a physical phone, use the development computer's LAN IP while both devices are on the same network.

Do not replace environment-controlled URLs with hardcoded development URLs unless explicitly requested.

---

# 31. Coding conventions

Active frontend code generally uses:

* JavaScript
* JSX
* functional components
* React hooks
* two-space indentation
* semicolons
* mostly double quotes

Component names use PascalCase.

Shared helpers commonly use named exports.

Screens often use default exports.

Preserve nearby formatting rather than unnecessarily reformatting entire files.

## Text input limits (since 2026-11-26)

Every text input has a length limit, and the server checks the same limit.
The numbers live in `lib/inputLimits.js` (app) and
`server/utils/inputLimits.js` (server); keep them in sync. Examples: names
100, email 100 (the columns are varchar(100)), street 200, service name 80,
service description 500, problem description, chat message, review, dispute
text, warranty claim 1000, warranty exclusions 300, AI message 2000, search 100.

* App: pass `maxLength={LIMITS.x}` to every `TextField`/`TextInput`.
  `TextField` shows a counter on multi-line fields (`showCount` forces it).
  `PasswordField` defaults to `LIMITS.password`.
* Server: add `limitText({ field: ["Label", LIMITS.x] })` to the route (after
  any upload middleware). It answers `400 { error, message, field,
  code: "TEXT_TOO_LONG" }`, and also refuses objects or arrays in text fields.
  `"parts[].name"` checks every item of an array. The chat socket uses
  `textProblem` directly.
* A new text column must be able to hold its limit; add a migration if not.

---

# 32. Backend module conventions

The backend uses ES modules.

Relative backend imports generally include:

```text
.js
```

Example:

```js
import db from "../config/db.js";
```

Do not remove `.js` extensions from backend ES-module imports unless the module configuration changes.

---

# 33. API payload conventions

Many backend/database fields use snake_case.

Examples:

```text
shop_id
user_id
role_id
service_request_id
payment_status
client_approved
estimated_cost
```

Do not automatically convert API payloads to camelCase.

Preserve the contract expected by the controller and frontend.

---

# 34. Response formats

Backend response shapes are not perfectly standardized.

Responses may be:

```js
[]
```

or:

```js
{ repairs: [] }
```

or:

```js
{ success: true }
```

or:

```js
{ error: "..." }
```

Inspect the relevant controller before changing frontend selectors.

Do not assume all endpoints have the same response wrapper.

---

# 35. Mutation behavior

Existing frontend mutations commonly:

1. Set loading/busy state
2. Call the API
3. Handle errors
4. Refresh relevant data after success

Preserve this behavior where appropriate.

Avoid introducing duplicate fetch state logic when shared hooks already exist.

---

# 36. SQL safety

All user-controlled values must use parameterized queries.

Good:

```js
db.query(
  "SELECT * FROM shops WHERE shop_id = ?",
  [shopId]
);
```

Avoid:

```js
db.query(
  `SELECT * FROM shops WHERE shop_id = ${shopId}`
);
```

Always validate resource ownership server-side.

Do not rely solely on frontend route guards.

---

# 37. Legacy application rule

`legacy-web/` is an older Vite/React DOM implementation.

It may be used to understand:

* previous UI
* previous flows
* previous component behavior

But do not directly import DOM components into Expo.

For example, do not introduce:

```jsx
<div>
<button>
<input>
```

into native React Native screens.

Translate the behavior using:

```jsx
<View>
<Pressable>
<TextInput>
```

or existing shared PixelPatch components.

---

# 38. Scope discipline

When given a specific coding task:

1. Inspect relevant code.
2. Determine the smallest correct change.
3. Avoid unrelated refactoring.
4. Preserve existing architecture.
5. Report important nearby problems separately instead of silently rewriting them.

Do not expand a small bug fix into a project-wide rewrite without explicit permission.

---

# 39. Known implementation hazards

The following are known findings.

Treat these as existing technical debt, not patterns to copy.

## User CRUD authorization

Some generic user CRUD routes may currently lack proper authentication.

Do not assume these routes are secure.

---

## Chat authorization

Some chat/message operations may lack complete participant validation.

Do not copy this authorization pattern into new endpoints.

---

## Shop ownership

Some repair helpers may trust supplied shop IDs.

New or modified business operations should verify shop ownership server-side.

---

## Sensitive logging

Some authentication/payment handlers may contain logging of sensitive tokens or configuration.

Never reproduce or add logging that exposes:

* JWTs
* passwords
* API keys
* payment secrets
* OAuth tokens

---

## Transactions

As of 2026-11-16 the multi-step writes that matter (business registration,
Xendit settlement, client cancellation, AI chat persistence, AI conversation
delete) run through `utils/transaction.js` `withTransaction`. Other multi-write
paths (for example payment-link creation, quotation create/update with parts
and warranty) still run as separate statements and are not atomic.

Do not assume an existing multi-write operation is atomic unless it uses
`withTransaction`. See section 12 for the rule.

---

## AI transactions

`analyzeIssue` used to hold an open transaction across the OpenAI request. It
now calls OpenAI first and opens the transaction only for the writes. Keep it
that way: never hold a pooled connection or open transaction across an
external call.

---

## Payment creation

A `payments` row is still inserted before the Xendit invoice is created. A
failed attempt marks it `FAILED`, and the next attempt for the same part
reuses that row (`createPaymentLinkFor` in `server/utils/paymentPlan.js`).

Inspect this behavior before modifying retry logic.

---

## Upload controller

Node backend code must not depend on Vite's `import.meta.env` (a leftover
`import.meta.env.VITE_API_URL` in the upload controller was removed on
2026-11-16). Upload endpoints return relative `/uploads/...` paths; the
frontend resolves them with `mediaUrl()` from `lib/api.js`. Use server
environment variables through Node's environment configuration instead.

---

## Upload paths

Upload/static paths may depend on the backend working directory.

Be careful when changing:

* upload destination paths
* static serving paths
* deployment working directories

---

# 40. Tests and validation

The repository currently does not contain a complete automated test suite.

Do not claim a change is fully verified solely because:

```bash
npm run lint
```

passes.

Frontend lint does not validate backend SQL or database behavior.

Where appropriate, validation can include:

* ESLint
* Expo Doctor
* Expo dependency check
* starting backend
* checking API response
* testing affected screen
* checking database row changes
* testing Socket.IO behavior
* testing payment flow safely

Avoid triggering real:

* payments
* emails
* AI charges

unless necessary for the requested task.

---

# 41. Rules for AI coding agents

Before changing PixelPatch code:

1. Read this `AGENTS.md`.
2. Inspect the relevant frontend screen.
3. Trace the API request.
4. Trace its Express route.
5. Inspect its controller.
6. Inspect associated SQL.
7. Consider actual database structure.
8. Preserve the authoritative repair lifecycle.
9. Do not infer role IDs without verification.
10. Do not expose secrets.
11. Avoid unrelated changes.

---

# 42. When behavior is inconsistent

PixelPatch contains some legacy and partially migrated code.

If two parts of the system disagree:

DO NOT silently choose one.

Instead determine whether the discrepancy concerns:

* legacy code
* active Expo code
* frontend assumption
* backend authorization
* database schema
* intentional business rule
* known bug

For repair workflow behavior, the authoritative repair rules in this document take precedence unless the developer explicitly requests a change.

For database columns and role IDs, verify the actual database rather than guessing.

---

# 43. Core principle

PixelPatch already has an established architecture and business flow.

The goal when modifying it is normally:

```text
Understand → Trace → Fix → Verify
```

not:

```text
Assume → Redesign → Rewrite
```

Preserve working behavior, make focused changes, and never invent business rules that are not explicitly part of PixelPatch.

# PixelPatch Database Schema Reference

Verified against the live local database with `SHOW CREATE TABLE` on
2026-11-16 (MariaDB 10.4.32, database `pixelpatchdb`). Re-verify before
schema-dependent changes, because the database may have changed since then.

Backend access uses a `mysql2` connection pool (no ORM). Transactions go
through `server/utils/transaction.js`.

Schema changes made from this project are recorded as SQL files in
`server/sql/`. There is no migration runner: apply them manually and keep the
files in date order.

Conventions: tables are InnoDB, `utf8mb4`, and every table has an
`id INT AUTO_INCREMENT` primary key unless noted. "FK" means a real
foreign-key constraint exists. "No FK" means the relationship is only
enforced by application code.

---

## Repair workflow tables

### service_requests

```text
id
client_id            NOT NULL   FK -> users.id
shop_id              NOT NULL   FK -> shops.id
delivery_method      enum('PICKUP','DROPOFF','ONSITE') NOT NULL
device_id            NOT NULL   FK -> devices.id
issue_description    text NOT NULL
pickup_address_id    NULL       FK -> addresses.id
preferred_date       datetime NOT NULL
notes                text NULL
rejection_reason     text NULL
client_approved      tinyint(1) NULL DEFAULT NULL
payment_status       enum('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING'   (PAID = paid in full)
deposit_paid_at      datetime NULL   (deposit settled, so work may start: set by the webhook, or on
                     approval for a 0% deposit; added 2026-11-28, section 15 Step 6)
is_received          tinyint(1) NOT NULL DEFAULT 0
received_at          datetime NULL
received_method      enum('PICKUP','DELIVERY') NULL
                     (set by POST /business/repairs/:id/received: PICKUP = shop collected it,
                      DELIVERY = client dropped it off; on-site repairs are never received;
                      allowed once the request is ACCEPTED and before COMPLETED; gates nothing)
estimated_price      decimal(10,2) NOT NULL   (always written as 0.00 today)
status               enum('PENDING','REVIEW','IN_PROGRESS','COMPLETED') NOT NULL
decision             enum('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING'
created_at, updated_at   datetime NOT NULL
completed_at         datetime NULL
```

`client_approved`: `NULL` = undecided, `1` = approved, `0` = cancelled by the
client (see section 16). There is no CANCELLED value in `status`.

Do not collapse `status`, `decision`, `payment_status`, and `client_approved`
into one field.

### service_request_items

```text
id
request_id   FK -> service_requests.id  ON DELETE CASCADE
service_id   FK -> shop_services.id
```

### service_request_attachments

```text
id
attachment_id        varchar(255) NOT NULL   (an uploaded file name, e.g. "1765720598745-182152142.png")
service_request_id   int NOT NULL            No FK
```

`attachment_id` is a file name, not a reference to the `attachments` table.

### request_status_history

```text
id
request_id   FK -> service_requests.id
status       varchar(30) NOT NULL
updated_by   int NOT NULL   (No FK)
remarks      text NOT NULL
updated_at   datetime NOT NULL
```

Currently only the initial `PENDING` row is written when a request is created.
Later transitions are not recorded.

### request_assessments

```text
id
request_id         FK -> service_requests.id   (NOT unique)
device_condition   text NULL
observed_issues    text NULL
recommendation     text NULL
is_remote          tinyint(1) NOT NULL
created_at         datetime NOT NULL
updated_at         datetime NULL
```

### request_assessment_attachments

```text
attachment_id           (PK part, AUTO_INCREMENT)
request_assessment_id   (PK part)   No FK
```

Unused (0 rows).

### request_quotations

```text
id
request_id                  FK -> service_requests.id   (NOT unique)
assessment_id               FK -> request_assessments.id
labor_fee                   decimal(10,0) NOT NULL
estimated_cost              decimal(10,2) NOT NULL
deposit_percent             tinyint unsigned NOT NULL DEFAULT 100   (0-100, CHECK; added 2026-11-24)
allow_cash                  tinyint(1) NOT NULL DEFAULT 0           (balance may be paid in cash; added 2026-11-24)
estimated_completion_time   datetime NULL
is_parts_needed             tinyint(1) NOT NULL
status                      enum('PENDING','PAID','CANCELLED') NOT NULL
discount_id                 int NULL   (No FK; discounts are unused)
created_at, updated_at      datetime NOT NULL
```

Business rules:

* one quotation per repair request, created only after an assessment
* `estimated_cost` = sum of selected `shop_services.base_price` + sum of part
  costs; `labor_fee` is not included

There is NO unique constraint on `request_id`. The one-quotation rule is
enforced only in `createQuotation`.

Quotation `status` lifecycle:

```text
PENDING   = created; editable by the business; can be approved and paid
PAID      = set by the Xendit webhook when the payment is verified
CANCELLED = set when the client cancels the request
```

Only `PENDING` quotations can be edited, approved, or get a payment link.
Paid quotations created before 2026-11-16 were backfilled by
`server/sql/2026-11-16_backfill_paid_quotations.sql`.

### request_quotation_parts

```text
id
request_quotation_id   int NOT NULL   No FK
name                   varchar(255) NOT NULL
cost                   decimal(10,0) NOT NULL   (whole pesos only)
```

### request_quotation_warranties

```text
id
request_quotation_id   int NOT NULL   No FK
is_warranty_covered    tinyint(1) NOT NULL   (new rows are always 1: no row = no warranty)
warranty_value         int NOT NULL
warranty_unit          enum('YEAR','DAY','MONTH','WEEK') NOT NULL
coverage               enum('PARTS','LABOUR','BOTH') NULL   (NULL on older rows = BOTH; added 2026-11-28)
exclusions             varchar(300) NULL   (what isn't covered; added 2026-11-28)
```

Warranty data lives here, not on `request_quotations`. The table holds orphan
rows for deleted quotations (ids 3, 4, 5 as of 2026-11-16). The warranty
starts at `service_requests.completed_at` (business rule 9).

### warranty_claims

```text
id
request_id          FK -> service_requests.id   (the original repair)
client_id           FK -> users.id
shop_id             FK -> shops.id
problem             text NOT NULL   (contact details hidden)
delivery_method     enum('PICKUP','DROPOFF','ONSITE') NOT NULL
pickup_address_id   NULL FK -> addresses.id
preferred_date      date NOT NULL
status              enum('OPEN','ACCEPTED','DECLINED','ESCALATED','CLOSED') NOT NULL DEFAULT 'OPEN'
shop_response       text NULL   (the shop's reason for declining)
admin_note          text NULL   (the admin's explanation)
decided_by          int NULL   No FK   (the admin)
linked_request_id   NULL FK -> service_requests.id  UNIQUE   (the warranty repair)
created_at          datetime NOT NULL DEFAULT current_timestamp()
responded_at, escalated_at, resolved_at   datetime NULL
```

Added 2026-11-28 (business rule 9).

### warranty_claim_photos

```text
id
claim_id    FK -> warranty_claims.id  ON DELETE CASCADE
file_name   varchar(255) NOT NULL   (under uploads/requests/, like repair request photos)
```

### request_assignments

```text
id
request_id    FK -> service_requests.id   UNIQUE (one assignment per request)
employee_id   FK -> shop_employees.id
assigned_by   FK -> users.id
assigned_at   datetime NOT NULL
updated_at    datetime NULL
```

### payments

```text
id
request_id     FK -> service_requests.id   (NOT unique)
client_id      FK -> users.id
shop_id        FK -> shops.id
kind           enum('FULL','DEPOSIT','BALANCE') NOT NULL DEFAULT 'FULL'   (added 2026-11-28)
amount         decimal(10,2) NULL
paid_at        datetime NULL
payment_link   varchar(500) NULL
gateway_ref    varchar(100) NULL   (Xendit invoice id; added 2026-11-28)
confirmed_by   int NULL   No FK   (users.id who confirmed a cash payment; added 2026-11-28)
gateway        enum('XENDIT','CASH') DEFAULT 'XENDIT'   (CASH added 2026-11-28)
status         enum('PENDING','PAID','FAILED') DEFAULT 'PENDING'
```

One row per part of the payment (section 15 Step 6). The webhook updates
`payments.status`, then `settleRequestPayments` updates the request.

### payment_details

```text
id
payment_id        FK -> payments.id  ON DELETE CASCADE ON UPDATE CASCADE
type              enum('PARTIAL','FULL') NOT NULL   (FULL for kind FULL, PARTIAL for a deposit or balance)
status            enum('PAID','PROCESSING','PARTIALLY_PAID') NOT NULL
method            enum('GCASH','MAYA','CARD') NOT NULL
transaction_ref   varchar(255) NOT NULL
created_at        datetime NOT NULL DEFAULT current_timestamp()
updated_at        datetime NULL
```

### reviews

```text
id
request_id   NULL   FK -> service_requests.id
client_id    NULL   FK -> users.id
shop_id      NULL   FK -> shops.id
rating       int NULL
feedback     text NULL
created_at   datetime NULL
```

Reviews are for completed repairs. There is no unique constraint per request.

### disputes

```text
id
request_id            FK -> service_requests.id   UNIQUE (one dispute per request)
client_id             FK -> users.id
shop_id               FK -> shops.id
status                enum('OPEN','SHOP_PROPOSED','RESOLVED','REJECTED') NOT NULL DEFAULT 'OPEN'
proposed_resolution   enum('REFUND','RESERVICE') NULL
shop_response         text NULL
created_at            datetime NOT NULL DEFAULT current_timestamp()
updated_at            datetime NOT NULL (auto-updated)
resolved_at           datetime NULL
```

Disputes happen after completion: the client explains, the shop proposes a
resolution, and the client accepts or rejects it.

### dispute_edits

```text
id
dispute_id   FK -> disputes.id  ON DELETE CASCADE
edited_by    enum('CLIENT','BUSINESS','ADMIN') NOT NULL   (ADMIN added 2026-11-24: an admin's decision)
content      text NOT NULL
created_at   datetime NOT NULL DEFAULT current_timestamp()
```

The message history of a dispute.

---

## Users, shops, and catalog

### users

```text
id
role_id         int NOT NULL DEFAULT 1   FK -> user_roles.id
first_name      varchar(100) NOT NULL
middle_name     varchar(255) NULL
last_name       varchar(255) NOT NULL
suffix          varchar(50) NULL
birthdate       date NULL      (not collected by the app; nullable since 2026-11-16)
email           varchar(100) NOT NULL UNIQUE
phone           varchar(20) NULL   (optional; nullable since 2026-11-16)
password_hash   varchar(255) NOT NULL
photo_url       longtext NULL
suspended_at, suspended_reason (varchar 500), suspended_by (int, no FK)   NULL   (added 2026-11-24; section 18)
created_at, updated_at   datetime (defaults / auto-update)
```

### user_roles

```text
id
role_name   varchar(50) NOT NULL
```

Verified rows: `1 = user`, `2 = admin`, `3 = business` (see section 20).

### shops

```text
id
user_id                  FK -> users.id   (owner; NOT unique)
name                     varchar(100) NOT NULL
description              text NOT NULL
address_id               FK -> addresses.id  NOT NULL
phone_number             varchar(20) NOT NULL     (NOT "phone")
email                    varchar(100) NOT NULL
accepts_cash             tinyint(1) NOT NULL DEFAULT 0                    (added 2026-11-24)
default_deposit_percent  tinyint unsigned NOT NULL DEFAULT 100 (0-100, CHECK; added 2026-11-24)
default_warranty_value, default_warranty_unit, default_warranty_coverage, default_warranty_exclusions
                         NULL   (the shop's usual warranty; value NULL = none; added 2026-11-28)
open_time, closing_time  time NOT NULL
days_from, days_to       varchar(255) NOT NULL
is_verified              tinyint(1) NOT NULL   (0 = pending, 1 = verified)
rating_average           decimal(3,2) NOT NULL
current_customer_count   int NOT NULL DEFAULT 0
created_at, updated_at   datetime NOT NULL
```

* A user can own several shops. The seed admin user (role 2) owns four. The
  business middleware takes the first shop (`LIMIT 1`) and requires role 3.
* `rating_average` is NOT recomputed by any code, so it can disagree with
  `reviews`. Compute from `reviews` if accuracy matters.
* Registration flow (implemented 2026-11-23, see section 20 "Becoming a
  business"): a new shop is created with `is_verified = 0` and the owner stays
  role 1; an admin approves it (owner becomes role 3) or rejects it (the
  application is deleted and the reason emailed).
* `phone_number` is stored normalized as `09XXXXXXXXX` for new registrations
  (`server/utils/phone.js`); older rows may differ.

### addresses

```text
id
user_id               NULL   FK -> users.id
country, region, province, city, barangay   varchar(255) NOT NULL
street                varchar(255) NULL
postal_code           varchar(50) NULL
label                 varchar(50) NULL
latitude, longitude   decimal(10,7) NULL   (NULL = unknown; no screen collects them yet)
is_default            tinyint(1) NOT NULL DEFAULT 0
created_at, updated_at   datetime NOT NULL
```

Referenced by `shops.address_id` and `service_requests.pickup_address_id`.

### devices

```text
id
user_id         int NOT NULL   No FK
device_type     enum('PHONE','LAPTOP','DESKTOP') NULL   (added 2026-11-23; NULL = older device)
name, model, serial_number, model_number, brand   varchar(255) NOT NULL
specs           longtext NULL   (JSON of type-specific specs, added 2026-11-23)
photo_url       longtext NULL
created_at, updated_at   datetime NOT NULL
```

PixelPatch repairs phones, laptops and desktop computers ("CPU" = system unit).
The specification fields per type, and which are required, live in
`server/utils/deviceSpecs.js` (validation) and `lib/deviceSpecs.js` (form and
display); keep them in sync. Repair requests require the device to belong to
the client and to have a `device_type`. Applied by
`server/sql/2026-11-23_device_types.sql`.

### shop_services

```text
id
shop_id               FK -> shops.id
name                  varchar(100) NOT NULL
category              enum('SMARTPHONE','DESKTOP','CONTROLLER','TABLET','SMARTWATCH','LAPTOP','OTHER') NOT NULL
                      (offered since 2026-11-24: SMARTPHONE, TABLET, LAPTOP, DESKTOP = "PC", OTHER)
custom_category       varchar(60) NULL   (the typed device when category = 'OTHER'; added 2026-11-24)
description           text NOT NULL
base_price            decimal(10,2) NOT NULL
estimated_timeframe   varchar(255) NOT NULL     (NOT "timeframe")
accepts_pickup        tinyint(1) NOT NULL
accepts_onsite        tinyint(1) NOT NULL
accepts_dropoff       tinyint(1) NOT NULL DEFAULT 0
created_at, updated_at   datetime NOT NULL
review_status         enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING'
review_note           text NULL     (admin's rejection reason, shown to the shop)
reviewed_by           NULL FK -> users.id
reviewed_at           datetime NULL
```

Service review (since 2026-11-16, `server/sql/2026-11-16_service_review.sql`):

* New services (registration or the business catalog) start `PENDING`.
* Clients only ever see `APPROVED` services: public listings, shop pages, the
  request screen, AI suggestions, derived delivery methods and request
  creation all filter on it. Keep that filter on any new client-facing query.
* A shop editing name, category or description, or editing a `REJECTED`
  service, sends it back to `PENDING`. Price, turnaround and service methods
  change without review.
* Services already on a repair request stay on it whatever their status.
* Repair requests also require `shops.is_verified = 1`.

### shop_service_types

```text
id
shop_id      FK -> shops.id
Is_onsite    tinyint(1) NOT NULL   (capital "I")
is_dropoff   tinyint(1) NOT NULL
is_pickup    tinyint(1) NOT NULL
created_at, updated_at   datetime NOT NULL
```

An explicit per-shop delivery setting. It overlaps with, and can disagree
with, the `accepts_*` columns on `shop_services` (shop 4's row says on-site +
drop-off while its services say pickup).

Resolve a shop's delivery methods with `server/utils/shopDeliveryTypes.js`:
an explicit row wins; otherwise a method is accepted when any of the shop's
services accepts it. Business registration writes one row per new shop
(since 2026-11-24), from the delivery methods chosen in the form.

### shop_payouts

```text
id
shop_id          FK -> shops.id
method           enum('CARD','GCASH','MAYA','BANK') NOT NULL   (BANK added 2026-11-16; only GCASH offered since 2026-11-24)
bank_name        varchar(100) NULL   (when method = 'BANK'; added 2026-11-24)
account_name     varchar(100) NOT NULL
account_number   varchar(50) NOT NULL
tin              varchar(20) NULL
status           enum('VERIFIED','PENDING','FAILED') NOT NULL
```

Written by business registration (one row per new shop, status `PENDING`)
since 2026-11-16. Shops registered before then have no row. The app offers
GCASH, MAYA and BANK; CARD exists only for older data. Nothing verifies or
pays out to these accounts yet.

### shop_employees

```text
id
shop_id      FK -> shops.id
user_id      NULL  FK -> users.id  UNIQUE   (the member's own account once they accept; added 2026-11-28)
first_name   varchar(100) NOT NULL
last_name    varchar(100) NOT NULL
role         varchar(100) NOT NULL
phone        varchar(20) NULL
email        varchar(150) NULL
invite_email varchar(100) NULL   (open invite, lowercase; added 2026-11-28)
invited_at, joined_at   datetime NULL   (added 2026-11-28)
is_active    tinyint(1) NOT NULL DEFAULT 1
created_at   datetime NOT NULL DEFAULT current_timestamp()
updated_at   datetime NULL
```

There is no `employees` table. Use `shop_employees`. Applied by
`server/sql/2026-11-27_shop_members.sql` (see section 20 "Shop members").

---

## Chat and AI

### chats

```text
id
request_id        NULL   FK -> service_requests.id   (NULL = the General chat; set = that repair's chat)
client_id         FK -> users.id
shop_id           FK -> shops.id
handler_employee_id   NULL FK -> shop_employees.id   (who the owner handed it to; NULL = the owner; added 2026-11-28)
transferred_at    datetime NULL   (added 2026-11-28)
started_at        datetime NOT NULL
last_message_at   datetime NOT NULL
is_active         tinyint(1) NOT NULL
```

### chat_messages

```text
id
chat_id          FK -> chats.id
sender_id        int NOT NULL   No FK
sender_kind      enum('CLIENT','OWNER','STAFF','SYSTEM') NULL   (NULL on older messages; added 2026-11-28)
sender_label     varchar(150) NULL   ("Juan · Technician"; added 2026-11-28)
message_text     text NOT NULL
card             longtext NULL   (JSON repair card on a SYSTEM message; added 2026-11-28, section 25)
attachment_url   text NULL
is_read          tinyint(1) NOT NULL
timestamp        datetime NOT NULL
```

There is no `messages` table.

### ai_conversations

```text
id
user_id          FK -> users.id
issue_category   varchar(100) NOT NULL
ai_confidence    decimal(5,4) NOT NULL
title            varchar(255) DEFAULT 'New Chat'
created_at, updated_at   datetime NOT NULL
```

### ai_messages

```text
id
conversation_id   FK -> ai_conversations.id
message_text      text NOT NULL
sender            enum('user','ai') NOT NULL DEFAULT 'user'
feedback          enum('UP','DOWN') NULL      (thumbs on an assistant reply; added 2026-11-26)
recommendation    longtext NULL               (JSON on a reply that showed shop cards:
                  { shop_ids, shop_names, shop_notes, device_type, issue_category, summary };
                  cards are rebuilt from the live DB when a chat is reopened; added 2026-11-26)
timestamp         datetime NOT NULL
```

The old `'[SYSTEM] Recommended shops'` marker rows were removed by
`server/sql/2026-11-26_ai_assistant.sql`.

### ai_usage

```text
id
user_id             FK -> users.id
conversation_id     int NULL   No FK (kept after the chat is deleted)
model               varchar(50) NOT NULL
prompt_tokens, completion_tokens   int NULL
status              enum('PENDING','OK','FAILED') NOT NULL DEFAULT 'PENDING'
created_at          datetime NOT NULL DEFAULT current_timestamp()
```

One row per assistant message sent to OpenAI (no message text). Used for the
per-user limits and cost tracking. Added 2026-11-26.

---

## Tables that exist but are unused (0 rows, no active code path)

```text
activity_logs              (user_id FK -> users)
auth_sessions              (user_id FK -> users, token, expires_at)
conversation_suggestions   (conversation_id FK -> ai_conversations, reason)
shop_suggestions           (PK shop_id + conversation_suggestion FK -> conversation_suggestions)
discounts                  (shop_id FK -> shops, discount_code, unit, value, count, limit, valid_from, valid_until, is_active)
notifications              (user_id FK -> users, message, is_read)
subscription_plans         (plan_name, description, price, duration_days, customer_limit, features JSON, is_active)
subscriptions              (shop_id FK -> shops, plan_id FK -> subscription_plans, renewal_date)
```

Confirm the intended behavior before building on these.

`attachments`, `shop_documents` and `shop_documents_attachments` are used by
business registration since 2026-11-24 (see "Shop documents" in section 20).
`shop_documents_attachments.attachment_id` holds an `attachments.id` (no FK).

---

## Known schema gaps

* No unique constraint on `request_quotations.request_id` or
  `request_assessments.request_id`. Application code must enforce one of each
  per request.
* No foreign keys on `request_quotation_parts`, `request_quotation_warranties`,
  `service_request_attachments`, `shop_documents_attachments`,
  `request_assessment_attachments`, `devices.user_id`,
  `chat_messages.sender_id`, or `request_status_history.updated_by`.
* Deleting rows does not cascade to these tables. Clean up child rows
  explicitly.
* No triggers, views, or stored routines exist.
