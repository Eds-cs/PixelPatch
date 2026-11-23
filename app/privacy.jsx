// app/privacy.jsx — Privacy Policy. Anyone can read it (see BROWSABLE_SCREENS).
import PolicyPage from "../components/PolicyPage";

const SECTIONS = [
  {
    heading: "What we collect",
    body: [
      "Account details: your name, birthday, email address, mobile number and password (stored only as a secure hash).",
      "Addresses you add in Zamboanga City, the devices you register with their specifications and photos, your repair requests, quotations, payments, reviews, disputes and chat messages.",
      "For repair shops: business name, contact details, address, opening hours, services and payout account.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "To run your account, send verification and password-reset codes, pass your repair request and device details to the shop you choose, process payments and resolve disputes.",
      "Administrators use shop details to review and approve business registrations and services.",
    ],
  },
  {
    heading: "Who we share it with",
    body: [
      "The repair shop handling your request sees the details it needs: your name, contact details, device, problem description and pickup address.",
      "Service providers that help run PixelPatch: Xendit (payments), OpenAI (the AI assistant receives the messages you type to it), Google (if you sign in with Google) and our email provider.",
      "We do not sell your personal information.",
    ],
  },
  {
    heading: "Keeping it safe",
    body: [
      "Connections to PixelPatch are encrypted (HTTPS), passwords are hashed, and only you, the shop on your request and administrators can see your repair details.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can view and update your profile, addresses and devices in the app. To have your account and data deleted, contact PixelPatch through the Help centre.",
      "These rights follow the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).",
    ],
  },
];

export default function Privacy() {
  return (
    <PolicyPage
      title="Privacy Policy"
      updated="November 23, 2026"
      intro="This explains what personal information PixelPatch collects, why, and who it is shared with."
      sections={SECTIONS}
    />
  );
}
