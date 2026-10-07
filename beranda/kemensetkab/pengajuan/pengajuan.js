const API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
let currentUser = null;
let allPengajuan = [];
let activeFilter = "semua";

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
  displayCurrentDate();
  displayUserProfile(user);
  initializeLogout();
  initializeFilters();
  loadPengajuan(user);
}

async function loadPengajuan(user) {
  const container = document.getElementById("pengajuanContainer");
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getPengajuanMasukKemensetkab", session_token: user.session_token })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Gagal memuat pengajuan.");
    allPengajuan = Array.isArray(result.data) ? result.data : [];
    updateCounts();
    renderPengajuan();
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="error-state"><h3>Gagal memuat pengajuan</h3><p>${escapeHtml(error.message)}</p><button class="retry-button" onclick="loadPengajuan(currentUser)">Coba Lagi</button></div>`;
  }
}

function initializeFilters() {
  document.querySelectorAll(".status-tab").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll(".status-tab").forEach(tab => tab.classList.remove("active"));
      button.classList.add("active");
      renderPengajuan();
    });
  });
}

function getCategory(item) {
  const status = normalizeStatus(item.status || item.status_label || "");
  const stage = normalizeStatus(item.tahap_sekarang || "");

  if (status.includes("selesai")) return "selesai";
  if (status.includes("eksternal") || stage.includes("eksternal")) return "eksternal";
  if (status.includes("revisi") || status.includes("perbaikan")) {
    if (stage === "kem001" || stage.includes("kemensetkab")) return "perbaikan";
    return "menunggu_revisi";
  }
  if (status.includes("menunggu verifikasi") || status.includes("perlu verifikasi") || status === "diajukan") return "verifikasi";
  if (status.includes("menunggu") || status.includes("diproses") || status.includes("proses") || stage.includes("mensetkab") || stage.includes("menteri sekretariat kabinet") || stage.includes("ketua")) return "proses";
  return "proses";
}

function updateCounts() {
  const counts = { semua: allPengajuan.length, verifikasi: 0, menunggu_revisi: 0, perbaikan: 0, proses: 0, eksternal: 0, selesai: 0 };
  allPengajuan.forEach(item => counts[getCategory(item)]++);
  Object.keys(counts).forEach(key => {
    const id = "count" + key.split("_").map(v => v.charAt(0).toUpperCase()+v.slice(1)).join("");
    const el = document.getElementById(id);
    if (el) el.textContent = counts[key];
  });
}

function renderPengajuan() {
  const container = document.getElementById("pengajuanContainer");
  const filtered = activeFilter === "semua" ? allPengajuan : allPengajuan.filter(item => getCategory(item) === activeFilter);
  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✓</div><h3>Tidak ada pengajuan</h3><p>Tidak ada pengajuan pada kategori yang dipilih.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const category = getCategory(item);
    const status = getStatusInfo(item.status_label || item.status);
    const action = category === "verifikasi" ? "Verifikasi" : category === "perbaikan" ? "Lihat & Perbaiki" : "Lihat Detail";
    return `<article class="submission-card">
      <div class="submission-header">
        <div>
          <div class="submission-number">${escapeHtml(item.nomor_pengajuan || item.id || "-")}</div>
          <h3>${escapeHtml(item.perihal || "Tanpa judul")}</h3>
          <p class="submission-ministry">${escapeHtml(item.asal_kementerian || "-")}</p>
        </div>
        ${getJenisBadge(item.jenis)}
      </div>
      <div class="submission-body">
        <div class="submission-info"><span>📅 ${formatTanggal(item.tanggal_pengajuan)}</span>${getStatusBadge(item.status_label || item.status)}</div>
        <span class="stage-text">Tahap: ${escapeHtml(formatUnit(item.tahap_sekarang || "-"))}</span>
      </div>
      <div class="submission-footer"><button class="detail-button" onclick="lihatDetail('${escapeAttribute(item.id || item.nomor_pengajuan || "")}')">${action} →</button></div>
    </article>`;
  }).join("");
}

function lihatDetail(id) { window.location.href = "detail/index.html?id=" + encodeURIComponent(id); }
function normalizeStatus(value) { return String(value||"").trim().toLowerCase().replace(/_/g," ").replace(/\s+/g," "); }
function getStatusInfo(value) {
  const raw=String(value||"").trim(), n=normalizeStatus(raw);
  const map=[
    [/^diajukan$/, ["Diajukan","diajukan"]],
    [/menunggu verifikasi|perlu verifikasi/, ["Menunggu Verifikasi","menunggu-verifikasi"]],
    [/perlu revisi|^revisi$/, ["Perlu Revisi","perlu-revisi"]],
    [/menunggu persetujuan mensetkab|menunggu persetujuan menteri sekretariat kabinet/, ["Menunggu Persetujuan Mensetkab","menunggu-mensetkab"]],
    [/menunggu persetujuan ketua bem|menunggu persetujuan ketua/, ["Menunggu Persetujuan Ketua BEM","menunggu-ketua"]],
    [/diajukan ke dpm/, ["Diajukan ke DPM","diajukan-dpm"]],
    [/disetujui dpm/, ["Disetujui DPM","disetujui-dpm"]],
    [/diajukan ke fakultas/, ["Diajukan ke Fakultas","diajukan-fakultas"]],
    [/disetujui fakultas/, ["Disetujui Fakultas","disetujui-fakultas"]],
    [/menunggu dokumen fakultas/, ["Menunggu Dokumen Fakultas","menunggu-fakultas"]],
    [/dalam proses|diproses|proses/, ["Dalam Proses","dalam-proses"]],
    [/selesai/, ["Selesai","selesai"]],
    [/ditolak/, ["Ditolak","ditolak"]]
  ];
  for(const [rx,info] of map) if(rx.test(n)) return {label:info[0],cls:info[1]};
  return {label:raw||"-",cls:"lainnya"};
}
function getStatusBadge(value){const i=getStatusInfo(value);return `<span class="status-pill status-${i.cls}">${escapeHtml(i.label)}</span>`;}
function getJenisBadge(value){const raw=String(value||"").trim(), n=raw.toLowerCase();const label=n==="proposal"?"Proposal":n==="lpj"?"LPJ":raw||"-";const cls=n==="proposal"?"proposal":n==="lpj"?"lpj":"lainnya";return `<span class="jenis-badge jenis-${cls}">${escapeHtml(label)}</span>`;}
function formatUnit(value){const raw=String(value||"").trim(),n=raw.toLowerCase();if(raw==="KEM001"||n==="biro agata"||n==="kemensetkab")return "Kementerian Sekretariat Kabinet";if(n==="mensetkab")return "Menteri Sekretariat Kabinet";if(n==="ketua"||n==="ketua bem")return "Ketua BEM";if(n==="kemenkeu"||n==="kementerian keuangan")return "Kementerian Keuangan";return raw;}
function formatTanggal(value){if(!value)return"-";const d=new Date(value);return isNaN(d)?value:d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});}
function displayCurrentDate(){const el=document.getElementById("currentDate");if(el)el.textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
function displayUserProfile(user){const name=user.nama_lengkap||user.nama||"Kementerian Sekretariat Kabinet";const initial=String(user.kementerian_id||"")==="KEM001"?"KS":getInitials(name);document.getElementById("profileName").textContent=name;document.getElementById("profileRole").textContent="Kementerian";document.getElementById("profileAvatar").textContent=initial;document.getElementById("topbarAvatar").textContent=initial;}
function getInitials(name){const parts=String(name||"").trim().split(/\s+/).filter(Boolean);return parts.length>1?(parts[0][0]+parts[1][0]).toUpperCase():String(parts[0]||"KS").substring(0,2).toUpperCase();}
function initializeLogout(){document.getElementById("logoutButton")?.addEventListener("click",()=>{if(!confirm("Apakah Anda yakin ingin keluar dari SITARA?"))return;sessionStorage.removeItem("sitaraUser");window.location.href="/login/index.html";});}
function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function escapeAttribute(v){return String(v??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
