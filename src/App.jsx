import { useState } from "react";

const ACCENT = "#b33d33";
const BG = "#111111";
const CARD = "#1a1a1a";
const BORDER = "#2a2a2a";
const TEXT = "#e8e8e8";
const MUTED = "#888888";
const INPUT_BG = "#222222";

const styles = {
  container: { minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", padding: "0" },
  inner: { maxWidth: 560, margin: "0 auto", padding: "24px 20px 40px" },
  logoWrap: { textAlign: "center", marginTop: 8, marginBottom: 4 },
  logoRogue: { fontSize: 20, fontWeight: 800, letterSpacing: 2, color: "#fff" },
  logoFinance: { fontSize: 20, fontWeight: 800, letterSpacing: 2, color: ACCENT },
  subtitle: { textAlign: "center", color: MUTED, fontSize: 13, marginBottom: 12, lineHeight: 1.5 },
  privacy: { textAlign: "center", fontSize: 11, color: "#555", marginBottom: 24, lineHeight: 1.5, padding: "0 20px" },
  progressBar: { display: "flex", gap: 4, marginBottom: 32 },
  progressDot: (active, done) => ({ flex: 1, height: 3, borderRadius: 2, background: done ? ACCENT : active ? ACCENT : BORDER, opacity: done ? 0.5 : 1, transition: "all 0.3s" }),
  stepLabel: { fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 },
  stepTitle: { fontSize: 20, fontWeight: 600, marginBottom: 4, color: "#fff" },
  stepDesc: { fontSize: 13, color: MUTED, marginBottom: 24, lineHeight: 1.5 },
  card: { background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: "20px", marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: 500 },
  helperText: { fontSize: 11, color: "#666", marginBottom: 12, lineHeight: 1.4 },
  input: { width: "100%", background: INPUT_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", background: INPUT_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", color: TEXT, fontSize: 14, outline: "none", minHeight: 100, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" },
  selectInput: { width: "100%", background: INPUT_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box", appearance: "none" },
  addBtn: { background: "none", border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "10px", width: "100%", color: MUTED, fontSize: 13, cursor: "pointer", marginBottom: 12, transition: "border-color 0.2s" },
  removeBtn: { background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer", padding: "0 0 0 8px", lineHeight: 1 },
  row: { display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12 },
  field: (flex = 1) => ({ flex }),
  nav: { display: "flex", gap: 12, marginTop: 24 },
  btnPrimary: { flex: 1, background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s" },
  btnSecondary: { flex: 1, background: "none", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px", fontSize: 15, cursor: "pointer" },
  divider: { borderTop: `1px solid ${BORDER}`, margin: "16px 0" },
  entryLabel: { fontSize: 12, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  contextBlurb: { fontSize: 12, color: "#777", marginBottom: 16, lineHeight: 1.5, padding: "10px 12px", background: "#1e1e1e", borderRadius: 8, borderLeft: `3px solid ${ACCENT}` },
};

const CREDIT_SOURCES = ["Experian", "Credit Karma", "TransUnion", "Equifax", "Other"];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota",
  "Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming","Other / outside US",
];

const emptyIncome = () => ({ source: "", amount: "" });
const emptyAsset = () => ({ type: "401k", amount: "" });
const emptyBank = () => ({ name: "", description: "" });

export default function RoguePrepForm() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const closerName = params.get("closer") || "";
  const contactEmail = params.get("email") || "";
  const contactName = params.get("name") || "";

  const [data, setData] = useState({
    firstName: contactName || "",
    email: contactEmail || "",
    creditSource: "",
    creditScore: "",
    income: [emptyIncome()],
    savings: "",
    state: "",
    assets: [emptyAsset()],
    banks: [
      { name: "", description: "Bills / main account" },
      { name: "", description: "Spending account" },
      { name: "", description: "Brokerage / investments" },
    ],
    additionalBanks: [],
    monthlyRent: "",
    monthlyDebtPayments: "",
    totalMonthlyExpenses: "",
    creditCardDebt: "",
    personalLoanDebt: "",
    remainingCreditCardBalances: "",
    creditDebtFreeText: "",
    questions: "",
  });

  const update = (key, val) => setData(d => ({ ...d, [key]: val }));
  const addItem = (key, factory) => update(key, [...data[key], factory()]);
  const removeItem = (key, i) => update(key, data[key].filter((_, idx) => idx !== i));
  const updateItem = (key, i, field, val) => {
    const arr = [...data[key]];
    arr[i] = { ...arr[i], [field]: val };
    update(key, arr);
  };

  const STEPS = [
    { label: "Step 1 of 4", title: "Credit score and income", desc: "Your score and what's coming in each month." },
    { label: "Step 2 of 4", title: "Assets and banks", desc: "What you have and where it lives." },
    { label: "Step 3 of 4", title: "Credit and debt", desc: "Helps us figure out the best way to structure things for you." },
    { label: "Step 4 of 4", title: "Anything else", desc: "Questions, concerns, anything you want us to know." },
  ];

  const handleSubmit = async () => {
    setSubmitting(true);

    const payload = {
      contact: { name: data.firstName, email: data.email, closer: closerName },
      ...data,
      submittedAt: new Date().toISOString(),
    };
    try {
      await fetch("https://uberops.app.n8n.cloud/webhook/prep-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitting(false);
      setSubmitted(true);
    } catch (e) {
      setSubmitting(false);
      alert("Something went wrong. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <div style={styles.logoWrap}>
            <span style={styles.logoRogue}>ROGUE </span>
            <span style={styles.logoFinance}>FINANCE</span>
          </div>
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 12 }}>You're all set</div>
            <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
              Your financial snapshot has been submitted.{closerName ? ` ${closerName} will review it before your call` : " Your strategist will review it before your call"} so you can hit the ground running.
              <br /><br />
              No need to do anything else. Just show up.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <>
          <div style={styles.card}>
            <div style={styles.entryLabel}>Your details</div>
            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>First name</label>
              <input style={styles.input} placeholder="Your first name" value={data.firstName} onChange={e => update("firstName", e.target.value)} />
            </div>
            <div>
              <label style={styles.label}>Email</label>
              <input style={styles.input} placeholder="Your email address" type="email" value={data.email} onChange={e => update("email", e.target.value)} />
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.entryLabel}>Credit score</div>
            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>Where did you check your score?</label>
              <select style={styles.selectInput} value={data.creditSource} onChange={e => update("creditSource", e.target.value)}>
                <option value="">Select one</option>
                {CREDIT_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Score</label>
              <input style={styles.input} placeholder="e.g. 712" type="number" value={data.creditScore} onChange={e => update("creditScore", e.target.value)} />
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.entryLabel}>Household net income</div>
            <div style={styles.helperText}>Total monthly income after taxes. If you're married or have a partner, include their income too.</div>
            {data.income.map((inc, i) => (
              <div key={i} style={styles.row}>
                <div style={styles.field(2)}>
                  {i === 0 && <label style={styles.label}>Source</label>}
                  <input style={styles.input} placeholder="e.g. Salary, side hustle" value={inc.source} onChange={e => updateItem("income", i, "source", e.target.value)} />
                </div>
                <div style={styles.field(1)}>
                  {i === 0 && <label style={styles.label}>Monthly ($)</label>}
                  <input style={styles.input} placeholder="0" type="number" value={inc.amount} onChange={e => updateItem("income", i, "amount", e.target.value)} />
                </div>
                {data.income.length > 1 && <button style={styles.removeBtn} onClick={() => removeItem("income", i)}>&times;</button>}
              </div>
            ))}
            <button style={styles.addBtn} onClick={() => addItem("income", emptyIncome)}>+ Add income source</button>
          </div>

          <div style={styles.card}>
            <div style={styles.entryLabel}>Savings &amp; location</div>
            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>Savings ($) <span style={{ color: "#666", fontWeight: 400 }}>— optional</span></label>
              <div style={styles.helperText}>Cash sitting in checking, savings, or money market accounts. Rough number is fine.</div>
              <input style={styles.input} placeholder="0" type="number" value={data.savings} onChange={e => update("savings", e.target.value)} />
            </div>
            <div>
              <label style={styles.label}>State <span style={{ color: "#666", fontWeight: 400 }}>— optional</span></label>
              <select style={styles.selectInput} value={data.state} onChange={e => update("state", e.target.value)}>
                <option value="">Select your state</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </>
      );

      case 1: return (
        <>
          <div style={styles.card}>
            <div style={styles.entryLabel}>Assets</div>
            <div style={styles.contextBlurb}>This helps us understand what you have available. We use this to find ways to free up cash and reduce what you're paying in interest.</div>
            {data.assets.map((a, i) => (
              <div key={i}>
                {i > 0 && <div style={{ ...styles.divider, margin: "12px 0" }} />}
                <div style={styles.row}>
                  <div style={styles.field(1.5)}>
                    {i === 0 && <label style={styles.label}>Type</label>}
                    <select style={styles.selectInput} value={a.type} onChange={e => updateItem("assets", i, "type", e.target.value)}>
                      {["401k", "IRA", "Home equity", "HELOC", "Investments", "Savings", "Other"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={styles.field(1)}>
                    {i === 0 && <label style={styles.label}>Value ($)</label>}
                    <input style={styles.input} placeholder="0" type="number" value={a.amount} onChange={e => updateItem("assets", i, "amount", e.target.value)} />
                  </div>
                  {data.assets.length > 1 && <button style={styles.removeBtn} onClick={() => removeItem("assets", i)}>&times;</button>}
                </div>
                {a.type === "Home equity" && (
                  <div style={styles.helperText}>
                    Home equity = what your home would sell for today minus what you owe on the mortgage. For example, if your home is worth $500,000 and you owe $200,000, your equity is $300,000.
                  </div>
                )}
              </div>
            ))}
            <button style={styles.addBtn} onClick={() => addItem("assets", emptyAsset)}>+ Add asset</button>
          </div>

          <div style={styles.card}>
            <div style={styles.entryLabel}>Your banks</div>
            <div style={styles.helperText}>Where your money currently lives. Just the bank names.</div>
            {data.banks.map((b, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <label style={styles.label}>{b.description}</label>
                <input style={styles.input} placeholder="e.g. Chase" value={b.name} onChange={e => {
                  const banks = [...data.banks];
                  banks[i] = { ...banks[i], name: e.target.value };
                  update("banks", banks);
                }} />
              </div>
            ))}
            {data.additionalBanks.map((b, i) => (
              <div key={`add-${i}`} style={styles.row}>
                <div style={styles.field(1.5)}>
                  <input style={styles.input} placeholder="Bank name" value={b.name} onChange={e => updateItem("additionalBanks", i, "name", e.target.value)} />
                </div>
                <div style={styles.field(1.5)}>
                  <input style={styles.input} placeholder="What's it for?" value={b.description} onChange={e => updateItem("additionalBanks", i, "description", e.target.value)} />
                </div>
                <button style={styles.removeBtn} onClick={() => removeItem("additionalBanks", i)}>&times;</button>
              </div>
            ))}
            <button style={styles.addBtn} onClick={() => addItem("additionalBanks", emptyBank)}>+ Add another account</button>
          </div>

          <div style={styles.card}>
            <div style={styles.entryLabel}>Monthly essentials</div>
            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>How much are you spending per month on mortgage / rent?</label>
              <input style={styles.input} placeholder="$" type="number" value={data.monthlyRent} onChange={e => update("monthlyRent", e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>How much are you spending per month paying off debt?</label>
              <input style={styles.input} placeholder="$" type="number" value={data.monthlyDebtPayments} onChange={e => update("monthlyDebtPayments", e.target.value)} />
            </div>
            <div>
              <label style={styles.label}>Total monthly expenses</label>
              <div style={styles.helperText}>Everything you spend in a month — bills, groceries, subscriptions, everything. Rough number is fine.</div>
              <input style={styles.input} placeholder="$" type="number" value={data.totalMonthlyExpenses} onChange={e => update("totalMonthlyExpenses", e.target.value)} />
            </div>
          </div>
        </>
      );

      case 2: return (
        <div style={styles.card}>
          <div style={styles.entryLabel}>Credit and debt overview</div>
          <div style={styles.contextBlurb}>This helps us figure out the best way to bundle and optimise your debt so you're paying less interest and clearing it faster. Round numbers are fine.</div>

          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>Credit Card Debt ($)</label>
            <div style={styles.helperText}>Total balance currently owed across all your credit cards. Credit cards only, no personal loans here.</div>
            <input style={styles.input} placeholder="0" type="number" value={data.creditCardDebt} onChange={e => update("creditCardDebt", e.target.value)} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>Personal Loan Debt ($) <span style={{ color: "#666", fontWeight: 400 }}>— optional</span></label>
            <div style={styles.helperText}>Outstanding personal loans, BNPL, anything that isn't a credit card or a mortgage.</div>
            <input style={styles.input} placeholder="0" type="number" value={data.personalLoanDebt} onChange={e => update("personalLoanDebt", e.target.value)} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>Remaining Credit Card Balances ($)</label>
            <div style={styles.helperText}>Total available headroom across all your cards (limits minus current balances). Rough number is fine.</div>
            <input style={styles.input} placeholder="0" type="number" value={data.remainingCreditCardBalances} onChange={e => update("remainingCreditCardBalances", e.target.value)} />
          </div>

          <div>
            <label style={styles.label}>Anything else about your debt? <span style={{ color: "#666", fontWeight: 400 }}>— optional</span></label>
            <div style={styles.helperText}>Rough APRs, car loans, monthly payments, anything specific that would help on the call.</div>
            <textarea
              style={styles.textarea}
              placeholder={"e.g. Car loan $15,000 at 6%. Two cards at 22% APR. Paying about $800/month across everything."}
              rows={4}
              value={data.creditDebtFreeText}
              onChange={e => update("creditDebtFreeText", e.target.value)}
            />
          </div>
        </div>
      );

      case 3: return (
        <div style={styles.card}>
          <div style={styles.entryLabel}>Questions or notes</div>
          <div style={styles.helperText}>Anything you want to bring up on the call, anything on your mind, or anything you think we should know. Totally optional.</div>
          <textarea style={styles.textarea} placeholder="Type here..." rows={5} value={data.questions} onChange={e => update("questions", e.target.value)} />
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <div style={styles.logoWrap}>
          <span style={styles.logoRogue}>ROGUE </span>
          <span style={styles.logoFinance}>FINANCE</span>
        </div>
        <div style={styles.subtitle}>
          {data.firstName ? `${data.firstName}, fill` : "Fill"} this in before your call. Takes about 5 minutes.
          <br />Rough numbers are totally fine.
        </div>
        <div style={styles.privacy}>
          Your information is private and only shared with your strategist. We don't need any personally identifiable information like driver's licence numbers or account numbers. We will never ask for that.
        </div>

        <div style={styles.progressBar}>
          {STEPS.map((_, i) => (
            <div key={i} style={styles.progressDot(i === step, i < step)} />
          ))}
        </div>

        <div style={styles.stepLabel}>{STEPS[step].label}</div>
        <div style={styles.stepTitle}>{STEPS[step].title}</div>
        <div style={styles.stepDesc}>{STEPS[step].desc}</div>

        {renderStep()}

        <div style={styles.nav}>
          {step > 0 && (
            <button style={styles.btnSecondary} onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button style={styles.btnPrimary} onClick={() => setStep(s => s + 1)}>Continue</button>
          ) : (
            <button
              style={{ ...styles.btnPrimary, opacity: submitting ? 0.6 : 1 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
