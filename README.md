# PixelPatch

Device-repair marketplace connecting clients with repair shops, plus an
OpenAI-backed troubleshooting assistant.

The app is being migrated from a Vite + React DOM web app to **Expo
(universal)** so one codebase serves **web, iOS, and Android**.

---

## Running it

Two processes: the Expo app and the Express API.

```bash
# 1. API  (needs server/.env — see below)
npm run server            # → http://localhost:5000

# 2. App
npm start                 # dev server, then press w / i / a
npm run web               # web only
npm run android
npm run ios               # macOS only
```

On a physical phone, install **Expo Go** and scan the QR code from `npm start`.

### Checks

```bash
npm run lint              # ESLint (expo config, flat config in eslint.config.js)
npx expo-doctor           # 21 project-health checks — should be 21/21
npx expo install --check  # flags dependencies off the SDK 57 matrix
```

All three are clean as of the last commit. `npm run lint` reports 0 errors;
the remaining warnings are the documented `set-state-in-effect` fetch-on-mount
pattern (see `eslint.config.js` for why they are warnings).

A native build additionally needs the config plugins in `app.json` — notably
`expo-image-picker`, which supplies the iOS photo-permission string. Without it
a production iOS build **crashes** when a user attaches a device photo.

### Environment

Four files, none committed. Copy the templates and fill them in:

```bash
cp .env.example .env               # Expo app  — 4 vars
cp server/.env.example server/.env # Express API — 15 vars
```

| File | Loaded by | Purpose |
| --- | --- | --- |
| `.env` | Expo | app defaults |
| `.env.local` | Expo | machine-specific overrides (wins over `.env`) |
| `server/.env` | `server/loadEnv.js` | API secrets |
| `server/.env.local` | `server/loadEnv.js` | local overrides (wins over `server/.env`) |

`.env.example` and `server/.env.example` **are** committed — they carry every
key with the values stripped, so a new clone knows exactly what to supply.

`npm start` loads these automatically; there is no `--env-file` flag on the
Expo CLI. Precedence, highest first:

```text
.env.development.local  →  .env.local  →  .env.development  →  .env
```

So `.env.local` always wins over `.env` without any extra configuration — put
machine-specific values there and leave `.env` on the shared defaults. Confirm
what loaded from the CLI banner at startup:

```text
env: load .env.local .env
env: export EXPO_PUBLIC_API_URL EXPO_PUBLIC_GOOGLE_...
```

Values are read once at startup and compiled into the bundle, so **restart the
dev server after editing** — hot reload will not pick them up.

> **EXPO_PUBLIC_ values are not secret.** Expo compiles them into the app
> bundle, where anyone can read them out of a shipped build. Only the API base
> URL and Google *client* IDs belong there. Every real credential — database
> password, `JWT_SECRET`, OpenAI and Xendit keys — lives in `server/.env` and
> must never be copied into the app's `.env`.

---

## Layout

```text
/
├─ app/              expo-router routes (file path = URL)
│   ├─ (auth)/       login, signup
│   ├─ (tabs)/       client: home, services, repairs, chat, profile
│   ├─ business/     shop portal (drawer nav) — /business/*
│   ├─ chat/[id]     live conversation
│   ├─ repair/[id]   repair detail, payment, review
│   ├─ request/[shopId]  create a repair request
│   ├─ shop/[id]     shop detail
│   ├─ service/[serviceKey]
│   ├─ devices, addresses, assistant
│   ├─ become-partner    shop onboarding wizard
│   └─ payment-success | payment-failed
├─ components/       shared RN UI (Button, TextField, Modal, Screen, AsyncList)
├─ lib/              api, auth, socket, shop, payments, upload, useFetch, storage
├─ constants/        theme
├─ server/           Express + MySQL + Socket.IO API  (unchanged)
└─ legacy-web/       the old Vite app — migration reference, delete when done
```

`legacy-web/` still runs (`cd legacy-web && npm install && npm run dev`) and is
excluded from Metro via `metro.config.js`.

---

## Payments (Xendit)

The shop generates a checkout link, the client pays it, and the **webhook**
confirms it. The browser redirect is cosmetic — `lib/payments.js` never treats
landing on a success URL as proof of payment.

1. Shop opens the repair and taps **Generate payment link**
   (`POST /api/business/repairs/:id/payments/generate-link`).
2. Client opens the repair and taps **Pay now**.
   - **Web** — same-tab redirect, so Xendit returns to `/payment-success`
     or `/payment-failed`.
   - **iOS / Android** — an in-app browser (`expo-web-browser`). It closes on
     redirect or when the user dismisses it.
3. Either way the app then polls `GET /api/client/repairs/:id` until
   `payment.status` is terminal (`PAID` / `SETTLED` / `EXPIRED` / `FAILED`),
   because `xenditWebhookController` is what actually flips it. If the webhook
   is still in flight, the client is told it's processing rather than shown a
   false result.

Keep `XENDIT_SUCCESS_URL` / `XENDIT_FAILURE_URL` pointed at the **web** URLs
(`https://<your-host>/payment-success`). Native does not need them changed —
polling covers it. If you ever point them at the app scheme
(`pixelpatch://payment-success`) the native session returns instantly, but the
web flow loses its landing page.

---

## Google Sign-In

Optional. The **Continue with Google** button on the login screen only renders
when a client ID is configured for the running platform, so an unconfigured
build simply shows email/password.

Google issues a **separate OAuth client ID per platform**, and an ID token's
`aud` claim is whichever client requested it. `googleLogin` originally verified
against a single `GOOGLE_CLIENT_ID`, which would reject every token from the
iOS and Android apps. It now verifies against `GOOGLE_CLIENT_IDS` — a
comma-separated allow-list — falling back to `GOOGLE_CLIENT_ID` when unset, so
existing web-only setups behave exactly as before. Verification is still
strict; the list only tells the server which of *this project's* clients count.

To enable it:

1. Create Web, iOS and Android OAuth client IDs in the Google Cloud console.
2. Put them in the app's `.env` as the three `EXPO_PUBLIC_GOOGLE_*` values.
3. Put the same IDs, comma-separated, in `server/.env` as `GOOGLE_CLIENT_IDS`.

The iOS and Android clients must be registered against the `pixelpatch` scheme
and the `com.pixelpatch.app` bundle/package declared in `app.json`.

---

## Date and time input

`components/DateField.jsx` wraps
[`react-native-ui-datepicker`](https://www.npmjs.com/package/react-native-ui-datepicker)
(MIT). It is pure JavaScript — its only dependencies are dayjs, clsx and
lodash — so there is no native module and no config plugin, and the same
calendar renders on web, iOS and Android and still works in Expo Go.

`@react-native-community/datetimepicker` was the obvious alternative but has no
usable web target, which would have split the platforms.

Use `mode="date"` (returns `YYYY-MM-DD`) or `mode="time"` (returns `HH:mm`).
Both parse and format in **local** time, so a selected day never shifts across
the UTC boundary.

---

## Migration status

Styling uses **NativeWind**, so Tailwind class strings port across largely
unchanged (`className="flex-1 bg-gray-50"` works on all three platforms).

**Done**

- Expo SDK 57 + expo-router, building for web / iOS / Android
- Auth: login, signup, token persistence, route guard
- Cross-platform token storage (SecureStore on native, localStorage on web)
- Home, Services, Service detail, Repairs, Repair detail, Chat list, Chat room, Profile
- Socket.IO wired to the existing `join` / `send_message` / `new_message` events
- **Business portal** at `/business/*` — dashboard (stats, revenue, status
  breakdown), repairs queue, repair detail carrying the full
  accept/reject → assessment → quotation → assign → start → complete flow,
  disputes list + propose-resolution, employees (list, add, assign to a repair),
  services, reviews, shop profile
- Role-aware landing: `role_id === 3` goes to `/business/dashboard`, regular users to `/assistant`
- The legacy fixed `w-64` sidebar is now a drawer — permanent sidebar at
  1024px and wider, slide-over below
- Xendit payments end to end — see [Payments](#payments-xendit) above
- Repair request creation (`/request/:shopId`) — device, services, delivery
  method, address, issue, preferred date and photo attachments, submitted as
  multipart
- Device management (`/devices`) and addresses (`/addresses`), both with photo
  upload where the API accepts one
- Shop detail (`/shop/:id`) linked from Home, Services and the AI assistant
- AI assistant (`/assistant`) with conversation history
- Client review submission on a completed repair
- Shop onboarding (`/become-partner`) — the 4-step wizard replacing
  `BusinessSignUpPg1..Pg4`
- Universal date/time pickers — see [Date and time input](#date-and-time-input)
- Google Sign-In — see [Google Sign-In](#google-sign-in)
- Settings, Help centre and About

The migration is functionally complete: every legacy screen backed by a real
API has been ported.

**Deliberately not ported**

- **Discounts and vouchers.** `BusinessDiscounts`, `CustomDiscount`,
  `Shop/Discounts` and `Shop/CreateVoucher` contain **zero API calls**, and the
  server has no discount or voucher endpoint. They are unwired mockups, so
  porting them would produce a form that silently discards input. This needs a
  backend first.
- **Careers, Terms, Privacy.** Present in `constants/routes.js` but never built
  — no component ever existed for them.

The legacy `Settings`, `Help` and `About` pages were single "coming soon"
lines, so the ported versions were written fresh against what the app actually
does rather than copied.

### Business onboarding role behavior

`registerBusiness` promotes the owner to `role_id = 3` inside the same database
transaction as the shop and service inserts. Shop ownership is still resolved
from `GET /api/my-shop` for authorization and profile display.

### Porting a screen

1. Open the original in `legacy-web/src/components/`.
2. Swap tags: `div`→`View`, `p`/`span`/`h1`→`Text`, `button`→`Pressable`,
   `input`→`TextInput`, `img`→`Image`.
3. Keep the `className` strings — NativeWind handles them.
4. Replace `axios`/`fetch` with `api` from `lib/api.js` (base URL + auth header
   are already applied).
5. Replace `useNavigate`/`Link` from react-router with `useRouter`/`Link` from
   `expo-router`.

Layout notes: RN has no CSS grid, and flex direction defaults to `column`
(not `row`) — add `flex-row` where the web version relied on the browser default.


