// Active shop employee directory. Assignment stays in the repair workspace.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AsyncList from "../../components/AsyncList";
import Button from "../../components/Button";
import TextField from "../../components/TextField";
import Modal from "../../components/Modal";
import api from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { useResponsive } from "../../lib/useResponsive";
import { COLORS } from "../../constants/theme";

const EMPTY = { firstName: "", lastName: "", role: "", phone: "", email: "" };
const nameOf = (employee) => [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Employee";
const roleOf = (employee) => (employee.role || "").trim();
const roleKey = (employee) => roleOf(employee).toLowerCase();
function joinedDate(value) {
  if (!value) return "Date not recorded";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? "Date not recorded" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ employee }) {
  const initials = [employee.first_name, employee.last_name].filter(Boolean).map((value) => value.charAt(0).toUpperCase()).join("");
  return <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-50"><Text className="text-base font-bold text-blue-700">{initials || "?"}</Text></View>;
}

function Contact({ icon, value, fallback }) {
  return (
    <View className="mt-2 flex-row items-start gap-2">
      <Ionicons name={icon} size={15} color={COLORS.textMuted} />
      <Text selectable className={`flex-1 text-sm ${value ? "text-gray-700" : "text-gray-400"}`}>{value || fallback}</Text>
    </View>
  );
}

export default function Employees() {
  const { isMobile, isDesktop } = useResponsive();
  const { data, error, loading, refreshing, refresh } = useFetch("/business/employees", (d) => d.employees ?? []);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [sort, setSort] = useState("name");

  const employees = data ?? [];
  const roles = [...new Map(employees.filter((item) => roleOf(item)).map((item) => [roleKey(item), roleOf(item)])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const needle = query.trim().toLowerCase();
  const filtered = employees.filter((employee) =>
    (!role || roleKey(employee) === role) &&
    (!needle || [nameOf(employee), employee.role, employee.phone, employee.email].join(" ").toLowerCase().includes(needle))
  ).sort((a, b) => sort === "newest"
    ? (new Date(String(b.created_at || "").replace(" ", "T")).getTime() || 0) - (new Date(String(a.created_at || "").replace(" ", "T")).getTime() || 0) || Number(b.id) - Number(a.id)
    : nameOf(a).localeCompare(nameOf(b)) || Number(a.id) - Number(b.id)
  );
  const contactCount = employees.filter((employee) => employee.phone || employee.email).length;
  const setField = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const openForm = () => { setFormError(null); setOpen(true); };
  const closeForm = () => { if (!busy) setOpen(false); };

  const submit = async () => {
    if (busy) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.role.trim()) {
      setFormError("First name, last name and role are required.");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError("Enter a valid email address or leave the email field empty.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await api.post("/business/employees", {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), role: form.role.trim(),
        phone: form.phone.trim() || null, email: form.email.trim() || null,
      });
      setOpen(false);
      setForm(EMPTY);
      setQuery("");
      setRole("");
      setSort("newest");
      await refresh();
    } catch (e) {
      setFormError(e.message || "Couldn't add this employee.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <AsyncList
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={refresh}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        emptyText={employees.length ? "No team members match these filters. Try another name, contact, or role." : "Your team starts here. Add an employee to make them available for repair assignment."}
        ListHeaderComponent={
          <View>
            <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
              <View className="flex-1">
                <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Your team</Text>
                <Text className="mt-1 text-sm leading-5 text-gray-500">People, roles, and contact details in one place.</Text>
              </View>
              <Button title="Add employee" onPress={openForm} />
            </View>

            <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
              {[
                { label: "Active employees", value: employees.length, note: "Listed in your shop", icon: "people-outline" },
                { label: "Team roles", value: roles.length, note: "Distinct roles across your team", icon: "briefcase-outline" },
                { label: "Contact available", value: contactCount, note: "Has a phone number or email", icon: "call-outline" },
              ].map((stat) => (
                <View key={stat.label} style={{ width: isMobile ? "100%" : "32%" }} className={`rounded-xl border border-gray-200 bg-white p-4 ${isMobile ? "flex-row items-center gap-4" : ""}`}>
                  <View className="h-10 w-10 items-center justify-center rounded-lg bg-blue-50"><Ionicons name={stat.icon} size={20} color={COLORS.primary} /></View>
                  <View className={isMobile ? "flex-1" : "mt-3"}>
                    <Text className="text-xs font-medium text-gray-500">{stat.label}</Text>
                    <Text className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</Text>
                    <Text className="mt-1 text-xs leading-5 text-gray-400">{stat.note}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <TextField label="Search your team" placeholder="Name, role, phone, or email" value={query} onChangeText={setQuery} autoCapitalize="none" />
              <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">Filter by role</Text>
              <View className="flex-row flex-wrap gap-2">
                {[["", "All roles"], ...roles].map(([key, label]) => (
                  <Pressable key={key} onPress={() => setRole(key)} accessibilityRole="button" accessibilityLabel={`Filter role: ${label}`} accessibilityState={{ selected: role === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${role === key ? "bg-blue-600" : "bg-gray-50"}`}>
                    <Text className={`text-sm font-semibold ${role === key ? "text-white" : "text-gray-600"}`}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <Text className="mr-1 text-xs text-gray-500">Sort by</Text>
                {[["name", "Name A–Z"], ["newest", "Newest added"]].map(([key, label]) => (
                  <Pressable key={key} onPress={() => setSort(key)} accessibilityRole="button" accessibilityState={{ selected: sort === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${sort === key ? "bg-blue-50" : ""}`}>
                    <Text className={`text-xs font-semibold ${sort === key ? "text-blue-700" : "text-gray-500"}`}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-sm text-gray-500">{filtered.length} of {employees.length} active employees</Text>
              <View className="flex-row flex-wrap gap-3">
                {query || role || sort !== "name" ? <Pressable onPress={() => { setQuery(""); setRole(""); setSort("name"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">Reset filters</Text></Pressable> : null}
                <Pressable onPress={refresh} disabled={refreshing} accessibilityRole="button" accessibilityState={{ busy: refreshing, disabled: refreshing }} className="min-h-11 justify-center"><Text className="text-sm font-semibold text-blue-600">{refreshing ? "Refreshing…" : "Refresh"}</Text></Pressable>
              </View>
            </View>
            {isDesktop && filtered.length ? (
              <View className="mb-2 flex-row gap-5 px-4">
                {[["Team member", 3], ["Role", 2], ["Contact details", 3], ["Added", 2]].map(([label, flex]) => <Text key={label} style={{ flex }} className="text-xs font-semibold uppercase text-gray-400">{label}</Text>)}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)} accessibilityRole="button" accessibilityLabel={`View employee profile: ${nameOf(item)}`} className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-blue-50">
            <View className={isDesktop ? "flex-row items-center gap-5" : ""}>
              <View className="flex-row items-center gap-3" style={isDesktop ? { flex: 3, minWidth: 0 } : undefined}>
                <Avatar employee={item} />
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{nameOf(item)}</Text>
                  <Text className="mt-1 text-xs text-emerald-700">Active employee</Text>
                </View>
                {!isDesktop ? <Ionicons name="chevron-forward-outline" size={18} color={COLORS.textMuted} /> : null}
              </View>
              <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-3"}>
                <Text className="text-sm font-medium text-gray-700">{roleOf(item) || "Role not specified"}</Text>
              </View>
              <View style={isDesktop ? { flex: 3, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-2 border-t border-gray-100 pt-1"}>
                <Contact icon="call-outline" value={item.phone} fallback="No phone recorded" />
                <Contact icon="mail-outline" value={item.email} fallback="No email recorded" />
              </View>
              <View style={isDesktop ? { flex: 2, minWidth: 0 } : undefined} className={isDesktop ? "" : "mt-4 flex-row flex-wrap items-center justify-between gap-2"}>
                <Text className="text-xs text-gray-500">Added {joinedDate(item.created_at)}</Text>
                <Text className="mt-2 text-sm font-semibold text-blue-600">View profile</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={open} onClose={closeForm} title="Add employee" footer={<Button title="Save employee" loading={busy} onPress={submit} />}>
        <Text className="mb-4 text-sm leading-5 text-gray-500">Add a team member to your shop. Assign them to a repair from the repair workspace after the required approval and payment.</Text>
        {formError ? <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</Text> : null}
        <View className={isMobile ? "" : "flex-row gap-3"}>
          <View style={isMobile ? undefined : { flex: 1 }}><TextField label="First name *" value={form.firstName} onChangeText={setField("firstName")} placeholder="Juan" maxLength={100} editable={!busy} /></View>
          <View style={isMobile ? undefined : { flex: 1 }}><TextField label="Last name *" value={form.lastName} onChangeText={setField("lastName")} placeholder="Dela Cruz" maxLength={100} editable={!busy} /></View>
        </View>
        <TextField label="Role *" value={form.role} onChangeText={setField("role")} placeholder="e.g. Technician" maxLength={100} editable={!busy} />
        <TextField label="Phone (optional)" value={form.phone} onChangeText={setField("phone")} placeholder="09XX XXX XXXX" keyboardType="phone-pad" inputMode="tel" maxLength={20} editable={!busy} />
        <TextField label="Email (optional)" value={form.email} onChangeText={setField("email")} placeholder="tech@example.com" autoCapitalize="none" keyboardType="email-address" inputMode="email" maxLength={150} editable={!busy} />
        <Text className="text-xs text-gray-400">* Required fields. Contact details can be left empty.</Text>
      </Modal>

      <Modal visible={Boolean(selected)} onClose={() => setSelected(null)} title="Employee profile">
        {selected ? (
          <View>
            <View className="mb-4 flex-row items-center gap-3">
              <Avatar employee={selected} />
              <View className="flex-1"><Text className="text-lg font-bold text-gray-900">{nameOf(selected)}</Text><Text className="mt-1 text-sm text-gray-500">{roleOf(selected) || "Role not specified"}</Text></View>
            </View>
            <Text className="mb-4 text-xs font-semibold text-emerald-700">Active employee · #{selected.id}</Text>
            <Text className="mb-2 text-xs font-semibold uppercase text-gray-400">Contact details</Text>
            <Contact icon="call-outline" value={selected.phone} fallback="No phone recorded" />
            <Contact icon="mail-outline" value={selected.email} fallback="No email recorded" />
            <Text className="mt-5 text-xs font-semibold uppercase text-gray-400">Added to your shop</Text>
            <Text className="mb-4 mt-2 text-sm text-gray-700">{joinedDate(selected.created_at)}</Text>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
