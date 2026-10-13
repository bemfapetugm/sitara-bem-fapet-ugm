const API_URL =
  "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
let currentUser = null,
  allPengembalian = [],
  activeFilter = "semua",
  searchTerm = "";
const sessionData = sessionStorage.getItem("sitaraUser");
if (!sessionData) {
  window.location.href = "/login/index.html";
} else {
  try {
    currentUser = JSON.parse(sessionData);
    if (
      currentUser.role !== "kementerian" ||
      currentUser.kementerian_id !== "KEM001"
    ) {
      alert("Anda tidak memiliki akses halaman ini.");
      sessionStorage.removeItem("sitaraUser");
      window.location.href = "/login/index.html";
    } else {
      initializePengembalian(currentUser);
    }
  } catch (e) {
    sessionStorage.removeItem("sitaraUser");
    window.location.href = "/login/index.html";
  }
}
function initializePengembalian(user) {
  displayCurrentDate();
  displayUserProfile(user);
  initializeLogout();
  initializeFilters();
  document
    .getElementById("searchPengembalian")
    ?.addEventListener("input", (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      renderPengembalian();
    });
  document
    .getElementById("pengembalianContainer")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-pengajuan-id]");
      if (btn) bukaModalDetail(btn.dataset.pengajuanId);
    });
  inisialisasiModalDetail();
  loadPengembalian(user);
}
async function loadPengembalian(user) {
  const container = document.getElementById("pengembalianContainer");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getPengembalianMensetkab",
        session_token: user.session_token,
      }),
    });
    const result = await response.json();
    if (!result.success)
      throw new Error(result.message || "Gagal memuat pengembalian.");
    allPengembalian = Array.isArray(result.data) ? result.data : [];
    updateCounts();
    renderPengembalian();
    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="error-state"><h3>Gagal memuat pengembalian</h3><p>${escapeHtml(error.message)}</p><button class="retry-button" onclick="loadPengembalian(currentUser)">Coba Lagi</button></div>`;
  }
}
function getCategory(item) {
  const s = normalizeStatus(item.status_label || item.status);
  if (s === "diajukan ke dpm" || s === "menunggu persetujuan dpm") return "diajukan_dpm";
  if (s === "disetujui ketua bem") return "disetujui_ketua";
  return "ditolak_ketua";
}
function updateCounts() {
  const approved = allPengembalian.filter(
      (x) => getCategory(x) === "disetujui_ketua",
    ).length,
    rejected = allPengembalian.filter(
      (x) => getCategory(x) === "ditolak_ketua",
    ).length;
  setText("countSemua", allPengembalian.length);
  setText("countDisetujuiKetua", approved);
  setText("countDitolakKetua", rejected);
  setText("tabCountSemua", allPengembalian.length);
  setText("tabCountDisetujui", approved);
  setText("tabCountDitolak", rejected);
}
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function initializeFilters() {
  document.querySelectorAll(".status-tab").forEach((button) =>
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document
        .querySelectorAll(".status-tab")
        .forEach((tab) => tab.classList.toggle("active", tab === button));
      renderPengembalian();
    }),
  );
}
function renderPengembalian() {
  const container = document.getElementById("pengembalianContainer");
  let filtered =
    activeFilter === "semua"
      ? allPengembalian
      : allPengembalian.filter((x) => getCategory(x) === activeFilter);
  if (searchTerm)
    filtered = filtered.filter((x) =>
      `${x.perihal || ""} ${x.asal_kementerian || ""} ${x.nomor_pengajuan || ""}`
        .toLowerCase()
        .includes(searchTerm),
    );
  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="inbox"></i></div><h3>${searchTerm ? "Pengajuan tidak ditemukan" : "Tidak ada pengembalian"}</h3><p>${searchTerm ? "Coba kata kunci lain." : "Belum ada pengajuan yang telah disetujui atau ditolak oleh Ketua BEM."}</p></div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }
  container.innerHTML = `<div class="table-scroll"><table class="return-table"><thead><tr><th>No.</th><th>Judul Pengajuan</th><th>Kementerian</th><th>Tanggal Dikembalikan</th><th>Keputusan Ketua BEM</th><th>Aksi</th></tr></thead><tbody>${filtered
    .map((item, index) => {
      const category = getCategory(item);
      const approved = category === "disetujui_ketua";
      const dpm = category === "diajukan_dpm";
      return `<tr><td>${index + 1}</td><td class="title-cell">${escapeHtml(item.perihal || "Tanpa judul")}<small>${escapeHtml(item.nomor_pengajuan || item.id || "-")}</small></td><td>${escapeHtml(item.asal_kementerian || "-")}</td><td>${formatDateTime(item.updated_at || item.tanggal_pengajuan)}</td><td><span class="decision-badge ${approved ? "decision-approved" : (dpm ? "status-dpm" : "decision-rejected")}"><i data-lucide="${approved ? "check" : (dpm ? "send" : "x")}"></i>${approved ? "Disetujui Ketua BEM" : (dpm ? "Diajukan ke DPM" : "Ditolak Ketua BEM")}</span></td><td><button class="detail-button" type="button" data-pengajuan-id="${escapeHtml(item.id || item.nomor_pengajuan || "")}"><i data-lucide="eye"></i> Detail</button></td></tr>`;
    })
    .join("")}</tbody></table></div>`;
  if (window.lucide) lucide.createIcons();
}
function lihatDetail(id) {
  bukaModalDetail(id);
}
function normalizeStatus(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}
function formatDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return escapeHtml(v);
  return `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}<small>${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })} WIB</small>`;
}
function displayCurrentDate() {
  const el = document.getElementById("currentDate");
  if (el)
    el.textContent = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
}
function displayUserProfile(user) {
  const name =
      user.nama_lengkap || user.nama || "Kementerian Sekretariat Kabinet",
    initial =
      String(user.kementerian_id || "") === "KEM001" ? "KS" : getInitials(name);
  setText("profileName", name);
  setText("profileRole", "Kementerian");
  setText("profileAvatar", initial);
  setText("topbarAvatar", initial);
}
function getInitials(name) {
  const p = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return p.length > 1
    ? (p[0][0] + p[1][0]).toUpperCase()
    : String(p[0] || "KS")
        .substring(0, 2)
        .toUpperCase();
}
function initializeLogout() {
  document.getElementById("logoutButton")?.addEventListener("click", () => {
    if (!confirm("Apakah Anda yakin ingin keluar dari SITARA?")) return;
    sessionStorage.removeItem("sitaraUser");
    window.location.href = "/login/index.html";
  });
}
function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function escapeAttribute(v) {
  return String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inisialisasiModalDetail() {
  const modal = document.getElementById("modalDetailPengembalian");
  if (!modal) return;
  modal
    .querySelectorAll("[data-close-modal]")
    .forEach((el) => el.addEventListener("click", tutupModalDetail));
  document.getElementById("detailModalBody")?.addEventListener("click", (e) => {
    const button = e.target.closest("[data-download-dokumen]");
    if (!button || button.disabled) return;
    downloadDokumenPengembalian(
      button.dataset.downloadPengajuan,
      button.dataset.downloadDokumen,
      button.dataset.downloadFilename,
      button,
    );
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) tutupModalDetail();
  });
}
async function bukaModalDetail(id) {
  const modal = document.getElementById("modalDetailPengembalian");
  const body = document.getElementById("detailModalBody");
  if (!modal || !body) return;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  body.innerHTML =
    '<div class="detail-modal-loading"><span class="detail-spinner"></span><p>Memuat informasi dan riwayat pengajuan...</p></div>';
  const closeBtn = modal.querySelector(".detail-modal-close");
  if (closeBtn) closeBtn.focus();
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getDetailPengembalianMensetkab",
        session_token: currentUser.session_token,
        pengajuan_id: id,
      }),
    });
    const result = await response.json();
    if (!result.success)
      throw new Error(result.message || "Detail pengajuan gagal dimuat.");
    renderModalDetail(result.data || {});
  } catch (error) {
    console.error(error);
    body.innerHTML = `<div class="detail-modal-error"><i data-lucide="circle-alert"></i><h3>Detail tidak dapat dimuat</h3><p>${escapeHtml(error.message || "Terjadi kesalahan.")}</p><button type="button" class="retry-button" onclick="bukaModalDetail('${escapeAttribute(id)}')">Coba Lagi</button></div>`;
    if (window.lucide) lucide.createIcons();
  }
}
function tutupModalDetail() {
  const modal = document.getElementById("modalDetailPengembalian");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
}
function renderModalDetail(d) {
  const body = document.getElementById("detailModalBody");
  const approved =
    normalizeStatus(d.status_label || d.status) === "disetujui ketua bem";
  const fields = [
    ["Jenis Pengajuan", d.jenis],
    ["Kementerian Pengaju", d.asal_kementerian],
    ["Tanggal Pengajuan", formatDateTimePlain(d.tanggal_pengajuan)],
    ["Tanggal Kegiatan", formatDateOnly(d.tanggal_kegiatan)],
    [
      "Waktu Kegiatan",
      [d.waktu_mulai, d.waktu_selesai].filter(Boolean).join(" – "),
    ],
    ["Tempat Kegiatan", d.tempat],
    ["Sumber Dana", d.sumber_dana],
    ["Jumlah Dana", formatCurrency(d.jumlah_dana)],
    ["Penanggung Jawab", d.penanggung_jawab],
    ["Kontak Penanggung Jawab", d.kontak],
    ["Nomor Surat", d.nomor_surat],
  ].filter(
    (x) => x[1] !== undefined && x[1] !== null && String(x[1]).trim() !== "",
  );
  const fieldHtml = fields
    .map(
      ([label, value]) =>
        `<div class="detail-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    )
    .join("");
  const docs = Array.isArray(d.dokumen) ? d.dokumen : [];
  const docsHtml = docs.length
    ? `<div class="detail-document-list">${docs
        .map((doc) => {
          const dokumenId = doc.dokumen_id || "";
          return `<div class="detail-document"><span class="detail-document-icon"><i data-lucide="file-text"></i></span><div class="detail-document-info"><strong>${escapeHtml(doc.nama_file || doc.jenis || "Dokumen")}</strong><small>${escapeHtml(doc.jenis || "Dokumen")} · Versi ${escapeHtml(doc.versi_dokumen || 1)}</small></div>${dokumenId ? `<button type="button" class="detail-document-link detail-document-download" data-download-pengajuan="${escapeHtml(d.id || d.nomor_pengajuan || "")}" data-download-dokumen="${escapeHtml(dokumenId)}" data-download-filename="${escapeHtml(doc.nama_file || doc.jenis || "dokumen")}"><i data-lucide="download"></i> Download</button>` : '<span class="detail-no-link">ID dokumen tidak tersedia</span>'}</div>`;
        })
        .join("")}</div>`
    : '<div class="detail-empty-note">Belum ada dokumen yang tercatat.</div>';
  const history = Array.isArray(d.riwayat) ? d.riwayat : [];
  const historyHtml = history.length
    ? `<ol class="detail-timeline">${history.map((h, i) => `<li class="detail-timeline-item"><span class="detail-timeline-marker">${i + 1}</span><div class="detail-timeline-content"><div class="detail-timeline-heading"><strong>${escapeHtml(h.aksi || h.status || "Pembaruan pengajuan")}</strong><time>${escapeHtml(formatDateTimePlain(h.waktu) || "-")}</time></div><div class="detail-timeline-meta">${[h.dari_unit ? `Dari: ${h.dari_unit}` : "", h.ke_unit ? `Ke: ${h.ke_unit}` : "", h.dilakukan_oleh ? `Pelaksana: ${h.dilakukan_oleh}` : ""].filter(Boolean).map(escapeHtml).join(" <span>•</span> ")}</div>${h.status ? `<div class="detail-history-status">Status: ${escapeHtml(h.status)}</div>` : ""}${h.catatan ? `<p class="detail-history-note">${escapeHtml(h.catatan)}</p>` : ""}</div></li>`).join("")}</ol>`
    : '<div class="detail-empty-note">Belum ada riwayat tindakan yang tercatat.</div>';
  body.innerHTML = `<div class="detail-hero"><div class="detail-hero-icon"><i data-lucide="file-text"></i></div><div class="detail-hero-main"><div class="detail-eyebrow">${escapeHtml(d.nomor_pengajuan || d.id || "-")}</div><h3>${escapeHtml(d.judul || "Tanpa judul")}</h3><p>${escapeHtml(d.asal_kementerian || "-")}</p></div><span class="detail-status ${approved ? "is-approved" : "is-rejected"}"><i data-lucide="${approved ? "check-circle-2" : "x-circle"}"></i>${approved ? "Disetujui Ketua BEM" : "Ditolak Ketua BEM"}</span></div>
  <section class="detail-section"><h4><i data-lucide="clipboard-list"></i> Informasi Pengajuan</h4><div class="detail-fields">${fieldHtml || '<p class="detail-empty-note">Informasi tambahan tidak tersedia.</p>'}</div>${d.catatan ? `<div class="detail-longtext"><span>Isi / Catatan Pengajuan</span><p>${escapeHtml(d.catatan)}</p></div>` : ""}${d.deskripsi_evaluasi ? `<div class="detail-longtext"><span>Deskripsi / Evaluasi</span><p>${escapeHtml(d.deskripsi_evaluasi)}</p></div>` : ""}${d.catatan_terakhir ? `<div class="detail-longtext detail-last-note"><span>Catatan Terakhir</span><p>${escapeHtml(d.catatan_terakhir)}</p></div>` : ""}</section>
  <section class="detail-section"><h4><i data-lucide="files"></i> Dokumen Pengajuan <span class="detail-count">${docs.length}</span></h4>${docsHtml}</section>
  <section class="detail-section"><h4><i data-lucide="history"></i> Riwayat Pengajuan <span class="detail-count">${history.length}</span></h4>${historyHtml}</section>`;
  if (window.lucide) lucide.createIcons();
}
function formatDateTimePlain(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return (
    d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " WIB"
  );
}
function formatDateOnly(v) {
  if (!v) return "";
  const d = new Date(v);

  if (isNaN(d)) return String(v);

  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function formatCurrency(v) {
  if (v === undefined || v === null || v === "") return "";
  const n = Number(
    String(v)
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=.*\.)/g, "")
      .replace(",", "."),
  );
  return Number.isFinite(n)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n)
    : String(v);
}

async function downloadDokumenPengembalian(
  pengajuanId,
  dokumenId,
  namaFile,
  button,
) {
  if (!pengajuanId || !dokumenId) {
    alert("Informasi dokumen tidak lengkap.");
    return;
  }
  const originalHtml = button ? button.innerHTML : "";
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader-circle"></i> Menyiapkan...';
    if (window.lucide) lucide.createIcons();
  }
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "downloadDokumenKemensetkab",
        session_token: currentUser.session_token,
        pengajuan_id: pengajuanId,
        dokumen_id: dokumenId,
      }),
    });
    const result = await response.json();
    if (!result.success || !result.data || !result.data.base64) {
      throw new Error(
        result.message || "Dokumen gagal disiapkan untuk diunduh.",
      );
    }

    const raw = atob(result.data.base64);
    const chunkSize = 65536;
    const chunks = [];
    for (let offset = 0; offset < raw.length; offset += chunkSize) {
      const slice = raw.slice(offset, offset + chunkSize);
      const bytes = new Uint8Array(slice.length);
      for (let i = 0; i < slice.length; i++) bytes[i] = slice.charCodeAt(i);
      chunks.push(bytes);
    }
    const blob = new Blob(chunks, {
      type: result.data.mime_type || "application/octet-stream",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = sanitizeDownloadFilename(
      namaFile || result.data.nama_file || "dokumen"
    );
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  } catch (error) {
    console.error("Download dokumen pengembalian gagal:", error);
    alert(error.message || "Dokumen gagal diunduh. Silakan coba kembali.");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalHtml;
      if (window.lucide) lucide.createIcons();
    }
  }
}

function sanitizeDownloadFilename(name) {
  return String(name || "dokumen")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/[\r\n]/g, " ")
    .trim() || "dokumen";
}
