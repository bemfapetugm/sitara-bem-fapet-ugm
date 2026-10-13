// Modul konten Pengajuan ke Fakultas. Inisialisasi sesi, header, sidebar, profil, tanggal, dan logout tetap mengikuti file asli.
const FAKULTAS_API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
let currentUser = null;
let pendingRows = [];
let selectedToSend = null;
let currentPage = 1;
const pageSize = 8;
let sending = false;

document.addEventListener("DOMContentLoaded", initializeDpmShell);

function initializeDpmShell() {
  // Pastikan modal tidak terbuka otomatis akibat state/class yang tertinggal.
  document.getElementById("revisionModal")?.setAttribute("hidden", "");
  document.getElementById("confirmModal")?.setAttribute("hidden", "");
  document.getElementById("finalDocsModal")?.setAttribute("hidden", "");
  document.body.classList.remove("dpm-modal-open");

  const raw = sessionStorage.getItem("sitaraUser");
  if (!raw) { window.location.href = "/login/index.html"; return; }
  try { currentUser = JSON.parse(raw); }
  catch (error) { sessionStorage.removeItem("sitaraUser"); window.location.href = "/login/index.html"; return; }
  if (currentUser.role !== "kementerian" || currentUser.kementerian_id !== "KEM001") {
    alert("Anda tidak memiliki akses halaman ini.");
    sessionStorage.removeItem("sitaraUser");
    window.location.href = "/login/index.html";
    return;
  }
  displayCurrentDate();
  displayUserProfile(currentUser);
  initializeLogout();
  bindDpmEvents();
  refreshDpmIcons();
  loadDpmRows();
}

function displayCurrentDate() {
  const el = document.getElementById("currentDate");
  if (el) el.textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function displayUserProfile(user) {
  const name = user.nama_lengkap || user.nama || "Kementerian Sekretariat Kabinet";
  const initials = String(user.kementerian_id || "") === "KEM001" ? "KS" : getInitials(name);
  setText("profileName", name); setText("profileRole", "Kementerian"); setText("profileAvatar", initials); setText("topbarAvatar", initials);
}
function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : String(parts[0] || "KS").substring(0, 2).toUpperCase();
}
function initializeLogout() {
  document.getElementById("logoutButton")?.addEventListener("click", () => {
    if (!confirm("Apakah Anda yakin ingin keluar dari SITARA?")) return;
    sessionStorage.removeItem("sitaraUser"); window.location.href = "/login/index.html";
  });
}
function bindDpmEvents() {
  document.getElementById("searchInput")?.addEventListener("input", () => { currentPage = 1; renderDpmRows(); });
  document.getElementById("statusFilter")?.addEventListener("change", () => { currentPage = 1; renderDpmRows(); });
  document.getElementById("dateFilter")?.addEventListener("change", () => { currentPage = 1; renderDpmRows(); });
  document.getElementById("prevPage")?.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderDpmRows(); } });
  document.getElementById("nextPage")?.addEventListener("click", () => { const pages = Math.max(1, Math.ceil(getFilteredDpmRows().length / pageSize)); if (currentPage < pages) { currentPage++; renderDpmRows(); } });
  document.getElementById("closeConfirm")?.addEventListener("click", closeDpmConfirm);
  document.getElementById("cancelConfirm")?.addEventListener("click", closeDpmConfirm);
  document.getElementById("confirmModal")?.addEventListener("click", e => { if (e.target.id === "confirmModal") closeDpmConfirm(); });
  document.getElementById("confirmSend")?.addEventListener("click", sendDpmSubmission);
  document.getElementById("closeFinalDocs")?.addEventListener("click", closeFinalDocsModal);
  document.getElementById("cancelFinalDocs")?.addEventListener("click", closeFinalDocsModal);
  document.getElementById("finalDocsModal")?.addEventListener("click", e => { if (e.target.id === "finalDocsModal") closeFinalDocsModal(); });
  document.getElementById("submitFinalDocs")?.addEventListener("click", uploadFinalFacultyDocs);
  bindFinalFilePicker("finalPayoutFile", "finalPayoutFileName", "Belum ada PDF dipilih");
  bindFinalFilePicker("finalFacilityFile", "finalFacilityFileName", "Belum ada PDF dipilih");
  document.getElementById("closeRevision")?.addEventListener("click", closeRevisionModal);
  document.getElementById("cancelRevision")?.addEventListener("click", closeRevisionModal);
  document.getElementById("revisionModal")?.addEventListener("click", e => { if (e.target.id === "revisionModal") closeRevisionModal(); });
  document.getElementById("submitRevision")?.addEventListener("click", submitDpmRevision);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDpmConfirm(); closeRevisionModal(); closeFinalDocsModal(); } });
}

async function postDpmAction(action, extra = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(FAKULTAS_API_URL, {
      method: "POST",
      body: JSON.stringify({ action, session_token: currentUser.session_token, ...extra }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error("Server tidak dapat dihubungi. Coba lagi.");
    return await response.json();
  } catch (error) {
    if (error && error.name === "AbortError") {
      const timeoutError = new Error("Server belum memberikan respons dalam batas waktu. Status pengiriman belum dapat dipastikan. Periksa status pengajuan sebelum mencoba mengirim ulang.");
      timeoutError.code = "DPM_REQUEST_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
async function loadDpmRows(silent = false) {
  const body = document.getElementById("submissionRows");
  if (!silent) {
    body.innerHTML = '<tr><td colspan="6"><div class="dpm-loading"><span class="loader"></span><p>Memuat pengajuan yang disetujui DPM...</p></div></td></tr>';
    showDpmNotice("", "");
  }
  try {
    // Endpoint khusus Fakultas: hanya pengajuan Proposal yang sudah disetujui DPM
    // dan tahapnya sudah kembali ke Kemensetkab (KEM001).
    const result = await postDpmAction("getPengajuanKeFakultas");
    if (!result.success) throw new Error(result.message || "Gagal memuat pengajuan ke Fakultas.");
    const data = Array.isArray(result.data) ? result.data : [];
    pendingRows = data.filter(item => {
      const status = normalizeDpm(item.status_label || item.status);
      const stage = normalizeDpm(item.tahap_sekarang);
      const type = normalizeDpm(item.jenis);
      return type === "proposal" && ((status === "disetujui dpm" && stage === "kem001") || (status === "diajukan ke fakultas" && stage === "fakultas"));
    }).map(item => {
      const status = normalizeDpm(item.status_label || item.status);
      const isAwaitingFinal = status === "diajukan ke fakultas" || normalizeDpm(item.tahap_sekarang) === "fakultas";
      return { ...item, pengajuan_id: String(item.pengajuan_id || item.id || item.nomor_pengajuan || "").trim(), status: isAwaitingFinal ? "menunggu_verifikasi" : "siap" };
    }).filter(item => item.pengajuan_id);
    updateDpmStats(); currentPage = 1; renderDpmRows();
  } catch (error) {
    console.error("Pengajuan ke Fakultas:", error);
    body.innerHTML = `<tr><td colspan="6"><div class="dpm-error"><h3>Gagal memuat pengajuan</h3><p>${escapeDpmHtml(error.message || "Terjadi kesalahan.")}</p><button type="button" id="retryDpm">Coba Lagi</button></div></td></tr>`;
    document.getElementById("retryDpm")?.addEventListener("click", loadDpmRows);
    updateDpmStats();
  } finally { refreshDpmIcons(); }
}
function updateDpmStats() {
  // Statistik dipisahkan berdasarkan tahap alur:
  // - Menunggu Diteruskan: masih di Kemensetkab, belum dikirim ke Fakultas.
  // - Menunggu Verifikasi: sudah dikirim ke Fakultas, menunggu hasil/keputusan.
  // Total menghitung setiap pengajuan yang tampil satu kali.
  const waitingToSend = pendingRows.filter(item => item.status === "siap").length;
  const awaitingFaculty = pendingRows.filter(item => item.status === "menunggu_verifikasi").length;
  const total = pendingRows.length;

  setText("statWaiting", waitingToSend);
  setText("statRevision", awaitingFaculty);
  setText("statTotal", total);
}
function getFilteredDpmRows() {
  const query = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  const status = document.getElementById("statusFilter")?.value || "semua";
  const date = document.getElementById("dateFilter")?.value || "";
  let rows = [...pendingRows];
  return rows.filter(item => {
    const haystack = [item.pengajuan_id, item.nomor_pengajuan, item.perihal, item.judul, item.jenis, item.asal_kementerian].map(v => String(v || "").toLowerCase()).join(" ");
    if (query && !haystack.includes(query)) return false;
    if (status !== "semua" && item.status !== status) return false;
    if (date && datePart(item.updated_at || item.tanggal_pengajuan) !== date) return false;
    return true;
  }).sort((a, b) => new Date(b.updated_at || b.tanggal_pengajuan || 0) - new Date(a.updated_at || a.tanggal_pengajuan || 0));
}
function renderDpmRows() {
  const body = document.getElementById("submissionRows");
  const filtered = getFilteredDpmRows();
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > pages) currentPage = pages;
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  if (!rows.length) {
    const query = (document.getElementById("searchInput")?.value || "").trim();
    body.innerHTML = `<tr><td colspan="6"><div class="dpm-empty"><div class="dpm-empty-icon"><i data-lucide="inbox"></i></div><h3>${query ? "Pengajuan tidak ditemukan" : "Belum ada pengajuan yang perlu ditindaklanjuti"}</h3><p>${query ? "Coba kata kunci lain atau ubah filter." : "Pengajuan Proposal yang telah disetujui DPM dan dikembalikan ke Kemensetkab akan muncul di sini."}</p></div></td></tr>`;
  } else {
    body.innerHTML = rows.map((item, index) => {
      const needsRevision = item.status === "revisi";
      const awaitingFinal = item.status === "menunggu_verifikasi";
      const title = escapeDpmHtml(item.perihal || item.judul || "Tanpa judul");
      const id = escapeDpmHtml(item.pengajuan_id);
      const ministry = escapeDpmHtml(item.asal_kementerian || "-");
      const date = escapeDpmHtml(formatDpmDate(item.updated_at || item.tanggal_pengajuan));
      const status = needsRevision
        ? '<span class="dpm-status revision">Perlu Revisi</span>'
        : awaitingFinal
          ? '<span class="dpm-status waiting">Menunggu Verifikasi</span>'
          : '<span class="dpm-status waiting">Menunggu diteruskan</span>';
      const action = needsRevision
        ? `<button type="button" class="dpm-detail-button" data-revision-id="${escapeDpmAttr(item.pengajuan_id)}"><i data-lucide="upload-cloud"></i> Perlu Revisi</button>`
        : awaitingFinal
          ? `<button type="button" class="dpm-send-button" data-final-id="${escapeDpmAttr(item.pengajuan_id)}"><i data-lucide="check-circle"></i> Selesai</button>`
          : `<button type="button" class="dpm-send-button" data-send-id="${escapeDpmAttr(item.pengajuan_id)}"><i data-lucide="send"></i> Teruskan ke Fakultas</button>`;
      return `<tr><td>${start + index + 1}</td><td><div class="dpm-title-cell"><span class="dpm-row-file"><i data-lucide="file-text"></i></span><span>${title}</span></div></td><td><div class="dpm-ministry">${ministry}</div></td><td><span class="dpm-date">${date}</span></td><td>${status}</td><td>${action}</td></tr>`;
    }).join("");
  }
  body.querySelectorAll("[data-send-id]").forEach(button => button.addEventListener("click", () => openDpmConfirm(button.dataset.sendId)));
  body.querySelectorAll("[data-final-id]").forEach(button => button.addEventListener("click", () => openFinalDocsModal(button.dataset.finalId)));
  body.querySelectorAll("[data-revision-id]").forEach(button => button.addEventListener("click", () => openRevisionModal(button.dataset.revisionId)));
  setText("resultCount", filtered.length ? `Menampilkan ${start + 1}–${Math.min(start + pageSize, filtered.length)} dari ${filtered.length} pengajuan` : "Tidak ada pengajuan");
  setText("pageLabel", `${currentPage} / ${pages}`);
  document.getElementById("prevPage").disabled = currentPage <= 1;
  document.getElementById("nextPage").disabled = currentPage >= pages;
  updateDpmStats(); refreshDpmIcons();
}
function openDpmConfirm(id) {
  selectedToSend = pendingRows.find(item => item.pengajuan_id === String(id));
  if (!selectedToSend) return;
  setText("confirmId", selectedToSend.pengajuan_id);
  setText("confirmSubject", selectedToSend.perihal || selectedToSend.judul || "Tanpa judul");
  document.getElementById("confirmModal").hidden = false;
  document.body.classList.add("dpm-modal-open"); refreshDpmIcons();
}
function closeDpmConfirm() {
  if (sending) return;
  document.getElementById("confirmModal").hidden = true;
  document.body.classList.remove("dpm-modal-open"); selectedToSend = null;
}
async function sendDpmSubmission() {
  if (!selectedToSend || sending) return;
  const button = document.getElementById("confirmSend");
  sending = true; button.disabled = true; button.innerHTML = '<span class="loader small"></span> Memproses...';
  try {
    const result = await postDpmAction("kirimKeFakultas", { pengajuan_id: selectedToSend.pengajuan_id });
    if (!result.success) throw new Error(result.message || "Pengajuan gagal diteruskan ke Fakultas.");
    document.getElementById("confirmModal").hidden = true;
    document.body.classList.remove("dpm-modal-open"); selectedToSend = null;
    currentPage = 1; renderDpmRows();
    // Sinkronkan daftar; pengajuan yang telah dikirim tetap tampil sebagai Menunggu Verifikasi.
    await loadDpmRows(true);
    showDpmNotice("success", result.message || "Pengajuan berhasil diteruskan ke Fakultas.");
  } catch (error) { showDpmNotice("error", error.message || "Pengajuan gagal diteruskan ke Fakultas."); }
  finally { sending = false; button.disabled = false; button.innerHTML = '<i data-lucide="send"></i> Teruskan ke Fakultas'; refreshDpmIcons(); }
}

let finalDocsTarget = null;
let finalDocsUploading = false;
function openFinalDocsModal(id) {
  const item = pendingRows.find(row => row.pengajuan_id === String(id));
  if (!item) return;
  finalDocsTarget = item;
  setText("finalDocsId", item.pengajuan_id);
  setText("finalDocsSubject", item.perihal || item.judul || "Tanpa judul");
  const payout = document.getElementById("finalPayoutFile");
  const facility = document.getElementById("finalFacilityFile");
  if (payout) payout.value = "";
  if (facility) facility.value = "";
  setText("finalPayoutFileName", "Belum ada PDF dipilih");
  setText("finalFacilityFileName", "Belum ada PDF dipilih");
  document.getElementById("finalPayoutPicker")?.classList.remove("has-file");
  document.getElementById("finalFacilityPicker")?.classList.remove("has-file");
  const note = document.getElementById("finalDocsNotice");
  if (note) { note.hidden = true; note.textContent = ""; note.className = "dpm-notice"; }
  document.getElementById("finalDocsModal").hidden = false;
  document.body.classList.add("dpm-modal-open"); refreshDpmIcons();
}
function closeFinalDocsModal() {
  if (finalDocsUploading) return;
  const modal = document.getElementById("finalDocsModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("dpm-modal-open"); finalDocsTarget = null;
}
function bindFinalFilePicker(inputId, nameId, emptyText) {
  const input = document.getElementById(inputId);
  if (!input || input.dataset.pickerBound === "true") return;
  input.dataset.pickerBound = "true";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    const picker = input.closest(".dpm-final-file-field")?.querySelector(".dpm-final-file-picker");
    setText(nameId, file ? file.name : emptyText);
    picker?.classList.toggle("has-file", Boolean(file));
    const notice = document.getElementById("finalDocsNotice");
    if (notice) notice.hidden = true;
  });
}
async function finalFilePayload(file, kind) {
  if (!file) return null;
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) throw new Error(`File "${file.name}" harus berformat PDF (.pdf).`);
  if (file.size > 15 * 1024 * 1024) throw new Error("Ukuran setiap dokumen maksimal 15 MB.");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca file " + file.name + ".")); reader.readAsDataURL(file);
  });
  return { kind, name: file.name, type: file.type || "", data: dataUrl.split(",")[1] || "" };
}
async function uploadFinalFacultyDocs() {
  if (!finalDocsTarget || finalDocsUploading) return;
  const button = document.getElementById("submitFinalDocs"), notice = document.getElementById("finalDocsNotice");
  const setNotice = (type, message) => { if (!notice) return; notice.className = "dpm-notice" + (type ? " " + type : ""); notice.textContent = message; notice.hidden = !message; };
  try {
    const payoutFile = document.getElementById("finalPayoutFile")?.files?.[0];
    const facilityFile = document.getElementById("finalFacilityFile")?.files?.[0];
    if (!payoutFile) throw new Error("Surat Pencairan Dana wajib diunggah.");
    const files = [await finalFilePayload(payoutFile, "Surat Pencairan Dana")];
    if (facilityFile) files.push(await finalFilePayload(facilityFile, "Surat Peminjaman Fasilitas"));
    finalDocsUploading = true;
    if (button) { button.disabled = true; button.innerHTML = '<span class="loader small"></span> Menyimpan...'; }
    setNotice("", "");
    const result = await postDpmAction("uploadDokumenFinalFakultas", { pengajuan_id: finalDocsTarget.pengajuan_id, files }, 120000);
    if (!result.success) throw new Error(result.message || "Dokumen final gagal disimpan.");
    finalDocsUploading = false;
    closeFinalDocsModal(); await loadDpmRows(true);
    showDpmNotice("success", result.message || "Dokumen final berhasil disimpan dan dikembalikan ke kementerian pengaju.");
  } catch (error) { setNotice("error", error.message || "Gagal mengunggah dokumen final."); }
  finally { finalDocsUploading = false; if (button) { button.disabled = false; button.innerHTML = '<i data-lucide="upload-cloud"></i> Unggah Dokumen Final'; } refreshDpmIcons(); }
}

function showDpmNotice(type, message) {
  const el = document.getElementById("notice"); if (!el) return;
  el.className = "dpm-notice" + (type ? ` ${type}` : ""); el.textContent = message; el.hidden = !message;
}
function normalizeDpm(value) { return String(value || "").trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " "); }
function datePart(value) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function formatDpmDate(value) { if (!value) return "-"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "-" : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d); }
function escapeDpmHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
function escapeDpmAttr(value) { return escapeDpmHtml(value); }
function refreshDpmIcons() { if (window.lucide?.createIcons) window.lucide.createIcons(); }
function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }

let dpmRevisionTarget = null;
let dpmRevisionTypes = [];
let dpmRevisionDocs = [];
async function openRevisionModal(id) {
  dpmRevisionTarget = pendingRows.find(item => item.pengajuan_id === String(id) && item.status === "revisi");
  if (!dpmRevisionTarget) return;
  document.getElementById("revisionModal").hidden = false;
  document.body.classList.add("dpm-modal-open");
  setText("revisionId", dpmRevisionTarget.pengajuan_id);
  setText("revisionSubject", dpmRevisionTarget.perihal || dpmRevisionTarget.judul || "Tanpa judul");
  const list = document.getElementById("revisionUploadList");
  list.innerHTML = '<div class="dpm-loading"><span class="loader"></span><p>Memuat jenis dokumen...</p></div>';
  const submitButton = document.getElementById("submitRevision");
  submitButton.disabled = true;
  showRevisionNotice("", "");
  try {
    const result = await postDpmAction("getDetailPengajuanKemensetkab", {pengajuan_id: dpmRevisionTarget.pengajuan_id});
    if (!result.success) throw new Error(result.message || "Gagal memuat detail dokumen.");
    const detail = result.data || result.detail || {};
    // Tampilkan catatan revisi yang diberikan DPM sebelum Kemensetkab mengunggah perbaikan.
    let dpmNote = document.getElementById("revisionDpmNote");
    if (!dpmNote) {
      dpmNote = document.createElement("section");
      dpmNote.id = "revisionDpmNote";
      dpmNote.className = "dpm-revision-note";
      dpmNote.setAttribute("aria-label", "Catatan revisi dari DPM");
      const heading = document.createElement("strong");
      heading.className = "dpm-revision-note-title";
      heading.innerHTML = '<i data-lucide="message-square-warning"></i><span>Catatan Revisi dari DPM</span>';
      const content = document.createElement("p");
      content.id = "revisionDpmNoteText";
      dpmNote.append(heading, content);
      const modalTitle = document.getElementById("revisionTitle");
      const intro = modalTitle?.nextElementSibling;
      if (intro?.tagName === "P") intro.insertAdjacentElement("afterend", dpmNote);
      else modalTitle?.insertAdjacentElement("afterend", dpmNote);
    }
    const noteText = String(detail.catatan || detail.catatan_terakhir || dpmRevisionTarget.catatan_terakhir || "").trim();
    const noteContent = document.getElementById("revisionDpmNoteText");
    if (noteContent) noteContent.textContent = noteText || "DPM tidak menyertakan catatan revisi.";
    dpmNote.classList.toggle("is-empty", !noteText);
    const docs = Array.isArray(detail.dokumen) ? detail.dokumen : [];
    const latest = new Map();
    docs.forEach(doc => {
      const type = String(doc.jenis || doc.jenis_dokumen || "").trim();
      if (!type) return;
      const previous = latest.get(type);
      if (!previous || Number(doc.versi_dokumen || 1) >= Number(previous.versi_dokumen || 1)) latest.set(type, doc);
    });
    dpmRevisionTypes = [...latest.keys()];
    dpmRevisionDocs = dpmRevisionTypes.map(type => latest.get(type));
    if (!dpmRevisionTypes.length) throw new Error("Daftar jenis dokumen pengajuan tidak ditemukan.");
    list.innerHTML = dpmRevisionTypes.map((type, i) => {
      const doc = dpmRevisionDocs[i] || {};
      const docId = String(doc.dokumen_id || "").trim();
      const version = Number(doc.versi_dokumen || 1) || 1;
      const hasDownload = Boolean(docId);
      return `
      <div class="dpm-revision-upload">
        <div class="dpm-revision-upload-heading">
          <span class="dpm-revision-file-icon"><i data-lucide="file-text"></i></span>
          <span class="dpm-revision-type-copy"><strong>${escapeDpmHtml(type)}</strong><small>Versi terbaru · v${version}</small></span>
          <span class="dpm-revision-optional">Opsional</span>
        </div>
        <div class="dpm-source-document">
          <span class="dpm-source-file-name">${escapeDpmHtml(doc.nama || "Dokumen sumber")}</span>
          <button type="button" class="dpm-download-source" data-download-doc="${escapeDpmAttr(docId)}" data-download-name="${escapeDpmAttr(doc.nama || type)}" ${hasDownload ? "" : "disabled"}>
            <i data-lucide="download"></i><span>Unduh versi terbaru</span>
          </button>
        </div>
        <p class="dpm-revision-upload-hint">Unduh dokumen sumber di atas, perbarui isinya, lalu unggah hasil perbaikan (.doc/.docx), maksimal 10 MB.</p>
        <input class="dpm-revision-file-input" type="file" id="dpmRevisionFile${i}" accept=".doc,.docx" data-type="${escapeDpmAttr(type)}">
        <label class="dpm-revision-pick" for="dpmRevisionFile${i}"><i data-lucide="upload-cloud"></i><span>Pilih dokumen hasil revisi</span></label>
        <span class="dpm-revision-file-name" id="dpmRevisionName${i}">Belum ada file dipilih</span>
      </div>`;
    }).join("");
    list.querySelectorAll("[data-download-doc]").forEach(button => {
      button.addEventListener("click", () => downloadDpmSourceDocument(
        dpmRevisionTarget.pengajuan_id, button.dataset.downloadDoc, button.dataset.downloadName, button
      ));
    });
    dpmRevisionTypes.forEach((_, i) => {
      document.getElementById(`dpmRevisionFile${i}`).addEventListener("change", e => {
        const file = e.target.files?.[0];
        setText(`dpmRevisionName${i}`, file ? file.name : "Belum ada file dipilih");
        const card = e.target.closest(".dpm-revision-upload");
        card?.classList.toggle("has-file", Boolean(file));
        updateRevisionSubmitState();
        showRevisionNotice("", "");
      });
    });
    updateRevisionSubmitState();
    refreshDpmIcons();
  } catch (err) {
    list.innerHTML = `<div class="dpm-error"><h3>Gagal memuat jenis dokumen</h3><p>${escapeDpmHtml(err.message)}</p></div>`;
    submitButton.disabled = true;
  }
}
async function downloadDpmSourceDocument(pengajuanId, dokumenId, fallbackName, button) {
  if (!pengajuanId || !dokumenId || button?.disabled) return;
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span class="loader small"></span><span>Menyiapkan...</span>';
  try {
    const result = await postDpmAction("downloadDokumenKemensetkab", {
      pengajuan_id: pengajuanId,
      dokumen_id: dokumenId
    });
    if (!result.success || !result.data?.base64) {
      throw new Error(result.message || "Dokumen tidak dapat diunduh.");
    }
    const binary = atob(result.data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: result.data.mime_type || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = sanitizeDpmFilename(result.data.nama_file || fallbackName || "dokumen");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showRevisionNotice("success", `Dokumen "${result.data.nama_file || fallbackName}" berhasil diunduh.`);
  } catch (error) {
    showRevisionNotice("error", error.message || "Gagal mengunduh dokumen.");
  } finally {
    button.disabled = false;
    button.innerHTML = original;
    refreshDpmIcons();
  }
}

function sanitizeDpmFilename(name) {
  return String(name || "dokumen").replace(/[\\/:*?"<>|\\u0000-\\u001f]/g, "_").trim() || "dokumen";
}

function updateRevisionSubmitState() {
  const selectedCount = dpmRevisionTypes.reduce((count, _, i) => count + (document.getElementById(`dpmRevisionFile${i}`)?.files?.length ? 1 : 0), 0);
  const button = document.getElementById("submitRevision");
  if (button) button.disabled = selectedCount < 1 || sending;
  const countLabel = document.getElementById("revisionSelectedCount");
  if (countLabel) countLabel.textContent = selectedCount
    ? `${selectedCount} dokumen dipilih`
    : "Pilih minimal 1 dokumen untuk mengirim revisi";
}

function closeRevisionModal() {
  const modal = document.getElementById("revisionModal");
  if (modal) {
    modal.hidden = true;
    modal.style.display = "none";
  }
  document.body.classList.remove("dpm-modal-open");

  // Jika request sedang berjalan, izinkan pengguna menutup modal.
  // Jangan menghapus target/data sampai request selesai agar hasilnya tetap bisa ditangani.
  if (sending) return;

  dpmRevisionTarget = null;
  dpmRevisionTypes = [];
  dpmRevisionDocs = [];
}
function showRevisionNotice(type, message) {
  const el = document.getElementById("revisionNotice");
  el.className = "dpm-notice" + (type ? ` ${type}` : "");
  el.textContent = message; el.hidden = !message;
}
function readRevisionFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(new Error(`Gagal membaca file ${file.name}.`));
    reader.readAsDataURL(file);
  });
}
async function submitDpmRevision() {
  if (!dpmRevisionTarget || sending) return;
  const button = document.getElementById("submitRevision");
  const targetId = dpmRevisionTarget.pengajuan_id;
  let requestStarted = false;
  try {
    const dokumen = [];
    for (let i = 0; i < dpmRevisionTypes.length; i++) {
      const input = document.getElementById(`dpmRevisionFile${i}`);
      const file = input?.files?.[0];
      // Tiap jenis dokumen bersifat opsional; proses hanya file yang dipilih.
      if (!file) continue;
      if (!/\.(doc|docx)$/i.test(file.name)) throw new Error(`File "${file.name}" harus berformat Word .doc atau .docx.`);
      if (file.size <= 0) throw new Error(`File "${file.name}" kosong.`);
      if (file.size > 10 * 1024 * 1024) throw new Error(`File "${file.name}" melebihi batas 10 MB.`);
      dokumen.push({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        jenis_dokumen: dpmRevisionTypes[i],
        data: await readRevisionFile(file)
      });
    }
    if (dokumen.length < 1) throw new Error("Pilih minimal satu file dokumen sebelum mengirim revisi.");
    if (dokumen.reduce((sum, doc) => sum + doc.size, 0) > 25 * 1024 * 1024) {
      throw new Error("Total ukuran dokumen maksimal 25 MB.");
    }

    sending = true;
    button.disabled = true;
    button.innerHTML = '<span class="loader small"></span> Mengirim revisi...';
    showRevisionNotice("info", "Dokumen sedang dikirim ke DPM. Mohon tunggu dan jangan menutup halaman.");
    requestStarted = true;
    const result = await postDpmAction("kirimRevisiDPMKemensetkab", {
      pengajuan_id: targetId,
      dokumen
    }, 180000);
    if (!result.success) throw new Error(result.message || "Gagal mengirim revisi ke DPM.");

    // Tutup modal dan tampilkan notifikasi global setelah backend benar-benar mengonfirmasi sukses.
    document.getElementById("revisionModal").hidden = true;
    document.body.classList.remove("dpm-modal-open");
    dpmRevisionTarget = null;
    dpmRevisionTypes = [];
    dpmRevisionDocs = [];
    pendingRows = pendingRows.filter(item => item.pengajuan_id !== targetId);
    currentPage = 1;
    renderDpmRows();
    showDpmNotice("success", result.message || "Dokumen revisi berhasil dikirim kembali ke DPM.");
    // Refresh daftar tanpa menahan notifikasi sukses jika pemuatan daftar lambat.
    loadDpmRows(true).catch(error => console.warn("Penyegaran daftar DPM:", error));
  } catch (err) {
    const message = err.message || "Gagal mengirim revisi.";
    // Tampilkan error di modal jika masih terbuka; jika sudah ditutup, tampilkan di halaman.
    const modal = document.getElementById("revisionModal");
    if (modal && !modal.hidden) showRevisionNotice("error", message);
    else showDpmNotice("error", message);
  } finally {
    sending = false;
    if (button) {
      button.innerHTML = '<i data-lucide="upload-cloud"></i> Kirim Revisi ke DPM';
      updateRevisionSubmitState();
    }
    refreshDpmIcons();
  }
}
