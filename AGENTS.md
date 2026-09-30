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
/upload/photo
```

Photo uploads.

```text
/webhooks/xendit
```

Xendit payment callbacks.

Always inspect the mounted router before assuming the full endpoint path from a filename.

---

# 12. Database

PixelPatch uses MySQL through:

```text
mysql2
```

The current database configuration uses a MySQL connection rather than a connection pool.

Controllers currently use a mixture of:

* callbacks
* `db.promise().query`
* promise wrappers

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
messages
```

Additional related tables may exist.

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

* approve the quotation
* cancel the repair

The repair must not proceed directly from quotation creation to active repair without the required client action.

---

## Step 6 — Client pays

After client approval, payment is performed through the Xendit payment flow.

Payment information is stored in the relevant payment tables.

A browser/application redirect from Xendit does NOT prove payment was successful.

Payment status must come from verified backend/payment information.

---

## Step 7 — Business assigns employee

After the required approval/payment stages are satisfied, the business may assign an employee to the repair.

Employee assignment belongs to the business repair workflow.

Do not treat employee assignment as client-controlled behavior.

---

## Step 8 — Business starts repair

When repair work begins:

```text
status = 'IN_PROGRESS'
```

Do not begin repair work before the required earlier workflow stages.

---

## Step 9 — Business completes repair

When the repair is finished:

```text
status = 'COMPLETED'
```

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

---

## `client_approved`

Expected behavior:

```text
NULL
```

means the client has not yet approved.

```text
1
```

means the client approved.

Inspect existing database/controller behavior before assuming other representations.

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
* start repair before required approval/payment
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
mapping in frontend and backend authorization checks. Before changing it,
inspect the live `user_roles` and `users` tables and confirm the affected
ownership and authorization behavior.

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

The webhook currently updates payment records.

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

---

# 26. AI troubleshooting

The AI troubleshooting backend uses the OpenAI API.

Current implementation uses stored conversation history.

Known implementation uses approximately:

```text
gpt-4o
```

The assistant can also perform shop recommendations using application logic and SQL.

Do not assume the existing implementation uses:

* vector databases
* embeddings
* tool calling
* RAG infrastructure

unless actual current code shows otherwise.

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

Some multi-step database operations use one MySQL connection and have incomplete transaction safety.

Do not assume all existing multi-write operations are atomic.

When modifying transaction-sensitive functionality, inspect:

```text
BEGIN
COMMIT
ROLLBACK
```

behavior carefully.

---

## AI transactions

Some AI controller logic may hold a transaction while performing an external OpenAI request.

This is potentially unsafe.

Do not copy this approach into new code.

---

## Payment creation

Payment records may currently be inserted before successful external Xendit invoice creation.

This can cause failed invoice attempts to leave existing rows.

Inspect this behavior before modifying retry logic.

---

## Upload controller

Some upload/backend code may incorrectly reference:

```text
import.meta.env.VITE_API_URL
```

Node backend code must not depend on Vite's `import.meta.env`.

Use server environment variables through Node's environment configuration instead.

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

This section contains database structure that has been previously confirmed or observed in PixelPatch.

Treat this as a working schema reference, not a substitute for inspecting the actual MySQL database.

Before changing schema-dependent code, verify the live/current database with `DESCRIBE`, `SHOW CREATE TABLE`, or equivalent queries.

---

## Database

Primary database:

```text
pixelpatchdb
```

Database engine currently used locally:

```text
MySQL / MariaDB
```

Backend access uses:

```text
mysql2
```

---

# 1. users

Known fields include:

```text
id
role_id
first_name
middle_name
last_name
email
phone
password_hash
photo_url
created_at
```

Exact nullable/default constraints should be verified in the current database.

Known relationship:

```text
users.role_id -> user_roles.id
```

Role mapping has historically been inconsistent in the codebase.

Do not assume role IDs from frontend constants alone.

---

# 2. user_roles

Known purpose:

Stores application role definitions.

Typical relationship:

```text
user_roles.id
    ↓
users.role_id
```

IMPORTANT:

The current mapping must be verified from the database.

Previously observed code has conflicting assumptions involving role IDs `1`, `2`, and `3`.

Do not normalize or rewrite role IDs until checking:

```sql
SELECT * FROM user_roles;
```

and:

```sql
SELECT id, email, role_id
FROM users
ORDER BY role_id, id;
```

---

# 3. shops

Known fields include:

```text
id
user_id
name
description
address_id
phone
email
open_time
closing_time
days_from
days_to
is_verified
rating_average
```

Known relationship:

```text
shops.user_id -> users.id
```

Shop ownership is based on `user_id`.

Verification state:

```text
is_verified = 0
```

means pending.

```text
is_verified = 1
```

means approved/verified.

The intended business-registration behavior is:

* new shop is created with `is_verified = 0`
* admin approval changes it to verified
* rejected shops may be deleted

Do not assume business authorization solely from `shops.user_id`; also inspect the applicable role and ownership checks.

---

# 4. addresses

Known purpose:

Stores user/shop/request address information.

Known relationship:

```text
service_requests.pickup_address_id -> addresses.id
```

Shops may also reference an address through:

```text
shops.address_id
```

Exact columns should be verified before schema changes.

---

# 5. devices

Known purpose:

Stores client devices.

Known relationship:

```text
service_requests.device_id -> devices.id
```

Exact device columns should be inspected in the current database.

---

# 6. shop_services

Known fields include:

```text
id
shop_id
name
base_price
timeframe
category
accepts_pickup
accepts_onsite
accepts_dropoff
```

Known relationship:

```text
shop_services.shop_id -> shops.id
```

Known category values previously used include:

```text
SMARTPHONE
DESKTOP
CONTROLLER
TABLET
SMARTWATCH
LAPTOP
OTHER
```

Do not change enum values without checking the live schema.

---

# 7. service_requests

This is the primary repair-request table.

Known fields include:

```text
id
client_id
shop_id
device_id
issue_description
delivery_method
pickup_address_id
preferred_date
notes
rejection_reason
client_approved
payment_status
is_received
received_at
received_method
estimated_price
status
decision
completed_at
created_at
updated_at
```

Some current versions may not contain every historical field listed above.

Verify before relying on a field.

Known relationships:

```text
service_requests.client_id -> users.id
service_requests.shop_id -> shops.id
service_requests.device_id -> devices.id
service_requests.pickup_address_id -> addresses.id
```

Known workflow-related values:

### decision

```text
PENDING
ACCEPTED
REJECTED
```

### status

Known values include:

```text
PENDING
REVIEW
IN_PROGRESS
COMPLETED
```

### payment_status

```text
PENDING
PAID
FAILED
```

### client_approved

Expected meaning:

```text
NULL = client has not decided
1    = client approved
```

Do not collapse these fields into one unified state.

---

# 8. service_request_items

Known fields:

```text
id
request_id
service_id
```

Known relationships:

```text
service_request_items.request_id -> service_requests.id
service_request_items.service_id -> shop_services.id
```

Previously observed behavior indicated request items are deleted when their repair request is deleted.

Verify the actual foreign-key action in the current database.

---

# 9. service_request_attachments

Known purpose:

Stores uploaded files/images attached to repair requests.

Known relationship:

```text
service_request_attachments.request_id -> service_requests.id
```

Exact columns should be inspected before changes.

---

# 10. request_status_history

Known purpose:

Stores repair/request status history.

Exact columns and constraints were not fully confirmed.

Do not invent history fields without inspecting the current table.

---

# 11. request_assessments

Known purpose:

Stores the business assessment performed after accepting a repair request.

Known fields previously used include:

```text
id
request_id
device_condition
observed_issues
recommendation
is_remote
```

Assessment must exist before quotation creation according to the intended PixelPatch repair workflow.

Known relationship:

```text
request_assessments.request_id -> service_requests.id
```

Verify actual constraints before schema changes.

---

# 12. request_quotations

Known fields include:

```text
id
request_id
assessment_id
labor_fee
estimated_cost
status
estimated_completion_time
is_parts_needed
warranty_value
warranty_unit
```

Not every field above was confirmed in every project version.

Previously confirmed fields include:

```text
id
request_id
assessment_id
labor_fee
estimated_cost
status
```

Known relationships:

```text
request_quotations.request_id -> service_requests.id
request_quotations.assessment_id -> request_assessments.id
```

Intended PixelPatch behavior:

* one quotation per repair request
* quotation is created after assessment
* estimated repair cost should be based on selected service prices plus quotation-part costs
* labor fee is not intended to be part of the final computed total in the current business rule

IMPORTANT:

The database was not previously confirmed to contain a unique constraint enforcing one quotation per request.

Do not assume that uniqueness is enforced at database level without checking.

---

# 13. request_quotation_parts

Known fields include:

```text
id
request_quotation_id
name
cost
```

Previously confirmed relationship intent:

```text
request_quotation_parts.request_quotation_id -> request_quotations.id
```

A foreign-key constraint was not previously confirmed.

Verify with:

```sql
SHOW CREATE TABLE request_quotation_parts;
```

before relying on cascade or constraint behavior.

---

# 14. payments

Known fields include:

```text
id
request_id
client_id
shop_id
amount
paid_at
payment_link
gateway
status
```

Known gateway:

```text
XENDIT
```

Known status values:

```text
PENDING
PAID
FAILED
```

Known relationship:

```text
payments.request_id -> service_requests.id
```

Payment status may also be reflected on `service_requests.payment_status`.

Do not assume those two values are always synchronized without checking the controller/webhook logic.

---

# 15. payment_details

Known purpose:

Stores additional payment information related to payment processing.

Exact columns were not fully confirmed.

Inspect the live database before modifying it.

---

# 16. shop_employees

Known fields include:

```text
id
shop_id
first_name
last_name
role
phone
email
is_active
created_at
updated_at
```

Known relationship:

```text
shop_employees.shop_id -> shops.id
```

This replaced or superseded older references to an `employees` table in some parts of the project.

Prefer the currently implemented `shop_employees` table unless the live database proves otherwise.

---

# 17. request_assignments

Known fields include:

```text
request_id
employee_id
assigned_by
assigned_at
```

Known relationships:

```text
request_assignments.request_id -> service_requests.id
request_assignments.employee_id -> shop_employees.id
request_assignments.assigned_by -> users.id
```

Known intended rule:

```text
one assignment per repair request
```

Previously, `request_id` was intended to be unique.

Verify the actual unique constraint in the current database before relying on it.

---

# 18. reviews

Known fields/relationships include:

```text
request_id
client_id
shop_id
```

Known relationships:

```text
reviews.request_id -> service_requests.id
reviews.client_id -> users.id
reviews.shop_id -> shops.id
```

Reviews are intended for completed repair transactions.

`shops.rating_average` may store or cache aggregate rating information.

---

# 19. disputes

Known purpose:

Stores repair disputes.

Known relationships include:

```text
request_id
client_id
shop_id
```

Intended dispute behavior previously discussed includes:

* disputes happen after completion
* client provides an explanation
* shop can propose a resolution
