// lib/policies/business.js
// Business Terms of Service and Business Privacy Policy, shown in a pop-up on
// the shop registration form (components/PolicyModal.jsx). They follow the
// business rules and payment terms in AGENTS.md (section 20); update both
// when those rules change, and change UPDATED.
//
// This text was drafted for the project and has not been reviewed by a
// lawyer. Have it checked before launch.

const UPDATED = "28 November 2026";

export const BUSINESS_TERMS = {
  title: "Business Terms of Service",
  updated: UPDATED,
  intro:
    "These terms apply to repair shops that list on PixelPatch, and to the people who manage them. They are in addition to the general PixelPatch Terms of Service. By registering your shop you agree to both.",
  sections: [
    {
      heading: "Who can list a shop",
      body: [
        "Your shop must be a legitimate business located in Zamboanga City, the only area PixelPatch currently serves.",
        "You register from your PixelPatch account. The details you give, including your shop's name, address, contact details, TIN and payout account, must be true and kept up to date.",
      ],
    },
    {
      heading: "Verification",
      body: [
        "Only shops verified by a PixelPatch administrator can operate on the platform. You must upload proof of a legitimate business: your business (Mayor's) permit is required, and a DTI or SEC registration and BIR certificate of registration help us review faster.",
        "We may reject an application, and we tell you why so you can fix it and apply again. We may ask for more documents, and we may suspend a shop whose documents turn out to be false, expired or not its own.",
      ],
    },
    {
      heading: "Subscription",
      body: [
        "To be listed and to receive repair requests, your shop must keep an active monthly or yearly subscription. PixelPatch sets the plan prices and will show them to you before you are charged.",
        "If your subscription lapses, your shop is hidden from clients and can't accept new requests, but you must still finish the repairs already in progress.",
        "PixelPatch does not take a commission on your repairs.",
      ],
    },
    {
      heading: "Services and prices",
      body: [
        "Every service you add, rename or re-describe is reviewed by an administrator before clients can see it. List only services your shop actually provides, with honest prices and turnaround times.",
      ],
    },
    {
      heading: "Quotations and warranties",
      body: [
        "Each repair request gets one quotation, sent from your shop's main account. It must list the services, parts, any possible additional costs, the estimated completion date and any warranty you offer. You set your own warranty terms and must honour them.",
        "Once the client approves a quotation, its price, parts, warranty and payment terms are fixed. You can't change them afterwards.",
      ],
    },
    {
      heading: "Payments",
      body: [
        "Clients can always pay online through PixelPatch's payment provider. For each quotation you choose how much must be paid online as a deposit before work starts, and whether the balance may be paid in cash.",
        "Online payments are held by PixelPatch and released to your payout account in full, less payment processing fees, 7 days after the repair is completed if no dispute has been opened. If a dispute is opened, the money is held until it is resolved.",
        "When a client pays you in cash, you (or the staff member assigned to the repair) must confirm it in the app. Never record cash you haven't received.",
        "Don't ask clients to pay outside the terms shown on their quotation.",
      ],
    },
    {
      heading: "Disputes and backjobs",
      body: [
        "If a client opens a dispute about a repair, you must respond within 2 days. If you don't, the dispute goes to a PixelPatch administrator, who decides it.",
        "Resolutions can include repairing the device again (a backjob) or a refund. Online payments still held by PixelPatch may be refunded to the client. For cash payments, you are responsible for any refund agreed or decided.",
      ],
    },
    {
      heading: "Staff and technicians",
      body: [
        "You may invite staff and technicians to join your shop with their own PixelPatch account (an account can work at one shop). Members only see the repairs assigned to them, and can start and complete those repairs and confirm payments for them. Only your main account can send quotations, assign repairs, and manage your services, members, payouts and disputes.",
        "You can hand a repair's chat to the member assigned to that repair. Clients see who they're talking to, by first name and role. While a chat is handed over you can read it but not reply until you take it back. Reassigning the repair, or removing the member, returns the chat to you.",
        "When you remove a member's access, they can no longer sign in to your shop and their chats return to you. Their unfinished repairs stay under their name so you can finish them, and their past repairs stay on your shop's record. PixelPatch does not vet members: your shop is responsible for what they do.",
      ],
    },
    {
      heading: "Clients' devices and data",
      body: [
        "Treat clients' devices with care, and use the personal information you receive through PixelPatch (names, contact details, addresses, device details) only to carry out the repair they asked for. Don't copy, sell or share it, and don't look through the data on their devices. See the Business Privacy Policy.",
      ],
    },
    {
      heading: "Talking to clients",
      body: [
        "Talk to clients through PixelPatch chat. Your shop's phone number and email are not shown to clients, and phone numbers, email addresses, links and social media accounts are hidden automatically in chat messages and in your shop description.",
        "For pickup and on-site repairs you can see the client's phone number from when you accept the request until 3 days after the repair is completed, so you can call to arrange the pickup, visit or return. Use it only for that repair.",
        "Don't ask clients for their contact details, or to talk, book or pay outside PixelPatch. Payments made outside PixelPatch aren't protected by disputes or refunds.",
      ],
    },
    {
      heading: "Conduct, suspension and closing",
      body: [
        "Don't mislead clients, post false reviews, take requests you can't handle, or move clients off PixelPatch to avoid its protections.",
        "PixelPatch may warn, suspend or remove a shop that breaks these terms, repeatedly loses disputes, or puts clients at risk. You may close your shop at any time after finishing your open repairs and resolving any disputes.",
      ],
    },
    {
      heading: "Changes",
      body: [
        "We may update these terms. We will tell you about important changes before they apply, and the date at the top shows the latest version.",
      ],
    },
  ],
};

export const BUSINESS_PRIVACY = {
  title: "Business Privacy Policy",
  updated: UPDATED,
  intro:
    "This explains what PixelPatch collects about your shop and the people who run it, why, and how it's protected, under the Data Privacy Act of 2012 (Republic Act No. 10173). It also explains your duties for the client data you handle. The general PixelPatch Privacy Policy covers your personal account.",
  sections: [
    {
      heading: "What we collect",
      body: [
        "Your shop's name, description, address, business email and phone number, opening hours, services and prices, and payment options.",
        "Your business documents: business permit, and DTI/SEC and BIR registration if you upload them.",
        "Your payout details: payout method, account name and number, and TIN.",
        "Your shop's activity on PixelPatch: repair requests, quotations, payments, chats, reviews and disputes.",
      ],
    },
    {
      heading: "Why we use it",
      body: [
        "To verify that your shop is a legitimate business, list it for clients, run repair requests, send your payouts, handle disputes, keep the platform safe, and meet legal and tax obligations.",
        "We send a code to your business email to confirm that it works and that you control it.",
      ],
    },
    {
      heading: "Who can see it",
      body: [
        "Clients see your public shop details: name, description, address, hours, services, prices, payment options, ratings and reviews. Your business phone number and email are not shown to clients; PixelPatch uses them to contact you.",
        "Chat messages between you and clients are checked automatically, and phone numbers, email addresses, links and social media accounts are hidden before they are saved.",
        "Your documents, TIN and payout account are only seen by PixelPatch administrators. Documents are stored privately and opened only through short-lived links.",
        "We share payment details with our payment provider to process payments and payouts, and information with authorities only when the law requires it. We don't sell your data.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "If your application is rejected, we delete the shop, its documents and its payout details. If it's approved, we keep your information while your shop is on PixelPatch, and records of repairs and payments for as long as the law requires afterwards.",
      ],
    },
    {
      heading: "Your clients' data",
      body: [
        "When you accept a repair, you receive the client's name, device details and, for pickup and on-site repairs, their address. For pickup and on-site repairs you also see their phone number until 3 days after the repair is completed. You never see their email. Use these details only for that repair, keep them secure, and don't keep them longer than you need to.",
        "A member of your staff sees the same details for the repairs assigned to them, and the repair chats you hand them. Make sure they follow these rules too.",
        "Devices may hold personal files, photos and accounts. Don't open, copy or share them unless the repair needs it and the client agrees.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        "You can ask to see, correct or delete your information, or object to how we use it, subject to what we must keep by law. Contact us through Help in the app.",
      ],
    },
    {
      heading: "Changes",
      body: [
        "We may update this policy and will tell you about important changes. The date at the top shows the latest version.",
      ],
    },
  ],
};
