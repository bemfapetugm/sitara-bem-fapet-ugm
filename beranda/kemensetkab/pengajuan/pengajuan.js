const API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
let currentUser = null;
let allPengajuan = [];
let activeFilter = "semua";
let currentPage = 1;
let pageSize = 10;

const sessionData = sessionStorage.getItem("sitaraUser");
if (!sessionData) {
  window.location.href = "/login/index.html";
} else {
  try {
    currentUser = JSON.parse(sessionData);
    if (currentUser.role !== "kementerian" || currentUser.kementerian_id !== "KEM001") {
      alert("Anda tidak memiliki akses halaman ini.");
      sessionStorage.removeItem("sitaraUser");
      window.location.href = "/login/index.html";
    } else {
      initializePengajuan(currentUser);
    }
  } catch (error) {
    sessionStorage.removeItem("sitaraUser");
    window.location.href = "/login/index.html";
  }
}

function initializePengajuan(user) {
  initializeDetailModal();
  displayCurrentDate();
  displayUserProfile(user);
  initializeLogout();
  initializeFilters();
  loadPengajuan(user);
}

async function loadPengajuan(user) {
  const body = document.getElementById("pengajuanTableBody");
  if (body) body.innerHTML = `<tr><td colspan="7" class="table-loading">Memuat pengajuan...</td></tr>`;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getPengajuanMasukKemensetkab", session_token: user.session_token })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Gagal memuat pengajuan.");
    allPengajuan = Array.isArray(result.data) ? result.data : [];
    currentPage = 1;
    populateMinistryFilter();
    updateStatistics();
    renderPengajuan();
  } catch (error) {
    console.error(error);
    if (body) body.innerHTML = `<tr><td colspan="7" class="table-error"><div><h3>Gagal memuat pengajuan</h3><p>${escapeHtml(error.message)}</p><button class="retry-button" onclick="loadPengajuan(currentUser)">Coba Lagi</button></div></td></tr>`;
  }
}

function initializeFilters() {
  initializeCustomFilter({
    wrapId: "statusFilterWrap",
    triggerId: "statusFilterTrigger",
    menuId: "statusFilterMenu",
    selectId: "statusFilter",
    labelId: "statusFilterLabel"
  });

  initializeCustomFilter({
    wrapId: "ministryFilterWrap",
    triggerId: "ministryFilterTrigger",
    menuId: "ministryFilterMenu",
    selectId: "ministryFilter",
    labelId: "ministryFilterLabel"
  });

  initializeDateFilter();

  document.getElementById("searchInput")?.addEventListener("input", () => {
    currentPage = 1;
    renderPengajuan();
  });

  document.getElementById("statusFilter")?.addEventListener("change", e => {
    activeFilter = e.target.value;
    currentPage = 1;
    renderPengajuan();
  });

  document.getElementById("ministryFilter")?.addEventListener("change", () => {
    currentPage = 1;
    renderPengajuan();
  });

  document.getElementById("dateFilter")?.addEventListener("change", () => {
    syncDateFilter();
    currentPage = 1;
    renderPengajuan();
  });

  initializeSortDropdown();

  document.getElementById("sortFilter")?.addEventListener("change", () => {
    currentPage = 1;
    renderPengajuan();
  });

  document.getElementById("pageSize")?.addEventListener("change", e => {
    pageSize = Number(e.target.value) || 10;
    currentPage = 1;
    renderPengajuan();
  });

  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPengajuan();
    }
  });

  document.getElementById("nextPage")?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(getFilteredPengajuan().length / pageSize));
    if (currentPage < totalPages) {
      currentPage++;
      renderPengajuan();
    }
  });

  document.getElementById("refreshButton")?.addEventListener("click", () => loadPengajuan(currentUser));
}


function initializeSortDropdown() {
  const wrap = document.getElementById("sortFilterWrap");
  const trigger = document.getElementById("sortFilterTrigger");
  const menu = document.getElementById("sortFilterMenu");
  const select = document.getElementById("sortFilter");
  const label = document.getElementById("sortFilterLabel");

  if (!wrap || !trigger || !menu || !select || !label) return;

  const closeMenu = () => {
    wrap.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  };

  const syncSort = value => {
    const selected = menu.querySelector(
      `.sort-option[data-value="${CSS.escape(value)}"]`
    );

    label.textContent = selected
      ? selected.textContent.trim()
      : (select.options[select.selectedIndex]?.text || "Terbaru");

    menu.querySelectorAll(".sort-option").forEach(option => {
      const active = option.dataset.value === value;
      option.classList.toggle("selected", active);
      option.setAttribute("aria-selected", active ? "true" : "false");
    });
  };

  trigger.addEventListener("click", event => {
    event.stopPropagation();

    document.querySelectorAll(".custom-sort-control.open").forEach(other => {
      if (other !== wrap) {
        other.classList.remove("open");
        other.querySelector(".sort-trigger")?.setAttribute("aria-expanded", "false");
      }
    });

    const open = !wrap.classList.contains("open");
    wrap.classList.toggle("open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  menu.addEventListener("click", event => {
    const option = event.target.closest(".sort-option");
    if (!option) return;

    select.value = option.dataset.value;
    syncSort(select.value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    closeMenu();
  });

  document.addEventListener("click", event => {
    if (!wrap.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  syncSort(select.value || "terbaru");
}

function initializeCustomFilter({ wrapId, triggerId, menuId, selectId, labelId }) {
  const wrap = document.getElementById(wrapId);
  const trigger = document.getElementById(triggerId);
  const menu = document.getElementById(menuId);
  const select = document.getElementById(selectId);
  const label = document.getElementById(labelId);

  if (!wrap || !trigger || !menu || !select || !label) return;

  const closeMenu = () => {
    wrap.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  };

  const sync = value => {
    const selected = menu.querySelector(`.custom-filter-option[data-value="${CSS.escape(value)}"]`);
    label.textContent = selected ? selected.textContent.trim() : (select.options[select.selectedIndex]?.text || "");
    menu.querySelectorAll(".custom-filter-option").forEach(option => {
      const active = option.dataset.value === value;
      option.classList.toggle("selected", active);
      option.setAttribute("aria-selected", active ? "true" : "false");
    });
  };

  trigger.addEventListener("click", event => {
    event.stopPropagation();

    document.querySelectorAll(".custom-filter.open").forEach(other => {
      if (other !== wrap) {
        other.classList.remove("open");
        other.querySelector(".custom-filter-trigger")?.setAttribute("aria-expanded", "false");
      }
    });

    const open = !wrap.classList.contains("open");
    wrap.classList.toggle("open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  menu.addEventListener("click", event => {
    const option = event.target.closest(".custom-filter-option");
    if (!option) return;

    select.value = option.dataset.value;
    sync(select.value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    closeMenu();
  });

  document.addEventListener("click", event => {
    if (!wrap.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  sync(select.value || "semua");
}

function initializeDateFilter() {
  const trigger = document.getElementById("dateFilterTrigger");
  const input = document.getElementById("dateFilter");
  if (!trigger || !input) return;

  trigger.addEventListener("click", () => {
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        input.click();
      }
    } else {
      input.click();
    }
  });

  syncDateFilter();
}

function syncDateFilter() {
  const input = document.getElementById("dateFilter");
  const label = document.getElementById("dateFilterLabel");
  if (!input || !label) return;

  if (!input.value) {
    label.textContent = "dd/mm/yyyy";
    label.classList.remove("has-value");
    return;
  }

  const [year, month, day] = input.value.split("-");
  label.textContent = `${day}/${month}/${year}`;
  label.classList.add("has-value");
}

function getCategory(item) {
  const status = normalizeStatus(item.status || item.status_label || "");

  // Ikuti status Ditolak dari backend agar tidak terbaca sebagai Perlu Verifikasi.
  if (status.includes("ditolak") || status.includes("tolak")) return "ditolak";

  if (status.includes("selesai")) return "selesai";
  if (status.includes("revisi") || status.includes("perbaikan")) return "menunggu_revisi";

  // Status lama yang menunjukkan pengajuan telah diteruskan dari Kemensetkab
  // ditampilkan sebagai selesai pada halaman Pengajuan Masuk.
  if (
    status.includes("menunggu persetujuan mensetkab") ||
    status.includes("menteri sekretariat kabinet") ||
    status.includes("mensetkab")
  ) return "selesai";

  if (
    status.includes("menunggu verifikasi") ||
    status.includes("perlu verifikasi") ||
    status === "diajukan"
  ) return "verifikasi";

  // Status yang tidak dikenali tidak boleh otomatis dianggap Perlu Verifikasi.
  return "lainnya";
}

function updateStatistics() {
  const counts = { verifikasi: 0, menunggu_revisi: 0, selesai: 0 };
  allPengajuan.forEach(item => counts[getCategory(item)]++);
  setText("statTotal", allPengajuan.length);
  setText("statVerifikasi", counts.verifikasi);
  setText("statRevisi", counts.menunggu_revisi);
  setText("statSelesai", counts.selesai);
}

function populateMinistryFilter() {
  const select = document.getElementById("ministryFilter");
  const menu = document.getElementById("ministryFilterMenu");
  const label = document.getElementById("ministryFilterLabel");
  if (!select || !menu || !label) return;

  const current = select.value || "semua";
  const ministries = [...new Set(
    allPengajuan
      .map(item => String(item.asal_kementerian || item.kementerian || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "id"));

  select.innerHTML =
    `<option value="semua">Semua Kementerian</option>` +
    ministries.map(name =>
      `<option value="${escapeAttribute(name)}">${escapeHtml(name)}</option>`
    ).join("");

  const nextValue = ministries.includes(current) ? current : "semua";
  select.value = nextValue;

  menu.innerHTML =
    `<button type="button" class="custom-filter-option ${nextValue === "semua" ? "selected" : ""}" data-value="semua" role="option" aria-selected="${nextValue === "semua" ? "true" : "false"}">Semua Kementerian</button>` +
    ministries.map(name => {
      const selected = name === nextValue;
      return `<button type="button" class="custom-filter-option ${selected ? "selected" : ""}" data-value="${escapeAttribute(name)}" role="option" aria-selected="${selected ? "true" : "false"}">${escapeHtml(name)}</button>`;
    }).join("");

  label.textContent = select.options[select.selectedIndex]?.text || "Semua Kementerian";
}

function getFilteredPengajuan() {
  const search = normalizeStatus(document.getElementById("searchInput")?.value || "");
  const ministry = document.getElementById("ministryFilter")?.value || "semua";
  const date = document.getElementById("dateFilter")?.value || "";
  const filtered = allPengajuan.filter(item => {
    const category = getCategory(item);
    if (activeFilter !== "semua" && category !== activeFilter) return false;
    const haystack = normalizeStatus([item.nomor_pengajuan, item.id, item.perihal, item.asal_kementerian, item.kementerian].filter(Boolean).join(" "));
    if (search && !haystack.includes(search)) return false;
    const itemMinistry = String(item.asal_kementerian || item.kementerian || "").trim();
    if (ministry !== "semua" && itemMinistry !== ministry) return false;
    if (date && !isSameDate(item.tanggal_pengajuan, date)) return false;
    return true;
  });

  const sort = document.getElementById("sortFilter")?.value || "terbaru";
  filtered.sort((a,b) => {
    if (sort === "judul") return String(a.perihal || "").localeCompare(String(b.perihal || ""), "id");
    const da = getTime(a.tanggal_pengajuan), db = getTime(b.tanggal_pengajuan);
    return sort === "terlama" ? da - db : db - da;
  });
  return filtered;
}

function renderPengajuan() {
  const body = document.getElementById("pengajuanTableBody");
  if (!body) return;
  const filtered = getFilteredPengajuan();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  if (!pageItems.length) {
    body.innerHTML = `<tr><td colspan="7" class="empty-table"><div class="empty-icon"><i data-lucide="inbox"></i></div><h3>Tidak ada pengajuan</h3><p>Tidak ada pengajuan yang sesuai dengan filter.</p></td></tr>`;
  } else {
    body.innerHTML = pageItems.map((item, index) => {
      const category = getCategory(item);
      const status = getDisplayStatus(category);
      const number = start + index + 1;
      const ministry = item.asal_kementerian || item.kementerian || "-";
      const title = item.perihal || item.judul || "Tanpa judul";
      const subject = item.jenis || item.kategori || "Pengajuan";
      return `<tr>
        <td class="number-col">${number}.</td>
        <td class="title-col"><button type="button" class="title-link" onclick="lihatDetail('${escapeAttribute(item.id || item.nomor_pengajuan || "")}')">${escapeHtml(title)}</button><span>${escapeHtml(item.nomor_pengajuan || item.id || "-")}</span></td>
        <td class="ministry-col"><span class="ministry-badge ministry-${getMinistryClass(ministry)}">${escapeHtml(ministry)}</span></td>
        <td class="subject-col">${escapeHtml(subject)}</td>
        <td class="date-col">${formatTanggal(item.tanggal_pengajuan)}</td>
        <td class="status-col"><span class="status-pill ${status.cls}">${escapeHtml(status.label)}</span></td>
        <td class="action-col"><button type="button" class="detail-button" onclick="lihatDetail('${escapeAttribute(item.id || item.nomor_pengajuan || "")}')">Detail</button></td>
      </tr>`;
    }).join("");
  }

  setText("dataSummary", `dari ${filtered.length} data`);
  setText("pageNumber", currentPage);
  const prev = document.getElementById("prevPage"), next = document.getElementById("nextPage");
  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
  window.lucide?.createIcons();
}

function getDisplayStatus(category) {
  if (category === "menunggu_revisi") return { label: "Menunggu Revisi dari Kementerian", cls: "status-revisi" };
  if (category === "selesai") return { label: "Selesai", cls: "status-selesai" };
  if (category === "ditolak") return { label: "Ditolak", cls: "status-ditolak" };
  return { label: "Perlu Verifikasi", cls: "status-verifikasi" };
}

function getMinistryClass(value) {
  const n = normalizeStatus(value);
  if (n.includes("pendidikan")) return "blue";
  if (n.includes("wirausaha") || n.includes("kewirausahaan")) return "green";
  if (n.includes("peternakan")) return "orange";
  if (n.includes("industri")) return "red";
  if (n.includes("sosial")) return "purple";
  if (n.includes("dalam negeri")) return "cyan";
  return "neutral";
}

let currentDetailId = "";
let currentDetailData = null;

function lihatDetail(id) {
  const pengajuanId = String(id || "").trim();
  if (!pengajuanId) {
    showDetailError("ID pengajuan tidak ditemukan.");
    return;
  }

  currentDetailId = pengajuanId;
  currentDetailData = null;
  openDetailModal();
  loadDetailPengajuan(pengajuanId);
}

function openDetailModal() {
  const modal = document.getElementById("detailModal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-modal-open");
  document.getElementById("detailModalBody").innerHTML = `
    <div class="detail-loading">
      <div class="detail-spinner"></div>
      <p>Memuat detail pengajuan...</p>
    </div>`;
  syncDetailActionButtons(null);
  window.lucide?.createIcons();
}

function closeDetailModal() {
  const modal = document.getElementById("detailModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-modal-open");
  closeRevisionModal();
}

async function loadDetailPengajuan(pengajuanId) {
  const body = document.getElementById("detailModalBody");
  if (!body) return;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getDetailPengajuanKemensetkab",
        session_token: currentUser?.session_token || "",
        pengajuan_id: pengajuanId
      })
    });

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.message || "Detail pengajuan tidak dapat dimuat.");
    }

    currentDetailData = result.data;
    renderDetailPengajuan(result.data);
  } catch (error) {
    console.error(error);
    showDetailError(error.message || "Terjadi kesalahan saat memuat detail pengajuan.");
  }
}

function renderDetailPengajuan(detail) {
  const body = document.getElementById("detailModalBody");
  if (!body) return;

  const category = getDetailCategory(detail.status);
  const status = getDetailStatus(category);
  const kementerian = detail.asal_kementerian || detail.kementerian || "-";
  const description = detail.catatan || "Belum ada deskripsi atau catatan pengajuan.";
  const documents = Array.isArray(detail.dokumen) ? detail.dokumen : [];
  const history = Array.isArray(detail.riwayat) ? detail.riwayat : [];

  body.innerHTML = `
    <section class="detail-section">
      <div class="detail-section-title">
        <div class="section-icon"><i data-lucide="file-text"></i></div>
        <span>Informasi Pengajuan</span>
      </div>
      <div class="detail-info-grid">
        <div class="detail-info-item">
          <div class="detail-info-label">Nomor Pengajuan</div>
          <div class="detail-info-value">${escapeHtml(detail.nomor_pengajuan || detail.id || "-")}</div>
        </div>
        <div class="detail-info-item">
          <div class="detail-info-label">Status Pengajuan</div>
          <div class="detail-info-value"><span class="detail-status ${status.cls}">${escapeHtml(status.label)}</span></div>
        </div>
        <div class="detail-info-item">
          <div class="detail-info-label">Judul Pengajuan</div>
          <div class="detail-info-value title-value">${escapeHtml(detail.judul || "Tanpa judul")}</div>
        </div>
        <div class="detail-info-item">
          <div class="detail-info-label">Kementerian Pengusul</div>
          <div class="detail-info-value">${escapeHtml(kementerian)}</div>
        </div>
        <div class="detail-info-item">
          <div class="detail-info-label">Jenis Pengajuan</div>
          <div class="detail-info-value">${escapeHtml(detail.jenis || "-")}</div>
        </div>
        <div class="detail-info-item">
          <div class="detail-info-label">Tanggal Masuk</div>
          <div class="detail-info-value">${formatDetailDate(detail.tanggal_pengajuan)}</div>
        </div>
      </div>
    </section>

    <section class="detail-section">
      <div class="detail-section-title">
        <div class="section-icon"><i data-lucide="align-left"></i></div>
        <span>Perihal / Deskripsi</span>
      </div>
      <p class="detail-description">${escapeHtml(description)}</p>
    </section>

    <div class="detail-split">
      <section class="detail-section">
        <div class="detail-section-title">
          <div class="section-icon"><i data-lucide="file-down"></i></div>
          <span>Dokumen Pengajuan</span>
        </div>
        ${renderDetailDocuments(documents, category === "verifikasi")} 
      </section>

      <section class="detail-section">
        <div class="detail-section-title">
          <div class="section-icon"><i data-lucide="history"></i></div>
          <span>Riwayat Pengajuan</span>
        </div>
        ${renderDetailHistory(history)}
      </section>
    </div>`;

  syncDetailActionButtons(detail);
  window.lucide?.createIcons();
}

function renderDetailDocuments(documents, canUpload = false) {
  const groupedDocuments = {};

  documents.forEach((doc, index) => {
    const typeRaw = String(
      doc?.jenis ||
      doc?.jenis_dokumen ||
      doc?.nama_dokumen ||
      ""
    ).trim();

    const typeKey = normalizeStatus(typeRaw || `dokumen ${index + 1}`);
    if (!groupedDocuments[typeKey]) {
      groupedDocuments[typeKey] = {
        original: null,
        latest: null
      };
    }

    const relation = String(
      doc?.dokumen_asal_id ||
      doc?.dokumen_parent_id ||
      ""
    ).trim();

    const uploadedAt = getTime(doc?.uploaded_at);
    const version = Number(doc?.versi_dokumen || 0);

    // Dokumen tanpa relasi adalah dokumen asli pengajuan.
    // Tetap simpan satu dokumen asli per jenis untuk menjadi
    // acuan upload hasil perbaikan.
    if (!relation) {
      const currentOriginal = groupedDocuments[typeKey].original;
      if (
        !currentOriginal ||
        uploadedAt < getTime(currentOriginal.uploaded_at) ||
        (
          uploadedAt === getTime(currentOriginal.uploaded_at) &&
          version < Number(currentOriginal.versi_dokumen || 0)
        )
      ) {
        groupedDocuments[typeKey].original = doc;
      }
    }

    // Untuk setiap jenis dokumen, hanya gunakan versi paling baru.
    // Ini berlaku baik untuk dokumen original maupun hasil perbaikan.
    const currentLatest = groupedDocuments[typeKey].latest;
    if (
      !currentLatest ||
      uploadedAt > getTime(currentLatest.uploaded_at) ||
      (
        uploadedAt === getTime(currentLatest.uploaded_at) &&
        version >= Number(currentLatest.versi_dokumen || 0)
      )
    ) {
      groupedDocuments[typeKey].latest = doc;
    }
  });

  const items = Object.values(groupedDocuments)
    .filter(item => item.original)
    .sort((a, b) => {
      const aTime = getTime(a.original?.uploaded_at);
      const bTime = getTime(b.original?.uploaded_at);
      return aTime - bTime;
    });

  if (!items.length) {
    return `<div class="detail-empty">Belum ada dokumen pengajuan yang dapat ditampilkan.</div>`;
  }

  return `<div class="detail-doc-list detail-original-doc-list">${items.map((item, index) => {
    const original = item.original;
    const displayDoc = item.latest || original;

    const originalId = String(original?.dokumen_id || "").trim();
    const hasRevision = String(displayDoc?.dokumen_id || "").trim() !== originalId;
    const name = displayDoc.nama || displayDoc.nama_file || `Dokumen ${index + 1}`;
    const type = displayDoc.jenis || displayDoc.jenis_dokumen || "Dokumen pengajuan";
    const ext = getFileExtension(name);
    const size = formatFileSize(displayDoc.ukuran_file);
    const url = getDocumentUrl(displayDoc);

    const fileClass = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)
      ? ext
      : "other";

    const meta = [
      hasRevision ? "Hasil Perbaikan" : type,
      size
    ].filter(Boolean).join(" • ");

    const download = displayDoc?.dokumen_id
      ? `<button type="button" class="detail-download-button" onclick="downloadDetailDocument('${escapeAttribute(String(displayDoc.dokumen_id || ""))}', '${escapeAttribute(String(name || ""))}')">
          <i data-lucide="download"></i><span>Download</span>
        </button>`
      : `<span class="detail-download-button disabled">
          <i data-lucide="download"></i><span>Tidak tersedia</span>
        </span>`;

    const uploadControl = canUpload && originalId
      ? `<div class="detail-upload-slot">
          <div class="detail-upload-slot-copy">
            <div class="detail-upload-slot-title">
              ${hasRevision ? "Ganti Dokumen Hasil Perbaikan" : "Unggah Dokumen Hasil Perbaikan"}
            </div>
            <div class="detail-upload-slot-note">
              Word (.doc/.docx), maksimal 15 MB.
            </div>
          </div>
          <input type="file"
            class="detail-upload-input"
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onchange="handleDetailUploadSelected(this, '${escapeAttribute(originalId)}')">
          <button type="button" class="detail-upload-button" onclick="triggerDetailUpload(this)">
            <i data-lucide="upload"></i>
            <span>${hasRevision ? "Ganti Dokumen" : "Unggah Hasil Perbaikan"}</span>
          </button>
        </div>`
      : "";

    return `<div class="detail-doc-item detail-original-doc-item">
      <div class="detail-doc-main">
        <div class="detail-file-icon ${fileClass}">
          ${escapeHtml(ext.toUpperCase() || "FILE")}
        </div>
        <div style="min-width:0">
          <div class="detail-doc-name" title="${escapeAttribute(name)}">
            ${escapeHtml(name)}
          </div>
          <div class="detail-doc-meta">
            ${escapeHtml(meta)}
          </div>
        </div>
      </div>

      ${download}

      ${hasRevision ? `
        <div class="detail-revision-status">
          <i data-lucide="check-circle-2"></i>
          Menggunakan hasil perbaikan terbaru
        </div>
      ` : ""}

      ${uploadControl}
    </div>`;
  }).join("")}</div>`;
}

function triggerDetailUpload(button) {
  const item = button?.closest(".detail-original-doc-item");
  const input = item?.querySelector(".detail-upload-input");
  if (input) input.click();
}

function handleDetailUploadSelected(input, dokumenId) {
  const file = input?.files?.[0];
  if (!file) return;

  const name = String(file.name || "").trim();
  if (!/\.(doc|docx)$/i.test(name)) {
    alert("Dokumen hasil perbaikan harus berupa file Word (.doc atau .docx).");
    input.value = "";
    return;
  }

  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    alert("Ukuran dokumen maksimal 15 MB.");
    input.value = "";
    return;
  }

  uploadDetailRevisionDocument(file, input, dokumenId);
}

async function uploadDetailRevisionDocument(file, input, dokumenId) {
  const item = input?.closest(".detail-original-doc-item");
  const button = item?.querySelector(".detail-upload-button");
  if (!currentDetailId || !currentUser?.session_token || !button || !dokumenId) return;

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="detail-action-loading">Mengunggah...</span>`;

  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.includes(",") ? result.split(",")[1] : result);
      };
      reader.onerror = () => reject(new Error("File tidak dapat dibaca oleh browser."));
      reader.readAsDataURL(file);
    });

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "uploadDokumenHasilPerbaikanKemensetkab",
        session_token: currentUser.session_token,
        pengajuan_id: currentDetailId,
        dokumen_id: dokumenId,
        file: {
          name: file.name,
          type: file.type || (/\.docx$/i.test(file.name) ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/msword"),
          data: base64
        }
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Dokumen gagal diunggah.");

    if (input) input.value = "";
    alert(result.message || "Dokumen hasil perbaikan berhasil diunggah.");
    await loadDetailPengajuan(currentDetailId);
  } catch (error) {
    console.error(error);
    alert(error.message || "Terjadi kesalahan saat mengunggah dokumen.");
    button.disabled = false;
    button.innerHTML = originalHtml;
    window.lucide?.createIcons();
  }
}

function renderDetailHistory(history) {
  if (!history.length) {
    return `<div class="detail-history-empty">Belum ada riwayat pengajuan.</div>`;
  }

  return `<div class="detail-history">${history.map((item, index) => {
    const action = item.aksi || "Perubahan status pengajuan";
    const from = item.dari_unit ? String(item.dari_unit) : "";
    const to = item.ke_unit ? String(item.ke_unit) : "";
    const route = from && to ? `${from} → ${to}` : (to || from || "SITARA");
    const note = item.catatan || "";
    return `<div class="history-item ${index === history.length - 1 ? "" : "muted"}">
      <div class="history-rail"><span class="history-dot"></span></div>
      <div>
        <div class="history-time">${escapeHtml(formatDetailDate(item.waktu))}</div>
        <div class="history-action">${escapeHtml(action)}</div>
        <div class="history-note">${escapeHtml(route)}${note ? ` • ${escapeHtml(note)}` : ""}</div>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function syncDetailActionButtons(detail) {
  const revisionButton = document.getElementById("detailRevisionButton");
  const forwardButton = document.getElementById("detailForwardButton");
  if (!revisionButton || !forwardButton) return;

  // Aksi hanya aktif ketika pengajuan berada di tahap verifikasi Kemensetkab.
  // Jika status sudah Menunggu Revisi, Selesai, atau sudah diteruskan,
  // tombol tetap ditampilkan tetapi dinonaktifkan.
  const canVerify = !!detail && getDetailCategory(detail.status) === "verifikasi";

  revisionButton.hidden = false;
  forwardButton.hidden = false;
  revisionButton.disabled = !canVerify;
  forwardButton.disabled = !canVerify;
  revisionButton.setAttribute("aria-disabled", String(!canVerify));
  forwardButton.setAttribute("aria-disabled", String(!canVerify));

  if (canVerify) {
    revisionButton.removeAttribute("title");
    forwardButton.removeAttribute("title");
  } else {
    revisionButton.title = "Aksi tidak tersedia karena pengajuan sedang menunggu proses dari kementerian.";
    forwardButton.title = "Aksi tidak tersedia karena pengajuan sedang menunggu proses dari kementerian.";
  }
}

function getDetailCategory(value) {
  const status = normalizeStatus(value || "");
  if (status.includes("ditolak") || status.includes("tolak")) return "ditolak";
  if (status.includes("selesai") || status.includes("menunggu persetujuan mensetkab") || status.includes("mensetkab")) return "selesai";
  if (status.includes("revisi") || status.includes("perbaikan")) return "revisi";
  if (status.includes("menunggu verifikasi") || status.includes("perlu verifikasi") || status === "diajukan") return "verifikasi";
  return "lainnya";
}

function getDetailStatus(category) {
  if (category === "verifikasi") return { label: "Perlu Verifikasi", cls: "verifikasi" };
  if (category === "revisi") return { label: "Menunggu Revisi", cls: "revisi" };
  if (category === "selesai") return { label: "Selesai", cls: "selesai" };
  if (category === "ditolak") return { label: "Ditolak", cls: "ditolak" };
  return { label: "Status Tidak Dikenal", cls: "unknown" };
}

function getDocumentUrl(doc) {
  const directUrl = String(doc?.url || doc?.file_url || "").trim();
  if (directUrl) return directUrl;
  const driveId = String(doc?.drive_file_id || "").trim();
  return driveId ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}` : "";
}

async function downloadDetailDocument(dokumenId, fileName) {
  const id = String(dokumenId || "").trim();
  if (!id || !currentUser?.session_token || !currentDetailId) return;

  const safeName = String(fileName || "dokumen").trim() || "dokumen";
  const buttons = document.querySelectorAll(".detail-download-button");
  let activeButton = null;

  buttons.forEach(button => {
    const handler = button.getAttribute("onclick") || "";
    if (handler.includes(id)) activeButton = button;
  });

  const originalHtml = activeButton?.innerHTML || "";
  if (activeButton) {
    activeButton.disabled = true;
    activeButton.innerHTML = `<span class="detail-action-loading">Mengunduh...</span>`;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "downloadDokumenKemensetkab",
        session_token: currentUser.session_token,
        pengajuan_id: currentDetailId,
        dokumen_id: id
      })
    });

    const result = await response.json();
    if (!result.success || !result.data?.base64) {
      throw new Error(result.message || "Dokumen gagal diunduh.");
    }

    const binary = atob(result.data.base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: result.data.mime_type || "application/octet-stream"
    });

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = result.data.nama_file || safeName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    console.error(error);
    alert(error.message || "Terjadi kesalahan saat mengunduh dokumen.");
  } finally {
    if (activeButton) {
      activeButton.disabled = false;
      activeButton.innerHTML = originalHtml;
      window.lucide?.createIcons();
    }
  }
}

function getFileExtension(name) {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "file";
}

function formatFileSize(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && /[a-z]/i.test(value)) return value;
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return String(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDetailDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return escapeHtml(String(value));
  const date = d.toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta"
  });
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta"
  });
  return `${date} • ${time} WIB`;
}

function showDetailError(message) {
  const body = document.getElementById("detailModalBody");
  if (!body) return;
  body.innerHTML = `<div class="detail-error">
    <div class="detail-error-icon"><i data-lucide="circle-alert"></i></div>
    <h3>Detail pengajuan gagal dimuat</h3>
    <p>${escapeHtml(message || "Terjadi kesalahan.")}</p>
    <button type="button" class="detail-retry" onclick="loadDetailPengajuan(currentDetailId)">Coba Lagi</button>
  </div>`;
  syncDetailActionButtons(null);
  window.lucide?.createIcons();
}

function openRevisionModal() {
  const modal = document.getElementById("revisionModal");
  const note = document.getElementById("revisionNote");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  if (note) {
    note.value = "";
    setTimeout(() => note.focus(), 40);
  }
  window.lucide?.createIcons();
}

function closeRevisionModal() {
  const modal = document.getElementById("revisionModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

async function submitRevision() {
  const noteEl = document.getElementById("revisionNote");
  const button = document.getElementById("revisionSubmitButton");
  const catatan = String(noteEl?.value || "").trim();
  if (!catatan) {
    noteEl?.focus();
    alert("Catatan revisi wajib diisi.");
    return;
  }
  await processDetailVerification("revisi", catatan, button);
}

async function forwardDetailPengajuan() {
  if (!currentDetailId) return;
  const ok = confirm("Teruskan pengajuan ini ke Mensetkab?\n\nPengajuan akan berpindah dari tahap verifikasi Kemensetkab.");
  if (!ok) return;
  await processDetailVerification("setujui", "", document.getElementById("detailForwardButton"));
}

async function processDetailVerification(aksi, catatan, button) {
  if (!currentDetailId || !currentUser?.session_token) return;
  const originalHtml = button?.innerHTML || "";
  if (button) {
    button.disabled = true;
    button.innerHTML = `<span class="detail-action-loading">Memproses...</span>`;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "prosesVerifikasiPengajuan",
        session_token: currentUser.session_token,
        pengajuan_id: currentDetailId,
        aksi,
        catatan
      })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Proses pengajuan gagal.");

    closeRevisionModal();
    closeDetailModal();
    alert(result.message || "Proses pengajuan berhasil.");
    await loadPengajuan(currentUser);
  } catch (error) {
    console.error(error);
    alert(error.message || "Terjadi kesalahan saat memproses pengajuan.");
    if (button) {
      button.disabled = false;
      button.innerHTML = originalHtml;
      window.lucide?.createIcons();
    }
  }
}

function initializeDetailModal() {
  const modal = document.getElementById("detailModal");
  if (!modal) return;

  document.getElementById("detailCloseButton")?.addEventListener("click", closeDetailModal);
  document.querySelectorAll("[data-detail-close]").forEach(el => el.addEventListener("click", closeDetailModal));
  document.getElementById("detailRevisionButton")?.addEventListener("click", openRevisionModal);
  document.getElementById("detailForwardButton")?.addEventListener("click", forwardDetailPengajuan);

  document.querySelectorAll("[data-revision-close]").forEach(el => el.addEventListener("click", closeRevisionModal));
  document.getElementById("revisionSubmitButton")?.addEventListener("click", submitRevision);

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const revision = document.getElementById("revisionModal");
    if (revision?.classList.contains("is-open")) {
      closeRevisionModal();
    } else if (modal.classList.contains("is-open")) {
      closeDetailModal();
    }
  });
}


function normalizeStatus(value) { return String(value || "").trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " "); }
function getTime(value) { const d = new Date(value); return isNaN(d) ? 0 : d.getTime(); }
function isSameDate(value, target) { const d = new Date(value); if (isNaN(d)) return false; const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0"); return `${yyyy}-${mm}-${dd}` === target; }
function formatTanggal(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return String(value);

  const date = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta"
  });

  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta"
  });

  return `${date}<br><span class="time-meta">${time} WIB</span>`;
}
function displayCurrentDate() { const el = document.getElementById("currentDate"); if (el) el.textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function displayUserProfile(user) { const name = user.nama_lengkap || user.nama || "Kementerian Sekretariat Kabinet"; const initial = String(user.kementerian_id || "") === "KEM001" ? "KS" : getInitials(name); setText("profileName", name); setText("profileRole", "Kementerian"); setText("profileAvatar", initial); setText("topbarAvatar", initial); }
function getInitials(name) { const parts = String(name || "").trim().split(/\s+/).filter(Boolean); return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : String(parts[0] || "KS").substring(0, 2).toUpperCase(); }
function initializeLogout() { document.getElementById("logoutButton")?.addEventListener("click", () => { if (!confirm("Apakah Anda yakin ingin keluar dari SITARA?")) return; sessionStorage.removeItem("sitaraUser"); window.location.href = "/login/index.html"; }); }
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function escapeHtml(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function escapeAttribute(v) { return String(v ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
