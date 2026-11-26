// Shop employee directory: add, edit, deactivate and reactivate team members.
// Assignment to repairs stays in the repair workspace and only offers active staff.
import { useState } from "react";
import { LIMITS } from "../../lib/inputLimits";
import { Pressable, Text, View } from "react-native";
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
import {
  PHONE_MAX_LENGTH,
  PHONE_MESSAGE,
  PHONE_PLACEHOLDER,
  cleanPhoneInput,
  normalizePhone,
  phoneProblem,
} from "../../lib/phone";

const EMPTY = { firstName: "", lastName: "", role: "", phone: "", email: "" };
const STATUSES = [["active", "Active"], ["inactive", "Inactive"]];
const nameOf = (employee) => [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Employee";
const roleOf = (employee) => (employee.role || "").trim();
const roleKey = (employee) => roleOf(employee).toLowerCase();
const isActive = (employee) => Number(employee?.is_active) === 1;
function joinedDate(value) {
  if (!value) return "Date not recorded";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? "Date not recorded" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ employee }) {
  const initials = [employee.first_name, employee.last_name].filter(Boolean).map((value) => value.charAt(0).toUpperCase()).join("");
  return <View className={`h-12 w-12 items-center justify-center rounded-xl ${isActive(employee) ? "bg-teal-50" : "bg-gray-100"}`}><Text className={`text-base font-bold ${isActive(employee) ? "text-teal-800" : "text-gray-500"}`}>{initials || "?"}</Text></View>;
}

function StatusText({ employee }) {
  return isActive(employee)
    ? <Text className="mt-1 text-xs text-emerald-700">Active employee</Text>
    : <Text className="mt-1 text-xs text-gray-500">Inactive · not assignable</Text>;
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
  const { data, error, loading, refreshing, refresh } = useFetch("/business/employees/all", (d) => d.employees ?? []);
  // Form modal: null = closed, "new" = adding, otherwise the employee being edited.
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState("name");

  const everyone = data ?? [];
  const active = everyone.filter(isActive);
  const byStatus = status === "active" ? active : everyone.filter((employee) => !isActive(employee));
  const roles = [...new Map(byStatus.filter((item) => roleOf(item)).map((item) => [roleKey(item), roleOf(item)])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const needle = query.trim().toLowerCase();
  const filtered = byStatus.filter((employee) =>
    (!role || roleKey(employee) === role) &&
    (!needle || [nameOf(employee), employee.role, employee.phone, employee.email].join(" ").toLowerCase().includes(needle))
  ).sort((a, b) => sort === "newest"
    ? (new Date(String(b.created_at || "").replace(" ", "T")).getTime() || 0) - (new Date(String(a.created_at || "").replace(" ", "T")).getTime() || 0) || Number(b.id) - Number(a.id)
    : nameOf(a).localeCompare(nameOf(b)) || Number(a.id) - Number(b.id)
  );
  const activeRoles = new Set(active.map(roleKey).filter(Boolean)).size;
  const contactCount = active.filter((employee) => employee.phone || employee.email).length;
  const setField = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const isNew = editing === "new";

  const openNew = () => { setForm(EMPTY); setFormError(null); setEditing("new"); };
  const openEdit = (employee) => {
    setForm({ firstName: employee.first_name ?? "", lastName: employee.last_name ?? "", role: employee.role ?? "", phone: employee.phone ?? "", email: employee.email ?? "" });
    setFormError(null);
    setSelected(null);
    setEditing(employee);
  };
  const closeForm = () => { if (!busy) setEditing(null); };
  const openProfile = (employee) => { setProfileError(null); setSelected(employee); };

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
    if (form.phone.trim() && !normalizePhone(form.phone)) {
      setFormError(`${PHONE_MESSAGE} Or leave the phone empty.`);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), role: form.role.trim(),
        phone: normalizePhone(form.phone) || null, email: form.email.trim() || null,
      };
      if (isNew) {
        await api.post("/business/employees", payload);
        setQuery("");
        setRole("");
        setStatus("active");
        setSort("newest");
      } else {
        await api.put(`/business/employees/${editing.id}`, payload);
      }
      setEditing(null);
      setForm(EMPTY);
      await refresh();
    } catch (e) {
      setFormError(e.message || "Couldn't save this employee.");
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (employee) => {
    const deactivating = isActive(employee);
    const run = async () => {
      setBusy(true);
      setProfileError(null);
      try {
        await api.post(`/business/employees/${employee.id}/${deactivating ? "deactivate" : "reactivate"}`);
        setSelected(null);
        await refresh();
      } catch (e) {
        setProfileError(e.message || "Couldn't update this employee.");
      } finally {
        setBusy(false);
      }
    };
    if (!deactivating) { void run(); return; }
    confirmAction(
      "Deactivate employee",
      `${nameOf(employee)} will no longer be offered for repair assignment. You can reactivate them later.`,
      run,
      { confirmLabel: "Deactivate", destructive: true }
    );
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
        emptyText={everyone.length ? "No team members match these filters. Try another name, contact, role, or status." : "Your team starts here. Add an employee to make them available for repair assignment."}
        ListHeaderComponent={
          <View>
            <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
              <View className="flex-1">
                <Text accessibilityRole="header" className="text-2xl font-bold text-gray-900">Your team</Text>
                <Text className="mt-1 text-sm leading-5 text-gray-500">People, roles, and contact details in one place.</Text>
              </View>
              <Button title="Add employee" onPress={openNew} />
            </View>

            <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
              {[
                { label: "Active employees", value: active.length, note: everyone.length > active.length ? `${everyone.length - active.length} inactive` : "Available for assignment", icon: "people-outline" },
                { label: "Team roles", value: activeRoles, note: "Distinct roles across active staff", icon: "briefcase-outline" },
                { label: "Contact available", value: contactCount, note: "Active staff with a phone or email", icon: "call-outline" },
              ].map((stat) => (
                <View key={stat.label} style={{ width: isMobile ? "100%" : "32%" }} className={`rounded-xl border border-gray-200 bg-white p-4 ${isMobile ? "flex-row items-center gap-4" : ""}`}>
                  <View className="h-10 w-10 items-center justify-center rounded-lg bg-teal-50"><Ionicons name={stat.icon} size={20} color={COLORS.primary} /></View>
                  <View className={isMobile ? "flex-1" : "mt-3"}>
                    <Text className="text-xs font-medium text-gray-500">{stat.label}</Text>
                    <Text className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</Text>
                    <Text className="mt-1 text-xs leading-5 text-gray-400">{stat.note}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <TextField label="Search your team" maxLength={LIMITS.search} placeholder="Name, role, phone, or email" value={query} onChangeText={setQuery} autoCapitalize="none" />
              <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">Status</Text>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {STATUSES.map(([key, label]) => (
                  <Pressable key={key} onPress={() => { setStatus(key); setRole(""); }} accessibilityRole="button" accessibilityState={{ selected: status === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${status === key ? "bg-primary" : "bg-gray-50"}`}>
                    <Text className={`text-sm font-semibold ${status === key ? "text-white" : "text-gray-600"}`}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">Filter by role</Text>
              <View className="flex-row flex-wrap gap-2">
                {[["", "All roles"], ...roles].map(([key, label]) => (
                  <Pressable key={key} onPress={() => setRole(key)} accessibilityRole="button" accessibilityLabel={`Filter role: ${label}`} accessibilityState={{ selected: role === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${role === key ? "bg-teal-50" : "bg-gray-50"}`}>
                    <Text className={`text-sm font-semibold ${role === key ? "text-teal-800" : "text-gray-600"}`}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <Text className="mr-1 text-xs text-gray-500">Sort by</Text>
                {[["name", "Name A–Z"], ["newest", "Newest added"]].map(([key, label]) => (
                  <Pressable key={key} onPress={() => setSort(key)} accessibilityRole="button" accessibilityState={{ selected: sort === key }} className={`min-h-11 justify-center rounded-lg px-3 py-2 ${sort === key ? "bg-teal-50" : ""}`}>
                    <Text className={`text-xs font-semibold ${sort === key ? "text-teal-800" : "text-gray-500"}`}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-sm text-gray-500">{filtered.length} of {byStatus.length} {status} employees</Text>
              <View className="flex-row flex-wrap gap-3">
                {query || role || status !== "active" || sort !== "name" ? <Pressable onPress={() => { setQuery(""); setRole(""); setStatus("active"); setSort("name"); }} accessibilityRole="button" className="min-h-11 justify-center"><Text className="text-sm font-semibold text-primary">Reset filters</Text></Pressable> : null}
                <Pressable onPress={refresh} disabled={refreshing} accessibilityRole="button" accessibilityState={{ busy: refreshing, disabled: refreshing }} className="min-h-11 justify-center"><Text className="text-sm font-semibold text-primary">{refreshing ? "Refreshing…" : "Refresh"}</Text></Pressable>
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
          <Pressable onPress={() => openProfile(item)} accessibilityRole="button" accessibilityLabel={`View employee profile: ${nameOf(item)}`} className={`mb-3 rounded-xl border bg-white p-4 active:bg-teal-50 ${isActive(item) ? "border-gray-200" : "border-dashed border-gray-300"}`}>
            <View className={isDesktop ? "flex-row items-center gap-5" : ""}>
              <View className="flex-row items-center gap-3" style={isDesktop ? { flex: 3, minWidth: 0 } : undefined}>
                <Avatar employee={item} />
                <View className="flex-1">
                  <Text className={`text-base font-bold ${isActive(item) ? "text-gray-900" : "text-gray-500"}`}>{nameOf(item)}</Text>
                  <StatusText employee={item} />
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
                <Text className="mt-2 text-sm font-semibold text-primary">View profile</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={editing !== null} onClose={closeForm} title={isNew ? "Add employee" : "Edit employee"} footer={<Button title="Save employee" loading={busy} onPress={submit} />}>
        {isNew ? <Text className="mb-4 text-sm leading-5 text-gray-500">Add a team member to your shop. Assign them to a repair from the repair workspace after the required approval and payment.</Text> : null}
        {formError ? <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</Text> : null}
        <View className={isMobile ? "" : "flex-row gap-3"}>
          <View style={isMobile ? undefined : { flex: 1 }}><TextField label="First name *" value={form.firstName} onChangeText={setField("firstName")} placeholder="Juan" maxLength={LIMITS.personName} editable={!busy} /></View>
          <View style={isMobile ? undefined : { flex: 1 }}><TextField label="Last name *" value={form.lastName} onChangeText={setField("lastName")} placeholder="Dela Cruz" maxLength={LIMITS.personName} editable={!busy} /></View>
        </View>
        <TextField label="Role *" value={form.role} onChangeText={setField("role")} placeholder="e.g. Technician" maxLength={LIMITS.employeeRole} editable={!busy} />
        <TextField label="Phone (optional)" value={form.phone} onChangeText={(value) => setField("phone")(cleanPhoneInput(value))} error={phoneProblem(form.phone)} placeholder={PHONE_PLACEHOLDER} keyboardType="phone-pad" inputMode="tel" maxLength={PHONE_MAX_LENGTH} editable={!busy} />
        <TextField label="Email (optional)" value={form.email} onChangeText={setField("email")} placeholder="tech@example.com" autoCapitalize="none" keyboardType="email-address" inputMode="email" maxLength={LIMITS.email} editable={!busy} />
        <Text className="text-xs text-gray-400">* Required fields. Contact details can be left empty.</Text>
      </Modal>

      <Modal
        visible={Boolean(selected)}
        onClose={() => { if (!busy) setSelected(null); }}
        title="Employee profile"
        footer={selected ? (
          <View className={isMobile ? "gap-3" : "flex-row gap-3"}>
            <View className={isMobile ? "" : "flex-1"}><Button title="Edit details" variant="outline" disabled={busy} onPress={() => openEdit(selected)} /></View>
            <View className={isMobile ? "" : "flex-1"}>
              <Button title={isActive(selected) ? "Deactivate" : "Reactivate"} variant={isActive(selected) ? "outline" : "primary"} loading={busy} onPress={() => changeStatus(selected)} />
            </View>
          </View>
        ) : null}
      >
        {selected ? (
          <View>
            {profileError ? <Text accessibilityRole="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileError}</Text> : null}
            <View className="mb-4 flex-row items-center gap-3">
              <Avatar employee={selected} />
              <View className="flex-1"><Text className="text-lg font-bold text-gray-900">{nameOf(selected)}</Text><Text className="mt-1 text-sm text-gray-500">{roleOf(selected) || "Role not specified"}</Text></View>
            </View>
            <Text className={`mb-4 text-xs font-semibold ${isActive(selected) ? "text-emerald-700" : "text-gray-500"}`}>{isActive(selected) ? "Active employee" : "Inactive employee"} · #{selected.id}</Text>
            {Number(selected.open_assignment_count) ? <Text className="mb-4 rounded-lg bg-teal-50 p-3 text-xs leading-5 text-primary-soft-foreground">Assigned to {selected.open_assignment_count} unfinished repair{Number(selected.open_assignment_count) === 1 ? "" : "s"}. Reassign {Number(selected.open_assignment_count) === 1 ? "it" : "them"} before deactivating this employee.</Text> : null}
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
