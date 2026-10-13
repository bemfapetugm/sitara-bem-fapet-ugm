const API_URL =
  "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const raw = sessionStorage.getItem("sitaraUser");
if (!raw) location.href = "../../../login/index.html";
let user;
try {
  user = JSON.parse(raw);
} catch (e) {
  sessionStorage.removeItem("sitaraUser");
  location.href = "../../../login/index.html";
}
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
  );
const badge = (s) => {
  const x = String(s || "").toLowerCase();
  let c = "status-info";
  if (x.includes("selesai") || x.includes("disetujui")) c = "status-success";
  else if (x.includes("revisi") || x.includes("menunggu")) c = "status-warning";
  else if (x.includes("tolak")) c = "status-danger";
  return `<span class="status-badge ${c}">${esc(s || "-")}</span>`;
};
const parseTime = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const date = (v) => {
  const d = parseTime(v);
  if (!d) return `<span class="history-time">-</span>`;
  const dateText = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeText = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `<span class="history-time"><span>${esc(dateText)}</span><span>${esc(timeText)}</span></span>`;
};

async function init() {
  const name = user.nama_lengkap || user.nama || "Mensetkab";
  const av = (
    name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("") || "MS"
  ).toUpperCase();
  document.getElementById("profileName").textContent = name;
  document.getElementById("profileAvatar").textContent = av;
  document.getElementById("topbarAvatar").textContent = av;
  document.getElementById("currentDate").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getRiwayatMensetkab",
        session_token: user.session_token,
      }),
    });
    const result = await response.json();
    if (!result.success) throw Error(result.message || "Riwayat tidak dapat dimuat.");
    const rows = (result.data || []).slice();
    const PAGE_SIZE = 30;
    let currentPage = 1;
    const pagination = document.getElementById("pagination");
    const timeValue = (value) => parseTime(value)?.getTime() || 0;

    const renderPagination = (total, page, pageCount) => {
      if (!pagination) return;
      if (total <= PAGE_SIZE) {
        pagination.hidden = true;
        pagination.innerHTML = "";
        return;
      }
      pagination.hidden = false;
      const first = (page - 1) * PAGE_SIZE + 1;
      const last = Math.min(page * PAGE_SIZE, total);
      const buttons = [];
      buttons.push(`<button type="button" class="history-page-button" data-page="${page - 1}" aria-label="Halaman sebelumnya" ${page === 1 ? "disabled" : ""}><i data-lucide="chevron-left" aria-hidden="true"></i></button>`);
      let startPage = Math.max(1, page - 2);
      let endPage = Math.min(pageCount, startPage + 4);
      startPage = Math.max(1, endPage - 4);
      for (let n = startPage; n <= endPage; n++) {
        buttons.push(`<button type="button" class="history-page-button${n === page ? " is-active" : ""}" data-page="${n}" aria-label="Halaman ${n}" aria-current="${n === page ? "page" : "false"}" ${n === page ? "disabled" : ""}>${n}</button>`);
      }
      buttons.push(`<button type="button" class="history-page-button" data-page="${page + 1}" aria-label="Halaman berikutnya" ${page === pageCount ? "disabled" : ""}><i data-lucide="chevron-right" aria-hidden="true"></i></button>`);
      pagination.innerHTML = `<span class="history-pagination-info">Menampilkan ${first}–${last} dari ${total} aktivitas</span><div class="history-pagination-controls">${buttons.join("")}</div>`;
      pagination.querySelectorAll("button[data-page]").forEach((button) => {
        button.addEventListener("click", () => {
          const target = Number(button.dataset.page);
          if (Number.isInteger(target) && target >= 1 && target <= pageCount && target !== currentPage) {
            currentPage = target;
            render(false);
          }
        });
      });
      if (window.lucide) window.lucide.createIcons();
    };

    const render = (resetPage = true) => {
      if (resetPage) currentPage = 1;
      const q = (document.getElementById("search").value || "").trim().toLowerCase();
      const order = document.getElementById("sortOrder").value || "newest";
      const dateFilter = document.getElementById("dateFilter").value || "all";
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const cutoff = dateFilter === "7" || dateFilter === "30"
        ? now.getTime() - Number(dateFilter) * 24 * 60 * 60 * 1000
        : 0;

      const data = rows
        .filter((x) => {
          const searchable = [x.pengajuan_id, x.aksi, x.dari_unit, x.ke_unit, x.status, x.status_label]
            .map((v) => String(v || "")).join(" ").toLowerCase();
          if (!searchable.includes(q)) return false;
          const timestamp = timeValue(x.waktu);
          if (dateFilter === "today") return timestamp >= startToday && timestamp <= now.getTime();
          if (dateFilter === "7" || dateFilter === "30") return timestamp >= cutoff && timestamp <= now.getTime();
          return true;
        })
        .sort((a, b) => {
          const difference = timeValue(b.waktu) - timeValue(a.waktu);
          return order === "oldest" ? -difference : difference;
        });

      const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
      currentPage = Math.min(currentPage, pageCount);
      const pageData = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
      document.getElementById("resultCount").textContent = `${data.length} aktivitas ditemukan`;
      document.getElementById("body").innerHTML = pageData.length
        ? pageData.map((x) => `
          <tr>
            <td><div class="history-id"><span class="history-file-icon"><i data-lucide="file-text" aria-hidden="true"></i></span><strong>${esc(x.pengajuan_id || "-")}</strong></div></td>
            <td><div class="history-activity">${esc(x.aksi || "-")}</div></td>
            <td>${esc(x.dari_unit || "-")}</td>
            <td>${esc(x.ke_unit || "-")}</td>
            <td>${badge(x.status || x.status_label)}</td>
            <td>${date(x.waktu)}</td>
          </tr>`).join("")
        : `<tr><td colspan="6" class="empty-state">Tidak ada riwayat yang sesuai dengan pencarian atau filter.</td></tr>`;
      renderPagination(data.length, currentPage, pageCount);
      if (window.lucide) window.lucide.createIcons();
    };

    document.getElementById("search").addEventListener("input", render);
    document.getElementById("sortOrder").addEventListener("change", render);
    document.getElementById("dateFilter").addEventListener("change", render);
    render();
  } catch (e) {
    document.getElementById("body").innerHTML =
      `<tr><td colspan="6" class="empty-state">${esc(e.message || "Terjadi kesalahan saat memuat riwayat.")}</td></tr>`;
    document.getElementById("resultCount").textContent = "Riwayat belum tersedia";
    const pagination = document.getElementById("pagination");
    if (pagination) pagination.hidden = true;
  }
}
document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Apakah Anda yakin ingin keluar dari SITARA?")) {
    sessionStorage.removeItem("sitaraUser");
    location.href = "../../../login/index.html";
  }
};
init();
