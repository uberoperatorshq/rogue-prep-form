import { useMemo, useState } from "react";

// =========================================================================
// CONFIG
// =========================================================================

// Set to a video URL (YouTube, Loom, Vimeo, etc.) to render an embed on the
// completion screen.  Leave empty to render nothing.  Swappable without any
// other code change.
const COMPLETION_VIDEO_URL = "";

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
const NUDGE = "#d8a35e";   // amber for soft-nudge text — distinct from error red

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
  introBullets: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 1.6,
    marginBottom: 26,
    paddingLeft: 0,
    listStyle: "none",
    textAlign: "left",
  },
  introBulletRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  introBullet: {
    color: ACCENT,
    fontWeight: 700,
    lineHeight: 1.6,
    minWidth: 12,
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
  videoFrame: {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%", // 16:9
    background: "#000",
    borderRadius: 12,
    overflow: "hidden",
    border: `1px solid ${BORDER}`,
    marginTop: 12,
  },
  iframe: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: 0,
  },
};

// =========================================================================
// DATA TABLES
// =========================================================================

const ASSET_TYPES = ["401k", "IRA", "Home equity", "HELOC", "Investments", "Savings", "Other"];

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

function isBlankString(v) {
  return !v || String(v).trim() === "";
}

function looksLikeEmail(v) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

const emptyAsset = () => ({ type: "401k", value: "" });

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
  const [nudges, setNudges] = useState({}); // { fieldKey: boolean }

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
  const [assets, setAssets] = useState([emptyAsset()]);
  const [savings, setSavings] = useState("");
  const [monthlyRentMortgage, setMonthlyRentMortgage] = useState("");
  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState("");
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState("");

  // ---------------- Step 4: Anything else ----------------
  const [questions, setQuestions] = useState("");
  const [stateValue, setStateValue] = useState("");

  // Soft-nudge helper
  function nudge(key, on) {
    setNudges((prev) => ({ ...prev, [key]: !!on }));
  }

  // The 4 essentials.  Nudge if blank when leaving their step.  Never block.
  function evaluateNudgesForStep(currentStep) {
    if (currentStep === 0) {
      nudge("fullName", isBlankString(fullName));
      nudge("email", isBlankString(email));
    } else if (currentStep === 2) {
      nudge("creditScore", isBlankString(creditScore));
      nudge("creditCardDebt", isBlankString(creditCardDebt));
    }
  }

  function goNext() {
    evaluateNudgesForStep(step);
    if (step < 4) setStep(step + 1);
    else if (step === 4) handleSubmit();
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  // Asset row helpers
  function updateAsset(i, key, val) {
    setAssets((arr) => {
      const copy = arr.slice();
      copy[i] = { ...copy[i], [key]: val };
      return copy;
    });
  }
  function addAsset() {
    setAssets((arr) => arr.concat(emptyAsset()));
  }
  function removeAsset(i) {
    setAssets((arr) => arr.filter((_, idx) => idx !== i));
  }

  // ---------------- Submit ----------------
  async function handleSubmit() {
    setSubmitting(true);

    // Filter out asset rows the user never actually touched (no value entered).
    // A row with a value but the default "401k" type still counts.
    const assetsForPayload = assets
      .map((a) => ({ type: a.type, value: parseNumOrNull(a.value) }))
      .filter((a) => a.value !== null);

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
      assets: assetsForPayload,
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
    return (
      <div style={styles.page}>
        <div style={styles.inner}>
          <Header />
          <div style={styles.doneWrap}>
            <div style={styles.doneCheck}>&#10003;</div>
            <div style={styles.doneTitle}>You&apos;re all set.</div>
            <div style={styles.doneBody}>
              {closerName ? `${closerName} will review this before your call` : "Your strategist will review this before your call"},
              {" "}so you can hit the ground running.
              <br />
              <br />
              No need to do anything else — just show up.
            </div>
            {COMPLETION_VIDEO_URL ? (
              <div style={styles.videoFrame}>
                <iframe
                  style={styles.iframe}
                  src={COMPLETION_VIDEO_URL}
                  title="Rogue Finance"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : null}
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
            A few quick things before your call
          </div>
          <div style={styles.introBody}>
            This is the pre-call prep for the strategy call you booked.
            It helps your strategist come in ready, so the time we spend
            is actually useful for you. Takes about 5 minutes.
          </div>
          <ul style={styles.introBullets}>
            <li style={styles.introBulletRow}>
              <span style={styles.introBullet}>•</span>
              <span>Best guesses are completely fine. You can&apos;t get it wrong.</span>
            </li>
            <li style={styles.introBulletRow}>
              <span style={styles.introBullet}>•</span>
              <span>Skip anything you&apos;re not sure about.</span>
            </li>
            <li style={styles.introBulletRow}>
              <span style={styles.introBullet}>•</span>
              <span>We don&apos;t need account numbers, driver&apos;s licence, or anything personally identifying. We will never ask for that.</span>
            </li>
          </ul>

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
              {nudges.fullName ? (
                <div style={styles.nudge}>
                  This one helps us prep — your best guess is fine, you can still continue.
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
              {nudges.email ? (
                <div style={styles.nudge}>
                  This one helps us prep — your best guess is fine, you can still continue.
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
      desc: "What’s coming in each year, after tax.",
    },
    {
      label: "Step 2 of 4",
      title: "Credit & debt",
      desc: "Helps us figure out the best way to structure things for you.",
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
            <div style={styles.cardLabel}>Annual household net income</div>
            <div style={styles.fieldBlockLast}>
              <label style={styles.label}>Annual income, after tax ($)</label>
              <div style={styles.helper}>
                Include everything — salary, a partner&apos;s income, side income,
                pension, social security, disability. After-tax. Best estimate is fine.
              </div>
              <input
                style={styles.input}
                placeholder="e.g. 120000"
                type="number"
                inputMode="decimal"
                value={annualHouseholdIncome}
                onChange={(e) => setAnnualHouseholdIncome(e.target.value)}
              />
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
                inputMode="numeric"
                value={creditScore}
                onChange={(e) => setCreditScore(e.target.value)}
              />
              <div style={styles.helper}>
                Any bureau works. Not sure? Just give your best guess.
              </div>
              {nudges.creditScore ? (
                <div style={styles.nudge}>
                  This one helps us prep — your best guess is fine, you can still continue.
                </div>
              ) : null}
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>Credit card debt ($)</label>
              <div style={styles.helper}>
                Total balance owed across all your credit cards. Credit cards only.
              </div>
              <input
                style={styles.input}
                placeholder="0"
                type="number"
                inputMode="decimal"
                value={creditCardDebt}
                onChange={(e) => setCreditCardDebt(e.target.value)}
              />
              {nudges.creditCardDebt ? (
                <div style={styles.nudge}>
                  This one helps us prep — your best guess is fine, you can still continue.
                </div>
              ) : null}
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>
                Personal loan debt ($)<span style={styles.optionalTag}>— optional</span>
              </label>
              <div style={styles.helper}>
                Personal loans, BNPL, anything that isn&apos;t a credit card or mortgage.
              </div>
              <input
                style={styles.input}
                placeholder="0"
                type="number"
                inputMode="decimal"
                value={personalLoanDebt}
                onChange={(e) => setPersonalLoanDebt(e.target.value)}
              />
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>Total credit limit across all cards ($)</label>
              <div style={styles.helper}>
                The combined limit on all your cards (not what you owe — the total you could borrow).
              </div>
              <input
                style={styles.input}
                placeholder="e.g. 45000"
                type="number"
                inputMode="decimal"
                value={totalCreditLimit}
                onChange={(e) => setTotalCreditLimit(e.target.value)}
              />
            </div>

            <div style={styles.fieldBlockLast}>
              <label style={styles.label}>
                Anything else about your debt?<span style={styles.optionalTag}>— optional</span>
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
              <div style={styles.helper}>
                This helps us understand what you have available, so we can find ways to
                free up cash and reduce what you&apos;re paying in interest.
              </div>
              {assets.map((a, i) => (
                <div key={i}>
                  {i > 0 ? <div style={styles.divider} /> : null}
                  <div style={styles.row}>
                    <div style={styles.flex(1.6)}>
                      {i === 0 ? <label style={styles.label}>Type</label> : null}
                      <select
                        style={styles.select}
                        value={a.type}
                        onChange={(e) => updateAsset(i, "type", e.target.value)}
                      >
                        {ASSET_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.flex(1)}>
                      {i === 0 ? <label style={styles.label}>Value ($)</label> : null}
                      <input
                        style={styles.input}
                        placeholder="0"
                        type="number"
                        inputMode="decimal"
                        value={a.value}
                        onChange={(e) => updateAsset(i, "value", e.target.value)}
                      />
                    </div>
                    {assets.length > 1 ? (
                      <button
                        type="button"
                        aria-label="Remove asset row"
                        style={styles.removeBtn}
                        onClick={() => removeAsset(i)}
                      >
                        &times;
                      </button>
                    ) : null}
                  </div>
                  {a.type === "Home equity" ? (
                    <div style={styles.helper}>
                      Home equity = what your home would sell for today minus what
                      you owe on the mortgage. For example, if your home is worth
                      $500,000 and you owe $200,000, your equity is $300,000.
                    </div>
                  ) : null}
                </div>
              ))}
              <button type="button" style={styles.addBtn} onClick={addAsset}>
                + Add asset
              </button>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>Savings & monthly money</div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>
                  Savings ($)<span style={styles.optionalTag}>— optional</span>
                </label>
                <div style={styles.helper}>
                  Cash sitting in checking, savings, or money market accounts. Rough number is fine.
                </div>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  inputMode="decimal"
                  value={savings}
                  onChange={(e) => setSavings(e.target.value)}
                />
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>Monthly rent / mortgage ($)</label>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  inputMode="decimal"
                  value={monthlyRentMortgage}
                  onChange={(e) => setMonthlyRentMortgage(e.target.value)}
                />
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>Monthly debt payments ($)</label>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  inputMode="decimal"
                  value={monthlyDebtPayments}
                  onChange={(e) => setMonthlyDebtPayments(e.target.value)}
                />
              </div>

              <div style={styles.fieldBlockLast}>
                <label style={styles.label}>Total monthly expenses ($)</label>
                <div style={styles.helper}>
                  Everything you spend in a month — bills, groceries, subscriptions, everything. Rough number is fine.
                </div>
                <input
                  style={styles.input}
                  placeholder="0"
                  type="number"
                  inputMode="decimal"
                  value={totalMonthlyExpenses}
                  onChange={(e) => setTotalMonthlyExpenses(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <div style={styles.card}>
            <div style={styles.cardLabel}>Anything else</div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>
                Questions or notes<span style={styles.optionalTag}>— optional</span>
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
                State<span style={styles.optionalTag}>— optional</span>
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
          Your information is private and only shared with your strategist.
          We don&apos;t need any personally identifiable information like
          driver&apos;s licence numbers or account numbers. We will never ask for that.
        </div>
      </div>
    </div>
  );
}
