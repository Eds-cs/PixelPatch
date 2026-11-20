// Shop service catalog: browse, add, edit and delete the shop's services.
// GET/POST /api/business/services, PUT/DELETE /api/business/services/:id
import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../../components/AsyncList";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { confirmAction } from "../../lib/confirm";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

const METHODS = [
  { key: "accepts_pickup", label: "Pickup", icon: "car-outline", hint: "You collect the device" },
  { key: "accepts_dropoff", label: "Drop-off", icon: "storefront-outline", hint: "The client brings it in" },
  { key: "accepts_onsite", label: "On-site", icon: "location-outline", hint: "A technician visits" },
];
const FALLBACK_CATEGORIES = ["SMARTPHONE", "LAPTOP", "DESKTOP", "TABLET", "SMARTWATCH", "CONTROLLER", "OTHER"];
const EMPTY_FORM = {
  name: "", category: "", description: "", base_price: "", estimated_timeframe: "",
  accepts_pickup: false, accepts_dropoff: true, accepts_onsite: false,
};
const money = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
  ? "₱" + Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : "Not priced";
const categoryLabel = (value) => value ? String(value).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Uncategorized";
const supports = (service, key) => Number(service[key]) === 1;
// shop_services.review_status: clients only see APPROVED services.
const REVIEW_STYLE = {
  PENDING: ["bg-amber-100", "text-amber-800", "Waiting for admin review"],
  REJECTED: ["bg-red-100", "text-red-800", "Rejected by admin"],
  APPROVED: ["bg-emerald-100", "text-emerald-800", "Live"],
};

function ReviewBadge({ status }) {
  const [background, foreground, label] = REVIEW_STYLE[status] ?? REVIEW_STYLE.APPROVED;
  return <View className={`self-start rounded-full px-2.5 py-1 ${background}`}><Text className={`text-xs font-semibold ${foreground}`}>{label}</Text></View>;
}

function Methods({ service }) {
  const enabled = METHODS.filter((method) => supports(service, method.key));
  return (
    <View className="flex-row flex-wrap gap-2">
      {enabled.length ? enabled.map((method) => (
        <View key={method.key} className="flex-row items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1.5">
          <Ionicons name={method.icon} size={14} color={COLORS.textMuted} />
          <Text className="text-xs font-medium text-gray-600">{method.label}</Text>
        </View>
      )) : <Text className="text-xs text-gray-400">Service methods not specified</Text>}
    </View>
  );
}

export default function BusinessServices() {
  const { isMobile, isDesktop } = useResponsive();
  const { data, error, loading, refreshing, refresh } = useFetch("/business/services");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("");
  const [sort, setSort] = useState("name");

  // null = closed, "new" = adding, otherwise the service being edited.
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);

  const services = data?.services ?? [];
  const waiting = services.filter((item) => item.review_status === "PENDING").length;
  const rejected = services.filter((item) => item.review_status === "REJECTED").length;
  const allCategories = data?.categories?.length ? data.categories : FALLBACK_CATEGORIES;
  const categories = [...new Set(services.map((item) => item.category).filter(Boolean))].sort();
  const prices = services.filter((item) => item.base_price !== null && item.base_price !== "" && Number.isFinite(Number(item.base_price))).map((item) => Number(item.base_price));
  const needle = query.trim().toLowerCase();
  const filtered = services.filter((item) =>
    (!category || item.category === category) && (!method || supports(item, method)) &&
    (!needle || [item.name, item.description, item.category, item.estimated_timeframe].join(" ").toLowerCase().includes(needle))
  ).sort((a, b) => {
    const nameOrder = String(a.name || "").localeCompare(String(b.name || "")) || Number(a.id) - Number(b.id);
    const priceA = a.base_price === null || a.base_price === "" || a.base_price === undefined ? NaN : Number(a.base_price);
    const priceB = b.base_price === null || b.base_price === "" || b.base_price === undefined ? NaN : Number(b.base_price);
    if (sort !== "name") {
      if (!Number.isFinite(priceA)) return Number.isFinite(priceB) ? 1 : nameOrder;
      if (!Number.isFinite(priceB)) return -1;
      return (sort === "lowest" ? priceA - priceB : priceB - priceA) || nameOrder;
    }
    return nameOrder;
  });

  const isNew = editing === "new";
  const setField = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const openNew = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing("new");
  };
  const openEdit = (service) => {
    setForm({
      name: service.name ?? "",
      category: service.category ?? "",
      description: service.description ?? "",
      base_price: service.base_price !== null && service.base_price !== undefined ? String(Number(service.base_price)) : "",
      estimated_timeframe: service.estimated_timeframe ?? "",
      accepts_pickup: supports(service, "accepts_pickup"),
      accepts_dropoff: supports(service, "accepts_dropoff"),
      accepts_onsite: supports(service, "accepts_onsite"),
    });
    setFormError(null);
    setEditing(service);
  };
  const close = () => { if (!busy) setEditing(null); };

  const validate = () => {
    if (!form.name.trim()) return "Enter a service name.";
    if (!form.category) return "Choose a device category.";
    const price = Number(form.base_price);
    if (!form.base_price.trim() || !Number.isFinite(price) || price <= 0) return "Enter a base price above 0.";
    if (!form.estimated_timeframe.trim()) return "Enter an estimated turnaround (for example, 1-2 days).";
    if (!form.accepts_pickup && !form.accepts_dropoff && !form.accepts_onsite) return "Choose at least one service method.";
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) { setFormError(problem); return; }
    setBusy(true);
    setFormError(null);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim(), estimated_timeframe: form.estimated_timeframe.trim(), base_price: Number(form.base_price) };
      const { data: saved } = isNew
        ? await api.post("/business/services", payload)
        : await api.put(`/business/services/${editing.id}`, payload);
      setNotice(saved?.reviewStatus === "PENDING"
        ? `"${payload.name}" was sent for admin review. Clients will see it once it's approved.`
        : `"${payload.name}" was updated.`);
      setEditing(null);
      await refresh();
    } catch (e) {
      setFormError(e.message || "Couldn't save this service.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const service = editing;
    confirmAction("Delete service", `Delete "${service.name}"? Clients will no longer be able to choose it.`, async () => {
      setBusy(true);
      setFormError(null);
      try {
        await api.delete(`/business/services/${service.id}`);
        setEditing(null);
        await refresh();
      } catch (e) {
        setFormError(e.message || "Couldn't delete this service.");
      } finally {
        setBusy(false);
      }
    }, { confirmLabel: "Delete", destructive: true });
  };

  const usedCount = Number(editing?.request_count) || 0;
  const priceLocked = !isNew && Number(editing?.open_quotation_count) > 0;

  return (
    <View className="flex-1 bg-gray-50">
      <AsyncList
        loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}
        data={filtered} keyExtractor={(item) => String(item.id)}
        emptyText={services.length ? "No services match these filters. Try another category, method, or search." : "Your shop has no listed services yet. Add one so clients can request repairs."}
        ListHeaderComponent={
          <View>
            <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
              <View className="flex-1">
                <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Service catalog</Text>
                <Text className="mt-1 text-sm leading-5 text-gray-500">Manage your offerings, base prices, and service methods.</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Button title="Refresh" variant="outline" onPress={refresh} loading={refreshing} />
                <Button title="Add service" onPress={openNew} />
              </View>
            </View>
            {notice ? (
              <View className="mb-4 flex-row items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} />
                <Text className="flex-1 text-sm leading-5 text-brand-800">{notice}</Text>
                <Pressable onPress={() => setNotice(null)} accessibilityRole="button" accessibilityLabel="Dismiss" className="h-8 w-8 items-center justify-center"><Ionicons name="close" size={18} color={COLORS.textMuted} /></Pressable>
              </View>
            ) : null}
            {waiting || rejected ? (
              <View className="mb-4 flex-row items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <Ionicons name="hourglass-outline" size={20} color="#b45309" />
                <Text className="flex-1 text-sm leading-5 text-amber-900">
                  {[waiting ? `${waiting} waiting for admin review` : null, rejected ? `${rejected} rejected (open one to see why, then edit to resubmit)` : null].filter(Boolean).join(" · ")}. Clients only see services marked Live.
                </Text>
              </View>
            ) : null}
            <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
              {[
                { label: "Listed services", value: services.length, note: "In your shop catalog", icon: "pricetags-outline" },
                { label: "Device categories", value: categories.length, note: "Across your listed services", icon: "grid-outline" },
                { label: "Starting base price", value: prices.length ? money(Math.min(...prices)) : "—", note: "Lowest listed service price", icon: "cash-outline" },
              ].map((stat) => (
                <View key={stat.label} style={{ width: isMobile ? "100%" : "32%" }} className={`rounded-xl border border-gray-200 bg-white p-4 ${isMobile ? "flex-row items-center gap-4" : ""}`}>
                  <Ionicons name={stat.icon} size={24} color={COLORS.primary} />
                  <View className="flex-1">
                    <Text className={`text-xs font-medium text-gray-500 ${isMobile ? "" : "mt-3"}`}>{stat.label}</Text>
                    <Text className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</Text>
                    <Text className="mt-1 text-xs leading-5 text-gray-400">{stat.note}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <TextField label="Search services" value={query} onChangeText={setQuery} placeholder="Service name, category, or description" autoCapitalize="none" />
              <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">Device category</Text>
              <View className="flex-row flex-wrap gap-2">
                {["", ...categories].map((value) => <Pressable key={value} onPress={() => setCategory(value)} accessibilityRole="button" accessibilityState={{ selected: category === value }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${category === value ? "bg-brand-600" : "bg-gray-50"}`}><Text className={`text-sm font-semibold ${category === value ? "text-white" : "text-gray-600"}`}>{value ? categoryLabel(value) : "All categories"}</Text></Pressable>)}
              </View>
              <Text className="mb-2 mt-4 text-xs font-semibold uppercase text-gray-500">Service method</Text>
              <View className="flex-row flex-wrap gap-2">
                {[{ key: "", label: "All methods" }, ...METHODS].map((item) => <Pressable key={item.key} onPress={() => setMethod(item.key)} accessibilityRole="button" accessibilityState={{ selected: method === item.key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${method === item.key ? "bg-brand-50" : "bg-gray-50"}`}><Text className={`text-sm font-semibold ${method === item.key ? "text-brand-700" : "text-gray-600"}`}>{item.label}</Text></Pressable>)}
              </View>
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <Text className="text-xs text-gray-500">Sort by</Text>
                {[["name", "Name A–Z"], ["lowest", "Price: low to high"], ["highest", "Price: high to low"]].map(([key, label]) => <Pressable key={key} onPress={() => setSort(key)} accessibilityRole="button" accessibilityLabel={`Sort by ${label}`} accessibilityState={{ selected: sort === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${sort === key ? "bg-brand-50" : ""}`}><Text className={`text-xs font-semibold ${sort === key ? "text-brand-700" : "text-gray-500"}`}>{label}</Text></Pressable>)}
              </View>
            </View>
            <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-sm text-gray-500">{filtered.length} of {services.length} services · tap a service to edit it</Text>
              {query || category || method || sort !== "name" ? <Pressable onPress={() => { setQuery(""); setCategory(""); setMethod(""); setSort("name"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-brand-600">Reset filters</Text></Pressable> : null}
            </View>
            {isDesktop && filtered.length ? <View className="mb-2 flex-row gap-5 px-4">{[["Service", 4], ["Service options", 3], ["Base price", 2]].map(([label, flex]) => <Text key={label} style={{ flex }} className="text-xs font-semibold uppercase text-gray-400">{label}</Text>)}</View> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openEdit(item)} accessibilityRole="button" accessibilityLabel={`Edit service: ${item.name}, base price ${money(item.base_price)}`} className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-brand-50">
            <View className={isDesktop ? "flex-row items-start gap-5" : ""}>
              <View style={isDesktop ? { flex: 4, minWidth: 0 } : undefined}>
                <View className="mb-2 flex-row flex-wrap items-center gap-2">
                  <ReviewBadge status={item.review_status} />
                  <Text className="text-xs font-semibold text-brand-600">{categoryLabel(item.category)}</Text>
                </View>
                <Text className="text-base font-bold text-gray-900">{item.name || "Unnamed service"}</Text>
                {item.review_status === "REJECTED" && item.review_note ? <Text className="mt-2 rounded-lg bg-red-50 p-2 text-xs leading-5 text-red-700">Admin: {item.review_note}</Text> : null}
                <Text numberOfLines={2} className="mt-2 text-sm leading-5 text-gray-500">{item.description || "No service description provided."}</Text>
                {Number(item.request_count) ? <Text className="mt-2 text-xs text-gray-400">Used in {item.request_count} repair request{Number(item.request_count) === 1 ? "" : "s"}</Text> : null}
              </View>
              <View style={isDesktop ? { flex: 3, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-4"}>
                <Methods service={item} />
                <Text className="mt-3 text-xs leading-5 text-gray-500">Estimated turnaround: {item.estimated_timeframe || "Not specified"}</Text>
              </View>
              <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-4 flex-row flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3"}>
                <View><Text className="text-xs text-gray-400">Base price</Text><Text className="mt-1 text-lg font-bold text-brand-600">{money(item.base_price)}</Text></View>
                <Text className="mt-3 text-sm font-semibold text-brand-600">Edit →</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={editing !== null}
        onClose={close}
        title={isNew ? "Add service" : "Edit service"}
        footer={
          <View className={isMobile ? "gap-3" : "flex-row-reverse gap-3"}>
            <View className={isMobile ? "" : "flex-1"}><Button title="Save service" loading={busy} onPress={submit} /></View>
            {!isNew && !usedCount ? <View className={isMobile ? "" : "flex-1"}><Button title="Delete service" variant="outline" disabled={busy} onPress={remove} /></View> : null}
          </View>
        }
      >
        {formError ? <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</Text> : null}
        {!isNew && editing?.review_status === "REJECTED" ? (
          <View className="mb-4 rounded-lg bg-red-50 p-3">
            <Text className="text-xs font-semibold text-red-800">Rejected by admin</Text>
            <Text className="mt-1 text-sm leading-5 text-red-700">{editing.review_note || "No reason given."}</Text>
            <Text className="mt-2 text-xs leading-5 text-red-700">Fix the issue and save to send it for review again.</Text>
          </View>
        ) : null}
        <Text className="mb-4 text-xs leading-5 text-gray-500">
          {isNew
            ? "New services are reviewed by an admin before clients can see them."
            : "Changing the name, category or description sends this service back for admin review. Price, turnaround and service methods update right away."}
        </Text>
        {!isNew && usedCount ? <Text className="mb-4 rounded-lg bg-brand-50 p-3 text-xs leading-5 text-brand-800">This service is part of {usedCount} repair request{usedCount === 1 ? "" : "s"}, so it can&apos;t be deleted. You can still edit it.</Text> : null}

        <TextField label="Service name" value={form.name} onChangeText={setField("name")} placeholder="e.g. Screen replacement" maxLength={100} editable={!busy} />

        <Text className="mb-2 text-sm font-medium text-gray-700">Device category</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {allCategories.map((value) => (
            <Pressable key={value} onPress={() => setField("category")(value)} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: form.category === value }} className={`min-h-11 justify-center rounded-lg border px-3 py-2 ${form.category === value ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white"}`}>
              <Text className={`text-sm font-semibold ${form.category === value ? "text-brand-700" : "text-gray-600"}`}>{categoryLabel(value)}</Text>
            </Pressable>
          ))}
        </View>

        <View className={isMobile ? "" : "flex-row gap-3"}>
          <View className={isMobile ? "" : "flex-1"}>
            <TextField label="Base price (₱)" value={form.base_price} onChangeText={setField("base_price")} placeholder="1500" keyboardType="decimal-pad" inputMode="decimal" editable={!busy && !priceLocked} />
          </View>
          <View className={isMobile ? "" : "flex-1"}>
            <TextField label="Estimated turnaround" value={form.estimated_timeframe} onChangeText={setField("estimated_timeframe")} placeholder="1-2 days" maxLength={255} editable={!busy} />
          </View>
        </View>
        {priceLocked ? <Text className="-mt-2 mb-4 text-xs leading-5 text-amber-700">The price is locked while a quotation that includes this service is waiting for payment.</Text> : null}

        <TextField label="Description (optional)" value={form.description} onChangeText={setField("description")} placeholder="What does this service include?" multiline editable={!busy} style={{ minHeight: 96, paddingTop: 12, textAlignVertical: "top" }} />

        <Text className="mb-2 text-sm font-medium text-gray-700">Service methods</Text>
        {METHODS.map((item) => (
          <View key={item.key} className="mb-2 min-h-11 flex-row items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
            <View className="flex-1 flex-row items-center gap-2">
              <Ionicons name={item.icon} size={18} color={COLORS.textMuted} />
              <View className="flex-1"><Text className="text-sm font-semibold text-gray-800">{item.label}</Text><Text className="text-xs text-gray-500">{item.hint}</Text></View>
            </View>
            <Switch value={form[item.key]} onValueChange={setField(item.key)} disabled={busy} trackColor={{ true: COLORS.primary }} accessibilityLabel={`${item.label} service method`} />
          </View>
        ))}
      </Modal>
    </View>
  );
}
