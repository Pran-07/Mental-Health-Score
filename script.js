const API_URL = "https://mental-health-score-fuep.onrender.com/predict";
const PLATFORMS = [
  { value: "Facebook", icon: "📘" },
  { value: "LinkedIn", icon: "💼" },
  { value: "Instagram", icon: "📸" },
  { value: "Snapchat", icon: "👻" },
  { value: "Twitter", icon: "🐦" },
  { value: "YouTube", icon: "▶️" },
  { value: "TikTok", icon: "🎵" },
  { value: "LINE", icon: "💬" },
  { value: "KakaoTalk", icon: "🗨️" },
  { value: "VKontakte", icon: "🌐" },
  { value: "WhatsApp", icon: "📱" },
  { value: "WeChat", icon: "🟢" },
];

const PURPOSES = [
  { value: "Networking", icon: "🤝" },
  { value: "Education", icon: "🎓" },
  { value: "Entertainment", icon: "🎬" },
  { value: "News", icon: "📰" },
];

const STRESS_LEVELS = [
  { value: "Low", icon: "🌤️", desc: "Generally manageable" },
  { value: "Medium", icon: "⛅", desc: "Some noticeable pressure" },
  { value: "High", icon: "🌥️", desc: "Frequent or significant pressure" },
  { value: "Very High", icon: "⛈️", desc: "Intense or difficult-to-manage pressure" },
];

const TOP_COUNTRIES = ["Other", "India", "USA", "Canada", "Australia", "UK", "Germany", "Mexico", "Turkey", "France"];

const STEP_ORDER = ["1", "2", "3", "4", "review"];


const state = {
  stepIndex: 0,
  values: {
    most_used_platform: null,
    purpose_of_use: null,
    stress_level: null,
  },
  hasInteracted: false,
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const form = $("#assessmentForm");
const stepEls = { 1: $('[data-step="1"]'), 2: $('[data-step="2"]'), 3: $('[data-step="3"]'), 4: $('[data-step="4"]'), review: $('[data-step="review"]') };
const railItems = $$(".step-rail-item");
const progressText = $("#progressText");
const progressFill = $("#progressFill");
const progressBar = $("#progressBar");
const backBtn = $("#backBtn");
const nextBtn = $("#nextBtn");
const resetBtn = $("#resetBtn");
const stepControls = $("#stepControls");
const analyzeBtn = $("#analyzeBtn");
const analyzeStatus = $("#analyzeStatus");

const assessmentSection = $("#assessment");
const resultSection = $("#resultSection");
const apiErrorSection = $("#apiErrorSection");

function initTheme() {
  const saved = localStorage.getItem("mindscope-theme");
  const theme = saved || "dark";
  applyTheme(theme);
}
function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  const toggle = $("#themeToggle");
  toggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  toggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
  localStorage.setItem("mindscope-theme", theme);
}
$("#themeToggle").addEventListener("click", () => {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  applyTheme(isLight ? "dark" : "light");
});

const menuToggle = $("#menuToggle");
const navLinks = $("#navLinks");
menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
});
$$("#navLinks a").forEach((a) => a.addEventListener("click", () => {
  navLinks.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
}));

function buildChoiceGrid(container, items, fieldName, extraClass) {
  container.innerHTML = "";
  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = extraClass || "choice-card";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.dataset.value = item.value;
    btn.innerHTML = `<span class="choice-icon" aria-hidden="true">${item.icon}</span><span>${item.value}</span>`;
    btn.addEventListener("click", () => {
      state.values[fieldName] = item.value;
      state.hasInteracted = true;
      $$(`[data-field="${fieldName}"]`, container).forEach(() => {});
      Array.from(container.children).forEach((c) => c.setAttribute("aria-checked", c === btn ? "true" : "false"));
      clearFieldError(fieldName);
    });
    container.appendChild(btn);
  });
}

function buildStressGrid() {
  const container = $("#stressGrid");
  container.innerHTML = "";
  STRESS_LEVELS.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "stress-card";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.dataset.value = item.value;
    btn.innerHTML = `
      <span class="stress-icon" aria-hidden="true">${item.icon}</span>
      <span class="stress-name">${item.value}</span>
      <span class="stress-desc">${item.desc}</span>
    `;
    btn.addEventListener("click", () => {
      state.values.stress_level = item.value;
      state.hasInteracted = true;
      Array.from(container.children).forEach((c) => c.setAttribute("aria-checked", c === btn ? "true" : "false"));
      clearFieldError("stress");
    });
    container.appendChild(btn);
  });
}

buildChoiceGrid($("#platformGrid"), PLATFORMS, "most_used_platform");
buildChoiceGrid($("#purposeGrid"), PURPOSES, "purpose_of_use", "choice-card");
buildStressGrid();

function contextLabel(value, min, max) {
  const pct = (value - min) / (max - min);
  if (pct < 0.33) return "Low";
  if (pct < 0.66) return "Moderate";
  return "High";
}

function wireSlider(inputId, outId, contextId, unitLabel, decimals) {
  const input = $(`#${inputId}`);
  const out = $(`#${outId}`);
  const ctx = $(`#${contextId}`);
  const update = () => {
    const val = parseFloat(input.value);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty("--fill", `${pct}%`);
    out.textContent = `${val.toFixed(decimals)} ${unitLabel}`;
    if (ctx) ctx.textContent = contextLabel(val, min, max);
    state.hasInteracted = true;
  };
  input.addEventListener("input", update);
  update();
}

wireSlider("usageHours", "usageHoursOut", "usageHoursContext", "hours/day", 1);
wireSlider("dailyUnlocks", "dailyUnlocksOut", "dailyUnlocksContext", "unlocks/day", 0);
wireSlider("studyHours", "studyHoursOut", "studyHoursContext", "hours/day", 1);
wireSlider("activityHours", "activityHoursOut", "activityHoursContext", "hours/day", 1);
wireSlider("sleepHours", "sleepHoursOut", "sleepHoursContext", "hours/night", 1);

function setFieldError(key, message) {
  const errEl = $(`#err-${key}`);
  if (errEl) errEl.textContent = message;
  const fieldEl = errEl ? errEl.closest(".field") : null;
  if (fieldEl) fieldEl.classList.add("has-error");
}
function clearFieldError(key) {
  const errEl = $(`#err-${key}`);
  if (errEl) errEl.textContent = "";
  const fieldEl = errEl ? errEl.closest(".field") : null;
  if (fieldEl) fieldEl.classList.remove("has-error");
}
function clearAllErrors() {
  $$(".field-error").forEach((e) => (e.textContent = ""));
  $$(".field.has-error").forEach((f) => f.classList.remove("has-error"));
}

function validateStep(step) {
  clearAllErrors();
  let valid = true;

  if (step === "1") {
    const age = $("#age").value;
    if (age === "" || Number(age) < 10 || Number(age) > 100) {
      setFieldError("age", "Enter an age between 10 and 100.");
      valid = false;
    }
    if (!$("#gender").value) {
      setFieldError("gender", "Select a gender.");
      valid = false;
    }
    if (!$("#country").value.trim()) {
      setFieldError("country", "Enter your country.");
      valid = false;
    }
    if (!$("#academicLevel").value) {
      setFieldError("academicLevel", "Select an academic level.");
      valid = false;
    }
  }

  if (step === "2") {
    if (!state.values.most_used_platform) {
      setFieldError("platform", "Select the platform you use most.");
      valid = false;
    }
    if (!state.values.purpose_of_use) {
      setFieldError("purpose", "Select your primary purpose of use.");
      valid = false;
    }
  }

  if (step === "4") {
    if (!state.values.stress_level) {
      setFieldError("stress", "Select your current stress level.");
      valid = false;
    }
  }

  if (!valid) {
    showToast("Please complete the highlighted fields.", "error");
  }
  return valid;
}

function goToStep(index) {
  state.stepIndex = index;
  const key = STEP_ORDER[index];

  Object.entries(stepEls).forEach(([k, el]) => {
    el.classList.toggle("is-active", k === key);
  });

  railItems.forEach((item) => {
    const railKey = item.dataset.rail;
    const railNum = Number(railKey);
    const currentNum = Number(key === "review" ? 5 : key);
    item.classList.toggle("is-active", railKey === key);
    item.classList.toggle("is-done", railNum < currentNum);
  });

  const isReview = key === "review";
  progressText.textContent = isReview ? "Review" : `Step ${key} of 4`;
  const pct = isReview ? 100 : (Number(key) / 4) * 100;
  progressFill.style.width = `${pct}%`;
  progressBar.setAttribute("aria-valuenow", String(Math.round(pct)));

  backBtn.disabled = index === 0;
  nextBtn.textContent = index === STEP_ORDER.length - 2 ? "Review" : "Next";
  stepControls.style.display = isReview ? "none" : "flex";

  if (isReview) populateReview();

  assessmentSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

nextBtn.addEventListener("click", () => {
  const currentKey = STEP_ORDER[state.stepIndex];
  if (currentKey !== "review" && !validateStep(currentKey)) return;
  if (state.stepIndex < STEP_ORDER.length - 1) goToStep(state.stepIndex + 1);
});

backBtn.addEventListener("click", () => {
  if (state.stepIndex > 0) goToStep(state.stepIndex - 1);
});

$("#editAnswersBtn")?.addEventListener("click", () => {
  resultSection.hidden = true;
  assessmentSection.hidden = false;
  goToStep(0);
});

function populateReview() {
  const d = collectFormData();
  $("#rv-age").textContent = d.age;
  $("#rv-gender").textContent = d.gender;
  $("#rv-country").textContent = d.country;
  $("#rv-academic").textContent = d.academic_level;
  $("#rv-platform").textContent = d.most_used_platform;
  $("#rv-purpose").textContent = d.purpose_of_use;
  $("#rv-usage").textContent = `${d.avg_daily_usage_hours} hours/day`;
  $("#rv-unlocks").textContent = `${d.daily_unlocks} unlocks/day`;
  $("#rv-study").textContent = `${d.study_hours} hours/day`;
  $("#rv-activity").textContent = `${d.physical_activity_hours} hours/day`;
  $("#rv-sleep").textContent = `${d.sleep_hours_per_night} hours/night`;
  $("#rv-stress").textContent = d.stress_level;
}

function collectFormData() {
  return {
    age: Number($("#age").value),
    gender: $("#gender").value,
    country: $("#country").value.trim() || "Other",
    academic_level: $("#academicLevel").value,
    most_used_platform: state.values.most_used_platform,
    purpose_of_use: state.values.purpose_of_use,
    avg_daily_usage_hours: Number($("#usageHours").value),
    daily_unlocks: Number($("#dailyUnlocks").value),
    study_hours: Number($("#studyHours").value),
    physical_activity_hours: Number($("#activityHours").value),
    sleep_hours_per_night: Number($("#sleepHours").value),
    stress_level: state.values.stress_level,
  };
}

function resetAssessment(skipConfirm) {
  if (!skipConfirm && state.hasInteracted) {
    const ok = window.confirm("This will clear everything you've entered. Start a new assessment?");
    if (!ok) return;
  }
  form.reset();
  state.values = { most_used_platform: null, purpose_of_use: null, stress_level: null };
  state.hasInteracted = false;
  clearAllErrors();
  $$(".choice-card, .stress-card").forEach((c) => c.setAttribute("aria-checked", "false"));
  ["usageHours", "dailyUnlocks", "studyHours", "activityHours", "sleepHours"].forEach((id) => {
    $(`#${id}`).dispatchEvent(new Event("input"));
  });
  resultSection.hidden = true;
  apiErrorSection.hidden = true;
  assessmentSection.hidden = false;
  goToStep(0);
  showToast("Reset completed.", "success");
}
resetBtn.addEventListener("click", () => resetAssessment(false));
$("#newAssessmentBtn").addEventListener("click", () => resetAssessment(true));

async function submitAssessment() {
  const payload = collectFormData();

  setAnalyzing(true);
  analyzeStatus.textContent = "Connecting to the ML prediction service…";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = "";
      try {
        const errBody = await response.json();
        detail = errBody?.detail ? JSON.stringify(errBody.detail) : "";
      } catch (_) {  }
      throw new HttpError(response.status, detail);
    }

    const data = await response.json();
    if (typeof data.predicted_mental_health_score !== "number") {
      throw new Error("bad_shape");
    }

    showResult(data.predicted_mental_health_score, payload);
    showToast("Prediction complete.", "success");
  } catch (err) {
    handleSubmitError(err);
  } finally {
    setAnalyzing(false);
  }
}

class HttpError extends Error {
  constructor(status, detail) {
    super("http_error");
    this.status = status;
    this.detail = detail;
  }
}

function handleSubmitError(err) {
  assessmentSection.hidden = true;
  resultSection.hidden = true;
  apiErrorSection.hidden = false;

  const titleEl = $("#apiErrorTitle");
  const detailEl = $("#apiErrorDetail");

  if (err instanceof HttpError) {
    titleEl.textContent = "The prediction server returned an error.";
    detailEl.innerHTML = `Something went wrong while processing the prediction. Please try again. <br><span style="color:var(--text-faint); font-size:0.8rem;">Status ${err.status}</span>`;
    showToast("The prediction server returned an error.", "error");
  } else if (err instanceof TypeError) {

    titleEl.textContent = "Unable to connect to the prediction server.";
    detailEl.innerHTML = `Please make sure the FastAPI backend is running at <code>${API_URL.replace("/predict", "")}</code>`;
    showToast("Unable to connect to the prediction server.", "error");
  } else {
    titleEl.textContent = "Something went wrong while processing the prediction.";
    detailEl.textContent = "Please try again.";
    showToast("Unexpected response from the server.", "error");
  }
}

$("#retryBtn").addEventListener("click", () => {
  apiErrorSection.hidden = true;
  assessmentSection.hidden = false;
  submitAssessment();
});

function setAnalyzing(isAnalyzing) {
  analyzeBtn.disabled = isAnalyzing;
  $(".btn-label", analyzeBtn).textContent = isAnalyzing ? "Analyzing…" : "Analyze my mental wellness";
  $(".btn-spinner", analyzeBtn).hidden = !isAnalyzing;
  if (!isAnalyzing) analyzeStatus.textContent = "";
}

analyzeBtn.addEventListener("click", submitAssessment);

function scoreRangeInfo(score) {
  if (score < 4) return { label: "Lower predicted score range", cls: "range-low" };
  if (score < 7) return { label: "Moderate predicted score range", cls: "range-mid" };
  return { label: "Higher predicted score range", cls: "range-high" };
}

function showResult(score, payload) {
  assessmentSection.hidden = true;
  apiErrorSection.hidden = true;
  resultSection.hidden = false;

  animateScoreNumber(score);
  animateScoreRing(score);

  const range = scoreRangeInfo(score);
  const tag = $("#scoreRangeTag");
  tag.textContent = range.label;
  tag.className = `score-range-tag ${range.cls}`;

  renderSnapshot(payload);
  renderInsights(payload);

  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function animateScoreNumber(score) {
  const el = $("#scoreNumber");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    el.textContent = score.toFixed(1);
    return;
  }
  const duration = 900;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = (score * eased).toFixed(1);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = score.toFixed(1);
  }
  requestAnimationFrame(tick);
}

function animateScoreRing(score) {
  const circle = $("#scoreRingFill");
  const circumference = 2 * Math.PI * 86; // r=86
  const pct = Math.max(0, Math.min(score / 10, 1));
  const offset = circumference - pct * circumference;
  circle.style.strokeDasharray = `${circumference}`;

  circle.style.strokeDashoffset = `${circumference}`;
  requestAnimationFrame(() => {
    circle.style.strokeDashoffset = `${offset}`;
  });
}

function renderSnapshot(d) {
  const items = [
    { icon: "📵", label: "Social media usage", value: `${d.avg_daily_usage_hours} hrs/day` },
    { icon: "🔓", label: "Daily unlocks", value: `${d.daily_unlocks}/day` },
    { icon: "📚", label: "Study time", value: `${d.study_hours} hrs/day` },
    { icon: "🏃", label: "Physical activity", value: `${d.physical_activity_hours} hrs/day` },
    { icon: "😴", label: "Sleep", value: `${d.sleep_hours_per_night} hrs/night` },
    { icon: "🧭", label: "Stress", value: d.stress_level },
    { icon: "🎓", label: "Academic level", value: d.academic_level },
    { icon: "📲", label: "Platform", value: d.most_used_platform },
  ];
  const grid = $("#snapshotGrid");
  grid.innerHTML = items
    .map(
      (i) => `
      <div class="snap-card">
        <span class="snap-icon" aria-hidden="true">${i.icon}</span>
        <span class="snap-label">${i.label}</span>
        <span class="snap-value">${i.value}</span>
      </div>`
    )
    .join("");
}

function renderInsights(d) {
  const insights = [];

  if (d.avg_daily_usage_hours >= 6) {
    insights.push({
      title: "Digital usage",
      text: "Your reported daily social media usage is relatively high. Consider creating intentional screen-free periods during the day.",
    });
  }
  if (d.sleep_hours_per_night <= 6) {
    insights.push({
      title: "Sleep",
      text: "Your reported sleep duration is relatively low. Maintaining a consistent sleep routine may support overall wellbeing.",
    });
  }
  if (d.physical_activity_hours < 1) {
    insights.push({
      title: "Physical activity",
      text: "You reported limited physical activity. Consider adding short movement breaks to your daily routine.",
    });
  }
  if (d.study_hours >= 8) {
    insights.push({
      title: "Study balance",
      text: "Your reported study time is relatively high. Remember to include breaks and recovery time.",
    });
  }
  if (insights.length === 0) {
    insights.push({
      title: "Balanced routine",
      text: "Your reported habits fall within a generally balanced range across the areas we asked about.",
    });
  }

  const grid = $("#insightsGrid");
  grid.innerHTML = insights
    .map((i) => `<div class="insight-card"><h4>${i.title}</h4><p>${i.text}</p></div>`)
    .join("");
}

function showToast(message, type = "info") {
  const container = $("#toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-leaving");
    setTimeout(() => toast.remove(), 260);
  }, 3800);
}

function goToAssessment() {
  assessmentSection.hidden = false;
  assessmentSection.scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#heroStartBtn").addEventListener("click", goToAssessment);
$("#navCta").addEventListener("click", goToAssessment);

function animateCounters() {
  const els = $$("[data-count-to]");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  els.forEach((el) => {
    const target = Number(el.dataset.countTo);
    const suffix = el.dataset.suffix || "";
    if (prefersReduced) {
      el.textContent = target.toLocaleString() + suffix;
      return;
    }
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

const statsObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    });
  },
  { threshold: 0.4 }
);
const statsSection = $(".stats");
if (statsSection) statsObserver.observe(statsSection);

initTheme();
goToStep(0);
