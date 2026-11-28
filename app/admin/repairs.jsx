// Admin · Repairs: every repair request across shops. READ-ONLY: admins
// watch and support; shops and clients run the workflow (AGENTS.md §15).
//
// GET /api/admin/repairs?view=ALL|WAITING|OVERDUE|ACTIVE|COMPLETED|CLOSED&q=&limit=&offset=
// GET /api/admin/repairs/:id
import { useState } from "react";
import { LIMITS } from "../../lib/inputLimits";
import { ActivityIndicator, FlatList, Linking, Text, View } from "react-native";

import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import {
  AdminCard,
  AdminDetail,
  AdminEmpty,
  AdminPageHeader,
  AdminPill,
  AdminTabs,
  adminDate,
  adminMoney,
} from "../../components/AdminUI";
import { useFetch } from "../../lib/useFetch";
import { usePagedFetch, useDebouncedValue } from "../../lib/usePagedFetch";
import { useResponsive } from "../../lib/useResponsive";
import { repairStage } from "../../lib/repairStage";
import { categoryLabel } from "../../lib/serviceCategories";
import { quotationTermsText } from "../../lib/paymentTerms";
import { formatPhone } from "../../lib/phone";
import { waitingFor } from "../../lib/adminSummary";
import { COLORS } from "../../constants/theme";

const TABS = [
  { key: "WAITING", label: "Waiting > 2 days" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CLOSED", label: "Closed" },
  { key: "ALL", label: "All" },
];
const HINTS = {
  WAITING: "The shop hasn't accepted or rejected these for over 2 days. Oldest first.",
  OVERDUE: "In progress past the completion date on the quotation. Oldest first.",
  ACTIVE: "Everything not yet completed, rejected or cancelled.",
  COMPLETED: "Finished repairs.",
  CLOSED: "Rejected by the shop or cancelled by the client.",
  ALL: "Every repair request.",
};
const DELIVERY = { PICKUP: "Pickup", DROPOFF: "Drop-off", ONSITE: "On-site" };
const PAYMENT_KIND = { FULL: "Full payment", DEPOSIT: "Deposit", BALANCE: "Balance" };
const DISPUTE = { OPEN: "Dispute open", SHOP_PROPOSED: "Dispute: shop offered", RESOLVED: "Dispute resolved", REJECTED: "Dispute: offer declined" };
const TYPE = { PHONE: "Phone", LAPTOP: "Laptop", DESKTOP: "PC" };

const deviceText = (r) =>
  [TYPE[r.device_type], [r.device_brand, r.device_model].filter(Boolean).join(" ") || r.device_name].filter(Boolean).join(" · ") || "Device";

function RepairRow({ repair, view, onPress }) {
  const stage = repairStage(repair);
  const waited = view === "WAITING" ? waitingFor(repair.created_at) : null;
  return (
    <AdminCard
      onPress={onPress}
      highlight={view === "WAITING" || view === "OVERDUE"}
      accessibilityLabel={`Repair ${repair.id}, ${repair.shop_name}, ${stage.label}`}
    >
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-base font-bold text-gray-900">#{repair.id}</Text>
        <AdminPill label={stage.label} tone={stage.tone} />
        {repair.dispute_status ? <AdminPill label={DISPUTE[repair.dispute_status] ?? "Dispute"} tone="red" /> : null}
      </View>
      <Text className="mt-1 text-sm text-gray-700" numberOfLines={1}>
        {repair.shop_name} · {repair.client_name}
      </Text>
      <Text className="mt-1 text-xs text-gray-500" numberOfLines={2}>
        {deviceText(repair)} · {DELIVERY[repair.delivery_method] ?? repair.delivery_method} · Requested {adminDate(repair.created_at, { time: false })}
        {waited ? ` (${waited} ago)` : ""}
        {repair.estimated_cost !== null && repair.estimated_cost !== undefined ? ` · Quote ${adminMoney(repair.estimated_cost)}` : ""}
        {view === "OVERDUE" && repair.estimated_completion_time ? ` · Due ${adminDate(repair.estimated_completion_time, { time: false })}` : ""}
      </Text>
    </AdminCard>
  );
}

function Section({ title, children }) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-semibold uppercase text-gray-400">{title}</Text>
      {children}
    </View>
  );
}

function RepairDetail({ repairId, onClose }) {
  const { data, error, loading } = useFetch(`/admin/repairs/${repairId}`);
  const r = data?.repair;
  const stage = r ? repairStage(r) : null;

  return (
    <Modal
      visible
      onClose={onClose}
      title={`Repair #${repairId}`}
      footer={<Button title="Close" variant="outline" onPress={onClose} />}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : error ? (
        <Text className="text-sm text-red-600">{error}</Text>
      ) : r ? (
        <View>
          <View className="mb-4 flex-row flex-wrap gap-2">
            <AdminPill label={stage.label} tone={stage.tone} />
            <AdminPill label="Read-only" tone="gray" />
          </View>

          <Section title="People">
            <AdminDetail icon="person-outline" label="Client">
              {r.client_name} · {r.client_email}
              {r.client_phone ? ` · ${formatPhone(r.client_phone)}` : ""}
            </AdminDetail>
            <AdminDetail icon="storefront-outline" label="Shop">
              {r.shop_name} · {formatPhone(r.shop_phone)} · {r.shop_email}
            </AdminDetail>
            {data.assignment ? (
              <AdminDetail icon="construct-outline" label="Technician">
                {data.assignment.employee_name} ({data.assignment.employee_role}) · assigned {adminDate(data.assignment.assigned_at)}
              </AdminDetail>
            ) : null}
          </Section>

          <Section title="Request">
            <AdminDetail icon="phone-portrait-outline" label="Device">
              {deviceText(r)}
              {r.device_serial ? ` · S/N ${r.device_serial}` : ""}
            </AdminDetail>
            <AdminDetail icon="chatbox-ellipses-outline" label="Problem">{r.issue_description}</AdminDetail>
            <AdminDetail icon="car-outline" label="Service method">
              {DELIVERY[r.delivery_method] ?? r.delivery_method}
              {r.service_address ? ` · ${r.service_address}` : ""}
            </AdminDetail>
            <AdminDetail icon="calendar-outline" label="Dates">
              Requested {adminDate(r.created_at)} · Preferred {adminDate(r.preferred_date, { time: false })}
              {r.completed_at ? ` · Completed ${adminDate(r.completed_at)}` : ""}
            </AdminDetail>
            {r.rejection_reason ? <AdminDetail icon="close-circle-outline" label="Rejection reason">{r.rejection_reason}</AdminDetail> : null}
            {data.services.length ? (
              <AdminDetail icon="list-outline" label="Services">
                {data.services.map((s) => `${s.name} (${categoryLabel(s.category, s.custom_category)}) ${adminMoney(s.base_price)}`).join("\n")}
              </AdminDetail>
            ) : null}
          </Section>

          <Section title="Assessment and quotation">
            {data.assessment ? (
              <AdminDetail icon="search-outline" label={`Assessment · ${adminDate(data.assessment.created_at)}`}>
                {[data.assessment.device_condition, data.assessment.observed_issues, data.assessment.recommendation].filter(Boolean).join("\n") || "—"}
              </AdminDetail>
            ) : (
              <Text className="mb-3 text-sm text-gray-500">No assessment yet.</Text>
            )}
            {data.quotation ? (
              <AdminDetail icon="receipt-outline" label={`Quotation · ${data.quotation.status.toLowerCase()}`}>
                {adminMoney(data.quotation.estimated_cost)} · due {adminDate(data.quotation.estimated_completion_time, { time: false })}
                {data.quotation.parts.length ? `\nParts: ${data.quotation.parts.map((p) => `${p.name} ${adminMoney(p.cost)}`).join(", ")}` : ""}
                {`\n${quotationTermsText(data.quotation)}`}
              </AdminDetail>
            ) : (
              <Text className="mb-3 text-sm text-gray-500">No quotation yet.</Text>
            )}
          </Section>

          <Section title="Payment and dispute">
            {data.payments.length ? (
              data.payments.map((p) => (
                <AdminDetail key={p.id} icon="card-outline" label={`${PAYMENT_KIND[p.kind] ?? "Payment"} #${p.id} · ${p.gateway === "CASH" ? "Cash (confirmed by the shop)" : p.gateway}`}>
                  {adminMoney(p.amount)} · {p.status}
                  {p.paid_at ? ` · paid ${adminDate(p.paid_at)}` : ""}
                </AdminDetail>
              ))
            ) : (
              <Text className="mb-3 text-sm text-gray-500">No payment yet.</Text>
            )}
            {data.dispute ? (
              <AdminDetail icon="alert-circle-outline" label="Dispute">
                {DISPUTE[data.dispute.status] ?? data.dispute.status} · opened {adminDate(data.dispute.created_at)}
              </AdminDetail>
            ) : null}
          </Section>

          {r.client_phone ? (
            <Button
              title="Call the client"
              variant="ghost"
              onPress={() => Linking.openURL(`tel:${String(r.client_phone).replace(/\s/g, "")}`)}
            />
          ) : null}
        </View>
      ) : null}
    </Modal>
  );
}

export default function AdminRepairs() {
  const { horizontalPadding } = useResponsive();
  const [view, setView] = useState("WAITING");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim());
  const list = usePagedFetch("/admin/repairs", { view, q }, { listKey: "repairs", pageSize: 30 });
  const [selected, setSelected] = useState(null);

  const header = (
    <View>
      <AdminPageHeader
        title="Repairs"
        description="Every repair request across shops. Read-only: shops and clients run each repair; use this to spot problems and help."
      />
      <AdminTabs tabs={TABS} value={view} onChange={setView} counts={list.extra?.counts ?? {}} />
      <Text className="mb-3 text-xs text-gray-500">{HINTS[view]}</Text>
      <TextField
        label="Search" maxLength={LIMITS.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Repair #, client, shop or device"
        autoCapitalize="none"
      />
      {list.error ? <Text className="mb-4 text-sm text-red-600">{list.error}</Text> : null}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={list.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: horizontalPadding, paddingBottom: 40, maxWidth: 1000, width: "100%", alignSelf: "center" }}
        ListHeaderComponent={header}
        renderItem={({ item }) => <RepairRow repair={item} view={view} onPress={() => setSelected(item.id)} />}
        ListEmptyComponent={
          list.loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <AdminEmpty
              icon="construct-outline"
              text={view === "WAITING" || view === "OVERDUE" ? "Nothing here. Shops are keeping up." : "No repairs match."}
            />
          )
        }
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={COLORS.primary} /> : null}
      />
      {selected ? <RepairDetail key={selected} repairId={selected} onClose={() => setSelected(null)} /> : null}
    </View>
  );
}
