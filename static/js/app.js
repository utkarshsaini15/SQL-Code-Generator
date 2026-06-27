/* ============================================================
   CodeForge AI — frontend logic
   ============================================================ */

const $ = (s) => document.querySelector(s);

const ICONS = {
  generate: "i-generate", explain: "i-explain", debug: "i-debug",
  optimize: "i-optimize", document: "i-document", review: "i-review", learn: "i-learn",
};

/* Per-module hero: centered title, rotating typewriter phrases, example chips. */
const HERO = {
  generate: {
    title: "Generate your code",
    typer: ["a Python function for factorial…", "a REST API endpoint in Flask…", "a SQL query for the 2nd-highest salary…", "a binary search in Java…"],
    chips: [
      { label: "Factorial in Python", prompt: "Write a Python function to find the factorial of a number" },
      { label: "2nd-highest salary (SQL)", prompt: "Write a SQL query to find the second highest salary" },
      { label: "Reverse a linked list", prompt: "Reverse a singly linked list in Java" },
    ],
  },
  explain: {
    title: "Explanation of your code",
    typer: ["what this function does…", "how this recursion works…", "this regex, step by step…"],
    chips: [
      { label: "Explain a regex", prompt: "Explain what this regex does: ^[\\w.+-]+@[\\w-]+\\.[\\w.-]+$" },
      { label: "Explain quicksort", prompt: "Explain how the quicksort algorithm works with an example" },
    ],
  },
  debug: {
    title: "Debug your code",
    typer: ["a NullPointerException…", "an off-by-one loop…", "a failing unit test…"],
    chips: [
      { label: "Fix an index error", prompt: "Debug this Python code:\nfor i in range(len(a)):\n    print(a[i+1])" },
      { label: "Why is it infinite?", prompt: "Why does this loop never end?\nwhile (i < 10) { console.log(i); }" },
    ],
  },
  optimize: {
    title: "Optimize your code",
    typer: ["an O(n²) nested loop…", "high memory usage…", "a slow database query…"],
    chips: [
      { label: "Speed up a loop", prompt: "Optimize this:\nresult = []\nfor x in data:\n    if x not in result:\n        result.append(x)" },
      { label: "Optimize a SQL query", prompt: "Optimize this query: SELECT * FROM orders WHERE YEAR(created_at) = 2024" },
    ],
  },
  document: {
    title: "Document your code",
    typer: ["docstrings & comments…", "a README section…", "an API reference…"],
    chips: [
      { label: "Add docstrings", prompt: "Add docstrings and comments to:\ndef factorial(n):\n    return 1 if n<2 else n*factorial(n-1)" },
    ],
  },
  review: {
    title: "Review your code",
    typer: ["for code smells…", "naming conventions…", "refactor opportunities…"],
    chips: [
      { label: "Review a function", prompt: "Review this code for quality:\ndef f(x):\n    y=x*2\n    return y" },
    ],
  },
  learn: {
    title: "Learn a new concept",
    typer: ["dynamic programming…", "closures in JavaScript…", "Big-O notation…", "recursion…"],
    chips: [
      { label: "Explain recursion", prompt: "Explain recursion with examples and a practice exercise" },
      { label: "What is Big-O?", prompt: "Explain Big-O notation with simple examples" },
    ],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const state = { mode: "generate", lastAnswer: "", lastEntryId: null, busy: false };

const els = {
  output: $("#output"),
  input: $("#userInput"),
  runBtn: $("#runBtn"),
  copyBtn: $("#copyBtn"),
  downloadBtn: $("#downloadBtn"),
  language: $("#languageSelect"),
  model: $("#modelSelect"),
  modeTitle: $("#modeTitle"),
  modeDesc: $("#modeDesc"),
  inputLabel: $("#inputLabel"),
  historyList: $("#historyList"),
  clearHistory: $("#clearHistory"),
  statusDot: $("#statusDot"),
  statusText: $("#statusText"),
  toast: $("#toast"),
};

/* ---- markdown ---- */
if (window.marked) {
  marked.setOptions({
    breaks: false,
    highlight: (code, lang) => {
      if (window.hljs && lang && hljs.getLanguage(lang)) {
        try { return hljs.highlight(code, { language: lang }).value; } catch (_) {}
      }
      return window.hljs ? hljs.highlightAuto(code).value : code;
    },
  });
}

function renderMarkdown(text) {
  if (window.marked) return marked.parse(text);
  const esc = text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  return `<pre>${esc}</pre>`;
}

/* Wrap each <pre> with editor-style chrome + a copy button. */
function decorateCodeBlocks() {
  els.output.querySelectorAll("pre").forEach((pre) => {
    if (pre.closest(".pre-wrap")) return;
    const wrap = document.createElement("div");
    wrap.className = "pre-wrap";
    pre.parentNode.insertBefore(wrap, pre);

    const dots = document.createElement("div");
    dots.className = "pre-dots";
    dots.innerHTML = "<i></i><i></i><i></i>";
    wrap.appendChild(dots);

    const btn = document.createElement("button");
    btn.className = "code-copy";
    btn.textContent = "Copy";
    btn.onclick = () => {
      navigator.clipboard.writeText(pre.innerText.trimEnd());
      btn.textContent = "Copied";
      toast("Code copied to clipboard");
      setTimeout(() => (btn.textContent = "Copy"), 1400);
    };
    wrap.appendChild(btn);
    wrap.appendChild(pre);
  });
}

/* ---- toast ---- */
let toastTimer;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

/* ---- greeting + hero ---- */
function greeting() {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${g}, Developer`;
}

function renderHero(mode) {
  const h = HERO[mode] || HERO.generate;
  state.lastAnswer = "";
  state.lastEntryId = null;
  els.copyBtn.disabled = true;
  els.downloadBtn.disabled = true;
  els.output.classList.remove("streaming");
  const chips = h.chips
    .map((c) => `<button class="chip" data-fill="${escapeHtml(c.prompt)}">${escapeHtml(c.label)}</button>`)
    .join("");
  els.output.innerHTML = `
    <div class="hero">
      <p class="hero-greet">${greeting()}</p>
      <h1 class="hero-title">${h.title}</h1>
      <p class="hero-typer"><span class="typer-prefix">try</span><span id="typer"></span><span class="typer-caret"></span></p>
      <div class="example-chips">${chips}</div>
    </div>`;
  startTyper(h.typer);
  els.output.closest(".output-wrap").scrollTop = 0;
}

/* Typewriter that types a phrase, pauses, deletes, and moves to the next —
   looping forever. A token cancels the old loop when the module changes. */
let typerToken = 0;
async function startTyper(phrases) {
  const my = ++typerToken;
  const el = document.getElementById("typer");
  if (!el || !phrases || !phrases.length) return;
  let i = 0;
  while (typerToken === my) {
    const word = phrases[i % phrases.length];
    for (let k = 1; k <= word.length; k++) {
      if (typerToken !== my) return;
      el.textContent = word.slice(0, k);
      await sleep(42);
    }
    await sleep(1300);
    for (let k = word.length; k >= 0; k--) {
      if (typerToken !== my) return;
      el.textContent = word.slice(0, k);
      await sleep(22);
    }
    await sleep(240);
    i++;
  }
}

/* ---- mode switching ---- */
function setMode(mode, btn, showHero = true) {
  state.mode = mode;
  document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  els.modeTitle.textContent = btn.querySelector(".mode-label").textContent;
  els.modeDesc.textContent = btn.getAttribute("title");
  els.inputLabel.textContent = btn.dataset.inputLabel;
  els.input.placeholder = btn.dataset.placeholder;
  if (showHero && !state.busy) renderHero(mode);
}
document.querySelectorAll(".mode-btn").forEach((btn) =>
  btn.addEventListener("click", () => setMode(btn.dataset.mode, btn))
);

/* ---- example chips (event delegation; chips are re-rendered per module) ---- */
els.output.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  els.input.value = chip.dataset.fill;
  els.input.focus();
  autoGrow();
});

/* ---- auto-growing textarea ---- */
function autoGrow() {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 220) + "px";
}
els.input.addEventListener("input", autoGrow);

/* ---- run (streaming) ---- */
async function run() {
  if (state.busy) return;
  const content = els.input.value.trim();
  if (!content) { els.input.focus(); return; }

  state.busy = true;
  state.lastAnswer = "";
  state.lastEntryId = null;
  typerToken++; // stop the hero typewriter
  els.runBtn.disabled = true;
  els.runBtn.querySelector(".btn-text").textContent = "Running";
  els.copyBtn.disabled = true;
  els.downloadBtn.disabled = true;

  const modelName = els.model.value || "model";
  els.output.classList.remove("streaming");
  els.output.innerHTML =
    `<div class="thinking"><span class="dots"><i></i><i></i><i></i></span>` +
    `Generating with <strong style="color:var(--text-1);margin-left:2px">${escapeHtml(modelName)}</strong></div>`;

  try {
    const resp = await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: state.mode, content,
        language: els.language.value, model: els.model.value,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${resp.status})`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    const scroller = els.output.closest(".output-wrap");
    let acc = "", first = true;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      if (first) { els.output.classList.add("streaming"); first = false; }
      state.lastAnswer = acc;
      els.output.innerHTML = renderMarkdown(acc);
      const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
      if (nearBottom) scroller.scrollTop = scroller.scrollHeight;
    }

    els.output.classList.remove("streaming");
    els.output.innerHTML = renderMarkdown(acc || "_No response._");
    decorateCodeBlocks();
    els.copyBtn.disabled = false;
    els.downloadBtn.disabled = false;
    await loadHistory();
  } catch (e) {
    els.output.classList.remove("streaming");
    els.output.innerHTML =
      `<div class="empty-state"><div class="empty-art" style="color:var(--err);background:rgba(240,101,96,.12);border-color:rgba(240,101,96,.3)">` +
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5"/><path d="M12 16h.01"/><circle cx="12" cy="12" r="9"/></svg></div>` +
      `<h3>Couldn't complete the request</h3><p>${escapeHtml(e.message)}</p></div>`;
  } finally {
    state.busy = false;
    els.runBtn.disabled = false;
    els.runBtn.querySelector(".btn-text").textContent = "Run";
  }
}
els.runBtn.addEventListener("click", run);
els.input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
});

/* ---- copy & download ---- */
els.copyBtn.addEventListener("click", () => {
  if (!state.lastAnswer) return;
  navigator.clipboard.writeText(state.lastAnswer);
  toast("Answer copied to clipboard");
});
els.downloadBtn.addEventListener("click", () => {
  if (state.lastEntryId) { window.location = `/api/download/${state.lastEntryId}`; return; }
  const blob = new Blob([state.lastAnswer], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `codeforge_${state.mode}.md`;
  a.click();
});

/* ---- history ---- */
function iconSvg(mode) {
  const id = ICONS[mode] || "i-generate";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><use href="#${id}"/></svg>`;
}

async function loadHistory() {
  try {
    const rows = await (await fetch("/api/history")).json();
    els.historyList.innerHTML = "";
    if (!rows.length) {
      els.historyList.innerHTML = `<li class="history-empty">Nothing yet — your runs appear here.</li>`;
      return;
    }
    if (rows[0]) state.lastEntryId = rows[0].id;
    rows.forEach((r) => {
      const time = (r.created_at || "").replace("T", " ").slice(5, 16);
      const li = document.createElement("li");
      li.className = "history-item";
      li.innerHTML = `
        <div class="hi-top">
          <span class="hi-badge">${iconSvg(r.mode)}${r.mode}</span>
          <span class="hi-time">${time}</span>
          <button class="hi-del" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div class="hi-preview">${escapeHtml(r.preview)}</div>`;
      li.addEventListener("click", () => loadEntry(r.id));
      li.querySelector(".hi-del").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteEntry(r.id);
      });
      els.historyList.appendChild(li);
    });
  } catch (_) {}
}

async function loadEntry(id) {
  const entry = await (await fetch(`/api/history/${id}`)).json();
  if (entry.error) return;
  typerToken++; // stop the hero typewriter
  // Switch the visible module WITHOUT rendering its hero, then show the answer.
  const btn = document.querySelector(`.mode-btn[data-mode="${entry.mode}"]`);
  if (btn) setMode(entry.mode, btn, false);
  state.lastAnswer = entry.response;
  state.lastEntryId = entry.id;
  els.input.value = entry.prompt;
  els.language.value = entry.language;
  autoGrow();
  els.output.classList.remove("streaming");
  els.output.innerHTML = renderMarkdown(entry.response);
  decorateCodeBlocks();
  els.copyBtn.disabled = false;
  els.downloadBtn.disabled = false;
  els.output.closest(".output-wrap").scrollTop = 0;
}

async function deleteEntry(id) {
  await fetch(`/api/history/${id}`, { method: "DELETE" });
  loadHistory();
}
els.clearHistory.addEventListener("click", async () => {
  if (!confirm("Delete all saved history?")) return;
  await fetch("/api/history", { method: "DELETE" });
  loadHistory();
  toast("History cleared");
});

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---- health / models ---- */
async function loadHealth() {
  try {
    const h = await (await fetch("/api/health")).json();
    if (h.ollama_available) {
      els.statusDot.className = "status-dot ok";
      els.statusText.textContent = "Ollama connected";
      els.model.innerHTML = "";
      (h.models.length ? h.models : [h.default_model]).forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m; opt.textContent = m.replace(":latest", "");
        if (m === h.default_model) opt.selected = true;
        els.model.appendChild(opt);
      });
    } else {
      els.statusDot.className = "status-dot bad";
      els.statusText.textContent = "Ollama offline";
      els.model.innerHTML = `<option value="">unavailable</option>`;
    }
  } catch (_) {
    els.statusDot.className = "status-dot bad";
    els.statusText.textContent = "Server unreachable";
  }
}

/* ---- init ---- */
const startBtn = document.querySelector('.mode-btn[data-mode="generate"]');
if (startBtn) setMode("generate", startBtn); // render the first hero
loadHealth();
loadHistory();
