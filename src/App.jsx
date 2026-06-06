import { useMemo, useState } from "react";

// =========================================================================
// CONFIG
// =========================================================================

// Set to an embed URL (YouTube, Loom, Vimeo, etc.) to wire a real video on
// the completion screen. Leave empty to render the styled placeholder card
// (which always shows the CTA below). Swappable without any other code change.
const COMPLETION_VIDEO_URL = "";
const COMPLETION_VIDEO_CTA = "While you wait, a quick message from the team";

const WEBHOOK_URL = "https://uberops.app.n8n.cloud/webhook/prep-form";

// =========================================================================
// THEME TOKENS  (kept consistent with the existing live form)
// =========================================================================

const ACCENT = "#b33d33";
const BG = "#111111";
const CARD = "#1a1a1a";
const BORDER = "#2a2a2a";
const TEXT = "#e8e8e8";
const MUTED = "#888888";
const INPUT_BG = "#222222";
const ERR = "#d96a5a";     // red-amber for inline error text on required-blank
const NUDGE = "#d8a35e";   // amber, kept for any soft nudges

const styles = {
  page: {
    minHeight: "100vh",
    background: BG,
    color: TEXT,
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: 0,
  },
  inner: {
    maxWidth: 560,
    margin: "0 auto",
    padding: "24px 18px 56px",
  },
  logoWrap: { textAlign: "center", marginTop: 8, marginBottom: 6 },
  logoRogue: { fontSize: 20, fontWeight: 800, letterSpacing: 2, color: "#fff" },
  logoFinance: { fontSize: 20, fontWeight: 800, letterSpacing: 2, color: ACCENT },
  subtitle: {
    textAlign: "center",
    color: MUTED,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 1.5,
  },
  privacy: {
    textAlign: "center",
    fontSize: 11,
    color: "#555",
    marginBottom: 24,
    lineHeight: 1.5,
    padding: "0 12px",
  },
  progressBar: { display: "flex", gap: 4, marginBottom: 28 },
  progressDot: (active, done) => ({
    flex: 1,
    height: 3,
    borderRadius: 2,
    background: done ? ACCENT : active ? ACCENT : BORDER,
    opacity: done ? 0.5 : 1,
    transition: "all 0.3s",
  }),
  stepLabel: {
    fontSize: 11,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  stepTitle: { fontSize: 22, fontWeight: 600, marginBottom: 6, color: "#fff", lineHeight: 1.25 },
  stepDesc: { fontSize: 14, color: MUTED, marginBottom: 22, lineHeight: 1.55 },
  card: {
    background: CARD,
    borderRadius: 12,
    border: `1px solid ${BORDER}`,
    padding: 20,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    color: MUTED,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  fieldBlock: { marginBottom: 14 },
  fieldBlockLast: { marginBottom: 0 },
  label: {
    display: "block",
    fontSize: 13,
    color: TEXT,
    marginBottom: 6,
    fontWeight: 500,
    lineHeight: 1.35,
  },
  optionalTag: { color: "#666", fontWeight: 400, marginLeft: 4 },
  errText: { fontSize: 12, color: ERR, marginTop: 6, lineHeight: 1.45 },
  calcReadout: {
    fontSize: 13,
    color: "#aaa",
    background: "#1e1e1e",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "10px 12px",
    marginTop: 10,
    lineHeight: 1.5,
    wordBreak: "normal",
    overflowWrap: "break-word",
  },
  helper: { fontSize: 12, color: "#777", marginBottom: 8, lineHeight: 1.45 },
  nudge: { fontSize: 12, color: NUDGE, marginTop: 6, lineHeight: 1.45 },
  input: {
    width: "100%",
    background: INPUT_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "11px 12px",
    color: TEXT,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    background: INPUT_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "11px 12px",
    color: TEXT,
    fontSize: 14,
    outline: "none",
    minHeight: 110,
    resize: "vertical",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  select: {
    width: "100%",
    background: INPUT_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "11px 12px",
    color: TEXT,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
  },
  addBtn: {
    background: "none",
    border: `1px dashed ${BORDER}`,
    borderRadius: 8,
    padding: 10,
    width: "100%",
    color: MUTED,
    fontSize: 13,
    cursor: "pointer",
    marginTop: 4,
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#666",
    fontSize: 22,
    cursor: "pointer",
    padding: "0 0 0 8px",
    lineHeight: 1,
  },
  row: { display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" },
  flex: (n) => ({ flex: n, minWidth: 0 }),
  nav: { display: "flex", gap: 12, marginTop: 28 },
  btnPrimary: {
    flex: 1,
    background: ACCENT,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "14px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  btnSecondary: {
    flex: 1,
    background: "none",
    color: MUTED,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "14px",
    fontSize: 15,
    cursor: "pointer",
  },
  divider: { borderTop: `1px solid ${BORDER}`, margin: "16px 0" },
  introHeadline: {
    fontSize: 26,
    fontWeight: 700,
    color: "#fff",
    lineHeight: 1.2,
    marginTop: 8,
    marginBottom: 12,
    textAlign: "center",
  },
  introBody: {
    fontSize: 14,
    color: TEXT,
    lineHeight: 1.6,
    marginBottom: 22,
    textAlign: "center",
  },
  introStack: {
    marginBottom: 26,
  },
  introLine: {
    fontSize: 13.5,
    color: MUTED,
    lineHeight: 1.6,
    marginBottom: 14,
    textAlign: "left",
  },
  introLineLast: {
    fontSize: 13.5,
    color: MUTED,
    lineHeight: 1.6,
    marginBottom: 0,
    textAlign: "left",
  },
  doneWrap: { textAlign: "center", paddingTop: 40 },
  doneCheck: { fontSize: 56, marginBottom: 12, color: ACCENT, lineHeight: 1 },
  doneTitle: { fontSize: 24, fontWeight: 600, color: "#fff", marginBottom: 14 },
  doneBody: {
    fontSize: 15,
    color: TEXT,
    lineHeight: 1.6,
    maxWidth: 440,
    margin: "0 auto 28px",
  },
  videoCard: {
    background: CARD,
    borderRadius: 14,
    border: `1px solid ${BORDER}`,
    padding: 16,
    marginTop: 8,
  },
  videoFrame: {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%", // 16:9
    background: "#000",
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${BORDER}`,
  },
  iframe: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: 0,
  },
  videoPlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background:
      "radial-gradient(circle at center, #2a1a18 0%, #161010 65%, #0a0707 100%)",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.06)",
    border: `2px solid ${ACCENT}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeft: `18px solid ${ACCENT}`,
    borderTop: "11px solid transparent",
    borderBottom: "11px solid transparent",
    marginLeft: 5, // optical centering
  },
  videoSoon: {
    fontSize: 11,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  videoCta: {
    fontSize: 14,
    color: TEXT,
    fontWeight: 500,
    lineHeight: 1.45,
    textAlign: "center",
    marginTop: 14,
  },
};

// =========================================================================
// DATA TABLES
// =========================================================================

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota",
  "Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming","Other / outside US",
];

// =========================================================================
// HELPERS
// =========================================================================

// Blank or non-numeric  → null (NEVER 0).  This guarantees the payload
// distinguishes "left it blank" from "really zero".
function parseNumOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(n) {
  return "$" + Math.abs(Math.round(n)).toLocaleString();
}

function isBlankString(v) {
  return !v || String(v).trim() === "";
}

function looksLikeEmail(v) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// =========================================================================
// SUBCOMPONENTS
// =========================================================================

function Header() {
  return (
    <div style={styles.logoWrap}>
      <span style={styles.logoRogue}>ROGUE </span>
      <span style={styles.logoFinance}>FINANCE</span>
    </div>
  );
}

function VideoCard() {
  return (
    <div style={styles.videoCard}>
      <div style={styles.videoFrame}>
        {COMPLETION_VIDEO_URL ? (
          <iframe
            style={styles.iframe}
            src={COMPLETION_VIDEO_URL}
            title="Rogue Finance"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div style={styles.videoPlaceholder}>
            <div style={styles.playButton}>
              <div style={styles.playTriangle} />
            </div>
            <div style={styles.videoSoon}>Video coming soon</div>
          </div>
        )}
      </div>
      <div style={styles.videoCta}>{COMPLETION_VIDEO_CTA}</div>
    </div>
  );
}

// =========================================================================
// COMPONENT
// =========================================================================

export default function RoguePrepForm() {
  // step model:
  //   0 = intro (identity)
  //   1..4 = data steps (progress bar shows these)
  //   5 = completion
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({}); // { fieldKey: boolean }, true means blank-required error

  // URL params (best-effort prefill; do not trust)
  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const paramName = (params.get("name") || "").trim();
  const paramEmail = (params.get("email") || "").trim();
  const paramCloser = (params.get("closer") || "").trim();

  // ---------------- identity (intro) ----------------
  const [fullName, setFullName] = useState(paramName || "");
  const [email, setEmail] = useState(
    looksLikeEmail(paramEmail) ? paramEmail.trim() : ""
  );
  const closerName = paramCloser;

  // ---------------- Step 1: Income ----------------
  const [annualHouseholdIncome, setAnnualHouseholdIncome] = useState("");

  // ---------------- Step 2: Credit & debt ----------------
  const [creditScore, setCreditScore] = useState("");
  const [creditCardDebt, setCreditCardDebt] = useState("");
  const [personalLoanDebt, setPersonalLoanDebt] = useState("");
  const [totalCreditLimit, setTotalCreditLimit] = useState("");
  const [debtNotes, setDebtNotes] = useState("");

  // ---------------- Step 3: Assets & monthly money ----------------
  const [retirement401k, setRetirement401k] = useState("");
  const [homeEquity, setHomeEquity] = useState("");
  const [otherAssetsValue, setOtherAssetsValue] = useState("");
  const [otherAssetsNote, setOtherAssetsNote] = useState("");
  const [savings, setSavings] = useState("");
  const [monthlyRentMortgage, setMonthlyRentMortgage] = useState("");
  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState("");
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState("");

  // ---------------- Step 4: Anything else ----------------
  const [questions, setQuestions] = useState("");
  const [stateValue, setStateValue] = useState("");

  // Required-field gating. Returns the set of field keys that are blank
  // for the current step. Inline error renders for any field present here.
  function requiredBlanksForStep(currentStep) {
    const blanks = {};
    if (currentStep === 0) {
      if (isBlankString(fullName)) blanks.fullName = true;
      // For email, blank OR invalid-shape both count as missing.
      if (isBlankString(email) || !looksLikeEmail(email)) blanks.email = true;
    } else if (currentStep === 1) {
      if (isBlankString(annualHouseholdIncome)) blanks.annualHouseholdIncome = true;
    } else if (currentStep === 2) {
      if (isBlankString(creditScore)) blanks.creditScore = true;
      if (isBlankString(creditCardDebt)) blanks.creditCardDebt = true;
    } else if (currentStep === 3) {
      if (isBlankString(savings)) blanks.savings = true;
      if (isBlankString(monthlyRentMortgage)) blanks.monthlyRentMortgage = true;
      if (isBlankString(monthlyDebtPayments)) blanks.monthlyDebtPayments = true;
      if (isBlankString(totalMonthlyExpenses)) blanks.totalMonthlyExpenses = true;
    }
    return blanks;
  }

  function goNext() {
    const blanks = requiredBlanksForStep(step);
    if (Object.keys(blanks).length > 0) {
      // Block. Surface inline errors on the offending fields.
      setErrors((prev) => ({ ...prev, ...blanks }));
      return;
    }
    // Clear any prior errors for this step's required fields before advancing.
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(blanks)) delete next[k];
      return next;
    });
    if (step < 4) setStep(step + 1);
    else if (step === 4) handleSubmit();
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  // ---------------- Submit ----------------
  async function handleSubmit() {
    setSubmitting(true);

    const payload = {
      contact: {
        fullName: fullName.trim(),
        email: email.trim(),
        closer: closerName || "",
      },
      annualHouseholdIncome: parseNumOrNull(annualHouseholdIncome),
      creditScore: parseNumOrNull(creditScore),
      creditCardDebt: parseNumOrNull(creditCardDebt),
      personalLoanDebt: parseNumOrNull(personalLoanDebt),
      totalCreditLimit: parseNumOrNull(totalCreditLimit),
      debtNotes: debtNotes.trim(),
      retirement401k: parseNumOrNull(retirement401k),
      homeEquity: parseNumOrNull(homeEquity),
      otherAssetsValue: parseNumOrNull(otherAssetsValue),
      otherAssetsNote: otherAssetsNote.trim(),
      savings: parseNumOrNull(savings),
      monthlyRentMortgage: parseNumOrNull(monthlyRentMortgage),
      monthlyDebtPayments: parseNumOrNull(monthlyDebtPayments),
      totalMonthlyExpenses: parseNumOrNull(totalMonthlyExpenses),
      state: stateValue ? stateValue : null,
      questions: questions.trim(),
      submittedAt: new Date().toISOString(),
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitting(false);
      setStep(5);
    } catch {
      setSubmitting(false);
      alert("Something went wrong. Please try again.");
    }
  }

  // ---------------- Completion ----------------
  if (step === 5) {
    const reviewer = closerName || "Your strategist";
    return (
      <div style={styles.page}>
        <div style={styles.inner}>
          <Header />
          <div style={styles.doneWrap}>
            <div style={styles.doneCheck}>&#10003;</div>
            <div style={styles.doneTitle}>You&apos;re all set.</div>
            <div style={styles.doneBody}>
              {reviewer} will review everything before your call so you can hit the ground running. Nothing else to do. Just show up.
            </div>
            <VideoCard />
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Intro ----------------
  if (step === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.inner}>
          <Header />
          <div style={styles.introHeadline}>
            Let&apos;s make your call count
          </div>
          <div style={styles.introStack}>
            <p style={styles.introLine}>
              Five minutes here means your strategist walks in already knowing your situation. The whole call goes to building your plan.
            </p>
            <p style={styles.introLine}>
              It&apos;s confidential. Only your strategist sees it. We don&apos;t ask for account numbers, SSN, or your licence. We don&apos;t need any of that.
            </p>
            <p style={styles.introLine}>
              Try to fill everything in, even if it&apos;s just a rough guess. If you genuinely don&apos;t know, an estimate beats leaving it blank.
            </p>
            <p style={styles.introLineLast}>
              Nobody&apos;s grading you. Best guess is fine.
            </p>
          </div>

          <div style={styles.card}>
            <div style={styles.cardLabel}>Your details</div>
            <div style={styles.fieldBlock}>
              <label style={styles.label}>Full name</label>
              <input
                style={styles.input}
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              {errors.fullName ? (
                <div style={styles.errText}>
                  Best guess is fine, but please don&apos;t leave this blank.
                </div>
              ) : null}
            </div>
            <div style={styles.fieldBlockLast}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email ? (
                <div style={styles.errText}>
                  {isBlankString(email)
                    ? "Best guess is fine, but please don't leave this blank."
                    : "Please enter a valid email."}
                </div>
              ) : null}
            </div>
          </div>

          <div style={styles.nav}>
            <button style={styles.btnPrimary} onClick={goNext}>
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Data steps (1..4) ----------------
  const STEPS = [
    {
      label: "Step 1 of 4",
      title: "Income",
      desc: "What’s coming in each year, before tax.",
    },
    {
      label: "Step 2 of 4",
      title: "Credit & debt",
      desc: "A picture of where your credit and debt stand right now.",
    },
    {
      label: "Step 3 of 4",
      title: "Assets & monthly money",
      desc: "What you have, and what’s going out each month.",
    },
    {
      label: "Step 4 of 4",
      title: "Anything else",
      desc: "Questions, notes, anything you want us to know.",
    },
  ];

  const stepIdx = step - 1; // 1..4 → 0..3

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <Header />
        <div style={styles.subtitle}>
          {fullName ? `${fullName.split(" ")[0]}, ` : ""}rough numbers are totally fine.
        </div>

        <div style={styles.progressBar}>
          {STEPS.map((_, i) => (
            <div key={i} style={styles.progressDot(i === stepIdx, i < stepIdx)} />
          ))}
        </div>

        <div style={styles.stepLabel}>{STEPS[stepIdx].label}</div>
        <div style={styles.stepTitle}>{STEPS[stepIdx].title}</div>
        <div style={styles.stepDesc}>{STEPS[stepIdx].desc}</div>

        {step === 1 && (
          <div style={styles.card}>
            <div style={styles.cardLabel}>Gross annual household income</div>
            <div style={styles.fieldBlockLast}>
              <label style={styles.label}>Annual income, before tax ($)</label>
              <div style={styles.helper}>
                Total household income before tax, per year. Salary, a partner&apos;s income, side income, pension, benefits, all of it. Rough number is fine.
              </div>
              <input
                style={styles.input}
                placeholder="e.g. 150000"
                type="number"
                onWheel={(e) => e.currentTarget.blur()}
                inputMode="decimal"
                value={annualHouseholdIncome}
                onChange={(e) => setAnnualHouseholdIncome(e.target.value)}
              />
              {errors.annualHouseholdIncome ? (
                <div style={styles.errText}>
                  Best guess is fine, but please don&apos;t leave this blank.
                </div>
              ) : null}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={styles.card}>
            <div style={styles.cardLabel}>Credit & debt</div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>Credit score</label>
              <input
                style={styles.input}
                placeholder="e.g. 712"
                type="number"
                onWheel={(e) => e.currentTarget.blur()}
                inputMode="numeric"
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
              />
              <div style={styles.helper}>
                Any bureau works. Not sure? Just give your best guess.
              </div>
              {errors.creditScore ? (
                <div style={styles.errText}>
                  Best guess is fine, but please don&apos;t leave this blank.
                </div>
              ) : null}
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>Credit card debt ($)</label>
              <div style={styles.helper}>
                Total balance owed across all your credit cards. Credit cards only. No credit card debt? Put 0.
              </div>
              <input
                style={styles.input}
                placeholder="0"
                type="number"
                onWheel={(e) => e.currentTarget.blur()}
                inputMode="decimal"
                value={creditCardDebt}
                onChange={(e) => setCreditCardDebt(e.target.value)}
              />
              {errors.creditCardDebt ? (
                <div style={styles.errText}>
                  Best guess is fine, but please don&apos;t leave this blank.
                </div>
              ) : null}
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>
                Personal loan debt ($)<span style={styles.optionalTag}>(optional)</span>
              </label>
              <div style={styles.helper}>
                Personal loans, BNPL, anything that isn&apos;t a credit card or mortgage.
              </div>
              <input
                style={styles.input}
                placeholder="0"
                type="number"
                onWheel={(e) => e.currentTarget.blur()}
                inputMode="decimal"
                value={personalLoanDebt}
                onChange={(e) => setPersonalLoanDebt(e.target.value)}
              />
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>Total credit limit across all cards ($)</label>
              <div style={styles.helper}>
                The combined limit on all your cards. Not what you owe, the total you could borrow.
              </div>
              <input
                style={styles.input}
                placeholder="e.g. 45000"
                type="number"
                onWheel={(e) => e.currentTarget.blur()}
                inputMode="decimal"
                value={totalCreditLimit}
                onChange={(e) => setTotalCreditLimit(e.target.value)}
              />
              {(() => {
                const ccd = parseNumOrNull(creditCardDebt);
                const tcl = parseNumOrNull(totalCreditLimit);
                if (ccd === null || tcl === null) return null;
                if (tcl === 0) return null; // can't compute %; show nothing
                const utilPct = Math.round((ccd / tcl) * 100);
                if (ccd > tcl) {
                  const over = ccd - tcl;
                  return (
                    <div style={styles.calcReadout}>
                      Based on this, you&apos;re about {fmtMoney(over)} over your total limit, using around {utilPct}% of it.
                    </div>
                  );
                }
                const available = tcl - ccd;
                return (
                  <div style={styles.calcReadout}>
                    Based on this, you have about {fmtMoney(available)} in available credit, and you&apos;re using around {utilPct}% of your total limit.
                  </div>
                );
              })()}
            </div>

            <div style={styles.fieldBlockLast}>
              <label style={styles.label}>
                Anything else about your debt?<span style={styles.optionalTag}>(optional)</span>
              </label>
              <div style={styles.helper}>
                Rough APRs, car loans, monthly payments, anything specific that would help on the call.
              </div>
              <textarea
                style={styles.textarea}
                rows={4}
                placeholder="e.g. Car loan $15,000 at 6%. Two cards at 22% APR."
                value={debtNotes}
                onChange={(e) => setDebtNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <>
            <div style={styles.card}>
              <div style={styles.cardLabel}>Assets</div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>401k / retirement ($)</label>
                <div style={styles.helper}>
                  Total across any retirement accounts. Enter 0 if none.
                </div>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  inputMode="decimal"
                  value={retirement401k}
                  onChange={(e) => setRetirement401k(e.target.value)}
                />
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>Home equity ($)</label>
                <div style={styles.helper}>
                  Roughly your home&apos;s value minus what&apos;s left on the mortgage. Enter 0 if you rent or don&apos;t have any.
                </div>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  inputMode="decimal"
                  value={homeEquity}
                  onChange={(e) => setHomeEquity(e.target.value)}
                />
              </div>

              <div style={styles.fieldBlockLast}>
                <label style={styles.label}>Other assets ($)</label>
                <div style={styles.helper}>
                  Anything else: investments, savings bonds, a HELOC you could draw on. Enter 0 if none.
                </div>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  inputMode="decimal"
                  value={otherAssetsValue}
                  onChange={(e) => setOtherAssetsValue(e.target.value)}
                />
                <div style={{ marginTop: 10 }}>
                  <label style={styles.label}>
                    What is it?<span style={styles.optionalTag}>(optional)</span>
                  </label>
                  <input
                    style={styles.input}
                    placeholder="e.g. brokerage account, HELOC, savings bonds"
                    value={otherAssetsNote}
                    onChange={(e) => setOtherAssetsNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>Savings & monthly money</div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>Savings ($)</label>
                <div style={styles.helper}>
                  Cash sitting in checking, savings, or money market accounts. Rough number is fine. If you don&apos;t have any, just put 0.
                </div>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  inputMode="decimal"
                  value={savings}
                  onChange={(e) => setSavings(e.target.value)}
                />
                {errors.savings ? (
                  <div style={styles.errText}>
                    Best guess is fine, but please don&apos;t leave this blank.
                  </div>
                ) : null}
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>Monthly rent / mortgage ($)</label>
                <div style={styles.helper}>
                  If you own outright or it&apos;s covered, put 0.
                </div>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  inputMode="decimal"
                  value={monthlyRentMortgage}
                  onChange={(e) => setMonthlyRentMortgage(e.target.value)}
                />
                {errors.monthlyRentMortgage ? (
                  <div style={styles.errText}>
                    Best guess is fine, but please don&apos;t leave this blank.
                  </div>
                ) : null}
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>Monthly debt payments ($)</label>
                <div style={styles.helper}>
                  If you&apos;re not paying anything toward debt right now, put 0.
                </div>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  inputMode="decimal"
                  value={monthlyDebtPayments}
                  onChange={(e) => setMonthlyDebtPayments(e.target.value)}
                />
                {errors.monthlyDebtPayments ? (
                  <div style={styles.errText}>
                    Best guess is fine, but please don&apos;t leave this blank.
                  </div>
                ) : null}
              </div>

              <div style={styles.fieldBlockLast}>
                <label style={styles.label}>Total monthly expenses ($)</label>
                <div style={styles.helper}>
                  Everything you spend in a month: bills, groceries, subscriptions, all of it. Rough number is fine.
                </div>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  inputMode="decimal"
                  value={totalMonthlyExpenses}
                  onChange={(e) => setTotalMonthlyExpenses(e.target.value)}
                />
                {errors.totalMonthlyExpenses ? (
                  <div style={styles.errText}>
                    Best guess is fine, but please don&apos;t leave this blank.
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <div style={styles.card}>
            <div style={styles.cardLabel}>Anything else</div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>
                Questions or notes<span style={styles.optionalTag}>(optional)</span>
              </label>
              <div style={styles.helper}>
                Anything you want to bring up on the call, anything on your mind,
                or anything you think we should know.
              </div>
              <textarea
                style={styles.textarea}
                rows={5}
                placeholder="Type here…"
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
              />
            </div>

            <div style={styles.fieldBlockLast}>
              <label style={styles.label}>
                State<span style={styles.optionalTag}>(optional)</span>
              </label>
              <div style={styles.helper}>For our records.</div>
              <select
                style={styles.select}
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
              >
                <option value="">Select your state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={styles.nav}>
          <button style={styles.btnSecondary} onClick={goBack}>Back</button>
          <button
            style={{ ...styles.btnPrimary, opacity: submitting ? 0.6 : 1 }}
            onClick={goNext}
            disabled={submitting}
          >
            {step < 4 ? "Continue" : submitting ? "Submitting…" : "Submit"}
          </button>
        </div>

        <div style={styles.privacy}>
          Private. Only shared with your strategist.
        </div>
      </div>
    </div>
  );
}
