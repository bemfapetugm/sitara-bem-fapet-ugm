const API_URL =
  "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
let presensiUser = null,
  presensiEvents = [];
const $ = (id) => document.getElementById(id);
try {
  presensiUser = JSON.parse(sessionStorage.getItem("sitaraUser") || "null");
} catch (_) {
  presensiUser = null;
}
if (!presensiUser) {
  location.href = "/login/index.html";
} else if (
  !(
    (presensiUser.role === "kementerian" &&
      presensiUser.kementerian_id === "KEM001") ||
    presensiUser.role === "mensetkab"
  )
) {
  alert("Anda tidak memiliki akses Presensi Kegiatan.");
  location.href = "../index.html";
} else {
  initPresensi();
}
function initPresensi() {
  $("currentDate").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  $("profileName").textContent =
    presensiUser.nama_lengkap || presensiUser.email || "Pengguna";
  $("profileAvatar").textContent = initials(
    presensiUser.nama_lengkap || presensiUser.email,
  );
  $("topbarAvatar").textContent = initials(
    presensiUser.nama_lengkap || presensiUser.email,
  );
  $("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("sitaraUser");
    location.href = "/login/index.html";
  });
  $("openCreate").onclick = () => $("createDialog").showModal();
  $("closeDialog").onclick = closeCreate;
  $("cancelCreate").onclick = closeCreate;
  $("closeDetail").onclick = () => $("detailDialog").close();
  $("createForm").addEventListener("submit", createEvent);
  loadKementerianInternal();
  $("refreshButton").onclick = loadEvents;
  $("searchInput").addEventListener("input", renderEvents);
  $("statusFilter").addEventListener("change", renderEvents);
  loadEvents();
}
async function loadKementerianInternal() {
  const select = $("kementerianInternal");
  try {
    const r = await api("presensiGetKementerianInternal");
    if (!r.success) throw Error(r.message || "Daftar kementerian tidak dapat dimuat.");
    select.innerHTML = '<option value="">Pilih kementerian</option>' +
      (r.data || []).map(k => `<option value="${escAttr(k.nama_unit)}" data-id="${escAttr(k.kementerian_id)}">${esc(k.nama_unit)}</option>`).join("");
  } catch (e) {
    select.innerHTML = '<option value="">Gagal memuat kementerian</option>';
    console.error(e);
  }
}
function initials(v) {
  return (
    String(v || "KS")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0] || "")
      .join("")
      .toUpperCase() || "KS"
  );
}
async function api(action, payload = {}) {
  const r = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action,
      session_token: presensiUser?.session_token,
      ...payload,
    }),
  });
  return r.json();
}
function notice(message, error = false) {
  const n = $("notice");
  n.hidden = false;
  n.classList.toggle("error", error);
  n.textContent = message;
}
async function loadEvents() {
  $("eventRows").innerHTML =
    '<tr><td colspan="6" class="empty">Memuat kegiatan...</td></tr>';
  try {
    const r = await api("presensiListKegiatan");
    if (!r.success) throw Error(r.message || "Gagal memuat kegiatan.");
    presensiEvents = r.data || [];
    $("statTotal").textContent = presensiEvents.length;
    $("statActive").textContent = presensiEvents.filter(
      (x) => x.status === "aktif",
    ).length;
    const sum = await Promise.all(
      presensiEvents.map((e) =>
        api("presensiListPeserta", { kegiatan_id: e.kegiatan_id }).catch(
          () => null,
        ),
      ),
    );
    $("statParticipants").textContent = sum.reduce(
      (n, x) => n + (x?.success ? (x.data?.peserta || []).length : 0),
      0,
    );
    renderEvents();
  } catch (e) {
    $("eventRows").innerHTML =
      '<tr><td colspan="6" class="empty">Gagal memuat kegiatan: ' +
      esc(e.message) +
      "</td></tr>";
  }
}
function renderEvents() {
  const q = $("searchInput").value.trim().toLowerCase(),
    st = $("statusFilter").value;
  const rows = presensiEvents.filter(
    (e) =>
      (st === "semua" || e.status === st) &&
      [e.nama_kegiatan, e.penyelenggara, e.lokasi].some((x) =>
        String(x || "")
          .toLowerCase()
          .includes(q),
      ),
  );
  if (!rows.length) {
    $("eventRows").innerHTML =
      '<tr><td colspan="6" class="empty">Belum ada kegiatan yang sesuai. Klik “Buat Kegiatan” untuk memulai.</td></tr>';
    return;
  }
  $("eventRows").innerHTML = rows
    .map(
      (e) =>
        `<tr><td><strong>${esc(e.nama_kegiatan)}</strong><small>${esc(e.jenis_kegiatan === "internal" ? "Internal · " : "Eksternal · ")}${esc(e.penyelenggara || "")}</small></td><td>${esc(fmtDate(e.tanggal_kegiatan))}<br><small>${esc(fmtTime(e.waktu_mulai))}–${esc(fmtTime(e.waktu_selesai))}</small></td><td>${esc(e.lokasi || "—")}</td><td>${esc(fmtTime(e.checkin_mulai))}–${esc(fmtTime(e.checkin_selesai))}</td><td><span class="status-pill status-${esc(e.status)}">${esc(e.status)}</span></td><td><div class="row-actions"><button class="small-button" onclick="showDetail('${escAttr(e.kegiatan_id)}')">Detail</button><button class="small-button" onclick="openQrPage('${escAttr(e.kegiatan_id)}')">Tampilkan QR</button><button class="small-button" onclick="changeStatus('${escAttr(e.kegiatan_id)}','${e.status === "aktif" ? "ditutup" : "aktif"}')">${e.status === "aktif" ? "Tutup" : "Aktifkan"}</button><button class="small-button" onclick="exportPdf('${escAttr(e.kegiatan_id)}')">PDF</button></div></td></tr>`,
    )
    .join("");
  window.lucide?.createIcons();
}
async function createEvent(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target),
    d = Object.fromEntries(f.entries());
  d.jenis_kegiatan = $("jenisKegiatan").value;
  d.penyelenggara = $("kementerianInternal").value;
  const selected = $("kementerianInternal").selectedOptions[0];
  d.kementerian_id = selected?.dataset.id || "";
  if (!d.penyelenggara) {
    notice("Silakan pilih kementerian.", true);
    return;
  }
  $("saveButton").disabled = true;
  $("saveButton").textContent = "Menyimpan...";
  try {
    const r = await api("presensiCreateKegiatan", { data: d });
    if (!r.success) throw Error(r.message || "Gagal membuat kegiatan.");
    closeCreate();
    ev.target.reset();
    notice(
      "Kegiatan berhasil dibuat. Buka Detail / QR untuk melihat tautan presensi.",
    );
    await loadEvents();
  } catch (e) {
    notice(e.message, true);
  } finally {
    $("saveButton").disabled = false;
    $("saveButton").textContent = "Simpan Kegiatan";
  }
}
function closeCreate() {
  $("createDialog").close();
}
async function changeStatus(id, status) {
  if (!confirm(`Ubah status kegiatan menjadi ${status}?`)) return;
  try {
    const r = await api("presensiUpdateStatus", { kegiatan_id: id, status });
    if (!r.success) throw Error(r.message);
    notice(r.message);
    loadEvents();
  } catch (e) {
    notice(e.message, true);
  }
}
// Berbagi sesi secara terbatas dengan tab QR melalui postMessage same-origin.
// Token sesi tidak ditambahkan ke URL.
window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.data?.type !== "SITARA_QR_REQUEST_SESSION") return;
  if (event.source && presensiUser?.session_token) {
    event.source.postMessage({ type: "SITARA_QR_SESSION", user: presensiUser }, location.origin);
  }
});
function openQrPage(id) {
  const target = new URL("qr.html", new URL("./", location.href));
  target.searchParams.set("kegiatan_id", id);
  // Jangan gunakan noopener: tab QR perlu meminta sesi secara aman dari tab asal.
  const opened = window.open(target.href, "_blank");
  if (!opened) notice("Popup diblokir browser. Izinkan pop-up untuk SITARA lalu coba lagi.", true);
}
async function showDetail(id) {
  const e = presensiEvents.find((x) => x.kegiatan_id === id);
  if (!e) return;
  $("detailTitle").textContent = e.nama_kegiatan;
  // Gunakan URL publik di domain SITARA saat produksi. Saat pengembangan lokal,
  // tetap gunakan origin dan folder modul yang sedang dibuka.
  const url =
    location.hostname === "sitara.bemfptugm.web.id"
      ? new URL("https://sitara.bemfptugm.web.id/beranda/kemensetkab/presensi/peserta.html")
      : new URL("peserta.html", new URL("./", location.href));
  url.searchParams.set("token", e.token_qr);
  const qr =
    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
    encodeURIComponent(url.href);
  $("detailContent").innerHTML =
    `<div class="detail-meta"><div><span>Tanggal</span><strong>${esc(fmtDate(e.tanggal_kegiatan))}</strong></div><div><span>Lokasi</span><strong>${esc(e.lokasi)}</strong></div><div><span>Waktu kegiatan</span><strong>${esc(fmtTime(e.waktu_mulai))}–${esc(fmtTime(e.waktu_selesai))}</strong></div><div><span>Check-in</span><strong>${esc(fmtTime(e.checkin_mulai))}–${esc(fmtTime(e.checkin_selesai))}</strong></div></div><div class="qr-note"><b>Token QR kegiatan</b><br>${esc(e.token_qr)}<br><br><b>URL formulir</b><br>${esc(url.href)}</div><div class="detail-buttons"><button class="primary-button" onclick="openQrPage('${escAttr(id)}')">Tampilkan QR di halaman baru</button><button class="secondary-button" onclick="copyText('${escAttr(url.href)}')">Salin tautan presensi</button><button class="secondary-button" onclick="copyText('${escAttr(e.token_qr)}')">Salin token</button><button class="secondary-button" onclick="loadParticipants('${escAttr(id)}')">Lihat peserta</button></div><p class="form-hint">QR dihasilkan menggunakan layanan QR eksternal dari URL formulir. Pastikan URL frontend peserta dapat diakses publik sebelum membagikan QR.</p><div style="text-align:center"><img src="${qr}" alt="QR Code presensi" width="220" height="220" style="max-width:100%"></div><div id="participantPanel"></div>`;
  $("detailDialog").showModal();
}
async function loadParticipants(id) {
  const p = $("participantPanel");
  p.innerHTML = "Memuat peserta...";
  try {
    const r = await api("presensiListPeserta", { kegiatan_id: id });
    if (!r.success) throw Error(r.message);
    const rows = r.data.peserta || [];
    p.innerHTML = `<h3>Rekap peserta (${rows.length})</h3><div class="table-scroll"><table><thead><tr><th>Nama</th><th>Instansi</th><th>Waktu</th></tr></thead><tbody>${
      rows
        .map((x) => {
          let d = {};
          try {
            d = JSON.parse(x.data_identitas || "{}");
          } catch (_) {}
          return `<tr><td>${esc(d.nama_lengkap || Object.values(d)[0] || "-")}</td><td>${esc(d.instansi || "-")}</td><td>${esc(x.waktu_presensi || "-")}</td></tr>`;
        })
        .join("") || '<tr><td colspan="3">Belum ada peserta.</td></tr>'
    }</tbody></table></div>`;
  } catch (e) {
    p.textContent = e.message;
  }
}
async function exportPdf(id) {
  try {
    notice("Menyiapkan PDF...");
    const r = await api("presensiExportPdf", { kegiatan_id: id });
    if (!r.success) throw Error(r.message);
    const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = r.filename || "daftar-hadir.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    notice("PDF berhasil disiapkan.");
  } catch (e) {
    notice(e.message, true);
  }
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notice("Berhasil disalin.");
  } catch (_) {
    prompt("Salin teks berikut:", text);
  }
}
function fmtDate(v) {
  if (!v) return "—";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  }
  const d = new Date(v);
  return isNaN(d)
    ? s
    : d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      });
}
function fmtTime(v) {
  if (v === null || v === undefined || v === "") return "—";
  const s = String(v).trim();
  const iso = s.match(/(?:T|\s)(\d{2}):(\d{2})(?::\d{2})?/);
  if (iso && /1899-12-30|1899/.test(s)) return `${iso[1]}:${iso[2]}`;
  const hm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hm) return `${hm[1].padStart(2, "0")}:${hm[2]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      });
}
function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function escAttr(v) {
  return esc(v).replace(/`/g, "&#96;");
}
