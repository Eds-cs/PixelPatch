// utils/payoutMethods.js
// How a shop receives its payouts. Keep in sync with lib/payoutMethods.js.
//
// Only GCash is offered for now (decided 2026-11-24): PixelPatch may support
// a single wallet at first. Maya and bank transfer are built and validated;
// to offer them, add them to ENABLED_PAYOUT_METHODS here and in the app.
// shop_payouts.method also allows CARD, for older data only.

export const ALL_PAYOUT_METHODS = ["GCASH", "MAYA", "BANK"];
export const ENABLED_PAYOUT_METHODS = ["GCASH"];

// Banks offered when BANK is enabled; "Other" lets the shop type its bank.
export const BANKS = [
  "BDO Unibank", "Bank of the Philippine Islands (BPI)", "Metrobank", "Land Bank of the Philippines",
  "Philippine National Bank (PNB)", "Security Bank", "UnionBank", "RCBC", "China Banking Corporation",
  "EastWest Bank", "PSBank", "Development Bank of the Philippines", "Asia United Bank", "Maybank Philippines",
  "CIMB Bank Philippines", "GoTyme Bank", "Maya Bank", "SeaBank", "Tonik", "Other",
];
