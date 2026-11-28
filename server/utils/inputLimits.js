// server/utils/inputLimits.js
// Longest text each kind of field may hold (2026-11-26 update brief, B2).
// The app uses the same numbers (lib/inputLimits.js, keep in sync) as
// maxLength on its inputs; the server checks them again, because a request
// can come from anywhere.
//
// Numbers follow the brief, adjusted to the database: emails are 100
// because users.email and shops.email are varchar(100).

export const LIMITS = {
  personName: 100,          // first, middle, last name; account holder; employee names
  email: 100,               // users.email / shops.email varchar(100)
  phone: 20,                // phone columns are varchar(20); the app also formats them
  password: 128,
  addressLine: 200,         // street
  addressLabel: 50,         // addresses.label varchar(50)
  postalCode: 10,
  shopName: 100,
  shopDescription: 1000,
  serviceName: 80,
  serviceDescription: 500,
  turnaround: 50,           // shop_services.estimated_timeframe
  customCategory: 60,       // shop_services.custom_category varchar(60)
  deviceField: 100,         // nickname, brand, model, serial and spec values
  issueDescription: 1000,   // service_requests.issue_description
  requestNotes: 1000,
  rejectionReason: 1000,
  assessmentField: 1000,    // condition, observed issues, recommendation
  partName: 100,
  chatMessage: 1000,
  reviewComment: 1000,
  disputeText: 1000,        // complaint, shop response, admin explanation
  warrantyExclusions: 300,  // request_quotation_warranties.exclusions varchar(300)
  warrantyClaim: 1000,      // claim problem, shop's decline reason, admin note
  adminNote: 1000,          // reasons sent to shops or applicants
  suspendReason: 500,       // users.suspended_reason varchar(500)
  employeeRole: 100,
  bankName: 100,
  accountNumber: 50,        // shop_payouts.account_number varchar(50)
  tin: 20,                  // shop_payouts.tin varchar(20)
  aiMessage: 2000,
  aiTitle: 50,
  search: 100,
};

export const tooLongMessage = (label, max) => `${label} can be up to ${max} characters.`;

// Values of `path` in `body`. "parts[].name" reads the name of every item in
// the parts array.
function valuesAt(body, path) {
  const [head, rest] = path.split("[].");
  const value = body?.[head];
  if (rest === undefined) return [value];
  return Array.isArray(value) ? value.map((item) => item?.[rest]) : [];
}

/**
 * The first problem with the text fields in `body`, or null.
 * rules: { field: [label, max] }. Missing (undefined/null) values are skipped
 * (whether a field is required is the handler's job). Numbers and booleans
 * are fine; objects and arrays in a text field are refused.
 */
export function textProblem(body, rules) {
  for (const [field, [label, max]] of Object.entries(rules)) {
    for (const value of valuesAt(body, field)) {
      if (value === undefined || value === null) continue;
      if (typeof value === "object") return { field, message: `${label} must be text.` };
      if (String(value).length > max) return { field, message: tooLongMessage(label, max) };
    }
  }
  return null;
}

/**
 * Express middleware: answers 400 when a text field is too long.
 * The body is { error, message, field, code } so both the app's API client
 * (which reads error or message) and field-highlighting forms work.
 * For multipart routes, put it after the upload middleware so req.body is filled.
 */
export const limitText = (rules) => (req, res, next) => {
  const problem = textProblem(req.body, rules);
  if (!problem) return next();
  return res.status(400).json({ error: problem.message, message: problem.message, field: problem.field, code: "TEXT_TOO_LONG" });
};
