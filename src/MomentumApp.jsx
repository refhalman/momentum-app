import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Flame, Lock, Sparkles, Plus, Check, TrendingDown, X, Wand2 } from "lucide-react";

const theme = {
  "--bg1": "#EAFBF2",
  "--bg2": "#E7F1FF",
  "--surface": "#FFFFFF",
  "--ink": "#10241C",
  "--muted": "#5C7269",
  "--primary": "#14B88C",
  "--primary-dark": "#0C8F6B",
  "--coral": "#FF6B5B",
  "--coral-soft": "#FFE7E3",
  "--yellow": "#FFC93C",
  "--purple": "#8B5CF6",
  "--gold": "#C48A00",
  "--gold-soft": "#FFF2D2",
  "--line": "#E3EFEA",
};

// canonical storage unit is lbs
const seedWeightsLb = [
  { day: "Jun 30", weight: 182.4 },
  { day: "Jul 1", weight: 182.0 },
  { day: "Jul 2", weight: 181.6 },
  { day: "Jul 3", weight: 181.8 },
  { day: "Jul 4", weight: 181.1 },
  { day: "Jul 5", weight: 180.7 },
  { day: "Jul 6", weight: 180.9 },
  { day: "Jul 7", weight: 180.2 },
  { day: "Jul 8", weight: 179.8 },
  { day: "Jul 9", weight: 179.9 },
  { day: "Jul 10", weight: 179.3 },
  { day: "Jul 11", weight: 178.8 },
  { day: "Jul 12", weight: 178.6 },
  { day: "Jul 13", weight: 178.1 },
];

const seedMeals = [
  { id: 1, date: "Jul 13", name: "Oats + berries", cal: 320 },
  { id: 2, date: "Jul 13", name: "Chicken & rice bowl", cal: 540 },
];

const GOAL_WEIGHT_LB = 165;
const FREE_HISTORY_DAYS = 7;
const FREE_MEAL_CAP = 3;

const LB_TO_KG = 0.453592;
const lbToKg = (lb) => lb * LB_TO_KG;
const kgToLb = (kg) => kg / LB_TO_KG;

// small built-in food dictionary for instant calorie estimates
const FOOD_CAL = {
  "avocado toast": 300, "peanut butter": 190, "greek yogurt": 100,
  "protein shake": 150, "ice cream": 270, "cheeseburger": 550,
  "chicken breast": 165, "chicken salad": 350, "chicken": 250,
  "pizza slice": 285, "pizza": 285, "burrito": 450, "sandwich": 350,
  "burger": 550, "fries": 365, "salad": 150, "pasta": 220, "steak": 420,
  "salmon": 367, "avocado": 240, "smoothie": 250, "cereal": 200,
  "pancakes": 350, "waffle": 290, "soup": 170, "sushi": 300, "taco": 210,
  "chips": 150, "cookie": 150, "chocolate": 210, "wine": 125, "beer": 154,
  "water": 0, "tea": 2, "coffee": 5, "latte": 190, "milk": 103,
  "yogurt": 100, "oats": 150, "oatmeal": 150, "toast": 75, "eggs": 155,
  "egg": 78, "banana": 105, "apple": 95, "rice": 200, "bread": 80,
  "cheese": 110, "bacon": 90, "sausage": 250, "nuts": 170, "almonds": 170,
};

const FACTS = [
  {
    emoji: "🎯",
    stat: "5–10%",
    text: "Losing just 5–10% of starting body weight is enough to meaningfully improve blood pressure and cholesterol for most people.",
  },
  {
    emoji: "📝",
    stat: "2x",
    text: "People who log their food and weight regularly tend to lose roughly twice as much as people who don't track at all.",
  },
  {
    emoji: "🧠",
    stat: "~66 days",
    text: "On average it takes about two months of repetition before a new habit starts feeling automatic instead of effortful.",
  },
  {
    emoji: "💪",
    stat: "24/7",
    text: "Muscle tissue burns more calories at rest than fat does, so strength training pays off even on your days off.",
  },
  {
    emoji: "😴",
    stat: "7–9 hrs",
    text: "Poor sleep raises the hormone that drives hunger and lowers the one that signals fullness — sleep is part of the plan, not separate from it.",
  },
  {
    emoji: "🐢",
    stat: "Slow > fast",
    text: "Gradual loss of about 1–2 lb a week is more likely to stay off long-term than crash diets that drop weight fast.",
  },
];

const STORIES = [
  {
    name: "Maria T.",
    initials: "MT",
    color: "var(--primary)",
    result: "-34 lb in 8 months",
    quote:
      "The streak was what hooked me. I didn't want to break the little ring, so logging became automatic within a few weeks.",
    tag: "Free plan → Premium",
  },
  {
    name: "James O.",
    initials: "JO",
    color: "var(--coral)",
    result: "-22 kg in 11 months",
    quote:
      "I'd tried five other apps and quit each one within a month. The weekly report actually explained why my weight stalled instead of just showing a flat line.",
    tag: "Premium member, 1 yr",
  },
  {
    name: "Priya S.",
    initials: "PS",
    color: "var(--purple)",
    result: "Kept 40 lb off for 3 years",
    quote:
      "Maintenance was harder than losing it. Being able to see three years of history in one chart is what keeps me honest.",
    tag: "Premium member, 3 yrs",
  },
  {
    name: "Deshawn K.",
    initials: "DK",
    color: "var(--gold)",
    result: "-18 lb in 4 months",
    quote:
      "The food estimate feature saved me — I hate typing in exact calories, and having a starting guess meant I actually logged meals instead of skipping it.",
    tag: "Free plan",
  },
];

// ---- Backend connection ----
// Once you deploy momentum-backend (see README.md) and set this to your
// real URL, the Subscribe button creates an actual Stripe Checkout session.
// Until then, it safely falls back to demo mode.
const API_BASE = "/.netlify/functions"; // same-domain serverless function

// Noom-style color coding, but for calorie density rather than points —
// gives an at-a-glance signal without forcing anyone to do math.
function calorieColor(cal) {
  if (cal == null) return "var(--muted)";
  if (cal <= 300) return "var(--primary)";
  if (cal <= 600) return "var(--yellow)";
  return "var(--coral)";
}

function estimateCalories(name) {
  const n = name.toLowerCase().trim();
  if (!n) return null;
  const matches = Object.keys(FOOD_CAL).filter((k) => n.includes(k));
  if (matches.length === 0) return null;
  const longest = matches.filter(
    (k) => !matches.some((other) => other !== k && other.includes(k) && other.length > k.length)
  );
  const total = longest.reduce((sum, k) => sum + FOOD_CAL[k], 0);
  return Math.min(Math.round(total), 1400);
}

function fmtWeight(lb, unit) {
  return unit === "kg" ? lbToKg(lb).toFixed(1) : lb.toFixed(1);
}

function MomentumRing({ value, max, size = 96, pulseKey }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <svg
      key={pulseKey}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="ring-pop"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="9" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function UpgradeCard({ onSubscribe, billing, setBilling, compact, loading }) {
  const price = billing === "yearly" ? "$5.83" : "$7.00";
  const sub = billing === "yearly" ? "billed $70/year" : "billed $7/month";
  return (
    <div
      className="rounded-3xl p-6 flex flex-col gap-5 slide-in"
      style={{
        background: "linear-gradient(155deg, #FFFFFF 0%, var(--gold-soft) 130%)",
        border: "2px solid var(--gold)",
        boxShadow: "0 10px 30px -12px rgba(196,138,0,0.35)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--purple), var(--gold))" }}
        >
          <Sparkles size={16} color="#fff" />
        </div>
        <span className="text-xs font-extrabold tracking-wide uppercase" style={{ color: "var(--gold)" }}>
          Momentum Premium
        </span>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-5xl font-extrabold" style={{ fontFamily: "'Baloo 2', sans-serif", color: "var(--ink)" }}>
          {price}
        </span>
        <span className="text-sm mb-1.5 font-medium" style={{ color: "var(--muted)" }}>
          / mo · {sub}
        </span>
      </div>

      <div className="flex gap-1.5 p-1.5 rounded-full" style={{ background: "var(--bg1)" }}>
        {["monthly", "yearly"].map((b) => (
          <button
            key={b}
            onClick={() => setBilling(b)}
            className="flex-1 text-sm py-2 rounded-full capitalize transition font-bold active:scale-95"
            style={{
              background: billing === b ? "var(--primary)" : "transparent",
              color: billing === b ? "#fff" : "var(--muted)",
            }}
          >
            {b}
            {b === "yearly" && <span className="ml-1 text-xs opacity-90">save 17%</span>}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2.5">
        {[
          "Unlimited daily logging",
          "Full weight history & trend lines",
          "Personalized weekly report",
          "Custom reminders",
        ].map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "var(--primary)" }}
            >
              <Check size={12} color="#fff" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onSubscribe}
        disabled={loading}
        className="w-full py-3.5 rounded-2xl font-extrabold text-base transition active:scale-95 disabled:opacity-70"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
          color: "#fff",
          boxShadow: "0 8px 20px -6px rgba(20,184,140,0.55)",
        }}
      >
        {loading ? "Connecting to Stripe…" : "Subscribe & start losing 🎉"}
      </button>
      {!compact && (
        <p className="text-xs text-center font-medium" style={{ color: "var(--muted)" }}>
          {API_BASE
            ? "Redirects to a secure Stripe checkout page."
            : "Demo mode — connect Stripe in the backend to take real payments."}
        </p>
      )}
    </div>
  );
}

export default function MomentumApp() {
  const [tab, setTab] = useState("today");
  const [isPremium, setIsPremium] = useState(false);
  const [unit, setUnit] = useState("lb");
  const [weights, setWeights] = useState(seedWeightsLb);
  const [meals, setMeals] = useState(seedMeals);
  const [weightInput, setWeightInput] = useState("");
  const [mealName, setMealName] = useState("");
  const [mealCal, setMealCal] = useState("");
  const [calAutoFilled, setCalAutoFilled] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [billing, setBilling] = useState("monthly");
  const [toast, setToast] = useState(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [subscribing, setSubscribing] = useState(false);
  const [sparks, setSparks] = useState(12);

  const today = "Jul 14";
  const todaysMeals = meals.filter((m) => m.date === today);
  const mealCapHit = !isPremium && todaysMeals.length >= FREE_MEAL_CAP;
  const streak = Math.min(weights.length, 7);
  const startWeightLb = weights[0].weight;
  const currentWeightLb = weights[weights.length - 1].weight;
  const lostLb = startWeightLb - currentWeightLb;
  const lostDisplay = unit === "kg" ? lbToKg(lostLb).toFixed(1) : lostLb.toFixed(1);

  const visibleWeights = useMemo(() => {
    const base = isPremium ? weights : weights.slice(-FREE_HISTORY_DAYS);
    return base.map((w) => ({
      ...w,
      weight: unit === "kg" ? +lbToKg(w.weight).toFixed(1) : w.weight,
    }));
  }, [weights, isPremium, unit]);

  const goalDisplay = unit === "kg" ? lbToKg(GOAL_WEIGHT_LB).toFixed(0) : GOAL_WEIGHT_LB;
  const lockedCount = weights.length - (isPremium ? weights.length : Math.min(weights.length, FREE_HISTORY_DAYS));

  const estimate = estimateCalories(mealName);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function logWeight() {
    const v = parseFloat(weightInput);
    if (!v || v <= 0) return;
    const lb = unit === "kg" ? kgToLb(v) : v;
    setWeights((w) => [...w, { day: "Today", weight: +lb.toFixed(1) }]);
    setWeightInput("");
    setPulseKey((k) => k + 1);
    setSparks((s) => s + 3);
    flash("Weight logged 🎉");
  }

  function onMealNameChange(v) {
    setMealName(v);
    if (calAutoFilled) {
      const est = estimateCalories(v);
      setMealCal(est ? String(est) : "");
    }
  }

  function onMealCalChange(v) {
    setMealCal(v);
    setCalAutoFilled(false);
  }

  function addMeal() {
    if (mealCapHit) {
      setShowPaywall(true);
      return;
    }
    if (!mealName.trim()) return;
    setMeals((m) => [
      ...m,
      { id: Date.now(), date: today, name: mealName.trim(), cal: Number(mealCal) || estimateCalories(mealName) || 0 },
    ]);
    setMealName("");
    setMealCal("");
    setCalAutoFilled(true);
    setSparks((s) => s + 2);
    flash("Meal logged 🍽️  +2 sparks");
  }

  async function subscribe() {
    if (!API_BASE) {
      // Demo mode — no backend configured yet. See momentum-backend/README.md.
      setIsPremium(true);
      setShowPaywall(false);
      flash("Premium activated (demo) ✨");
      setTab("today");
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetch(`${API_BASE}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // real Stripe-hosted checkout
      } else {
        flash("Couldn't start checkout — try again");
      }
    } catch (err) {
      flash("Couldn't reach payment server");
    } finally {
      setSubscribing(false);
    }
  }

  function manageSubscription() {
    if (!API_BASE) {
      setIsPremium(false);
      flash("Subscription cancelled (demo reset)");
      return;
    }
    // In production this calls /create-portal-session and redirects the
    // user to Stripe's own billing page — a one-click cancel, no phone
    // calls, no hidden menus.
    flash("Opening subscription management…");
  }

  return (
    <div
      style={theme}
      className="w-full min-h-full flex justify-center p-4"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');

        @keyframes slideIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .slide-in { animation: slideIn 0.35s cubic-bezier(.22,1.4,.36,1) both; }

        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .slide-up { animation: slideUp 0.4s cubic-bezier(.22,1.4,.36,1) both; }

        @keyframes popIn { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
        .ring-pop { animation: popIn 0.5s cubic-bezier(.22,1.4,.36,1) both; }

        @keyframes flamePulse { 0%,100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.15) rotate(-4deg); } }
        .flame-pulse { animation: flamePulse 1.8s ease-in-out infinite; }

        @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
      `}</style>
      <div
        className="w-full max-w-md rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
        style={{
          background: "linear-gradient(165deg, var(--bg1), var(--bg2))",
          fontFamily: "Inter, sans-serif",
          color: "var(--ink)",
          minHeight: 680,
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-3 flex items-center justify-between">
          <div>
            <div className="text-3xl" style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, color: "var(--primary-dark)" }}>
              Momentum
            </div>
            <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              {isPremium ? "🌟 Premium member" : "Free plan"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full p-1" style={{ background: "var(--surface)", border: "2px solid var(--line)" }}>
              {["lb", "kg"].map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase transition active:scale-90"
                  style={{
                    background: unit === u ? "var(--primary)" : "transparent",
                    color: unit === u ? "#fff" : "var(--muted)",
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-extrabold"
              style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
              title="Earn sparks by logging weight and meals"
            >
              ⚡ {sparks}
            </div>
            {isPremium && (
              <span
                className="text-xs font-extrabold px-2.5 py-1.5 rounded-full flex items-center gap-1"
                style={{ background: "linear-gradient(135deg, var(--purple), var(--gold))", color: "#fff" }}
              >
                <Sparkles size={12} />
              </span>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="mx-6 mb-2 px-3 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 slide-in"
            style={{ background: "var(--surface)", border: "2px solid var(--primary)", color: "var(--primary-dark)" }}
          >
            <Check size={14} /> {toast}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-6 pb-4 overflow-y-auto flex flex-col gap-4">
          {tab === "today" && (
            <>
              <div
                className="rounded-3xl p-5 flex items-center gap-4"
                style={{ background: "var(--surface)", boxShadow: "0 6px 20px -10px rgba(16,36,28,0.15)" }}
              >
                <MomentumRing value={streak} max={7} pulseKey={pulseKey} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Flame size={20} className="flame-pulse" style={{ color: "var(--coral)" }} />
                    <span className="font-extrabold text-xl" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                      {streak}-day streak
                    </span>
                  </div>
                  <div className="text-sm mt-1 font-semibold" style={{ color: "var(--muted)" }}>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "var(--primary-dark)" }}>
                      {lostDisplay} {unit}
                    </span>{" "}
                    lost so far
                  </div>
                </div>
              </div>

              <div
                className="rounded-3xl p-5"
                style={{ background: "var(--surface)", boxShadow: "0 6px 20px -10px rgba(16,36,28,0.15)" }}
              >
                <div className="text-sm font-extrabold mb-2">⚖️ Log today's weight</div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder={`${fmtWeight(currentWeightLb, unit)} ${unit}`}
                    className="flex-1 px-4 py-3 rounded-2xl text-base font-bold outline-none"
                    style={{ border: "2px solid var(--line)", background: "var(--bg1)" }}
                  />
                  <button
                    onClick={logWeight}
                    className="px-5 py-3 rounded-2xl text-base font-extrabold text-white active:scale-95 transition"
                    style={{ background: "var(--primary)", boxShadow: "0 6px 16px -6px rgba(20,184,140,0.6)" }}
                  >
                    Log
                  </button>
                </div>
              </div>

              <div
                className="rounded-3xl p-5"
                style={{ background: "var(--surface)", boxShadow: "0 6px 20px -10px rgba(16,36,28,0.15)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-extrabold">🍽️ Today's meals</div>
                  <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>
                    {todaysMeals.length}
                    {!isPremium && `/${FREE_MEAL_CAP}`} logged
                  </span>
                </div>

                {!isPremium && (
                  <div className="h-2 rounded-full mb-3 overflow-hidden" style={{ background: "var(--line)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((todaysMeals.length / FREE_MEAL_CAP) * 100, 100)}%`,
                        background: mealCapHit ? "var(--coral)" : "var(--primary)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 mb-3">
                  {todaysMeals.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm font-semibold slide-in rounded-xl px-3 py-2" style={{ background: "var(--bg1)" }}>
                      <span>{m.name}</span>
                      <span style={{ color: calorieColor(m.cal), fontFamily: "IBM Plex Mono, monospace", fontWeight: 800 }}>
                        {m.cal} cal
                      </span>
                    </div>
                  ))}
                  {todaysMeals.length === 0 && (
                    <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                      Nothing logged yet today.
                    </div>
                  )}
                </div>

                {mealCapHit ? (
                  <button
                    onClick={() => setShowPaywall(true)}
                    className="w-full py-3 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition"
                    style={{ background: "var(--coral-soft)", color: "var(--coral)" }}
                  >
                    <Lock size={14} /> Free limit reached — go unlimited
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        value={mealName}
                        onChange={(e) => onMealNameChange(e.target.value)}
                        placeholder="What did you eat?"
                        className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold outline-none"
                        style={{ border: "2px solid var(--line)", background: "var(--bg1)" }}
                      />
                      <input
                        value={mealCal}
                        onChange={(e) => onMealCalChange(e.target.value)}
                        type="number"
                        placeholder="cal"
                        className="w-16 px-2 py-2.5 rounded-xl text-sm font-semibold outline-none text-center"
                        style={{ border: "2px solid var(--line)", background: "var(--bg1)" }}
                      />
                      <button
                        onClick={addMeal}
                        className="px-3.5 py-2.5 rounded-xl text-white active:scale-90 transition"
                        style={{ background: "var(--coral)", boxShadow: "0 6px 14px -6px rgba(255,107,91,0.6)" }}
                      >
                        <Plus size={18} strokeWidth={3} />
                      </button>
                    </div>
                    {estimate && calAutoFilled && mealName && (
                      <div className="flex items-center gap-1.5 text-xs font-bold px-1 slide-in" style={{ color: "var(--purple)" }}>
                        <Wand2 size={12} /> Auto-estimated ~{estimate} cal — edit if you like
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "progress" && (
            <>
              <div
                className="rounded-3xl p-5"
                style={{ background: "var(--surface)", boxShadow: "0 6px 20px -10px rgba(16,36,28,0.15)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-extrabold flex items-center gap-1.5">
                    <TrendingDown size={16} style={{ color: "var(--primary)" }} />
                    Weight trend
                  </div>
                  <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>
                    goal {goalDisplay} {unit}
                  </span>
                </div>
                <div style={{ width: "100%", height: 180 }}>
                  <ResponsiveContainer>
                    <LineChart data={visibleWeights} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "2px solid var(--line)" }} />
                      <ReferenceLine y={goalDisplay} stroke="var(--gold)" strokeWidth={2} strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3, fill: "var(--primary)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {!isPremium && lockedCount > 0 && (
                  <button
                    onClick={() => setShowPaywall(true)}
                    className="w-full mt-2 py-3 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition"
                    style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                  >
                    <Lock size={14} /> Unlock {lockedCount} earlier days
                  </button>
                )}
              </div>

              <div
                className="rounded-3xl p-5 flex items-start gap-3"
                style={{ background: "var(--surface)", boxShadow: "0 6px 20px -10px rgba(16,36,28,0.15)" }}
              >
                {isPremium ? (
                  <div className="text-sm">
                    <div className="font-extrabold mb-1">📊 Your weekly report</div>
                    <p style={{ color: "var(--muted)" }} className="font-medium">
                      Down {lostDisplay} {unit} overall, with your best consistency on weekday
                      mornings. Keep the streak going — you're on pace for your goal in about 9 weeks.
                    </p>
                  </div>
                ) : (
                  <div className="text-sm w-full">
                    <div className="font-extrabold mb-1 flex items-center gap-1.5">
                      <Lock size={14} style={{ color: "var(--muted)" }} /> Weekly report
                    </div>
                    <p style={{ color: "var(--muted)" }} className="mb-3 font-medium">
                      Premium members get a personalized weekly breakdown of their progress and pace.
                    </p>
                    <button
                      onClick={() => setShowPaywall(true)}
                      className="text-sm font-extrabold"
                      style={{ color: "var(--primary)" }}
                    >
                      Unlock with Premium →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "stories" && (
            <>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-extrabold px-1">📚 Worth knowing</div>
                {FACTS.map((f, i) => (
                  <div
                    key={i}
                    className="rounded-3xl p-4 flex items-center gap-3 slide-in"
                    style={{
                      background: "var(--surface)",
                      boxShadow: "0 6px 20px -10px rgba(16,36,28,0.15)",
                      animationDelay: `${i * 0.05}s`,
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
                      style={{ background: "var(--bg1)" }}
                    >
                      <span className="text-lg leading-none">{f.emoji}</span>
                      <span
                        className="text-[10px] font-extrabold mt-0.5"
                        style={{ color: "var(--primary-dark)", fontFamily: "IBM Plex Mono, monospace" }}
                      >
                        {f.stat}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-snug" style={{ color: "var(--ink)" }}>
                      {f.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <div className="text-sm font-extrabold px-1">💬 Real people, real change</div>
                {STORIES.map((s, i) => (
                  <div
                    key={s.name}
                    className="rounded-3xl p-4 slide-in"
                    style={{
                      background: "var(--surface)",
                      boxShadow: "0 6px 20px -10px rgba(16,36,28,0.15)",
                      animationDelay: `${i * 0.06}s`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0"
                        style={{ background: s.color }}
                      >
                        {s.initials}
                      </div>
                      <div className="flex-1">
                        <div className="font-extrabold text-sm">{s.name}</div>
                        <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                          {s.tag}
                        </div>
                      </div>
                      <div
                        className="text-xs font-extrabold px-2.5 py-1.5 rounded-full flex-shrink-0"
                        style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                      >
                        {s.result}
                      </div>
                    </div>
                    <p className="text-sm font-medium leading-snug italic" style={{ color: "var(--ink)" }}>
                      "{s.quote}"
                    </p>
                  </div>
                ))}
                <p className="text-xs text-center font-medium mt-1" style={{ color: "var(--muted)" }}>
                  Illustrative example stories for this demo — individual results vary.
                </p>
              </div>
            </>
          )}

          {tab === "upgrade" && (
            <>
              {isPremium ? (
                <div
                  className="rounded-3xl p-6 flex flex-col items-center text-center gap-3"
                  style={{ background: "var(--surface)", boxShadow: "0 6px 20px -10px rgba(16,36,28,0.15)" }}
                >
                  <Sparkles size={26} style={{ color: "var(--gold)" }} />
                  <div className="font-extrabold text-lg">You're on Premium 🌟</div>
                  <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Unlimited logging, full history, and weekly reports are unlocked.
                  </p>
                  <button
                    onClick={manageSubscription}
                    className="w-full py-3 rounded-2xl text-sm font-extrabold active:scale-95 transition"
                    style={{ background: "var(--bg1)", color: "var(--ink)", border: "2px solid var(--line)" }}
                  >
                    Manage or cancel subscription
                  </button>
                  <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                    One tap, no phone calls — handled by Stripe's own billing page.
                  </p>
                  <button
                    onClick={() => {
                      setIsPremium(false);
                      flash("Premium turned off (demo reset)");
                    }}
                    className="text-xs mt-1 font-bold"
                    style={{ color: "var(--muted)", textDecoration: "underline" }}
                  >
                    (dev only) reset demo state
                  </button>
                </div>
              ) : (
                <UpgradeCard onSubscribe={subscribe} billing={billing} setBilling={setBilling} loading={subscribing} />
              )}
            </>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex px-4 pb-4 pt-2 gap-2">
          {[
            { id: "today", label: "Today", emoji: "🏠" },
            { id: "progress", label: "Progress", emoji: "📈" },
            { id: "stories", label: "Stories", emoji: "💬" },
            { id: "upgrade", label: "Upgrade", emoji: "✨" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 rounded-2xl text-[11px] font-extrabold transition active:scale-95 flex flex-col items-center gap-0.5"
              style={{
                background: tab === t.id ? "var(--primary)" : "var(--surface)",
                color: tab === t.id ? "#fff" : "var(--muted)",
                boxShadow: tab === t.id ? "0 6px 16px -6px rgba(20,184,140,0.55)" : "none",
              }}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Paywall modal */}
      {showPaywall && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-50"
          style={{ background: "rgba(16,36,28,0.5)" }}
          onClick={() => setShowPaywall(false)}
        >
          <div className="w-full max-w-sm relative slide-up" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowPaywall(false)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition"
              style={{ background: "var(--surface)", border: "2px solid var(--line)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            >
              <X size={16} />
            </button>
            <UpgradeCard onSubscribe={subscribe} billing={billing} setBilling={setBilling} loading={subscribing} />
          </div>
        </div>
      )}
    </div>
  );
}
