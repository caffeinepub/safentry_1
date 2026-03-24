import { useState } from "react";
import { toast } from "sonner";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  content: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    correct: number;
  }[];
}

const MODULES: TrainingModule[] = [
  {
    id: "vms_basics",
    title: "Ziyaretçi Yönetim Sistemi Temelleri",
    description: "Ziyaretçi kaydı, badge işlemleri ve temel prosedürler",
    content: `Ziyaretçi yönetim sistemi, şirkete gelen tüm ziyaretçilerin güvenli ve kayıt altında karşılanmasını sağlar.

**Temel İlkeler:**
• Her ziyaretçi mutlaka kimlik doğrulamasından geçmeli ve kayıt altına alınmalıdır
• Ziyaretçi rozeti görünür şekilde takılmalı ve tesis içinde her zaman üzerinde bulunmalıdır
• Ziyaretçi ayrılırken çıkış kaydı yapılmalı, rozet geri alınmalıdır
• Kara liste kontrolü, kayıt sırasında otomatik yapılır; uyarı alındığında güvenlik müdürüne haber verilmelidir

**Kayıt Adımları:**
1. Kimlik belgesi kontrol edilir (TC Kimlik veya pasaport)
2. Sistem üzerinden ziyaretçi kaydı oluşturulur
3. Ev sahibi personel onayı alınır (gerekiyorsa)
4. Badge basılır ve ziyaretçiye verilir
5. Tesis kuralları ve NDA ziyaretçiye imzalatılır`,
    questions: [
      {
        id: "q1",
        question: "Ziyaretçi rozeti ne zaman iade alınmalıdır?",
        options: [
          "Ziyaretçi içeri girdiğinde",
          "Ziyaretçi ayrılırken çıkış kaydı sırasında",
          "Randevu saati geldiğinde",
          "Sadece VIP ziyaretçilerden alınır",
        ],
        correct: 1,
      },
      {
        id: "q2",
        question: "Kara liste kontrolü ne zaman yapılır?",
        options: [
          "Sadece şüpheli görünüşlü kişiler için",
          "Haftalık toplu kontrol ile",
          "Kayıt sırasında otomatik olarak",
          "Yalnızca yönetici talebiyle",
        ],
        correct: 2,
      },
      {
        id: "q3",
        question: "Ziyaretçi kimliği doğrulanmadan ne yapılmalıdır?",
        options: [
          "Sisteme kaydedilip içeri alınabilir",
          "Kesinlikle tesis içine alınmamalıdır",
          "Sadece lobi alanına kabul edilir",
          "Ev sahibi izin verirse içeri alınabilir",
        ],
        correct: 1,
      },
    ],
  },
  {
    id: "security_protocols",
    title: "Güvenlik Protokolleri",
    description: "Erişim kontrolü, olay yönetimi ve acil durum prosedürleri",
    content: `Güvenlik protokolleri, tesisin ve çalışanların güvenliğini sağlamak için uyulması zorunlu kurallardır.

**Erişim Kontrolü:**
• Her bölge için yetki seviyeleri tanımlanmıştır; ziyaretçilerin yalnızca izinli bölgelere girişine izin verilmelidir
• Yetkisiz bölgeye giriş girişiminde ziyaretçiyi kibarca yönlendirin ve olayı sisteme kaydedin
• Özel güvenlik bölgelerinde her zaman refakatçi eşliği zorunludur

**Olay Yönetimi:**
• Her olay, ne kadar küçük görünse de sisteme kayıt edilmelidir
• Kritik olaylar (kavga, hırsızlık, yaralanma) güvenlik müdürüne ve yönetimine anında bildirilmelidir
• Olay anında tanıklar varsa isimleri ve ifadeleri kayıt altına alınmalıdır

**Acil Durum Prosedürleri:**
• Yangın alarmında tüm aktif ziyaretçiler sistemden görüntülenerek tahliye koordinasyonu yapılır
• Tahliye listesi, güvenlik görevlisi tarafından ana toplanma noktasına götürülür
• Tüm personelin tahliye noktalarını bilmesi zorunludur`,
    questions: [
      {
        id: "q1",
        question: "Yetkisiz bölgeye giriş girişiminde ne yapılmalıdır?",
        options: [
          "Görmezden gelinir",
          "Yalnızca uyarı verilir",
          "Ziyaretçi yönlendirilir ve olay sisteme kaydedilir",
          "Hemen polisi aramak gerekir",
        ],
        correct: 2,
      },
      {
        id: "q2",
        question: "Yangın alarmında ziyaretçi takibi nasıl yapılır?",
        options: [
          "Ziyaretçiler kendi çıkışını bulur",
          "Sistem üzerinden aktif ziyaretçiler görüntülenerek tahliye koordinasyonu yapılır",
          "Sadece VIP ziyaretçiler takip edilir",
          "Güvenlik kamerası kaydı yeterlidir",
        ],
        correct: 1,
      },
      {
        id: "q3",
        question: "Küçük bir olay yaşandığında ne yapılmalıdır?",
        options: [
          "Önemsiz olduğu için geçilir",
          "Sadece amire sözlü bildirilir",
          "Sisteme kayıt edilmelidir",
          "İki haftada bir yapılan toplantıda raporlanır",
        ],
        correct: 2,
      },
    ],
  },
  {
    id: "kvkk_gdpr",
    title: "KVKK ve Kişisel Veri Güvenliği",
    description:
      "Kişisel verilerin korunması, yasal yükümlülükler ve GDPR uyumu",
    content: `KVKK (Kişisel Verilerin Korunması Kanunu), ziyaretçilerden toplanan verilerin nasıl işleneceğini düzenler.

**Temel İlkeler:**
• Ziyaretçi verileri yalnızca ziyaret yönetimi amacıyla kullanılabilir
• Veriler, toplama amacının gerektirdiğinden fazla süre saklanamaz (sistem 90 gün sonra otomatik siler)
• Ziyaretçi, kendi verilerinin görülmesini ve silinmesini talep etme hakkına sahiptir
• Veri ihlali durumunda yetkili kişiler derhal bilgilendirilmelidir

**Yasaklar:**
• Ziyaretçi bilgileri üçüncü taraflarla paylaşılamaz
• Sistemden veri çıktısı alınması yetkili personel tarafından yapılmalıdır
• Ziyaretçi fotoğrafları veya belgeleri şirket dışına aktarılamaz

**Ziyaretçi Hakları:**
• Bireysel başvuru (SAR) formu, ziyaretçiler tarafından doldurulabilir
• Başvurular en geç 30 gün içinde yanıtlanmalıdır
• Silme talepleri uygun şekilde işlenip belgelere kaydedilmelidir`,
    questions: [
      {
        id: "q1",
        question: "Ziyaretçi verileri ne kadar süre saklanabilir?",
        options: [
          "Süresiz",
          "En fazla 1 yıl",
          "Sistem 90 gün sonra otomatik siler",
          "Yalnızca ziyaret günü",
        ],
        correct: 2,
      },
      {
        id: "q2",
        question:
          "Bir ziyaretçi verilerinin silinmesini talep ederse ne yapılmalıdır?",
        options: [
          "Talep reddedilir",
          "Yalnızca üst yönetici silebilir, zaman sınırı yoktur",
          "Talep işleme alınır ve en geç 30 gün içinde yanıtlanır",
          "Ziyaretten 1 yıl sonra silinecektir bildirisi verilir",
        ],
        correct: 2,
      },
      {
        id: "q3",
        question: "Ziyaretçi bilgileri kimlerle paylaşılabilir?",
        options: [
          "İş ortakları ile serbestçe",
          "Yalnızca yetkili şirket personeli ile, amaç dahilinde",
          "Tüm çalışanlarla paylaşılabilir",
          "Sosyal medya hesaplarında yayınlanabilir",
        ],
        correct: 1,
      },
    ],
  },
  {
    id: "emergency_procedures",
    title: "Acil Durum Prosedürleri",
    description: "Yangın, tahliye, tıbbi acil durum ve kriz yönetimi",
    content: `Acil durumlarda sakin kalmak ve doğru prosedürleri uygulamak hayat kurtarır.

**Yangın Prosedürü:**
1. Yangın alarmını aktifleştir
2. Sistemi açarak içerideki tüm ziyaretçileri ve personeli görüntüle
3. Tahliye listesini indir veya ekranda görüntüle
4. Ziyaretçileri acil çıkışlara yönlendir
5. Toplanma noktasında sayım yap

**Tıbbi Acil:**
• Sistem üzerinden ziyaretçinin acil iletişim kişisini bul
• İlk yardım yetkili personelini çağır
• Gerekirse 112'yi ara
• Olayı sisteme kaydet

**Kriz Yönetimi:**
• Güvenli olmayan bir durum tespit edildiğinde LOCKDOWN modunu aktifleştir
• Lockdown durumunda tüm erişim noktaları kapatılır
• Tüm aktif ziyaretçilere anlık uyarı gönder
• Güvenlik ve yönetim ekibiyle koordineli çalış`,
    questions: [
      {
        id: "q1",
        question: "Yangın prosedüründe ziyaretçi listesine nasıl ulaşılır?",
        options: [
          "Elle tutulan kağıt defterden",
          "Sistem üzerinden aktif ziyaretçiler görüntülenir",
          "Hafıza ile hatırlanır",
          "Güvenlik kamerasından izlenir",
        ],
        correct: 1,
      },
      {
        id: "q2",
        question:
          "Tıbbi acil durumda ziyaretçinin acil iletişim kişisine nasıl ulaşılır?",
        options: [
          "Telefon defterinden aranır",
          "Ziyaretçiden öğrenilir",
          "Sistemde kayıtlı acil iletişim bilgisinden",
          "İlgili departman yöneticisine sorulur",
        ],
        correct: 2,
      },
      {
        id: "q3",
        question: "Güvenli olmayan bir durum tespitinde ne aktifleştirilir?",
        options: [
          "Haber uyarısı",
          "VIP protokolü",
          "LOCKDOWN modu",
          "Bakım modu",
        ],
        correct: 2,
      },
    ],
  },
];

interface TrainingRecord {
  moduleId: string;
  completed: boolean;
  score: number;
  completedAt: number;
}

function getTrainingRecords(staffId: string): TrainingRecord[] {
  const raw = localStorage.getItem(`safentry_training_${staffId}`);
  return raw ? JSON.parse(raw) : [];
}

function saveTrainingRecord(staffId: string, record: TrainingRecord) {
  const existing = getTrainingRecords(staffId).filter(
    (r) => r.moduleId !== record.moduleId,
  );
  localStorage.setItem(
    `safentry_training_${staffId}`,
    JSON.stringify([...existing, record]),
  );
}

export function getTrainingCompletionStatus(staffId: string): {
  completed: number;
  total: number;
  allDone: boolean;
} {
  const records = getTrainingRecords(staffId);
  const completed = MODULES.filter((m) =>
    records.find((r) => r.moduleId === m.id && r.completed),
  ).length;
  return {
    completed,
    total: MODULES.length,
    allDone: completed === MODULES.length,
  };
}

export default function TrainingTab({ staffId }: { staffId: string }) {
  const [activeModule, setActiveModule] = useState<TrainingModule | null>(null);
  const [phase, setPhase] = useState<"content" | "quiz" | "result">("content");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);
  const records = getTrainingRecords(staffId);

  const startModule = (mod: TrainingModule) => {
    setActiveModule(mod);
    setPhase("content");
    setAnswers({});
  };

  const startQuiz = () => setPhase("quiz");

  const submitQuiz = () => {
    if (!activeModule) return;
    let correct = 0;
    for (const q of activeModule.questions) {
      if (answers[q.id] === q.correct) correct++;
    }
    const pct = Math.round((correct / activeModule.questions.length) * 100);
    setScore(pct);
    setPhase("result");
    saveTrainingRecord(staffId, {
      moduleId: activeModule.id,
      completed: pct >= 70,
      score: pct,
      completedAt: Date.now(),
    });
    if (pct >= 70) {
      toast.success(
        `🎉 ${activeModule.title} modülü tamamlandı! Skor: ${pct}%`,
      );
    } else {
      toast.error(`❌ Geçme notu 70%. Skorum: ${pct}%. Tekrar deneyin.`);
    }
  };

  const card = (children: React.ReactNode) => (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {children}
    </div>
  );

  if (activeModule) {
    return (
      <div className="max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveModule(null)}
          className="mb-4 text-slate-400 hover:text-white text-sm flex items-center gap-1"
        >
          ← Modüllere Dön
        </button>

        {phase === "content" && (
          <div>
            {card(
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {activeModule.title}
                </h2>
                <p className="text-slate-400 text-sm mb-5">
                  {activeModule.description}
                </p>
                <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                  {activeModule.content.split("**").map((part, i) =>
                    i % 2 === 1 ? (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static content split
                      <strong key={i} className="text-white font-semibold">
                        {part}
                      </strong>
                    ) : (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static content split
                      <span key={i}>{part}</span>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={startQuiz}
                  className="mt-6 px-6 py-3 rounded-xl font-semibold text-white w-full"
                  style={{
                    background: "linear-gradient(135deg,#14b8a6,#0d9488)",
                  }}
                >
                  📝 Sınava Geç
                </button>
              </div>,
            )}
          </div>
        )}

        {phase === "quiz" && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">
              Quiz: {activeModule.title}
            </h2>
            {activeModule.questions.map((q, qi) => (
              <div
                key={q.id}
                data-ocid={`training.quiz.item.${qi + 1}`}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-white font-semibold mb-3">
                  {qi + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      // biome-ignore lint/suspicious/noArrayIndexKey: static options
                      key={oi}
                      className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={oi}
                        checked={answers[q.id] === oi}
                        onChange={() =>
                          setAnswers((a) => ({ ...a, [q.id]: oi }))
                        }
                        className="accent-teal-400"
                      />
                      <span className="text-slate-300 text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              data-ocid="training.quiz.submit_button"
              onClick={submitQuiz}
              disabled={activeModule.questions.some(
                (q) => answers[q.id] === undefined,
              )}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}
            >
              Sınavı Tamamla
            </button>
          </div>
        )}

        {phase === "result" && (
          <div>
            {card(
              <div className="text-center">
                <div
                  className="text-6xl font-bold mb-3"
                  style={{ color: score >= 70 ? "#4ade80" : "#f87171" }}
                >
                  {score}%
                </div>
                <p className="text-white text-xl font-semibold mb-2">
                  {score >= 70 ? "🎉 Başarılı!" : "❌ Başarısız"}
                </p>
                <p className="text-slate-400 text-sm mb-6">
                  {score >= 70
                    ? "Modülü başarıyla tamamladınız."
                    : "Geçme notu 70%'dir. Tekrar deneyebilirsiniz."}
                </p>
                <div className="flex gap-3 justify-center">
                  {score < 70 && (
                    <button
                      type="button"
                      data-ocid="training.retry.button"
                      onClick={() => {
                        setAnswers({});
                        setPhase("quiz");
                      }}
                      className="px-6 py-2 rounded-xl font-semibold text-white"
                      style={{
                        background: "linear-gradient(135deg,#f59e0b,#d97706)",
                      }}
                    >
                      Tekrar Dene
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveModule(null)}
                    className="px-6 py-2 rounded-xl font-semibold text-white"
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    Modüllere Dön
                  </button>
                </div>
              </div>,
            )}
          </div>
        )}
      </div>
    );
  }

  // Module list
  const completionStatus = getTrainingCompletionStatus(staffId);
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            🎓 Eğitim Modülleri
          </h2>
          <p className="text-slate-400 text-sm">
            Tamamlanan: {completionStatus.completed} / {completionStatus.total}
          </p>
        </div>
        <div
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{
            background: completionStatus.allDone
              ? "rgba(34,197,94,0.15)"
              : "rgba(245,158,11,0.15)",
            border: completionStatus.allDone
              ? "1px solid rgba(34,197,94,0.4)"
              : "1px solid rgba(245,158,11,0.4)",
            color: completionStatus.allDone ? "#4ade80" : "#fbbf24",
          }}
        >
          {completionStatus.allDone
            ? "✅ Tüm Eğitimler Tamamlandı"
            : "⚠️ Eğitim Gerekiyor"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODULES.map((mod, i) => {
          const record = records.find((r) => r.moduleId === mod.id);
          const completed = record?.completed ?? false;
          return (
            <div
              key={mod.id}
              data-ocid={`training.module.item.${i + 1}`}
              className="rounded-2xl p-5 cursor-pointer hover:opacity-90 transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: completed
                  ? "1px solid rgba(34,197,94,0.4)"
                  : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{
                    background: completed
                      ? "rgba(34,197,94,0.2)"
                      : "rgba(20,184,166,0.15)",
                  }}
                >
                  {completed ? "✅" : "📚"}
                </div>
                {record && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        record.score >= 70
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(239,68,68,0.15)",
                      color: record.score >= 70 ? "#4ade80" : "#f87171",
                    }}
                  >
                    {record.score}%
                  </span>
                )}
              </div>
              <h3 className="text-white font-semibold mb-1">{mod.title}</h3>
              <p className="text-slate-400 text-xs mb-4">{mod.description}</p>
              {record?.completedAt && (
                <p className="text-slate-500 text-xs mb-3">
                  Tamamlandı:{" "}
                  {new Date(record.completedAt).toLocaleDateString("tr-TR")}
                </p>
              )}
              <button
                type="button"
                data-ocid={`training.start.button.${i + 1}`}
                onClick={() => startModule(mod)}
                className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: completed
                    ? "rgba(34,197,94,0.15)"
                    : "linear-gradient(135deg,#14b8a6,#0d9488)",
                  border: completed ? "1px solid rgba(34,197,94,0.3)" : "none",
                  color: completed ? "#4ade80" : "white",
                }}
              >
                {completed ? "Tekrar Gözden Geçir" : "Eğitime Başla"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
