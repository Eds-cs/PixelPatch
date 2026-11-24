// lib/payoutMethods.js
// Keep in sync with server/utils/payoutMethods.js.
//
// Only GCash is offered for now. Maya and bank transfer are built: to offer
// them, add them to ENABLED_PAYOUT_METHODS here and on the server.

export const ENABLED_PAYOUT_METHODS = ["GCASH"];

export const PAYOUT_LABELS = { GCASH: "GCash", MAYA: "Maya", BANK: "Bank transfer" };

export const BANKS = [
  "BDO Unibank", "Bank of the Philippine Islands (BPI)", "Metrobank", "Land Bank of the Philippines",
  "Philippine National Bank (PNB)", "Security Bank", "UnionBank", "RCBC", "China Banking Corporation",
  "EastWest Bank", "PSBank", "Development Bank of the Philippines", "Asia United Bank", "Maybank Philippines",
  "CIMB Bank Philippines", "GoTyme Bank", "Maya Bank", "SeaBank", "Tonik", "Other",
];
