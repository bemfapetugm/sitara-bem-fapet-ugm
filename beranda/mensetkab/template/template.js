/* SITARA Mensetkab — daftar template resmi dari pengelolaan Kemensetkab. */
(function () {
  "use strict";

  const API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
  let user;
  try { user = JSON.parse(sessionStorage.getItem("sitaraUser") || "null"); } catch (_) { user = null; }
  if (!user || String(user.role || "").trim().toLowerCase() !== "mensetkab") return;

  const $ = id => document.getElementById(id);
  const grid = $("templateCards"), empty = $("templateEmpty"), search = $("searchTemplate");
  const category = $("filterTemplateCategory"), chips = $("templateCategoryChips"), sort = $("sortTemplate");
  let templates = [], activeCategory = "all", viewMode = "grid";

  async function post(action) {
    const response = await fetch(API_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, session_token: user.session_token })
    });
    return response.json();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
  function normalize(value) { return String(value == null ? "" : value).trim().toLocaleLowerCase("id-ID"); }
  function categoryName(item) { return String(item.category || "").trim(); }

  function directDownloadUrl(value) {
    const original = String(value || "").trim();
    if (!original) return "";
    try {
      const url = new URL(original);
      if (url.protocol !== "https:") return "";
      const host = url.hostname.toLowerCase();
      if (host === "drive.google.com" || host.endsWith(".drive.google.com")) {
        if (url.pathname === "/uc" && url.searchParams.get("export") === "download" && url.searchParams.get("id")) return original;
        let id = url.searchParams.get("id");
        if (!id) { const match = url.pathname.match(/\/file\/d\/([^/]+)/i); if (match) id = match[1]; }
        return id ? "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(id) : original;
      }
      if (host === "docs.google.com" || host.endsWith(".docs.google.com")) {
        if (/\/export(?:\/|$)/i.test(url.pathname)) return original;
        const match = url.pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/i);
        if (match) {
          const type = match[1].toLowerCase(), id = match[2];
          if (type === "document") return "https://docs.google.com/document/d/" + encodeURIComponent(id) + "/export?format=docx";
          if (type === "spreadsheets") return "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(id) + "/export?format=xlsx";
          if (type === "presentation") return "https://docs.google.com/presentation/d/" + encodeURIComponent(id) + "/export/pptx";
        }
      }
      return original;
    } catch (_) { return ""; }
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }
  function timestamp(item) {
    const value = item.updatedAt || item.date || item.createdAt || "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function renderCategories() {
    const previous = category.value || activeCategory;
    // Kategori hanya diambil dari data yang dikirim backend; tidak memakai kategori contoh hard-coded.
    const names = [...new Set(templates.map(categoryName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base" }));
    category.innerHTML = '<option value="all">Semua Kategori</option>' +
      names.map(name => '<option value="' + escapeHtml(normalize(name)) + '">' + escapeHtml(name) + '</option>').join("");
    const stillExists = previous === "all" || names.some(name => normalize(name) === previous);
    activeCategory = stillExists ? previous : "all";
    category.value = activeCategory;

    chips.innerHTML = "";
    const allNames = [{ name: "Semua", value: "all", icon: "layout-grid" }].concat(
      names.map(name => ({ name, value: normalize(name), icon: "folder" }))
    );
    allNames.forEach(entry => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "template-category-chip" + (activeCategory === entry.value ? " active" : "");
      button.dataset.category = entry.value;
      button.setAttribute("aria-pressed", String(activeCategory === entry.value));
      button.innerHTML = '<i data-lucide="' + entry.icon + '" aria-hidden="true"></i><span>' + escapeHtml(entry.name) + '</span>';
      button.addEventListener("click", () => {
        activeCategory = entry.value;
        category.value = entry.value;
        renderCategories();
        render();
      });
      chips.appendChild(button);
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function fileType(item) {
    const source = String(item.fileName || item.filename || item.name || item.downloadUrl || "").toLowerCase();
    const match = source.match(/\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp)(?:$|[?#])/);
    if (match) return match[1].replace("doc", "doc").toUpperCase();
    if (source.includes("docs.google.com/document")) return "DOCX";
    if (source.includes("docs.google.com/spreadsheets")) return "XLSX";
    if (source.includes("docs.google.com/presentation")) return "PPTX";
    return "DOKUMEN";
  }

  function render() {
    activeCategory = category.value || activeCategory;
    const query = normalize(search.value);
    let filtered = templates.filter(item => {
      const haystack = [item.title, categoryName(item), item.description].join(" ").toLocaleLowerCase("id-ID");
      const itemCategory = normalize(categoryName(item));
      return haystack.includes(query) && (activeCategory === "all" || itemCategory === activeCategory);
    });

    if (sort.value === "az") filtered.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "id"));
    else if (sort.value === "za") filtered.sort((a, b) => String(b.title || "").localeCompare(String(a.title || ""), "id"));
    else filtered.sort((a, b) => timestamp(b) - timestamp(a));

    grid.classList.toggle("is-list", viewMode === "list");
    grid.replaceChildren();
    filtered.forEach(item => {
      const card = document.createElement("article");
      card.className = "template-card";
      const preview = document.createElement("div");
      preview.className = "template-card-preview";
      preview.innerHTML = '<div class="template-preview-art"><i data-lucide="file-text" aria-hidden="true"></i><span class="template-preview-lines"><i></i><i></i><i></i><i></i></span></div><span class="template-format-badge">' +
        '<i data-lucide="file" aria-hidden="true"></i>' + escapeHtml(fileType(item)) + '</span>';

      const body = document.createElement("div");
      body.className = "template-card-body";
      const title = document.createElement("h4");
      title.textContent = item.title || "Template tanpa nama";
      const description = document.createElement("p");
      description.textContent = item.description || "Template dokumen resmi SITARA.";
      const meta = document.createElement("div");
      meta.className = "template-meta";
      const itemCategory = categoryName(item);
      meta.innerHTML = (itemCategory ? '<span class="template-category-label"><i data-lucide="folder" aria-hidden="true"></i>' + escapeHtml(itemCategory) + '</span>' : '') +
        ((item.updatedAt || item.date || item.createdAt) ? '<span><i data-lucide="calendar-days" aria-hidden="true"></i>' + escapeHtml(formatDate(item.updatedAt || item.date || item.createdAt)) + '</span>' : '');
      body.append(title, description, meta);

      const actions = document.createElement("div");
      actions.className = "template-card-actions";
      const downloadUrl = directDownloadUrl(item.downloadUrl);
      if (downloadUrl) {
        const link = document.createElement("a");
        link.className = "template-download-btn";
        link.href = downloadUrl;
        link.rel = "noopener";
        link.innerHTML = '<i data-lucide="download" aria-hidden="true"></i><span>Unduh Template</span>';
        actions.appendChild(link);
      } else {
        const unavailable = document.createElement("span");
        unavailable.className = "template-unavailable";
        unavailable.innerHTML = '<i data-lucide="info" aria-hidden="true"></i><span>File belum tersedia</span>';
        actions.appendChild(unavailable);
      }
      card.append(preview, body, actions);
      grid.appendChild(card);
    });

    const totalBadge = $("templateTotal");
    if (totalBadge) totalBadge.textContent = filtered.length + " template";
    $("templateResultsText").textContent = filtered.length + " template ditemukan";
    empty.hidden = filtered.length > 0;
    grid.hidden = filtered.length === 0;
    $("templateEmptyTitle").textContent = templates.length ? "Template tidak ditemukan" : "Belum ada template dokumen";
    $("templateEmptyMessage").textContent = templates.length ? "Coba ubah kata kunci atau pilih kategori lain." : "Template yang dipublikasikan Kemensetkab akan muncul di sini.";
    if (window.lucide) window.lucide.createIcons();
  }

  function setView(mode) {
    viewMode = mode;
    $("templateGridView").classList.toggle("active", mode === "grid");
    $("templateListView").classList.toggle("active", mode === "list");
    $("templateGridView").setAttribute("aria-pressed", String(mode === "grid"));
    $("templateListView").setAttribute("aria-pressed", String(mode === "list"));
    render();
  }

  async function load() {
    grid.hidden = false;
    empty.hidden = true;
    grid.innerHTML = '<div class="template-loading" role="status"><span class="template-spinner" aria-hidden="true"></span><span>Memuat template dokumen...</span></div>';
    try {
      const result = await post("getDocumentTemplates");
      if (!result || !result.success) throw new Error(result && result.message || "Gagal memuat template dokumen.");
      templates = Array.isArray(result.data) ? result.data : [];
      renderCategories();
      render();
    } catch (error) {
      grid.innerHTML = '<div class="template-error" role="alert"><i data-lucide="alert-circle" aria-hidden="true"></i><span>' + escapeHtml(error.message || "Gagal memuat template dokumen.") + '</span><button type="button" id="retryTemplates">Coba lagi</button></div>';
      grid.hidden = false; empty.hidden = true;
      $("retryTemplates").addEventListener("click", load);
      if (window.lucide) window.lucide.createIcons();
    }
  }

  search.addEventListener("input", render);
  category.addEventListener("change", () => { activeCategory = category.value; renderCategories(); render(); });
  sort.addEventListener("change", render);
  $("templateGridView").addEventListener("click", () => setView("grid"));
  $("templateListView").addEventListener("click", () => setView("list"));
  load();
})();