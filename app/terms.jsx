// app/terms.jsx — Terms of Service. Anyone can read it (see BROWSABLE_SCREENS).
import PolicyPage from "../components/PolicyPage";

const SECTIONS = [
  {
    heading: "What PixelPatch is",
    body: [
      "PixelPatch connects people in Zamboanga City with independent gadget repair shops. The shops, not PixelPatch, carry out the repairs and are responsible for their work.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "You must give accurate details when you sign up, including a valid email address and Philippine mobile number, and keep your password private. You are responsible for what happens under your account.",
      "PixelPatch currently serves Zamboanga City only. You need an address there, where you live or are staying, to request repairs.",
    ],
  },
  {
    heading: "Repair requests",
    body: [
      "A shop may accept or reject a request. Accepted requests are assessed, then quoted. Work only starts after you approve the quotation and pay. You may cancel before approving the quotation.",
      "Describe your device and its problem honestly. Back up your data before handing over a device; shops are not responsible for data loss.",
    ],
  },
  {
    heading: "Payments",
    body: [
      "Payments are processed by Xendit. A payment counts only once Xendit confirms it to PixelPatch, not when your browser returns from the payment page.",
    ],
  },
  {
    heading: "Business partners",
    body: [
      "Shops that register must give true business, location and payout details. Every shop and every service is reviewed by a PixelPatch administrator before clients can see it, and an application may be rejected.",
      "Shops must honour their published prices, quotations and warranties, and treat clients' devices and data with care.",
    ],
  },
  {
    heading: "Reviews, chats and disputes",
    body: [
      "Keep messages and reviews honest and respectful. If a completed repair goes wrong, open a dispute so the shop can propose a refund or re-service.",
      "To protect you, phone numbers, email addresses, links and social media accounts are hidden in chats with shops, and shops' own phone numbers and emails aren't shown. Keep the conversation and the payment on PixelPatch: payments made outside it aren't covered by disputes or refunds.",
    ],
  },
  {
    heading: "AI assistant",
    body: [
      "The AI assistant gives general troubleshooting suggestions. It can be wrong. Follow its advice at your own risk, and ask a repair shop when unsure.",
      "It only helps with phone, tablet, laptop and desktop problems, and only recommends verified PixelPatch shops. Each account can send up to 20 messages every 10 minutes and 100 a day.",
    ],
  },
  {
    heading: "Ending your account",
    body: [
      "We may suspend accounts or shops that break these terms, give false information, or misuse the platform.",
    ],
  },
];

export default function Terms() {
  return (
    <PolicyPage
      title="Terms of Service"
      updated="November 27, 2026"
      intro="These terms apply to everyone who uses PixelPatch, as a client or as a repair shop. By creating an account or registering a business you agree to them."
      sections={SECTIONS}
    />
  );
}
