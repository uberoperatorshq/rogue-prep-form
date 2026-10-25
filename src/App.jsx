import { useEffect, useMemo, useRef, useState } from "react";

// =========================================================================
// CONFIG
// =========================================================================

// Set to an embed URL (YouTube, Loom, Vimeo, etc.) to wire a real video on
// the completion screen. Leave empty to render the styled placeholder card
// (which always shows the CTA below). Swappable without any other code change.
// Andy plays at 1.5x with captions on by default (Patrick 2026-10-04); viewers can still change both in the player.
const COMPLETION_VIDEO_URL = "https://fast.wistia.net/embed/iframe/fjixekaj02?playbackRate=1.5&plugin%5Bcaptions-v1%5D%5BonByDefault%5D=true";
const COMPLETION_VIDEO_TITLE = "Watch the pre-call training";
const COMPLETION_VIDEO_BODY =
  "Andy recorded this for people who have a strategy session booked. Watch it start to finish so the call can start from your numbers.";
// Chapters (2026-10-25, Oct 20 revamp plan): engagement on the 23:49 cut is 57%, so people can
// jump to the part they care about. Seconds checked against the Wistia captions; a tap reloads
// the player at that second.
const TRAINING_CHAPTERS = [
  { t: 0, label: "Why a budget was never going to fix it" },
  { t: 249, label: "Does one more dollar make your life better or worse?" },
  { t: 482, label: "The system we build, account by account" },
  { t: 853, label: "\"Shouldn't every spare dollar just go to the debt?\"" },
  { t: 1024, label: "What the call is for, and what happens if it isn't a fit" },
  { t: 1064, label: "Why your partner needs to be on the call" },
  { t: 1140, label: "People who sat where you are now" },
];

// Six break-out videos from Andy, one question each. Top row bank access,
// coaching, affording it (moved up 2026-10-03, best completion rate); bottom
// row partner, debt, deciding. Wistia hashed ids.
const BREAKOUT_TITLE = "Questions almost everyone asks before this call";
// Run times from Wistia (2026-10-25), rounded to the nearest second like the Wistia player shows them; 10:36 in total. Stills = each media's custom thumbnail.
const BREAKOUT_SUB = "Six short answers from Andy. All six run under 11 minutes.";
const PARTNER_VIDEO_ID = "ywdmppplme";
const WISTIA_STILL = "https://embed-ssl.wistia.com/deliveries/";
const BREAKOUT_VIDEOS = [
  {
    id: "r90kiktykf",
    len: "0:52",
    still: "5b1ccf04d09d6387875a9fda0b40fab9",
    q: "Do you get access to my bank accounts?",
    a: "No. Never. Your accounts, your logins, a coach beside you while you click.",
  },
  {
    id: "p25usn12bi",
    len: "2:13",
    still: "d9f783991b8433dd77cd866e6db7c8e5",
    q: "Would you be coaching me personally?",
    a: "No, and here's why that's better for you. What the ninety days feel like, and who's beside you.",
  },
  {
    id: "ncze2s7sqh",
    len: "1:55",
    still: "9a962b60838645f3ab609ec6c4c55f7e",
    q: "What if I can't afford this right now?",
    a: "Don't do the math against today's balance. What standing still costs, in interest.",
  },
  {
    id: "ywdmppplme",
    len: "1:06",
    still: "169985d1352f3993adabbb08dc29d797",
    q: "What if I want to do this without my partner?",
    a: "Handling money apart is part of what got you here. Why one of you in the room cannot fix it.",
  },
  {
    id: "x1qh1guv4j",
    len: "1:21",
    still: "b62863bf8a7d1a00317dfa90daa11b5e",
    q: "Is this debt consolidation? Or debt settlement?",
    a: "Neither. Andy rules out the three things people assume, and hands the rest to your strategist.",
  },
  {
    id: "w9d1mfco1k",
    len: "3:09",
    still: "883b88b099b8ee185fdbb0db11ed5da3",
    q: "Do I have to decide on the call?",
    a: "Nobody makes you. What the hour looks like, and what \"let me think about it\" usually means.",
  },
];

// Verbatim Trustpilot reviews, same six the GHL confirmation page shows first.
const REVIEWS = [
  {
    "name": "Emma Skelton",
    "date": "March 28, 2026",
    "text": "Andy was just fabulous. He was gracious, non-judgemental and patient as we worked through all our finances. Fast forward a year, and we paid off over $100k in car loans and other debt, and never felt deprived. This year, we have been able to put over $200,000 into our retirement accounts, something that seemed impossible just a few years ago. 100% recommended!!"
  },
  {
    "name": "Gabe Smith",
    "date": "April 16, 2026",
    "text": "Andy's coaching helped us to completely rethink the way we handle our business and personal finance. He showed us the power of automation and the freedom of systems that work. But the biggest payoff didn't have anything to do with money. His thoughtful, kind, direct, and relationally attuned approach provided a pathway for growth in our marriage too."
  },
  {
    "name": "Bridget Finn",
    "date": "January 28, 2026",
    "text": "I was never good with money. I had a lot of shame around it. Over the years my income increased but I always found myself in the same paycheck-to-paycheck cycle. Andy's \"recipe\" helped me build a system where my money works for me. My bills are paid automatically. My savings are growing automatically. The stress and fear has been replaced with pride!"
  },
  {
    "name": "Lea Murrell",
    "date": "March 11, 2026",
    "text": "Andy, Joanna, and the Rogue Financial process have changed my life so incredibly significantly in three short months! Following a divorce, some other financial setbacks, and largely just not being very financially savvy I was not in a good place. The program itself, the communication, and the encouragement was exactly what I needed. I hate to think about where I would be if I never started it."
  },
  {
    "name": "Jimmy Vanaria",
    "date": "March 23, 2026",
    "text": "My wife and I have been stuck in a paycheck-to-paycheck cycle for our entire marriage. Working with Rogue Finance completely changed that in just 90 days. They helped us build a clear, simple system that actually works for our real lives. We're not just \"getting by\" anymore. We feel in control."
  },
  {
    "name": "Camille West",
    "date": "February 11, 2026",
    "text": "The team at Rogue Finance helped me gain meaningful clarity and structure around my finances. What stood out was not just the mindset shift they encouraged, but the practical, sustainable system they introduced. Andy, Joanna, and the entire team were knowledgeable, supportive, and genuinely invested in my progress."
  }
];

// VITE_* overrides exist only for local testing against a mock; production uses the defaults.
const WEBHOOK_URL = import.meta.env.VITE_SUBMIT_URL || "https://uberops.app.n8n.cloud/webhook/prep-form";
// Pre-fill: the closer booking link carries a signed token (?t=). This returns the
// setter's numbers for the contact; anything else and the form stays blank.
const PREFILL_URL = import.meta.env.VITE_PREFILL_URL || "https://uberops.app.n8n.cloud/webhook/prep-prefill";
// Results link (2026-10-23): submit saves the answers in Supabase under a random id; the
// ?view=complete&r=<id> link asks this for the few values the completion page shows.
const RESULTS_URL = import.meta.env.VITE_RESULTS_URL || "https://uberops.app.n8n.cloud/webhook/prep-results";

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
  prefillHint: { fontSize: 12, color: "#777", marginTop: 6, lineHeight: 1.45 },
  submitErr: {
    fontSize: 13,
    color: ERR,
    background: "#241616",
    border: `1px solid ${ERR}`,
    borderRadius: 8,
    padding: "10px 12px",
    marginTop: 14,
    lineHeight: 1.5,
    textAlign: "center",
  },
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
  calcConfirm: {
    fontSize: 12,
    color: "#777",
    marginTop: 8,
    lineHeight: 1.45,
    fontStyle: "italic",
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
  videoTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#fff",
    lineHeight: 1.3,
    textAlign: "center",
    marginBottom: 12,
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

const BANK_CHECK_OPTIONS = [
  "Multiple times a day",
  "Daily",
  "A few times a week",
  "Weekly",
  "A few times a month",
  "Rarely, I avoid looking",
];
// financialFrustration is deliberately free text with no example options:
// pre-written choices lead the answer, and closers want the prospect's own words.

const LITERACY_OPTIONS = [
  { value: "0", label: "0 - I have no idea what I'm doing" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "10", label: "10 - I should be in charge of the US Treasury" },
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

// 128 random bits, base64url (22 chars). Only the id goes in the link, never a number.
function newResultsId() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Tag Wistia plays with the prospect's email so stats name the viewer.
// No valid email = untagged player, same as before.
function withViewer(url, email) {
  if (!looksLikeEmail(email)) return url;
  return url + (url.includes("?") ? "&" : "?") + "email=" + encodeURIComponent(email.trim());
}

// Remember the submitter on this device so a return visit via the
// ?view=complete link still tags plays. Storage can throw; never block.
const VIEWER_KEY = "rogue_prep_viewer_email";
function saveViewer(email) {
  try {
    if (looksLikeEmail(email)) window.localStorage.setItem(VIEWER_KEY, email.trim());
  } catch (e) {}
}
function loadViewer() {
  try {
    return window.localStorage.getItem(VIEWER_KEY) || "";
  } catch (e) {
    return "";
  }
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

function VideoCard({ viewer, startAt }) {
  // startAt (seconds) comes from a chapter tap: the player reloads there and starts.
  const src = startAt == null ? COMPLETION_VIDEO_URL : COMPLETION_VIDEO_URL + "&time=" + startAt + "&autoPlay=true";
  return (
    <div className="done-video-frame">
      {COMPLETION_VIDEO_URL ? (
        <iframe
          key={startAt == null ? "start" : startAt}
          style={styles.iframe}
          src={withViewer(src, viewer)}
          title={COMPLETION_VIDEO_TITLE}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
  );
}

function fmtClock(sec) {
  return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
}

// Phone width matches the 640px breakpoint in index.css.
function useIsPhone() {
  const query = "(max-width: 640px)";
  const [isPhone, setIsPhone] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(query);
    const on = () => setIsPhone(m.matches);
    m.addEventListener ? m.addEventListener("change", on) : m.addListener(on);
    return () => (m.removeEventListener ? m.removeEventListener("change", on) : m.removeListener(on));
  }, []);
  return isPhone;
}

function breakoutSrc(id, viewer, autoPlay) {
  return withViewer(
    `https://fast.wistia.net/embed/iframe/${id}?videoFoam=true&playbackRate=1.5&plugin%5Bcaptions-v1%5D%5BonByDefault%5D=true` +
      (autoPlay ? "&autoPlay=true" : ""),
    viewer
  );
}

// Oct 20 revamp plan: 20 of 44 submitters played any breakout, but players finish them. Every
// tile shows its run time; on phone the six are compact rows (still + question) and the player
// loads when tapped, so all six questions fit about one screen.
function BreakoutVideos({ viewer, openId, onOpen }) {
  const isPhone = useIsPhone();
  return (
    <div className="done-qs" id="breakouts">
      <h2 className="done-qs-title">{BREAKOUT_TITLE}</h2>
      <p className="done-qs-sub">{BREAKOUT_SUB}</p>
      <div className="done-qs-grid">
        {BREAKOUT_VIDEOS.map((v) => {
          const open = !isPhone || openId === v.id;
          return (
            <div
              className={"done-q" + (v.id === PARTNER_VIDEO_ID ? " done-q-hot" : "") + (open ? "" : " done-q-row")}
              key={v.id}
              id={"breakout-" + v.id}
            >
              {open ? (
                <div className="done-video-frame done-q-frame">
                  <iframe
                    style={styles.iframe}
                    src={breakoutSrc(v.id, viewer, isPhone)}
                    title={v.q}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  {isPhone ? null : <span className="done-q-len">{v.len}</span>}
                </div>
              ) : (
                <button type="button" className="done-q-thumb" onClick={() => onOpen(v.id)} aria-label={"Play: " + v.q}>
                  <img src={WISTIA_STILL + v.still + ".jpg?image_crop_resized=320x180"} alt="" loading="lazy" />
                  <span className="done-q-play" />
                  <span className="done-q-len">{v.len}</span>
                </button>
              )}
              <div className="done-q-text" onClick={open ? undefined : () => onOpen(v.id)}>
                <div className="done-q-label">{v.q}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Retirement snapshot (2026-10-20): same benchmark the setters see in the setter tool
// (setter-tool src/lib/retirementSnapshot.js). Fidelity savings-by-age guideline, published
// points with a straight line between. Retirement balance only, home equity not counted.
// Only shown after a real submit (needs their income); the age is typed in right here.
const SNAPSHOT_MILESTONES = [[30, 1], [40, 3], [50, 6], [60, 8], [67, 10]];

function benchmarkMultiple(age) {
  if (age <= 30) return 1;
  if (age >= 67) return 10;
  for (let i = 0; i < SNAPSHOT_MILESTONES.length - 1; i++) {
    const [a0, m0] = SNAPSHOT_MILESTONES[i];
    const [a1, m1] = SNAPSHOT_MILESTONES[i + 1];
    if (age >= a0 && age <= a1) return m0 + ((m1 - m0) * (age - a0)) / (a1 - a0);
  }
  return 10;
}

function shortMoney(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return "$" + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (a >= 1e3) return "$" + Math.round(a / 1e3) + "k";
  return "$" + Math.round(a);
}

// knownAge (2026-10-23): the setter's age from the pre-fill or the results link. When it is
// there the age box is hidden; the box is only the fallback for prospects with no setter age.
function RetirementSnapshot({ income, retirement, knownAge }) {
  const [ageInput, setAgeInput] = useState("");
  if (!income || income <= 0) return null;
  const hasKnownAge = Number.isInteger(knownAge) && knownAge >= 18 && knownAge <= 100;
  const age = hasKnownAge ? knownAge : parseInt(ageInput, 10);
  const ageOk = Number.isFinite(age) && age >= 18 && age <= 100;
  const have = retirement && retirement > 0 ? retirement : 0;
  let snap = null;
  if (ageOk) {
    const targetMultiple = benchmarkMultiple(age);
    const target = targetMultiple * income;
    snap = {
      label: age < 30 ? "by 30" : age > 67 ? "by 67" : "at " + age,
      target,
      targetMultiple,
      haveMultiple: have / income,
      gap: target - have,
    };
  }
  const x = (m) => (m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")) + "x your income";
  return (
    <div className="done-snap">
      <h2 className="done-qs-title">How your retirement savings compare</h2>
      <p className="done-proof-sub">
        A rough check against a common savings-by-age benchmark.
        {hasKnownAge ? "" : " Enter your age to see it."}
      </p>
      <div className="done-snap-card">
        {hasKnownAge ? null : (
          <label className="done-snap-age">
            <span>Your age</span>
            <input
              type="number"
              inputMode="numeric"
              min="18"
              max="100"
              placeholder="e.g. 42"
              value={ageInput}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setAgeInput(e.target.value)}
            />
          </label>
        )}
        {snap ? (
          <div className="done-snap-grid">
            <div className="done-snap-cell">
              <div className="done-snap-k">Common benchmark {snap.label}</div>
              <div className="done-snap-v">{shortMoney(snap.target)}</div>
              <div className="done-snap-m">{x(snap.targetMultiple)}</div>
            </div>
            <div className="done-snap-cell">
              <div className="done-snap-k">You have</div>
              <div className="done-snap-v">{shortMoney(have)}</div>
              <div className="done-snap-m">{x(snap.haveMultiple)}</div>
            </div>
            <div className="done-snap-cell">
              <div className="done-snap-k">{snap.gap > 0 ? "Gap" : "Ahead by"}</div>
              <div className={"done-snap-v " + (snap.gap > 0 ? "done-snap-gap" : "done-snap-ahead")}>
                {shortMoney(snap.gap)}
              </div>
              <div className="done-snap-m">
                {(Math.abs(snap.gap) / income).toFixed(1).replace(/\.0$/, "")} years of income
              </div>
            </div>
          </div>
        ) : null}
        <p className="done-snap-note">
          Uses the retirement balance and household income you entered. Home equity is not counted.
          Benchmark: Fidelity&apos;s savings-by-age guideline (1x income by 30, 3x by 40, 6x by 50,
          8x by 60, 10x by 67). A guideline, not advice for your situation. Your strategist can walk
          through it with you on the call.
        </p>
      </div>
    </div>
  );
}

// Debt clock. MOCKUP (Patrick 2026-10-25), built to show the customer journey, not approved:
// the rates below are assumptions, not the prospect's own, and the copy and the guideline need
// sign-off before this merges. Uses the debt answers from the form; the live results link does
// not return debts (by design), so on a reopened link it only shows on the local mock.
const DEBT_CLOCK_APR = { card: 0.22, loan: 0.12 }; // assumed, roughly US averages
const DEBT_PAYMENT_GUIDELINE = 0.36; // common lender guideline: debt payments under 36% of gross income

function debtFreeMonths(balance, monthlyRate, payment) {
  if (balance <= 0) return 0;
  if (!payment || payment <= balance * monthlyRate) return null; // never, at this payment
  if (monthlyRate === 0) return Math.ceil(balance / payment);
  return Math.ceil(-Math.log(1 - (monthlyRate * balance) / payment) / Math.log(1 + monthlyRate));
}

function DebtClock({ cardDebt, loanDebt, monthlyPayment, income }) {
  const card = cardDebt > 0 ? cardDebt : 0;
  const loan = loanDebt > 0 ? loanDebt : 0;
  const total = card + loan;
  const yearlyInterest = card * DEBT_CLOCK_APR.card + loan * DEBT_CLOCK_APR.loan;
  if (total <= 0) return null;

  const perDay = yearlyInterest / 365;
  const months = debtFreeMonths(total, yearlyInterest / total / 12, monthlyPayment);
  let freeLabel = "Not at this payment";
  if (months !== null) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    freeLabel = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  const share = income > 0 && monthlyPayment > 0 ? (monthlyPayment * 12) / income : null;
  const money = (n) => "$" + Math.round(n).toLocaleString();
  return (
    <div className="done-debt">
      <h2 className="done-qs-title">Your debt clock</h2>
      <div className="done-snap-card">
        <div className="done-debt-tick">
          <div className="done-debt-tick-v">{money(yearlyInterest)} a year</div>
          <div className="done-debt-tick-k">in interest at these balances</div>
        </div>
        <div className="done-snap-grid">
          <div className="done-snap-cell">
            <div className="done-snap-k">Card and loan debt</div>
            <div className="done-snap-v">{shortMoney(total)}</div>
            <div className="done-snap-m">{money(perDay)} of interest a day</div>
          </div>
          <div className="done-snap-cell">
            <div className="done-snap-k">Debt-free at your current payments</div>
            <div className={"done-snap-v" + (months === null ? " done-snap-gap" : "")}>{freeLabel}</div>
            <div className="done-snap-m">
              {months === null ? "Payments don't cover the interest" : months + " months from now"}
            </div>
          </div>
          <div className="done-snap-cell">
            <div className="done-snap-k">Where you&apos;d want to be</div>
            <div className="done-snap-v">Under {Math.round(DEBT_PAYMENT_GUIDELINE * 100)}%</div>
            <div className={"done-snap-m" + (share !== null && share > DEBT_PAYMENT_GUIDELINE ? " done-snap-gap" : "")}>
              {share === null ? "of income on debt payments" : "of income on debt payments. Yours: " + Math.round(share * 100) + "%"}
            </div>
          </div>
        </div>
        <p className="done-snap-note">
          Mockup. Assumes {Math.round(DEBT_CLOCK_APR.card * 100)}% a year on cards and{" "}
          {Math.round(DEBT_CLOCK_APR.loan * 100)}% on personal loans, and that your monthly debt payments all go to these
          balances. Your real rates will differ. Your strategist can walk through it with you on the call.
        </p>
      </div>
    </div>
  );
}

// "Is someone else joining you on this call?" Shares the results link (no numbers in the link
// itself; it opens them, so whoever gets it sees them). Phone share sheet when the browser has
// one, plus WhatsApp, iMessage/SMS and copy.
function ShareResults({ link, closerName }) {
  const [copied, setCopied] = useState(false);
  const text =
    "Here are my prep answers for our call" + (closerName ? " with " + closerName : "") +
    " at Rogue Finance. Have a look before we talk: " + link;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", link);
    }
  };
  return (
    <div className="done-share">
      <h2 className="done-share-title">Is someone else joining you on this call?</h2>
      <p className="done-share-body">
        If you share money with a partner, they join the call too. Send them your results so they see the same
        numbers before you talk.
      </p>
      <div className="done-share-btns">
        {canShare ? (
          <button
            type="button"
            className="done-share-btn done-share-main"
            onClick={() => navigator.share({ title: "Rogue Finance prep", text, url: link }).catch(() => {})}
          >
            Share
          </button>
        ) : null}
        <a className="done-share-btn" href={"https://wa.me/?text=" + encodeURIComponent(text)} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <a className="done-share-btn" href={"sms:?&body=" + encodeURIComponent(text)}>
          iMessage / text
        </a>
        <button type="button" className="done-share-btn" onClick={copy}>
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
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
  const [step, setStep] = useState(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("view") === "complete"
      ? 5
      : 0
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null); // null or string, inline error under nav
  const [errors, setErrors] = useState({}); // { fieldKey: boolean }, true means blank-required error

  // URL params (best-effort prefill; do not trust)
  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const paramName = (params.get("name") || "").trim();
  const paramEmail = (params.get("email") || "").trim();
  const paramCloser = (params.get("closer") || "").trim();
  const paramToken = (params.get("t") || "").trim();
  const paramResults = (params.get("r") || "").trim();
  // One id per page load, so a re-submit after a timeout updates the same saved row.
  const [resultsId] = useState(() => (typeof window !== "undefined" ? newResultsId() : ""));

  // ---------------- identity (intro) ----------------
  const [fullName, setFullName] = useState(paramName || "");
  const [email, setEmail] = useState(
    looksLikeEmail(paramEmail) ? paramEmail.trim() : ""
  );
  const [closerName, setCloserName] = useState(paramCloser);

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

  // ---------------- Step 4: You & money ----------------
  const [bankCheckFrequency, setBankCheckFrequency] = useState("");
  const [financialLiteracy, setFinancialLiteracy] = useState("");
  const [moneyRelationshipWord, setMoneyRelationshipWord] = useState("");
  const [financialFrustration, setFinancialFrustration] = useState("");
  const [questions, setQuestions] = useState("");
  const [stateValue, setStateValue] = useState("");

  // ---------------- Pre-fill from the setter call ----------------
  // Only fills fields the prospect has not typed in. The snapshot rides along
  // on submit so n8n can show the closer what changed.
  const [prefill, setPrefill] = useState({
    status: "none",
    reason: paramToken ? "pending" : "no_token",
    setter: "",
    submittedAt: null,
    values: {},
    age: null,
  });
  // Age from a results link (setter age saved at submit). Never asked on the form.
  const [savedAge, setSavedAge] = useState(null);
  // Completion page: chapter the training starts from, breakout opened on phone.
  const [trainingStart, setTrainingStart] = useState(null);
  const [openBreakout, setOpenBreakout] = useState(null);

  useEffect(() => {
    if (!paramToken) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const fill = (setter, v) => {
      if (v === undefined || v === null) return;
      setter((cur) => (isBlankString(cur) ? String(v) : cur));
    };
    fetch(PREFILL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: paramToken }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j || !j.ok || !j.values) {
          setPrefill((p) => ({ ...p, reason: (j && j.reason) || "error" }));
          return;
        }
        const v = j.values;
        fill(setAnnualHouseholdIncome, v.annualHouseholdIncome);
        fill(setCreditScore, v.creditScore);
        fill(setCreditCardDebt, v.creditCardDebt);
        fill(setPersonalLoanDebt, v.personalLoanDebt);
        fill(setRetirement401k, v.retirement401k);
        fill(setHomeEquity, v.homeEquity);
        fill(setSavings, v.savings);
        if (typeof v.state === "string" && US_STATES.includes(v.state)) fill(setStateValue, v.state);
        setPrefill({
          status: "filled",
          reason: "",
          setter: j.setter || "",
          submittedAt: j.submittedAt || null,
          values: v,
          age: Number.isInteger(j.age) ? j.age : null,
        });
      })
      .catch((err) => {
        setPrefill((p) => ({ ...p, reason: err && err.name === "AbortError" ? "timeout" : "error" }));
      })
      .finally(() => clearTimeout(timeoutId));
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [paramToken]);

  // ---------------- Results link (?view=complete&r=<id>) ----------------
  // Loads the saved answers so the snapshot shows again on any device. Bad, expired or
  // slow id = the generic completion page, same as before.
  useEffect(() => {
    if (!paramResults || step !== 5) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    fetch(RESULTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ r: paramResults }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j || !j.ok) return;
        if (j.annualHouseholdIncome != null) {
          setAnnualHouseholdIncome(String(j.annualHouseholdIncome));
        }
        if (j.retirement401k != null) setRetirement401k(String(j.retirement401k));
        // Debt clock mockup: the live lookup does not return these, the local mock does.
        if (j.creditCardDebt != null) setCreditCardDebt(String(j.creditCardDebt));
        if (j.personalLoanDebt != null) setPersonalLoanDebt(String(j.personalLoanDebt));
        if (j.monthlyDebtPayments != null) setMonthlyDebtPayments(String(j.monthlyDebtPayments));
        if (Number.isInteger(j.age)) setSavedAge(j.age);
        if (j.closer && !paramCloser) setCloserName(String(j.closer));
        if (looksLikeEmail(j.email)) setEmail(j.email.trim());
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeoutId));
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
    // Runs once for the link's id; step only matters on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramResults]);

  // Each new step (and the completion page) opens at the top, not where Continue was clicked.
  const firstStepRender = useRef(true);
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [step]);

  function PrefillHint({ field }) {
    if (prefill.status !== "filled" || !(field in prefill.values)) return null;
    const who = prefill.setter ? `your call with ${prefill.setter}` : "your call with our team";
    return <div style={styles.prefillHint}>From {who}. Change it if it&apos;s off.</div>;
  }

  // ---------------- Required-field gating ----------------
  // INLINED at the click site below. Direct state reads, no lookup tables,
  // no indirection. If the bundle that ships to the browser has this code
  // in it, the gate runs.

  function goNext(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    // Compute blanks INLINE for the current step. Each branch reads the
    // hook-state variables directly from this render's closure. 0 is a
    // valid answer everywhere; only truly empty input blocks.
    const blanks = {};
    if (step === 0) {
      if (isBlankString(fullName)) blanks.fullName = true;
      if (isBlankString(email) || !looksLikeEmail(email)) blanks.email = true;
    } else if (step === 1) {
      if (isBlankString(annualHouseholdIncome)) blanks.annualHouseholdIncome = true;
    } else if (step === 2) {
      if (isBlankString(creditScore)) blanks.creditScore = true;
      if (isBlankString(creditCardDebt)) blanks.creditCardDebt = true;
    } else if (step === 3) {
      if (isBlankString(retirement401k)) blanks.retirement401k = true;
      if (isBlankString(homeEquity)) blanks.homeEquity = true;
      if (isBlankString(otherAssetsValue)) blanks.otherAssetsValue = true;
      if (isBlankString(savings)) blanks.savings = true;
      if (isBlankString(monthlyRentMortgage)) blanks.monthlyRentMortgage = true;
      if (isBlankString(monthlyDebtPayments)) blanks.monthlyDebtPayments = true;
      if (isBlankString(totalMonthlyExpenses)) blanks.totalMonthlyExpenses = true;
      if (isBlankString(stateValue)) blanks.state = true;
      // otherAssetsNote stays OPTIONAL
    } else if (step === 4) {
      if (isBlankString(bankCheckFrequency)) blanks.bankCheckFrequency = true;
      if (isBlankString(financialLiteracy)) blanks.financialLiteracy = true;
      if (isBlankString(moneyRelationshipWord)) blanks.moneyRelationshipWord = true;
      // financialFrustration and questions stay OPTIONAL
    }

    if (Object.keys(blanks).length > 0) {
      setErrors((prev) => ({ ...prev, ...blanks }));
      return;
    }

    // Step gate passed. Clear any stale errors for THIS step's required keys,
    // then advance (or submit on step 4).
    const STEP_KEYS_FOR_CLEAR = {
      0: ["fullName", "email"],
      1: ["annualHouseholdIncome"],
      2: ["creditScore", "creditCardDebt"],
      3: ["retirement401k", "homeEquity", "otherAssetsValue", "savings", "monthlyRentMortgage", "monthlyDebtPayments", "totalMonthlyExpenses", "state"],
      4: ["bankCheckFrequency", "financialLiteracy", "moneyRelationshipWord"],
    };
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of STEP_KEYS_FOR_CLEAR[step] || []) delete next[k];
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
    setSubmitError(null);

    const payload = {
      resultsId,
      // Signed booking-link token (2026-10-25). n8n trusts it over the typed email to find the
      // GHL contact. It is dropped before the answers are saved for the results link.
      token: paramToken || null,
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
      bankCheckFrequency: bankCheckFrequency || null,
      financialLiteracy: parseNumOrNull(financialLiteracy),
      moneyRelationshipWord: moneyRelationshipWord.trim(),
      financialFrustration: financialFrustration.trim(),
      questions: questions.trim(),
      // Setter's age (2026-10-23), for the GHL note and the results link. Null when the setter
      // call had none; the completion page then asks for it, but that answer is not sent.
      age: prefill.age,
      ageSource: prefill.age ? "setter" : null,
      prefill: {
        status: prefill.status,
        reason: prefill.reason === "pending" ? "timeout" : prefill.reason,
        setter: prefill.setter,
        submittedAt: prefill.submittedAt,
        values: prefill.values,
      },
      submittedAt: new Date().toISOString(),
    };

    // Hard timeout so the UI can never sit pending forever on a slow webhook.
    // The n8n workflow chains GHL search + note + custom-field update + Slack
    // post, so the real-world response time can spike. We bound the wait.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      // Webhook accepted the POST (any non-throwing response). Advance.
      saveViewer(email);
      // Swap the booking link (name, email, token) for the results link, so a refresh or a
      // bookmark reopens this page with the snapshot.
      try {
        window.history.replaceState(null, "", window.location.pathname + "?view=complete&r=" + resultsId);
      } catch (e) {}
      setStep(5);
    } catch (err) {
      // AbortError = our timeout fired. Other errors = network / DNS / CORS.
      // Keep the user's data so they can re-submit; show a clear, inline
      // message instead of a browser alert.
      if (err && err.name === "AbortError") {
        setSubmitError(
          "Submission is taking longer than expected. Your details are still here, please try again."
        );
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  }

  // ---------------- Completion ----------------
  if (step === 5) {
    const viewer = looksLikeEmail(email) ? email : loadViewer();
    const jumpTo = (id) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const playChapter = (t) => {
      setTrainingStart(t);
      jumpTo("training");
    };
    const income = parseNumOrNull(annualHouseholdIncome);
    const sharedId = paramResults || resultsId;
    const shareLink =
      typeof window !== "undefined" && sharedId
        ? window.location.origin + window.location.pathname + "?view=complete&r=" + sharedId
        : "";
    const who = closerName || "your strategist";
    return (
      <div className="done-page">
        <div className="done-inner">
          <Header />
          <div className="done-hero">
            <h1 className="done-title">
              Form done. <span className="done-title-accent">One more thing.</span>
            </h1>
            <p className="done-body">
              {closerName
                ? `${closerName}, your strategist for this call, will go through your answers before you speak.`
                : "Your strategist will go through your answers before the call."}
            </p>
          </div>

          {/* Order (Patrick 2026-10-25): training first, then their own numbers, then the breakouts. */}
          <div className="done-card" id="training">
            <h2 className="done-card-title">{COMPLETION_VIDEO_TITLE}</h2>
            <p className="done-card-body">{COMPLETION_VIDEO_BODY}</p>
            <VideoCard viewer={viewer} startAt={trainingStart} />
            <ol className="done-chapters">
              {TRAINING_CHAPTERS.map((c) => (
                <li key={c.t}>
                  <button type="button" onClick={() => playChapter(c.t)}>
                    <span className="done-chapter-t">{fmtClock(c.t)}</span>
                    {c.label}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {income > 0 ? (
            <div className="done-results">
              <h2 className="done-results-title">Here&apos;s what {who} sees.</h2>
              <p className="done-proof-sub">Your numbers from the form. {closerName || "Your strategist"} goes through them with you on the call.</p>
              <RetirementSnapshot
                income={income}
                retirement={parseNumOrNull(retirement401k)}
                knownAge={prefill.age || savedAge}
              />
              <DebtClock
                cardDebt={parseNumOrNull(creditCardDebt)}
                loanDebt={parseNumOrNull(personalLoanDebt)}
                monthlyPayment={parseNumOrNull(monthlyDebtPayments)}
                income={income}
              />
              {shareLink ? <ShareResults link={shareLink} closerName={closerName} /> : null}
            </div>
          ) : null}

          <BreakoutVideos viewer={viewer} openId={openBreakout} onOpen={setOpenBreakout} />

          <div className="done-stats">
            <div className="done-stat">
              <div className="done-stat-num">350+</div>
              <div className="done-stat-label">Families helped since 2022</div>
            </div>
            <div className="done-stat-divider" />
            <div className="done-stat">
              <div className="done-stat-label">Rated excellent on</div>
              <div className="done-stat-tp">
                <span className="done-tp-name">Trustpilot</span>
                <span className="done-tp-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <span className="done-tp-score">4.8</span>
              </div>
            </div>
          </div>

          <div className="done-proof">
            <h2 className="done-proof-title">
              You made <span className="done-title-accent">the right call.</span>
            </h2>
            <p className="done-proof-sub">Here&apos;s what people say after sitting where you&apos;re sitting now.</p>
            <div className="done-reviews">
              {REVIEWS.map((r) => (
                <div className="done-review" key={r.name}>
                  <div className="done-review-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                  <div className="done-review-name">{r.name}</div>
                  <div className="done-review-date">{r.date}</div>
                  <p className="done-review-text">{r.text}</p>
                </div>
              ))}
            </div>
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
            <button type="button" style={styles.btnPrimary} onClick={goNext}>
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
      title: "You & money",
      desc: "Numbers are done. A few quick gut answers, no wrong ones.",
    },
  ];

  const stepIdx = step - 1; // 1..4 → 0..3

  // First word of Full Name. Trim + whitespace-split so leading spaces,
  // tabs, or any run of whitespace don't yield a stray empty/short token.
  // Blank → empty string → subtitle drops the leading name + comma.
  const firstName = (fullName || "").trim().split(/\s+/).filter(Boolean)[0] || "";

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <Header />
        <div style={styles.subtitle}>
          {firstName ? `${firstName}, ` : ""}rough numbers are totally fine.
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
              <PrefillHint field="annualHouseholdIncome" />
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
              <PrefillHint field="creditScore" />
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
              <PrefillHint field="creditCardDebt" />
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
              <PrefillHint field="personalLoanDebt" />
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
                let body;
                if (ccd > tcl) {
                  const over = ccd - tcl;
                  body = (
                    <>
                      Based on this, you&apos;re about {fmtMoney(over)} over your total limit, using around {utilPct}% of it.
                    </>
                  );
                } else {
                  const available = tcl - ccd;
                  body = (
                    <>
                      Based on this, you have about {fmtMoney(available)} in available credit, and you&apos;re using around {utilPct}% of your total limit.
                    </>
                  );
                }
                return (
                  <>
                    <div style={styles.calcReadout}>{body}</div>
                    <div style={styles.calcConfirm}>
                      Does that look about right? If not, double-check the numbers above.
                    </div>
                  </>
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
                <PrefillHint field="retirement401k" />
                {errors.retirement401k ? (
                  <div style={styles.errText}>
                    Best guess is fine, but please don&apos;t leave this blank.
                  </div>
                ) : null}
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
                <PrefillHint field="homeEquity" />
                {errors.homeEquity ? (
                  <div style={styles.errText}>
                    Best guess is fine, but please don&apos;t leave this blank.
                  </div>
                ) : null}
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
                {errors.otherAssetsValue ? (
                  <div style={styles.errText}>
                    Best guess is fine, but please don&apos;t leave this blank.
                  </div>
                ) : null}
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
                <PrefillHint field="savings" />
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

              <div style={styles.fieldBlock}>
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

              <div style={styles.fieldBlockLast}>
                <label style={styles.label}>State</label>
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
                <PrefillHint field="state" />
                {errors.state ? (
                  <div style={styles.errText}>
                    Please select your state.
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div style={styles.card}>
              <div style={styles.cardLabel}>You &amp; money</div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>How often do you check your bank balance?</label>
                <select
                  style={styles.select}
                  value={bankCheckFrequency}
                  onChange={(e) => setBankCheckFrequency(e.target.value)}
                >
                  <option value="">Select one</option>
                  {BANK_CHECK_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {errors.bankCheckFrequency ? (
                  <div style={styles.errText}>Please pick one.</div>
                ) : null}
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>
                  On a scale of 0-10, how financially literate are you?
                </label>
                <select
                  style={styles.select}
                  value={financialLiteracy}
                  onChange={(e) => setFinancialLiteracy(e.target.value)}
                >
                  <option value="">Select one</option>
                  {LITERACY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {errors.financialLiteracy ? (
                  <div style={styles.errText}>Please pick a number.</div>
                ) : null}
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>
                  One word to describe your relationship with money
                </label>
                <input
                  style={styles.input}
                  placeholder="Type here…"
                  value={moneyRelationshipWord}
                  onChange={(e) => setMoneyRelationshipWord(e.target.value)}
                />
                {errors.moneyRelationshipWord ? (
                  <div style={styles.errText}>One word is all it takes.</div>
                ) : null}
              </div>

              <div style={styles.fieldBlockLast}>
                <label style={styles.label}>
                  What feels most frustrating about your finances right now?
                  <span style={styles.optionalTag}>(optional)</span>
                </label>
                <input
                  style={styles.input}
                  placeholder="Type here…"
                  value={financialFrustration}
                  onChange={(e) => setFinancialFrustration(e.target.value)}
                />
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>Anything else</div>
              <div style={styles.fieldBlockLast}>
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
            </div>
          </>
        )}

        <div style={styles.nav}>
          <button type="button" style={styles.btnSecondary} onClick={goBack}>Back</button>
          <button
            type="button"
            style={{ ...styles.btnPrimary, opacity: submitting ? 0.6 : 1 }}
            onClick={goNext}
            disabled={submitting}
          >
            {step < 4 ? "Continue" : submitting ? "Submitting…" : "Submit"}
          </button>
        </div>

        {submitError ? (
          <div style={styles.submitErr}>{submitError}</div>
        ) : null}

        <div style={styles.privacy}>
          Private. Only shared with your strategist.
        </div>
      </div>
    </div>
  );
}
