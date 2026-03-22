import { useState } from "react";
import { toast } from "sonner";
import { getHealthDeclarations, saveHealthDeclaration } from "../store";
import type { HealthDeclaration, HealthQuestion } from "../types";
import { generateId } from "../utils";

// ─── Admin: Health Questions Manager ─────────────────────────────────────────
interface QMProps {
  questions: HealthQuestion[];
  onChange: (qs: HealthQuestion[]) => void;
  enabled: boolean;
  onToggle: () => void;
}

export function HealthQuestionsManager({
  questions,
  onChange,
  enabled,
  onToggle,
}: QMProps) {
  const [newQ, setNewQ] = useState("");
  const [newType, setNewType] = useState<HealthQuestion["type"]>("yesno");
  const [newRequired, setNewRequired] = useState<
    HealthQuestion["requiredAnswer"] | "none"
  >("none");

  const addQuestion = () => {
    if (!newQ.trim()) return;
    const q: HealthQuestion = {
      id: generateId(),
      question: newQ.trim(),
      type: newType,
      requiredAnswer: newRequired === "none" ? undefined : newRequired,
    };
    onChange([...questions, q]);
    setNewQ("");
  };

  const removeQuestion = (id: string) =>
    onChange(questions.filter((q) => q.id !== id));

  return (
    <div
      className="p-5 rounded-2xl space-y-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-slate-300 font-semibold">🏥 Sağlık Tarama Formu</p>
        <button
          type="button"
          data-ocid="profile.health_screening.toggle"
          onClick={onToggle}
          className="relative w-12 h-6 rounded-full transition-colors"
          style={{
            background: enabled
              ? "rgba(14,165,233,0.6)"
              : "rgba(255,255,255,0.15)",
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{
              transform: enabled ? "translateX(24px)" : "translateX(0)",
            }}
          />
        </button>
      </div>
      <p className="text-slate-500 text-xs">
        Ziyaretçi kaydında sağlık tarama formu göster. Belirli cevaplar girişi
        engelleyebilir.
      </p>

      {enabled && (
        <>
          {/* Question list */}
          {questions.length > 0 && (
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  data-ocid={`health.question.item.${idx + 1}`}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm">{q.question}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {q.type === "yesno" ? "Evet/Hayır" : "Serbest metin"}
                      {q.requiredAnswer &&
                        ` • Zorunlu cevap: ${q.requiredAnswer === "yes" ? "Evet" : "Hayır"}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid={`health.question.delete_button.${idx + 1}`}
                    onClick={() => removeQuestion(q.id)}
                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add question */}
          <div
            className="p-4 rounded-xl space-y-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-slate-400 text-xs font-semibold">
              Yeni Soru Ekle
            </p>
            <input
              type="text"
              data-ocid="health.question.input"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="Soru metni..."
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            />
            <div className="flex gap-2">
              <select
                data-ocid="health.question.type.select"
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as HealthQuestion["type"])
                }
                className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <option value="yesno">Evet/Hayır</option>
                <option value="text">Serbest Metin</option>
              </select>
              {newType === "yesno" && (
                <select
                  data-ocid="health.question.required.select"
                  value={newRequired}
                  onChange={(e) =>
                    setNewRequired(
                      e.target.value as
                        | HealthQuestion["requiredAnswer"]
                        | "none",
                    )
                  }
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <option value="none">Zorunlu cevap yok</option>
                  <option value="yes">Evet olmalı</option>
                  <option value="no">Hayır olmalı</option>
                </select>
              )}
            </div>
            <button
              type="button"
              data-ocid="health.question.add_button"
              onClick={addQuestion}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: "rgba(14,165,233,0.25)",
                border: "1px solid rgba(14,165,233,0.4)",
              }}
            >
              + Soru Ekle
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Visitor: Health Screening Step ──────────────────────────────────────────
interface ScreeningProps {
  questions: HealthQuestion[];
  companyId: string;
  visitorId: string;
  visitorName: string;
  onPassed: (declaration: HealthDeclaration) => void;
  onBlocked: () => void;
}

export function HealthScreeningStep({
  questions,
  companyId,
  visitorId,
  visitorName,
  onPassed,
  onBlocked,
}: ScreeningProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, ""])),
  );
  const [blocked, setBlocked] = useState(false);
  const [blockingQuestion, setBlockingQuestion] = useState("");

  const handleSubmit = () => {
    // Check required answers
    for (const q of questions) {
      if (q.requiredAnswer) {
        const ans = answers[q.id];
        const required = q.requiredAnswer === "yes" ? "evet" : "hayır";
        if (ans.toLowerCase() !== required) {
          setBlockingQuestion(q.question);
          setBlocked(true);
          const decl: HealthDeclaration = {
            id: generateId(),
            companyId,
            visitorId,
            visitorName,
            submittedAt: Date.now(),
            answers: questions.map((qq) => ({
              questionId: qq.id,
              question: qq.question,
              answer: answers[qq.id] || "",
            })),
            passed: false,
          };
          saveHealthDeclaration(decl);
          onBlocked();
          return;
        }
      }
    }
    const decl: HealthDeclaration = {
      id: generateId(),
      companyId,
      visitorId,
      visitorName,
      submittedAt: Date.now(),
      answers: questions.map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: answers[q.id] || "",
      })),
      passed: true,
    };
    saveHealthDeclaration(decl);
    onPassed(decl);
  };

  if (blocked) {
    return (
      <div
        data-ocid="health.blocked.panel"
        className="p-5 rounded-2xl text-center space-y-3"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.3)",
        }}
      >
        <div className="text-4xl">🚫</div>
        <p className="text-red-400 font-semibold">Sağlık Taraması Başarısız</p>
        <p className="text-slate-400 text-sm">
          Aşağıdaki soruya verilen cevap girişe izin vermemektedir:
        </p>
        <p className="text-slate-300 text-sm italic">"{blockingQuestion}"</p>
        <p className="text-slate-500 text-xs">
          Lütfen güvenlik görevlisine başvurun.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{
          background: "rgba(14,165,233,0.08)",
          border: "1px solid rgba(14,165,233,0.2)",
        }}
      >
        <span className="text-2xl">🏥</span>
        <div>
          <p className="text-cyan-300 text-sm font-semibold">
            Sağlık Tarama Formu
          </p>
          <p className="text-slate-400 text-xs">
            Lütfen aşağıdaki soruları yanıtlayın.
          </p>
        </div>
      </div>

      {questions.map((q, idx) => (
        <div key={q.id} data-ocid={`health.answer.item.${idx + 1}`}>
          <p className="text-slate-300 text-sm mb-2">
            {idx + 1}. {q.question}
            {q.requiredAnswer && <span className="text-red-400 ml-1">*</span>}
          </p>
          {q.type === "yesno" ? (
            <div className="flex gap-3">
              {["Evet", "Hayır"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  data-ocid={`health.answer_${opt.toLowerCase()}.toggle`}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, [q.id]: opt.toLowerCase() }))
                  }
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background:
                      answers[q.id] === opt.toLowerCase()
                        ? opt === "Evet"
                          ? "rgba(34,197,94,0.3)"
                          : "rgba(239,68,68,0.3)"
                        : "rgba(255,255,255,0.05)",
                    border: `1px solid ${
                      answers[q.id] === opt.toLowerCase()
                        ? opt === "Evet"
                          ? "rgba(34,197,94,0.5)"
                          : "rgba(239,68,68,0.5)"
                        : "rgba(255,255,255,0.1)"
                    }`,
                    color:
                      answers[q.id] === opt.toLowerCase()
                        ? opt === "Evet"
                          ? "#22c55e"
                          : "#ef4444"
                        : "#94a3b8",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              data-ocid="health.answer.input"
              value={answers[q.id] || ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            />
          )}
        </div>
      ))}

      <button
        type="button"
        data-ocid="health.submit_button"
        onClick={handleSubmit}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
        style={{
          background: "rgba(14,165,233,0.3)",
          border: "1px solid rgba(14,165,233,0.5)",
        }}
      >
        Beyanı Onayla ve Devam Et
      </button>
    </div>
  );
}

// ─── Admin: Declarations List ─────────────────────────────────────────────────
export function HealthDeclarationsTab({ companyId }: { companyId: string }) {
  const [filter, setFilter] = useState<"all" | "passed" | "failed">("all");
  const all = getHealthDeclarations(companyId);
  const filtered = all.filter((d) => {
    if (filter === "passed") return d.passed;
    if (filter === "failed") return !d.passed;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">
          🏥 Sağlık Beyanları
        </h2>
        <div className="flex gap-2">
          {(["all", "passed", "failed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              data-ocid={`health.${f}.tab`}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background:
                  filter === f
                    ? "rgba(14,165,233,0.25)"
                    : "rgba(255,255,255,0.05)",
                border: `1px solid ${
                  filter === f
                    ? "rgba(14,165,233,0.5)"
                    : "rgba(255,255,255,0.1)"
                }`,
                color: filter === f ? "#0ea5e9" : "#94a3b8",
              }}
            >
              {f === "all"
                ? "Tümü"
                : f === "passed"
                  ? "✅ Geçti"
                  : "🚫 Engellendi"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          data-ocid="health.empty_state"
          className="p-8 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="text-4xl mb-3">🏥</div>
          <p className="text-slate-400 text-sm">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d, idx) => (
            <div
              key={d.id}
              data-ocid={`health.item.${idx + 1}`}
              className="p-4 rounded-2xl"
              style={{
                background: d.passed
                  ? "rgba(34,197,94,0.05)"
                  : "rgba(239,68,68,0.05)",
                border: `1px solid ${
                  d.passed ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"
                }`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white text-sm font-semibold">
                    {d.visitorName}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {new Date(d.submittedAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <span
                  className="px-2 py-0.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: d.passed
                      ? "rgba(34,197,94,0.2)"
                      : "rgba(239,68,68,0.2)",
                    color: d.passed ? "#22c55e" : "#ef4444",
                  }}
                >
                  {d.passed ? "✅ Geçti" : "🚫 Engellendi"}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {d.answers.map((a) => (
                  <div key={a.questionId} className="flex gap-2 text-xs">
                    <span className="text-slate-400 flex-1">{a.question}</span>
                    <span className="text-slate-300 font-medium">
                      {a.answer || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
