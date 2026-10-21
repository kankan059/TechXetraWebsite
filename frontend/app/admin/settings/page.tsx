"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings,
  Calendar,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Mail,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { FestDay, AdminSettings } from "@/types/api";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [festDays, setFestDays] = useState<FestDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states for global settings
  const [gatePassPricePaise, setGatePassPricePaise] = useState<string>("");
  const [purchasesEnabled, setPurchasesEnabled] = useState<boolean>(true);
  const [supportContact, setSupportContact] = useState<string>("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Form states for fest day editing
  const [editingDay, setEditingDay] = useState<FestDay | null>(null);
  const [dayDate, setDayDate] = useState("");
  const [dayDescription, setDayDescription] = useState("");
  const [savingDay, setSavingDay] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [settRes, daysRes] = await Promise.all([
        adminApi.settings.get().catch(() => ({})),
        adminApi.festDays.list().catch(() => []),
      ]);

      setSettings(settRes);
      setFestDays(daysRes || []);

      if (settRes) {
        if (settRes.gate_pass_price_paise !== undefined) {
          setGatePassPricePaise(String(settRes.gate_pass_price_paise));
        }
        if (settRes.purchases_enabled !== undefined) {
          setPurchasesEnabled(
            settRes.purchases_enabled === true ||
              settRes.purchases_enabled === "1" ||
              settRes.purchases_enabled === 1,
          );
        }
        if (settRes.support_contact !== undefined) {
          setSupportContact(String(settRes.support_contact));
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load festival configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.settings.update({
        gate_pass_price_paise: gatePassPricePaise ? Number(gatePassPricePaise) : undefined,
        purchases_enabled: purchasesEnabled ? "1" : "0",
        support_contact: supportContact.trim(),
      });

      setSuccess("Global festival settings updated successfully!");
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenDayEdit = (day: FestDay) => {
    setEditingDay(day);
    setDayDate(day.date || "");
    setDayDescription(day.description || "");
  };

  const handleSaveDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;

    setSavingDay(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.festDays.update(editingDay.day_number, {
        date: dayDate.trim(),
        description: dayDescription.trim(),
      });

      setSuccess(`Fest Day ${editingDay.day_number} schedule updated!`);
      setEditingDay(null);
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update fest day");
    } finally {
      setSavingDay(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            FESTIVAL CONFIGURATION & SCHEDULE
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Festival Settings & Schedule
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Control global ticket pricing, ticketing kill-switch, support contacts, and Day 1–3 dates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
          Loading settings and fest schedules...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Global Settings Form */}
          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#55DFFF]/10 text-[#55DFFF]">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Global Settings</h2>
                <p className="text-xs text-slate-400">Gate pass parameters & ticket sales availability</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Gate Pass Price (in Paise)
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-white/10 bg-black/40 px-3">
                  <span className="text-xs text-slate-500">₹</span>
                  <input
                    type="number"
                    value={gatePassPricePaise}
                    onChange={(e) => setGatePassPricePaise(e.target.value)}
                    placeholder="e.g. 30000 (for ₹300)"
                    className="w-full bg-transparent px-2 py-2.5 text-sm text-white focus:outline-none"
                  />
                  {gatePassPricePaise && (
                    <span className="text-xs text-emerald-400">
                      = ₹{(Number(gatePassPricePaise) / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">
                  Festival Support Email / Contact
                </label>
                <div className="mt-1.5 flex items-center rounded-xl border border-white/10 bg-black/40 px-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={supportContact}
                    onChange={(e) => setSupportContact(e.target.value)}
                    placeholder="support@techxetra.in"
                    className="w-full bg-transparent px-2 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div>
                  <p className="text-sm font-medium text-white">Purchases Enabled</p>
                  <p className="text-xs text-slate-400">
                    Master killswitch to pause all attendee pass checkouts and payments
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPurchasesEnabled(!purchasesEnabled)}
                  className="text-[#55DFFF] transition"
                >
                  {purchasesEnabled ? (
                    <ToggleRight className="h-8 w-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-slate-500" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#55DFFF] py-3 text-sm font-semibold text-black transition hover:bg-[#55DFFF]/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingSettings ? "Saving Settings..." : "Save Global Settings"}
              </button>
            </form>
          </div>

          {/* Fest Days Schedule */}
          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#55DFFF]/10 text-[#55DFFF]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Fest Days Schedule</h2>
                <p className="text-xs text-slate-400">Festival dates, inauguration, and grand finale schedule</p>
              </div>
            </div>

            <div className="space-y-4">
              {festDays.map((day) => (
                <div
                  key={day.day_number}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition hover:border-[#55DFFF]/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-[#55DFFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#55DFFF]">
                        DAY {day.day_number}
                      </span>
                      <h3 className="mt-2 text-base font-semibold text-white">
                        {day.date || "Date Unset"}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {day.description || "No description provided."}
                      </p>
                      {day.starts_at && (
                        <p className="mt-1 font-mono text-[11px] text-slate-500">
                          {new Date(day.starts_at).toLocaleTimeString()} –{" "}
                          {new Date(day.ends_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenDayEdit(day)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
                    >
                      Edit Day
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Fest Day Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">
              Edit Fest Day {editingDay.day_number}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Update date and programmatic agenda description.
            </p>

            <form onSubmit={handleSaveDay} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={dayDate}
                  onChange={(e) => setDayDate(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Description</label>
                <textarea
                  value={dayDescription}
                  onChange={(e) => setDayDescription(e.target.value)}
                  rows={3}
                  placeholder="e.g. Inauguration, Hackathons & Cultural Pro-Nite"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDay}
                  className="rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                >
                  {savingDay ? "Saving..." : "Save Day Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
