/* PostCraft AI — standalone vanilla JS version.
 * Talks to the existing FastAPI backend. The AI key never leaves the backend.
 *
 * BACKEND ADDRESS
 * ---------------
 * Default is your published app. You can override it without editing this file:
 *   - open index.html?api=https://your-backend-host/api   (remembered in this browser)
 *   - open index.html?api=reset                            (back to the default)
 */
const DEFAULT_API_BASE = "https://postcraft-ai-22.emergent.host/api";
const API_STORAGE_KEY = "postcraft-api-base";
const SESSION_KEY = "postcraft-anonymous-session";

function resolveApiBase() {
  const param = new URLSearchParams(window.location.search).get("api");
  if (param === "reset") localStorage.removeItem(API_STORAGE_KEY);
  else if (param) localStorage.setItem(API_STORAGE_KEY, param.replace(/\/+$/, ""));
  return localStorage.getItem(API_STORAGE_KEY) || window.POSTCRAFT_API_BASE || DEFAULT_API_BASE;
}
const API_BASE = resolveApiBase();

/* ---------- anonymous session (isolates drafts per browser) ---------- */
function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/* ---------- API layer ---------- */
class ApiError extends Error {
  constructor(status, body) {
    super(`request failed with ${status}`);
    this.status = status;
    this.body = body;
  }
}
async function request(method, path, body) {
  const headers = { "X-Session-ID": getSessionId() };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  if (res.status === 204) return undefined;
  return res.json();
}
const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b ?? null),
  put: (p, b) => request("PUT", p, b ?? null),
  del: (p) => request("DELETE", p),
};

/* ---------- helpers ---------- */
const $ = (testId) => document.querySelector(`[data-testid="${testId}"]`);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const ICONS = {
  spinner: (cls) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-circle ${cls} animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`,
  check: (cls) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check ${cls}" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>`,
  circleCheck: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>`,
  circleAlert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>`,
  plus: (cls) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus ${cls}" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2 lucide-trash-2 h-4 w-4" aria-hidden="true"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  arrowUpRight: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-right ml-1.5 h-3.5 w-3.5" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>`,
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text h-5 w-5" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>`,
  chart: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-column h-5 w-5 text-indigo-500" aria-hidden="true"><path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>`,
};

/* Resolved shadcn class strings (copied from the React build so visuals match exactly) */
const BTN_BASE =
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";
const BTN_PRIMARY_INDIGO = `${BTN_BASE} rounded-lg [&_svg:not([class*='size-'])]:size-4 text-primary-foreground h-8 gap-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700`;
const BTN_GHOST_SM = `${BTN_BASE} hover:bg-muted hover:text-foreground h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5`;
const CARD =
  "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] group border-slate-200/80 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg";
const CARD_HEADER =
  "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) pb-3";
const BADGE_OUTLINE =
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all border-indigo-100 bg-indigo-50/50 text-indigo-700";
const NAV_ACTIVE = "rounded-lg px-4 py-2 text-sm font-semibold transition-colors bg-indigo-50 text-indigo-700";
const NAV_IDLE = "rounded-lg px-4 py-2 text-sm font-semibold transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900";
const MNAV_ACTIVE = "rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700";
const MNAV_IDLE = "rounded-lg px-3 py-2 text-sm font-semibold text-slate-600";

/* ---------- toasts ---------- */
function toast(message, type = "success") {
  const host = document.getElementById("pc-toaster");
  const el = document.createElement("div");
  el.className = "pc-toast";
  el.dataset.type = type;
  el.setAttribute("role", "status");
  el.setAttribute("data-testid", `toast-${type}`);
  el.innerHTML = `${type === "success" ? ICONS.circleCheck : ICONS.circleAlert}<span>${esc(message)}</span>`;
  host.appendChild(el);
  while (host.children.length > 3) host.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add("pc-leaving");
    setTimeout(() => el.remove(), 260);
  }, 4000);
}

/* ---------- state ---------- */
const INITIAL_FORM = {
  topic: "", category: "Personal Branding", tone: "Professional", length: "Medium",
  language: "English", keywords: "", target_audience: "", call_to_action: "",
};
const state = {
  form: { ...INITIAL_FORM },
  post: "",
  hashtags: [],
  quality: null,
  view: "workspace",
  editingDraftId: null,
  drafts: [],
  draftsLoading: true,
  generating: false,
  transforming: null,
  saving: false,
};

/* ---------- element refs ---------- */
const el = {
  topic: $("post-topic-input"),
  category: $("post-category-select"),
  tone: $("post-tone-select"),
  length: $("post-length-select"),
  language: $("post-language-select"),
  keywords: $("post-keywords-input"),
  audience: $("post-audience-input"),
  cta: $("post-cta-input"),
  generate: $("generate-post-button"),
  title: $("draft-title-input"),
  editor: $("post-editor-textarea"),
  wordCount: $("word-count"),
  copy: $("copy-post-button"),
  download: $("download-post-button"),
  save: $("save-draft-button"),
  preview: $("preview-post-content"),
  linkedin: $("linkedin-preview"),
  navWorkspace: $("workspace-nav-button"),
  navDrafts: $("drafts-nav-button"),
  newPost: $("new-post-button"),
  brand: $("brand-home-button"),
  mobileMenu: $("mobile-menu-button"),
  mobileNav: $("mobile-navigation"),
  mWorkspace: $("mobile-workspace-nav-button"),
  mDrafts: $("mobile-drafts-nav-button"),
  mNew: $("mobile-new-post-button"),
  viewWorkspace: document.getElementById("view-workspace"),
  viewDrafts: document.getElementById("view-drafts"),
};
const formFields = [
  ["topic", el.topic], ["category", el.category], ["tone", el.tone], ["length", el.length],
  ["language", el.language], ["keywords", el.keywords], ["target_audience", el.audience], ["call_to_action", el.cta],
];
const GENERATE_IDLE_HTML = el.generate.innerHTML;
const AI_OPS = ["regenerate", "rewrite", "shorten", "expand", "hook", "grammar", "hashtags", "quality"];
const aiButtons = Object.fromEntries(AI_OPS.map((op) => [op, $(`ai-${op}-button`)]));
const aiIdleHtml = Object.fromEntries(AI_OPS.map((op) => [op, aiButtons[op].innerHTML]));
const draftsCountBadge = el.navDrafts.querySelector("span");
const reactionsLabel = el.linkedin.lastElementChild.lastElementChild;

// Quality slot replaces the static empty state so we can swap empty <-> audit card.
const qualitySlot = document.createElement("div");
$("quality-empty-state").replaceWith(qualitySlot);

// Hashtag line under the preview text.
const hashtagLine = document.createElement("p");
hashtagLine.className = "mt-4 text-sm font-medium leading-6 text-indigo-600";
hashtagLine.setAttribute("data-testid", "preview-hashtags");
hashtagLine.hidden = true;
el.preview.after(hashtagLine);

/* ---------- rendering ---------- */
function wordCount() {
  const t = state.post.trim();
  return t ? t.split(/\s+/).length : 0;
}

function renderForm() {
  for (const [key, node] of formFields) if (node.value !== state.form[key]) node.value = state.form[key];
}

function renderEditor() {
  if (el.editor.value !== state.post) el.editor.value = state.post;
  const wc = wordCount();
  el.wordCount.textContent = `${wc} words`;

  // Live LinkedIn preview
  if (state.post) el.preview.textContent = state.post;
  else el.preview.innerHTML = '<span class="text-slate-400">Your preview will appear here as you write.</span>';
  hashtagLine.hidden = state.hashtags.length === 0;
  hashtagLine.textContent = state.hashtags.join(" ");
  reactionsLabel.textContent = wc > 0 ? `${Math.max(1, Math.round(wc / 2))} reactions` : "Preview mode";

  const hasPost = Boolean(state.post);
  el.copy.disabled = !hasPost;
  el.download.disabled = !hasPost;
  el.save.disabled = state.saving || !state.post.trim();
  el.save.innerHTML = `${state.saving ? ICONS.spinner("mr-1.5 h-3.5 w-3.5") : ICONS.check("mr-1.5 h-3.5 w-3.5")}${state.editingDraftId ? "Update draft" : "Save draft"}`;

  for (const op of AI_OPS) {
    const btn = aiButtons[op];
    btn.disabled = !hasPost || state.transforming !== null;
    btn.innerHTML =
      state.transforming === op
        ? aiIdleHtml[op].replace(/<svg[\s\S]*?<\/svg>/, ICONS.spinner("mr-1.5 h-3.5 w-3.5"))
        : aiIdleHtml[op];
  }
}

function renderGenerate() {
  el.generate.disabled = state.generating || state.form.topic.trim().length < 3;
  el.generate.innerHTML = state.generating
    ? `${ICONS.spinner("mr-2 h-4 w-4")}Writing your first draft…`
    : GENERATE_IDLE_HTML;
}

function metric(label, value, suffix = "") {
  return `<div class="rounded-xl border border-white bg-white/80 px-3 py-2"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${label}</p><p class="mt-1 text-sm font-bold text-slate-900">${esc(value)}<span class="text-[10px] font-medium text-slate-400">${suffix}</span></p></div>`;
}

function renderQuality() {
  const q = state.quality;
  qualitySlot.innerHTML = !q
    ? '<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500" data-testid="quality-empty-state">Run a quality audit to see how your post reads.</div>'
    : `<div class="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/45 p-4" data-testid="quality-audit-card">
        <div class="flex items-center justify-between"><div><p class="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Post quality</p><p class="mt-1 text-sm text-slate-600">A quick editorial read on this draft.</p></div>${ICONS.chart}</div>
        <div class="grid grid-cols-3 gap-2">${metric("Hook", q.hook_score, "/100")}${metric("Readability", q.readability)}${metric("Scan", q.scannability, "/100")}</div>
        <p class="text-xs leading-relaxed text-slate-600" data-testid="quality-feedback">${esc(q.feedback)}</p>
      </div>`;
}

function renderNav() {
  const ws = state.view === "workspace";
  el.navWorkspace.className = ws ? NAV_ACTIVE : NAV_IDLE;
  el.navDrafts.className = ws ? NAV_IDLE : NAV_ACTIVE;
  el.mWorkspace.className = ws ? MNAV_ACTIVE : MNAV_IDLE;
  el.mDrafts.className = ws ? MNAV_IDLE : MNAV_ACTIVE;
  draftsCountBadge.textContent = String(state.drafts.length);
  el.viewWorkspace.hidden = !ws;
  el.viewDrafts.hidden = ws;
}

function draftCard(d) {
  const id = esc(d.id);
  return `<div data-slot="card" class="${CARD}" data-testid="draft-card-${id}">
    <div data-slot="card-header" class="${CARD_HEADER}">
      <div class="flex items-start justify-between gap-3"><span class="${BADGE_OUTLINE}">${esc(d.category)}</span>
        <button class="rounded-md p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100" aria-label="Delete draft" data-action="delete" data-id="${id}" data-testid="delete-draft-${id}">${ICONS.trash}</button></div>
      <div data-slot="card-title" class="font-heading font-medium line-clamp-2 pt-2 text-base">${esc(d.title)}</div>
    </div>
    <div data-slot="card-content" class="px-(--card-spacing)">
      <p class="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">${esc(d.content)}</p>
      <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span class="text-xs text-slate-400">${esc(new Date(d.updated_at).toLocaleDateString())}</span>
        <button type="button" class="${BTN_GHOST_SM}" data-action="open" data-id="${id}" data-testid="open-draft-${id}">Open ${ICONS.arrowUpRight}</button></div>
    </div>
  </div>`;
}

function renderDrafts() {
  let body;
  if (state.draftsLoading) {
    body = `<div class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500" data-testid="drafts-loading-state">${ICONS.spinner("mx-auto mb-3 h-5 w-5 text-indigo-500")}Loading your private drafts…</div>`;
  } else if (state.drafts.length === 0) {
    body = `<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center" data-testid="drafts-empty-state"><div class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">${ICONS.fileText}</div><h2 class="mt-4 font-heading text-lg font-bold">No saved drafts yet</h2><p class="mt-2 text-sm text-slate-500">Generate an idea in the workspace, then save it here.</p><button type="button" class="mt-5 ${BTN_PRIMARY_INDIGO}" data-action="new" data-testid="empty-drafts-new-button">Create your first post</button></div>`;
  } else {
    body = `<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">${state.drafts.map(draftCard).join("")}</div>`;
  }
  el.viewDrafts.innerHTML = `<section data-testid="drafts-dashboard">
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p class="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-600">Your library</p><h1 class="mt-2 font-heading text-4xl font-extrabold tracking-[-0.04em] text-slate-950" data-testid="drafts-heading">Drafts that keep your ideas moving.</h1><p class="mt-3 max-w-xl text-slate-500">Everything saved from this browser session, ready for another pass.</p></div>
      <button type="button" class="${BTN_PRIMARY_INDIGO}" data-action="new" data-testid="drafts-new-post-button">${ICONS.plus("mr-2 h-4 w-4")}New post</button></div>
    ${body}
  </section>`;
}

function renderAll() {
  renderForm();
  renderGenerate();
  renderEditor();
  renderQuality();
  renderNav();
  renderDrafts();
}

/* ---------- data ---------- */
async function loadDrafts() {
  try {
    state.drafts = await api.get("/drafts");
  } catch (err) {
    console.error("Could not load drafts:", err);
    state.drafts = [];
  } finally {
    state.draftsLoading = false;
    renderNav();
    renderDrafts();
  }
}

function applyResult(result, { keepHashtagsIfEmpty = false } = {}) {
  state.post = result.post;
  if (!keepHashtagsIfEmpty || result.hashtags.length) state.hashtags = result.hashtags;
  state.quality = result.quality;
}

/* ---------- actions ---------- */
async function generatePost() {
  if (state.generating || state.form.topic.trim().length < 3) return;
  state.generating = true;
  renderGenerate();
  try {
    applyResult(await api.post("/ai/generate", state.form));
    renderEditor();
    renderQuality();
    toast("Your post is ready to refine");
  } catch (err) {
    console.error(err);
    toast("AI generation could not complete. Check the model configuration and try again.", "error");
  } finally {
    state.generating = false;
    renderGenerate();
  }
}

async function transformPost(operation) {
  if (!state.post || state.transforming) return;
  state.transforming = operation;
  renderEditor();
  try {
    const { category, tone, length, language } = state.form;
    applyResult(
      await api.post("/ai/transform", { post: state.post, operation, category, tone, length, language }),
      { keepHashtagsIfEmpty: true },
    );
    renderQuality();
    toast("Post updated");
  } catch (err) {
    console.error(err);
    toast("That refinement could not complete. Please try again.", "error");
  } finally {
    state.transforming = null;
    renderEditor();
  }
}

async function saveDraft() {
  if (!state.post.trim()) {
    toast("Generate or write a post before saving", "error");
    return;
  }
  state.saving = true;
  renderEditor();
  const payload = {
    title: el.title.value.trim() || "Untitled post",
    content: state.post,
    category: state.form.category,
    tone: state.form.tone,
    length: state.form.length,
    language: state.form.language,
    hashtags: state.hashtags,
    quality: state.quality,
  };
  try {
    const draft = state.editingDraftId
      ? await api.put(`/drafts/${encodeURIComponent(state.editingDraftId)}`, payload)
      : await api.post("/drafts", payload);
    state.editingDraftId = draft.id;
    el.title.value = draft.title;
    toast("Draft saved to your private workspace");
    loadDrafts();
  } catch (err) {
    console.error(err);
    toast("Could not save this draft right now.", "error");
  } finally {
    state.saving = false;
    renderEditor();
  }
}

async function deleteDraft(id) {
  try {
    await api.del(`/drafts/${encodeURIComponent(id)}`);
    if (state.editingDraftId === id) state.editingDraftId = null;
    await loadDrafts();
    renderEditor();
    toast("Draft deleted");
  } catch (err) {
    console.error(err);
    toast("Could not delete that draft.", "error");
  }
}

function openDraft(id) {
  const d = state.drafts.find((x) => x.id === id);
  if (!d) return;
  state.post = d.content;
  state.hashtags = d.hashtags || [];
  state.quality = d.quality;
  state.editingDraftId = d.id;
  state.form = { ...INITIAL_FORM, topic: d.content, category: d.category, tone: d.tone, length: d.length, language: d.language };
  el.title.value = d.title;
  setView("workspace");
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
  toast("Draft opened in the editor");
}

function startNew() {
  state.form = { ...INITIAL_FORM };
  state.post = "";
  state.hashtags = [];
  state.quality = null;
  state.editingDraftId = null;
  el.title.value = "Untitled post";
  el.mobileNav.hidden = true;
  setView("workspace");
  renderAll();
  setTimeout(() => {
    el.topic.scrollIntoView({ behavior: "smooth", block: "center" });
    el.topic.focus({ preventScroll: true });
  }, 50);
  toast("Fresh post started — what do you want to say?");
}

function setView(view) {
  state.view = view;
  renderNav();
}

function fullText() {
  return `${state.post}${state.hashtags.length ? `\n\n${state.hashtags.join(" ")}` : ""}`;
}

async function copyPost() {
  const text = fullText();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast("Post copied to clipboard");
}

function downloadPost() {
  const url = URL.createObjectURL(new Blob([fullText()], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "postcraft-linkedin-post.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Text file downloaded");
}

/* ---------- events ---------- */
for (const [key, node] of formFields) {
  node.addEventListener(node.tagName === "SELECT" ? "change" : "input", () => {
    state.form[key] = node.value;
    if (key === "topic") renderGenerate();
  });
}
el.generate.addEventListener("click", generatePost);
el.editor.addEventListener("input", () => {
  state.post = el.editor.value;
  renderEditor();
});
el.copy.addEventListener("click", copyPost);
el.download.addEventListener("click", downloadPost);
el.save.addEventListener("click", saveDraft);
for (const op of AI_OPS) aiButtons[op].addEventListener("click", () => transformPost(op));

el.navWorkspace.addEventListener("click", () => setView("workspace"));
el.navDrafts.addEventListener("click", () => setView("drafts"));
el.newPost.addEventListener("click", startNew);
el.brand.addEventListener("click", startNew);
el.mobileMenu.addEventListener("click", () => (el.mobileNav.hidden = !el.mobileNav.hidden));
el.mWorkspace.addEventListener("click", () => { setView("workspace"); el.mobileNav.hidden = true; });
el.mDrafts.addEventListener("click", () => { setView("drafts"); el.mobileNav.hidden = true; });
el.mNew.addEventListener("click", startNew);

el.viewDrafts.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "new") startNew();
  else if (action === "open") openDraft(id);
  else if (action === "delete") deleteDraft(id);
});

/* ---------- boot ---------- */
console.info(`PostCraft AI (HTML version) using backend: ${API_BASE}`);
renderAll();
loadDrafts();
