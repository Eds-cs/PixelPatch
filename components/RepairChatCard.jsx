// components/RepairChatCard.jsx
// Repair cards in chat (server/utils/repairCards.js), drawn instead of a
// plain SYSTEM line, like an online shop's order and delivery updates:
//   REPAIR_CONFIRMED  the shop accepted the request
//   REPAIR_UPDATE     QUOTE_SENT, PAYMENT_RECEIVED, REPAIR_STARTED, REPAIR_COMPLETED
// Worded for whoever is reading (client, owner or staff). The button opens
// the repair for that reader.
import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { mediaUrl } from "../lib/api";
import { typeIcon } from "../lib/deviceSpecs";
import { calendarDate } from "./RepairSummary";
import { chatTimestamp } from "../lib/chat";
import { COLORS } from "../constants/theme";

const DELIVERY = {
  PICKUP: ["Pickup", "The shop collects your device"],
  DROPOFF: ["Drop-off", "Bring your device to the shop"],
  ONSITE: ["On-site", "A technician visits you"],
};
const REPAIR_ROUTE = { CLIENT: "/repair/", OWNER: "/business/repairs/", STAFF: "/staff/repairs/" };
const PART = { FULL: "Full payment", DEPOSIT: "Deposit", BALANCE: "Balance" };

const peso = (value) =>
  "₱" + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const initials = (name) =>
  String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "PP";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <View className="flex-row gap-3 py-1.5">
      <Text className="w-28 text-sm text-gray-500">{label}</Text>
      <Text selectable className="flex-1 text-right text-sm text-gray-900">{value}</Text>
    </View>
  );
}

function DeviceRow({ device, subtitle }) {
  const name = [device?.brand, device?.model].filter(Boolean).join(" ") || device?.name || "Device";
  const photo = device?.photo_url ? mediaUrl(device.photo_url) : null;
  return (
    <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-gray-50 p-3">
      {photo ? (
        <Image source={{ uri: photo }} className="h-14 w-14 rounded-lg bg-gray-100" resizeMode="cover" accessibilityLabel={name} />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-lg bg-teal-50">
          <Ionicons name={typeIcon(device?.type)} size={26} color={COLORS.primary} />
        </View>
      )}
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{name}</Text>
        {subtitle ? <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={2}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/** The bubble every card shares: the shop's initials, a title, then the body. */
function Shell({ card, maxWidth, icon, iconColor, title, label, children, button, primary, onPress }) {
  return (
    <View className="mb-3 flex-row items-start gap-2 self-start" style={{ maxWidth }}>
      <View className="h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white">
        <Text className="text-[11px] font-bold text-gray-700">{initials(card.shop_name)}</Text>
      </View>
      <View
        className="flex-1 rounded-2xl rounded-tl-md bg-white p-4"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
        accessibilityLabel={label}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name={icon} size={20} color={iconColor ?? COLORS.primary} />
          <Text className="flex-1 text-base font-bold text-gray-900">{title}</Text>
        </View>
        {children}
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          className={`mt-4 min-h-11 items-center justify-center rounded-xl ${primary ? "bg-primary active:opacity-90" : "bg-gray-100 active:bg-gray-200"}`}
        >
          <Text className={`text-sm font-semibold ${primary ? "text-white" : "text-gray-900"}`}>{button}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** "Latest update" with its time, like a delivery tracker. */
function Latest({ text, at }) {
  return (
    <View className="mt-3 border-t border-gray-100 pt-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">Latest update</Text>
      <Text className="mt-1 text-sm leading-5 text-gray-700">{text}</Text>
      {chatTimestamp(at) ? (
        <Text className="mt-0.5 text-xs text-gray-400">
          {new Date(chatTimestamp(at)).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
        </Text>
      ) : null}
    </View>
  );
}

function howYouPay(d) {
  if (Number(d.deposit_percent) === 100) return `${peso(d.total)} online before work starts`;
  const later = `${peso(d.balance)} when it's done${d.allow_cash ? ", online or cash" : ", online"}`;
  if (Number(d.deposit_percent) === 0) return `Nothing upfront · ${later}`;
  return `${d.deposit_percent}% deposit ${peso(d.deposit)} now · ${later}`;
}

function Confirmed({ card, client, ...shell }) {
  const [method, methodHint] = DELIVERY[card.delivery_method] ?? [card.delivery_method, null];
  const services = card.services ?? [];
  return (
    <Shell
      {...shell}
      card={card}
      icon="checkmark-circle"
      iconColor={COLORS.success}
      title={card.warranty_of ? "Warranty repair confirmed" : "Repair confirmed"}
      label={`${card.warranty_of ? "Warranty repair" : "Repair"} ${card.request_id} confirmed by ${card.shop_name}`}
      button="View details"
    >
      <Text className="mt-1 text-sm leading-5 text-gray-600">
        {client
          ? `${card.shop_name} accepted your repair request.${card.delivery_method === "DROPOFF" ? " Bring your device on your preferred date." : ""}`
          : "You accepted this repair request. Next: assess the device and send the quotation."}
      </Text>
      <DeviceRow
        device={card.device}
        subtitle={services.length ? services.join(", ") : card.warranty_of ? "Covered by the warranty" : "Services after assessment"}
      />
      <View className="mt-2">
        <Row label="Repair no." value={`#${card.request_id}`} />
        {card.warranty_of ? <Row label="Warranty for" value={`Repair #${card.warranty_of}`} /> : null}
        <Row label="Delivery" value={methodHint ? `${method} · ${methodHint}` : method} />
        <Row label={card.delivery_method === "DROPOFF" ? "Shop address" : "Address"} value={card.address} />
        <Row label="Preferred date" value={calendarDate(card.preferred_date)} />
        <Row label="Price" value={card.warranty_of ? "Free for covered work" : "Quoted after assessment"} />
      </View>
      {card.issue ? (
        <Text className="mt-2 text-xs italic leading-5 text-gray-500" numberOfLines={3}>&ldquo;{card.issue}&rdquo;</Text>
      ) : null}
    </Shell>
  );
}

function Update({ card, client, ...shell }) {
  const d = card.data ?? {};
  const repairNo = <Row label="Repair no." value={`#${card.request_id}`} />;

  if (card.stage === "QUOTE_SENT") {
    return (
      <Shell
        {...shell}
        card={card}
        icon="document-text-outline"
        title={client ? "Your quotation is ready" : "Quotation sent"}
        label={`Quotation for repair ${card.request_id}: ${peso(d.total)}`}
        button={client ? "Review quotation" : "View repair"}
        primary={client}
      >
        <DeviceRow device={card.device} subtitle={`Total ${peso(d.total)}`} />
        <View className="mt-2">
          {repairNo}
          <Row label="Total" value={Number(d.total) === 0 ? "Free" : peso(d.total)} />
          {Number(d.total) > 0 ? <Row label="How it's paid" value={howYouPay(d)} /> : null}
          <Row label="Ready by" value={calendarDate(d.ready_by)} />
          <Row label="Warranty" value={d.warranty ?? "No warranty"} />
        </View>
        <Latest
          at={card.at}
          text={client ? "Check what's included and approve the quotation to continue. You can also cancel." : "Waiting for the client to approve the quotation."}
        />
      </Shell>
    );
  }

  if (card.stage === "PAYMENT_RECEIVED") {
    const cash = d.method === "CASH";
    return (
      <Shell
        {...shell}
        card={card}
        icon="card-outline"
        iconColor={COLORS.success}
        title="Payment received"
        label={`${PART[d.kind] ?? "Payment"} of ${peso(d.amount)} received for repair ${card.request_id}`}
        button="View repair"
      >
        <DeviceRow device={card.device} subtitle={`${PART[d.kind] ?? "Payment"} · ${peso(d.amount)}`} />
        <View className="mt-2">
          {repairNo}
          <Row label="Paid" value={`${PART[d.kind] ?? "Payment"} ${peso(d.amount)}`} />
          <Row label="Method" value={cash ? "Cash to the shop" : "Online through PixelPatch"} />
          <Row label="Still to pay" value={d.paid_in_full ? "Nothing: paid in full" : `${peso(d.remaining)} before completion`} />
        </View>
        <Latest
          at={card.at}
          text={
            d.paid_in_full
              ? client
                ? cash ? "The shop confirmed your cash payment. Your repair is paid in full." : "Thank you! Your repair is paid in full."
                : "Paid in full. Mark the repair completed when the work is done."
              : client
                ? `The shop can start work now. The balance of ${peso(d.remaining)} is due before the repair is completed${d.cash_allowed ? ", online or in cash" : ""}.`
                : "The deposit is in. Assign a technician and start the repair."
          }
        />
      </Shell>
    );
  }

  if (card.stage === "PAYMENT_DUE") {
    const part = d.kind === "BALANCE" ? "balance" : d.kind === "DEPOSIT" ? "deposit" : "payment";
    return (
      <Shell
        {...shell}
        card={card}
        icon="wallet-outline"
        iconColor="#B45309"
        title={client ? "Payment due" : "Payment requested"}
        label={`${PART[d.kind] ?? "Payment"} of ${peso(d.amount)} due for repair ${card.request_id}`}
        button={client ? `Pay ${peso(d.amount)}` : "View repair"}
        primary={client}
      >
        <DeviceRow device={card.device} subtitle={`${PART[d.kind] ?? "Payment"} · ${peso(d.amount)}`} />
        <View className="mt-2">
          {repairNo}
          <Row label="Due now" value={`${PART[d.kind] ?? "Payment"} ${peso(d.amount)}`} />
          <Row
            label="How to pay"
            value={d.kind === "BALANCE" && d.cash_allowed ? "Online in the app, or cash to the shop" : "Online in the app"}
          />
        </View>
        <Latest
          at={card.at}
          text={
            client
              ? d.kind === "BALANCE"
                ? "Pay the balance before you get your device back. Open the repair to pay securely."
                : `Pay the ${part} so the shop can start work. Open the repair to pay securely.`
              : `The client was asked to pay the ${part}. It shows here once it's paid.`
          }
        />
      </Shell>
    );
  }

  if (card.stage === "REPAIR_STARTED") {
    return (
      <Shell
        {...shell}
        card={card}
        icon="construct-outline"
        title="Repair in progress"
        label={`Work started on repair ${card.request_id}`}
        button="View repair"
      >
        <DeviceRow device={card.device} subtitle="Work has started" />
        <View className="mt-2">
          {repairNo}
          <Row label="Technician" value={d.technician} />
          <Row label="Ready by" value={calendarDate(d.ready_by)} />
        </View>
        <Latest
          at={card.at}
          text={client ? "The technician is working on your device. Message the shop here any time for an update." : "Work has started on this device."}
        />
      </Shell>
    );
  }

  if (card.stage === "REPAIR_COMPLETED") {
    return (
      <Shell
        {...shell}
        card={card}
        icon="checkmark-done-circle"
        iconColor={COLORS.success}
        title="Repair completed"
        label={`Repair ${card.request_id} is completed`}
        button={client ? "Leave a review" : "View repair"}
        primary={client}
      >
        <DeviceRow device={card.device} subtitle="Ready for you" />
        <View className="mt-2">
          {repairNo}
          <Row label="Completed" value={calendarDate(d.completed_at) ?? calendarDate(card.at)} />
          <Row label="Warranty" value={d.warranty_until ? `Until ${calendarDate(d.warranty_until)}` : "No warranty"} />
        </View>
        <Latest
          at={card.at}
          text={
            client
              ? `Your device is ready. If something isn't right, open a dispute within 7 days${d.warranty_until ? ", or use the warranty later" : ""}.`
              : "Done. Any warranty starts today."
          }
        />
      </Shell>
    );
  }
  return null;
}

/**
 * card:     the message's card
 * viewerAs: "CLIENT" | "OWNER" | "STAFF" (GET /chat/:id `as`)
 * maxWidth: the chat's bubble width
 */
export default function RepairChatCard({ card, viewerAs = "CLIENT", maxWidth }) {
  const router = useRouter();
  if (!card?.request_id) return null;
  const route = REPAIR_ROUTE[viewerAs] ?? REPAIR_ROUTE.CLIENT;
  const props = {
    card,
    client: !viewerAs || viewerAs === "CLIENT",
    maxWidth,
    onPress: () => router.push(`${route}${card.request_id}`),
  };
  if (card.type === "REPAIR_CONFIRMED") return <Confirmed {...props} />;
  if (card.type === "REPAIR_UPDATE") return <Update {...props} />;
  return null;
}
