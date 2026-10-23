"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  ArrowLeft,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Lock,
  History,
  AlertCircle,
  CheckCircle2,
  Users,
  Shield,
  X,
} from "lucide-react";
import type { EsportsScore, UserProfile } from "@/types/api";
import { staffApi } from "@/services/staff-api";
import { participantApi } from "@/services/participant-api";
import { ApiError } from "@/lib/api-client";

interface StaffScoreEvent {
  id: string;
  slug: string;
  title: string;
  category: string;
  scoring_enabled: number | boolean;
  scoring_status: "NOT_APPLICABLE" | "OPEN" | "FINALIZED";
  max_rounds: number;
  volunteers_can_score: number | boolean;
  leaderboard_public: number | boolean;
}

interface ScoreHistoryItem {
  id: string;
  score_id: string;
  event_id: string;
  registration_id: string;
  round_no: number;
  old_score: number | null;
  new_score: number | null;
  version: number;
  action: "CREATE" | "UPDATE" | "DELETE";
  reason: string;
  actor_id: string;
  actor_name?: string;
  created_at: number;
}

interface StaffScoresResponse {
  event: StaffScoreEvent;
  scores: EsportsScore[];
  history: ScoreHistoryItem[];
}

export default function StaffEventScoringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<StaffScoresResponse | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Score modal state (Add or Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "UPDATE">("CREATE");
  const [targetScore, setTargetScore] = useState<EsportsScore | null>(null);

  const [inputRegistrationId, setInputRegistrationId] = useState("");
  const [inputRoundNo, setInputRoundNo] = useState(1);
  const [inputScore, setInputScore] = useState("");
  const [inputReason, setInputReason] = useState("");
  const [submittingScore, setSubmittingScore] = useState(false);

  // Delete modal state
  const [deleteModalScore, setDeleteModalScore] = useState<EsportsScore | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingScore, setDeletingScore] = useState(false);

  // Finalize state
  const [finalizing, setFinalizing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadScores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify staff session
      try {
        const meData = await participantApi.auth.me();
        setUser(meData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/login?redirect=/staff/events/${id}/scores`);
          return;
        }
      }

      const resData = await staffApi.scores.get(id);
      setData(resData as unknown as StaffScoresResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading scoring matrix");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void loadScores();
  }, [loadScores]);

  const openCreateModal = (regId?: string, round?: number) => {
    setModalMode("CREATE");
    setTargetScore(null);
    setInputRegistrationId(regId || "");
    setInputRoundNo(round || 1);
    setInputScore("");
    setInputReason("");
    setModalOpen(true);
  };

  const openEditModal = (score: EsportsScore) => {
    setModalMode("UPDATE");
    setTargetScore(score);
    setInputRegistrationId(score.registration_id);
    setInputRoundNo(score.round_no);
    setInputScore(String(score.score));
    setInputReason("");
    setModalOpen(true);
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRegistrationId.trim()) {
      setError("Registration ID is required.");
      return;
    }

    const numScore = parseFloat(inputScore);
    if (isNaN(numScore)) {
      setError("Please enter a valid numeric score.");
      return;
    }

    if (modalMode === "UPDATE" && !inputReason.trim()) {
      setError("A change reason is mandatory when modifying existing scores.");
      return;
    }

    setSubmittingScore(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: {
        registration_id: string;
        round_no: number;
        score: number;
        expected_version?: number;
        reason?: string;
      } = {
        registration_id: inputRegistrationId.trim(),
        round_no: inputRoundNo,
        score: numScore,
      };

      if (modalMode === "UPDATE" && targetScore) {
        payload.expected_version = targetScore.version;
        payload.reason = inputReason.trim();
      }

      await staffApi.scores.upsert(id, payload);

      setSuccess(`Score for Round ${inputRoundNo} saved successfully!`);
      setModalOpen(false);
      void loadScores();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "SCORE_VERSION_CONFLICT") {
        setError("Score was modified concurrently by another referee. Reloading live data.");
      } else {
        setError(err instanceof Error ? err.message : "Error saving score");
      }
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleDeleteScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalScore || !deleteReason.trim()) {
      setError("A deletion reason is required for the audit log.");
      return;
    }

    setDeletingScore(true);
    setError(null);
    setSuccess(null);

    try {
      await staffApi.scores.delete(id, deleteModalScore.id, deleteReason.trim());

      setSuccess(`Score deleted and audit log recorded.`);
      setDeleteModalScore(null);
      setDeleteReason("");
      void loadScores();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting score");
    } finally {
      setDeletingScore(false);
    }
  };

  const handleFinalize = async () => {
    if (
      !confirm(
        "Are you sure you want to finalize tournament scores? This will lock the scoreboard."
      )
    )
      return;

    setFinalizing(true);
    setError(null);
    setSuccess(null);

    try {
      await staffApi.scores.finalize(id);

      setSuccess("Tournament scoring finalized and locked!");
      void loadScores();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error finalizing scoring");
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-xl bg-white/10" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 text-xl font-bold">Scoring Unavailable</h1>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <Link
            href="/events"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black"
          >
            ← Return to Events
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const { event, scores, history } = data;
  const isFinalized = event.scoring_status === "FINALIZED";
  const maxRounds = event.max_rounds || 5;
  const roundCols = Array.from({ length: maxRounds }, (_, i) => i + 1);

  // Group scores by registration
  const participantMap: Record<
    string,
    {
      registration_id: string;
      display_name: string;
      rounds: Record<number, EsportsScore>;
      total: number;
    }
  > = {};

  for (const s of scores) {
    if (!participantMap[s.registration_id]) {
      participantMap[s.registration_id] = {
        registration_id: s.registration_id,
        display_name: s.team_name || s.participant_name || s.registration_id,
        rounds: {},
        total: 0,
      };
    }
    participantMap[s.registration_id].rounds[s.round_no] = s;
    participantMap[s.registration_id].total += s.score;
  }

  const participants = Object.values(participantMap).sort(
    (a, b) => b.total - a.total
  );

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/events/${event.slug || event.id}`}
            className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event Page
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:bg-white/10"
            >
              <History className="h-3.5 w-3.5" />
              {showHistory ? "View Score Matrix" : "View Audit History"}
            </button>

            <button
              type="button"
              onClick={() => void loadScores()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Live Refresh
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-8 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-400/10 px-3 py-0.5 text-xs font-semibold text-cyan-300">
                REFEREE SCORING CONSOLE
              </span>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                  isFinalized
                    ? "bg-red-400/10 text-red-300"
                    : "bg-emerald-400/10 text-emerald-300"
                }`}
              >
                {event.scoring_status}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
              {event.title}
            </h1>
            <p className="mt-1 text-xs text-white/50">
              Max Rounds: {maxRounds} · Optimistic concurrency enabled
            </p>
          </div>

          {!isFinalized && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-200"
              >
                <Plus className="h-4 w-4" />
                Enter Score
              </button>

              <button
                type="button"
                disabled={finalizing}
                onClick={handleFinalize}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-400 hover:text-black"
              >
                <Lock className="h-3.5 w-3.5" />
                Finalize Tournament
              </button>
            </div>
          )}
        </div>

        {/* Alert Banners */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Main Content: Scoring Matrix OR Audit History */}
        {showHistory ? (
          /* Audit History Table */
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0C1017]">
            <div className="border-b border-white/10 p-6">
              <h2 className="text-lg font-bold text-white">Immutable Score History</h2>
              <p className="mt-1 text-xs text-white/50">
                Every creation, modification and deletion is recorded with referee signature and reason.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-white/50">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Round</th>
                    <th className="px-6 py-4">Score Change</th>
                    <th className="px-6 py-4">Referee</th>
                    <th className="px-6 py-4">Mandatory Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-white/60">
                        {new Date(h.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            h.action === "CREATE"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : h.action === "UPDATE"
                              ? "bg-blue-400/10 text-blue-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {h.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white">Round {h.round_no}</td>
                      <td className="px-6 py-4 font-mono text-cyan-200">
                        {h.old_score !== null ? `${h.old_score} → ` : ""}
                        {h.new_score !== null ? h.new_score : "Deleted"}
                      </td>
                      <td className="px-6 py-4 text-white/80">
                        {h.actor_name || h.actor_id}
                      </td>
                      <td className="px-6 py-4 text-white/60">{h.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Live Score Matrix */
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0C1017]">
            <div className="border-b border-white/10 p-6">
              <h2 className="text-lg font-bold text-white">Round-by-Round Score Matrix</h2>
              <p className="mt-1 text-xs text-white/50">
                Click any existing score to edit with reason, or click empty slots to log points.
              </p>
            </div>

            {participants.length === 0 ? (
              <div className="py-20 text-center text-sm text-white/40">
                <Trophy className="mx-auto mb-3 h-10 w-10 text-white/20" />
                No tournament participants or scores entered yet. Click &apos;Enter Score&apos; to begin.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-xs font-semibold uppercase text-white/50">
                      <th className="px-6 py-4">Rank / Participant</th>
                      {roundCols.map((r) => (
                        <th key={r} className="px-4 py-4 text-center">
                          R{r}
                        </th>
                      ))}
                      <th className="px-6 py-4 text-right">Total Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {participants.map((p, idx) => (
                      <tr key={p.registration_id} className="transition hover:bg-white/[0.02]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-cyan-300">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-white">{p.display_name}</p>
                              <p className="text-[10px] text-white/40">ID: {p.registration_id}</p>
                            </div>
                          </div>
                        </td>

                        {roundCols.map((r) => {
                          const scoreEntry = p.rounds[r];
                          return (
                            <td key={r} className="px-4 py-4 text-center">
                              {scoreEntry ? (
                                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1">
                                  <span className="font-mono font-bold text-cyan-300">
                                    {scoreEntry.score}
                                  </span>
                                  {!isFinalized && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        title="Edit Score"
                                        onClick={() => openEditModal(scoreEntry)}
                                        className="text-white/40 hover:text-cyan-200"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Delete Score"
                                        onClick={() => setDeleteModalScore(scoreEntry)}
                                        className="text-white/40 hover:text-red-400"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                !isFinalized && (
                                  <button
                                    type="button"
                                    onClick={() => openCreateModal(p.registration_id, r)}
                                    className="rounded border border-dashed border-white/10 px-2 py-0.5 text-xs text-white/30 hover:border-cyan-300/40 hover:text-cyan-300"
                                  >
                                    +
                                  </button>
                                )
                              )}
                            </td>
                          );
                        })}

                        <td className="px-6 py-4 text-right font-mono text-base font-extrabold text-amber-300">
                          {p.total.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Enter / Edit Score Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white">
                  {modalMode === "CREATE" ? "Enter Round Score" : "Update Score (Version Conflict Guard)"}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 text-white/60 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveScore} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Registration ID / Team
                  </label>
                  <input
                    type="text"
                    required
                    value={inputRegistrationId}
                    onChange={(e) => setInputRegistrationId(e.target.value)}
                    placeholder="reg_01j..."
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-cyan-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/60">
                      Round No. (1–{maxRounds})
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={maxRounds}
                      value={inputRoundNo}
                      onChange={(e) => setInputRoundNo(parseInt(e.target.value, 10))}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-cyan-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/60">
                      Score Points
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={inputScore}
                      onChange={(e) => setInputScore(e.target.value)}
                      placeholder="e.g. 45"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-cyan-300"
                    />
                  </div>
                </div>

                {modalMode === "UPDATE" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300">
                      Mandatory Change Reason (Audit Log)
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={inputReason}
                      onChange={(e) => setInputReason(e.target.value)}
                      placeholder="e.g. Added 5 placement points after replay review"
                      className="mt-1.5 w-full rounded-xl border border-amber-400/30 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-amber-300"
                    />
                    <p className="mt-1 text-[10px] text-white/40">
                      Current record version: {targetScore?.version}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingScore}
                    className="rounded-xl bg-cyan-300 px-5 py-2 text-xs font-bold text-black transition hover:bg-cyan-200 disabled:opacity-50"
                  >
                    {submittingScore ? "Saving..." : "Save Score"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalScore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#0C1017] p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-red-300">Delete Score Entry</h3>
              <p className="mt-2 text-xs text-white/60">
                You are removing Round {deleteModalScore.round_no} score ({deleteModalScore.score} pts)
                for {deleteModalScore.registration_id}.
              </p>

              <form onSubmit={handleDeleteScore} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70">
                    Mandatory Reason for Deletion
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="e.g. Entered for incorrect squad by mistake"
                    className="mt-1.5 w-full rounded-xl border border-red-500/30 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-red-400"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModalScore(null)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deletingScore}
                    className="rounded-xl bg-red-500 px-5 py-2 text-xs font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
                  >
                    {deletingScore ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
