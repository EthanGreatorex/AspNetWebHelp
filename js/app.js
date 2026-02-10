"use strict";

// --- Simple client-side "config" of available guides ---
// Each guide can have a Markdown source and an optional matching PDF.
// Place the files in /guides and register them here.
const GUIDE_INDEX = [
  {
    id: "rigit_zoo_guide",
    title: "Rigit Zoo Walkthrough",
    description: "Rigit Zoo past exam-style ASP.NET Core MVC task.",
    mdFile: "rigit_zoo_guide.md",
    pdfFile: "rigit_zoo_guide.pdf", // optional – create this file in /guides
  },
];

const $ = (selector) => document.querySelector(selector);

// --- Theme handling using Bootstrap 5 data-bs-theme ---
const THEME_KEY = "aspnetwebhelp-theme";

function applyTheme(theme) {
  const body = document.body;
  const icon = $("#theme-toggle-icon");
  const isDark = theme === "dark";

  body.setAttribute("data-bs-theme", isDark ? "dark" : "light");

  if (icon) {
    icon.className = isDark ? "bi bi-moon-fill me-1" : "bi bi-sun-fill me-1";
  }
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    applyTheme(stored);
    return;
  }

  const prefersDark = window.matchMedia?.(
    "(prefers-color-scheme: dark)"
  ).matches;
  applyTheme(prefersDark ? "dark" : "light");
}

function toggleTheme() {
  const current = document.body.getAttribute("data-bs-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// --- Minimal Markdown renderer (headings, code, lists, bold/italic, links) ---
function renderMarkdown(markdown) {
  if (!markdown) return "";

  let text = markdown.replace(/\r\n/g, "\n");

  // Escape HTML
  text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Code blocks ``` ```
  text = text.replace(
    /```([\s\S]*?)```/g,
    (_, code) => `<pre><code>${code.trim()}</code></pre>`
  );

  // Headings
  text = text
    .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // Bold & italic
  text = text
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  );

  // Lists (basic)
  text = text.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");

  // Paragraphs
  const blocks = text.split(/\n{2,}/);
  const processed = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-6]|ul|ol|li|pre|blockquote)/.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n");

  return processed;
}

// --- Render accordion items ---
function renderAccordion() {
  const container = $("#guideAccordion");
  if (!container) return;

  if (!GUIDE_INDEX.length) {
    container.innerHTML =
      '<div class="alert alert-secondary small mb-0">No guides are configured. Add entries to GUIDE_INDEX in <code>js/app.js</code>.</div>';
    return;
  }

  const itemsHtml = GUIDE_INDEX.map((g) => {
    const collapseId = `guide-${g.id}-collapse`;
    const headingId = `guide-${g.id}-heading`;

    return `
      <div class="accordion-item">
        <h2 class="accordion-header" id="${headingId}">
          <button
            class="accordion-button collapsed small"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#${collapseId}"
            aria-expanded="false"
            aria-controls="${collapseId}"
            data-guide-id="${g.id}"
          >
            ${g.title}
          </button>
        </h2>
        <div
          id="${collapseId}"
          class="accordion-collapse collapse"
          aria-labelledby="${headingId}"
          data-bs-parent="#guideAccordion"
        >
          <div class="accordion-body">
            ${
              g.description
                ? `<p class="small text-body-secondary mb-2">${g.description}</p>`
                : ""
            }
            <div class="d-flex flex-wrap gap-2 mb-3">
              ${
                g.pdfFile
                  ? `<a href="./guides/${g.pdfFile}" class="btn btn-sm btn-outline-primary" download>
                        <i class="bi bi-file-earmark-arrow-down me-1"></i>Download PDF
                      </a>`
                  : ""
              }
            </div>
            <div class="guide-markdown small" data-guide-id="${g.id}">
              <div class="text-body-secondary">Loading guide…</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = itemsHtml;
}

// --- Load Markdown for a specific guide into its accordion body ---
async function loadGuideContent(guideId) {
  const guide = GUIDE_INDEX.find((g) => g.id === guideId);
  if (!guide || !guide.mdFile) return;

  const target = document.querySelector(
    `.guide-markdown[data-guide-id="${guideId}"]`
  );
  if (!target) return;

  // Avoid reloading if already loaded
  if (target.dataset.loaded === "true") return;

  try {
    const res = await fetch(`./guides/${guide.mdFile}?v=${Date.now()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} – ${res.statusText}`);
    }
    const md = await res.text();
    target.innerHTML = renderMarkdown(md);
    target.dataset.loaded = "true";
  } catch (err) {
    console.error("Failed to load guide", err);
    target.innerHTML =
      '<div class="text-danger small">Unable to load this guide. Ensure the Markdown file exists in the <code>/guides</code> folder.</div>';
  }
}

// --- Init ---
window.addEventListener("DOMContentLoaded", () => {
  // Theme
  initTheme();
  const themeToggle = $("#theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Render accordion
  renderAccordion();

  // Hook into Bootstrap collapse events to lazy-load content on first open
  const accordionEl = $("#guideAccordion");
  if (accordionEl) {
    accordionEl.addEventListener("show.bs.collapse", (event) => {
      const button = accordionEl.querySelector(
        `[data-bs-target="#${event.target.id}"]`
      );
      const guideId = button?.getAttribute("data-guide-id");
      if (guideId) {
        loadGuideContent(guideId);
      }
    });
  }
});

