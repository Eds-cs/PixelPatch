# Session Notes

## Changes in this push

- Scoped business repair routes, employee operations, technician assignment, and repair detail queries to the authenticated business owner's shop.
- Added pre-quotation service additions with server-side shop ownership and workflow validation.
- Made repair actions reflect the database's uppercase states; added technician assignment/reassignment and completion-date recovery for older quotations.
- Shared customer/business assessment and quotation presentation, including service/parts breakdown, total, and warranty.
- Added pickup/device-received state to both repair views and formatted displayed dates for people.
- Required a valid estimated completion date when creating or updating quotations, before client approval, and before payment-link generation.
- Strengthened Xendit callback verification against the invoice, external reference, status, amount, and local payment; mapped e-wallet channel data such as GCASH correctly.

## Validation

- Expo web export completed successfully.
- Node syntax checks and workspace diagnostics passed.
- ESLint reports the existing fetch-on-mount warning in the business repair detail screen.
- Live Xendit callback delivery and settlement were not exercised end-to-end.

## Local-only configuration

`server/.env` redirect URLs were changed to the local Expo web routes on port `8081`. Environment files are ignored by Git and are not included in this push. Xendit dashboard webhook and IP-allowlist settings are also external to the repository.

The untracked `server/server.js.save` backup is intentionally excluded.