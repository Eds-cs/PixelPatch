// lib/inputLimits.js
// Longest text each kind of field may hold. Used as maxLength on inputs;
// the server checks the same numbers (server/utils/inputLimits.js, keep in
// sync) and answers 400 when a request goes over.

export const LIMITS = {
  personName: 100,
  email: 100,
  phone: 20,
  password: 128,
  addressLine: 200,
  addressLabel: 50,
  postalCode: 10,
  shopName: 100,
  shopDescription: 1000,
  serviceName: 80,
  serviceDescription: 500,
  turnaround: 50,
  customCategory: 60,
  deviceField: 100,
  issueDescription: 1000,
  requestNotes: 1000,
  rejectionReason: 1000,
  assessmentField: 1000,
  partName: 100,
  chatMessage: 1000,
  reviewComment: 1000,
  disputeText: 1000,
  adminNote: 1000,
  suspendReason: 500,
  employeeRole: 100,
  bankName: 100,
  accountNumber: 50,
  tin: 20,
  aiMessage: 2000,
  aiTitle: 50,
  search: 100,
};
