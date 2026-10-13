const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const session = JSON.parse(sessionStorage.getItem("sitaraUser") || "{}");
const sessionToken = String(session.session_token || "").trim();
const $ = (id) => document.getElementById(id);

function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
}

function dateID(v) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d)
    ? esc(v)
    : d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

function initials(name) {
  return (
    String(name || "Pengguna")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "KH"
  );
}

async function api(action, data = {}) {
  const r = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action,
      session_token: sessionToken,
      ...data,
    }),
  });
  return r.json();
}

function setProfile() {
  const name =
    session.nama_lengkap || session.nama || session.name || "Pengguna";
  const i = initials(name);

  ["profileAvatar", "topbarAvatar"].forEach((x) => {
    if ($(x)) $(x).textContent = i;
  });

  if ($("profileName")) $("profileName").textContent = name;
  if ($("welcomeTitle")) $("welcomeTitle").textContent = name;

  // Tetap memakai label yang sama seperti dashboard Ketua BEM.
  if ($("profileRole")) $("profileRole").textContent = "Kementerian";
}

function setStats(stat, pengajuan = []) {
  // Statistik dihitung dari pengajuan milik kementerian yang login.
  // Revisi hanya dihitung jika tahap_sekarang menunjuk Kemenhubker.
  const rows = Array.isArray(pengajuan) ? pengajuan : [];
  const revisi = rows.filter(isRevisionForCurrentMinistry).length;
  const menunggu = rows.filter((item) => {
    const s = normalizeText(item.status_label || item.status);
    return !s.includes("revisi") && !s.includes("tolak") &&
      !s.includes("selesai") && !s.includes("disetujui") &&
      !s.includes("diterima");
  }).length;
  const disetujui = rows.filter((item) => {
    const s = normalizeText(item.status_label || item.status);
    return s.includes("selesai") || s.includes("disetujui") || s.includes("diterima");
  }).length;
  const ditolak = rows.filter((item) => normalizeText(item.status_label || item.status).includes("tolak")).length;

  $("statMenunggu").textContent = menunggu;
  $("statRevisi").textContent = revisi;
  $("statDisetujui").textContent = disetujui;
  $("statDitolak").textContent = ditolak;
}


function normalizeText(v) {
  return String(v ?? "").trim().toLowerCase();
}

function isOwnedByCurrentMinistry(item) {
  const currentId = normalizeText(
    session.kementerian_id || session.kementerianId || session.id_kementerian || ""
  );
  const currentName = normalizeText(
    session.nama_unit || session.nama_kementerian || session.kementerian || ""
  );

  const itemId = normalizeText(
    item.kementerian_id || item.kementerianId || item.id_kementerian || ""
  );
  const itemName = normalizeText(
    item.asal_kementerian || item.nama_kementerian || item.kementerian || ""
  );

  if (currentId && itemId) return currentId === itemId;
  if (currentName && itemName) return currentName === itemName;

  // Jangan menampilkan data lintas kementerian jika identitas pemilik tidak tersedia.
  return false;
}

function isFollowUpStatus(status) {
  const s = normalizeText(status);

  // Hanya tiga kelompok yang ditampilkan di panel ini:
  // 1. Perlu revisi
  // 2. Selesai/disetujui/diterima
  // 3. Ditolak
  if (s.includes("revisi")) return true;
  if (s.includes("tolak")) return true;
  if (s.includes("selesai") || s.includes("disetujui") || s.includes("diterima")) return true;

  return false;
}

function isRevisionForCurrentMinistry(item) {
  const status = normalizeText(item?.status_label || item?.status || "");
  if (!status.includes("revisi")) return false;

  const currentId = normalizeText(
    session.kementerian_id || session.kementerianId || session.id_kementerian || ""
  );
  const currentName = normalizeText(
    session.nama_unit || session.nama_kementerian || session.kementerian || ""
  );
  const stage = normalizeText(item?.tahap_sekarang || item?.tahap || item?.unit_tujuan || "");
  if (!stage) return false;

  // Cocokkan ID terlebih dahulu, lalu label kementerian jika backend mengirim nama.
  if (currentId && stage === currentId) return true;
  if (currentName && stage === currentName) return true;

  // Dukungan variasi label yang umum dipakai untuk Kementerian Hubungan Kerja Sama.
  return stage.includes("hubungan kerja sama") || stage.includes("kemenhubker");
}

function isDashboardFollowUpItem(item) {
  const status = item?.status_label || item?.status;
  if (!isFollowUpStatus(status)) return false;
  const normalized = normalizeText(status);
  if (normalized.includes("revisi")) return isRevisionForCurrentMinistry(item);
  return true;
}

function filterDashboardPengajuan(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter(isOwnedByCurrentMinistry)
    .filter((item) => isFollowUpStatus(item.status_label || item.status))
    .sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
}

/*
 * Mengambil waktu keputusan/status TERKINI dari data Riwayat Pengajuan.
 * Prioritas:
 * 1. aktivitas riwayat yang cocok dengan nomor pengajuan + status
 * 2. field timestamp keputusan yang mungkin dikirim backend
 * 3. updated_at sebagai fallback
 *
 * Dengan begitu kolom Tanggal bukan lagi tanggal pengajuan awal.
 */
function getDecisionTimestamp(item, activities = []) {
  const id = normalizeText(
    item?.nomor_pengajuan ||
      item?.pengajuan_id ||
      item?.id_pengajuan ||
      item?.id ||
      ""
  );

  const status = normalizeText(item?.status_label || item?.status || "");

  const matchesStatus = (activity) => {
    const text = normalizeText(
      activity?.aktivitas ||
        activity?.aksi ||
        activity?.status_label ||
        activity?.status ||
        ""
    );

    if (status.includes("revisi")) {
      return text.includes("revisi");
    }

    if (
      status.includes("tolak")
    ) {
      return text.includes("tolak");
    }

    if (
      status.includes("selesai") ||
      status.includes("disetujui") ||
      status.includes("diterima")
    ) {
      return (
        text.includes("setujui") ||
        text.includes("disetujui") ||
        text.includes("diterima") ||
        text.includes("selesai")
      );
    }

    return false;
  };

  const candidates = Array.isArray(activities)
    ? activities.filter((activity) => {
        const activityId = normalizeText(
          activity?.pengajuan_id ||
            activity?.nomor_pengajuan ||
            activity?.id_pengajuan ||
            activity?.id ||
            ""
        );

        if (!id || !activityId || id !== activityId) return false;
        return matchesStatus(activity);
      })
    : [];

  // Jika ada beberapa riwayat dengan status yang sama, gunakan yang terbaru.
  candidates.sort(
    (a, b) =>
      new Date(
        b?.waktu ||
          b?.timestamp ||
          b?.created_at ||
          b?.updated_at ||
          0
      ).getTime() -
      new Date(
        a?.waktu ||
          a?.timestamp ||
          a?.created_at ||
          a?.updated_at ||
          0
      ).getTime()
  );

  if (candidates.length) {
    return (
      candidates[0]?.waktu ||
      candidates[0]?.timestamp ||
      candidates[0]?.created_at ||
      candidates[0]?.updated_at ||
      ""
    );
  }

  // Dukungan untuk field timestamp keputusan jika backend menyediakannya.
  return (
    item?.tanggal_keputusan ||
    item?.waktu_keputusan ||
    item?.decision_at ||
    item?.status_updated_at ||
    item?.updated_at ||
    ""
  );
}

function formatDecisionDateTime(value) {
  if (!value) return "-";

  const d = new Date(value);
  if (isNaN(d.getTime())) return esc(value);

  const date = d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `<span class="decision-date">${esc(date)}</span>
          <span class="decision-time">${esc(time)} WIB</span>`;
}

function renderItems(items, activities = []) {
  const body = $("recentList");
  if (!body) return;

  if (!Array.isArray(items) || !items.length) {
    body.innerHTML =
      '<tr><td colspan="5" class="empty-state">Tidak ada pengajuan yang sedang diproses.</td></tr>';
    return;
  }

  body.innerHTML = items
    .slice(0, 5)
    .map(
      (x, index) => {
        // Backend pada beberapa data menggunakan tanggal_pengajuan,
        // sementara sebagian data lama menggunakan tanggal/created_at.
        const statusText = x.status_label || x.status || "-";
        const decisionAt = getDecisionTimestamp(x, activities);

        return `
          <tr>
              <td class="dashboard-row-number">${index + 1}</td>
              <td>
                  <strong>${esc(x.perihal || x.judul_pengajuan || x.judul || "Pengajuan")}</strong>
                  <small>${esc(x.nomor_pengajuan || x.pengajuan_id || "-")}</small>
              </td>
              <td><span class="type-badge">${esc(x.jenis || x.jenis_pengajuan || "-")}</span></td>
              <td class="dashboard-decision-date">
                ${decisionAt ? formatDecisionDateTime(decisionAt) : "-"}
              </td>
              <td class="dashboard-status-cell">
                <span class="status-badge ${statusClass(statusText)}">${esc(statusText)}</span>
              </td>
          </tr>
        `;
      },
    )
    .join("");
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("revisi")) return "status-warning";
  if (
    s.includes("selesai") ||
    s.includes("disetujui") ||
    s.includes("diterima")
  )
    return "status-success";
  if (s.includes("tolak")) return "status-danger";
  return "status-info";
}

function dateTimeID(v) {
  if (!v) return { date: "-", time: "-" };
  const d = new Date(v);
  if (isNaN(d.getTime())) return { date: esc(v), time: "-" };

  return {
    date: d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

function getActivityOwnerKey(item) {
  const id = normalizeText(
    item?.kementerian_id ||
      item?.kementerianId ||
      item?.id_kementerian ||
      item?.pemilik_kementerian_id ||
      item?.pemilik_kementerian
  );
  const name = normalizeText(
    item?.asal_kementerian ||
      item?.nama_kementerian ||
      item?.kementerian ||
      item?.nama_unit ||
      item?.unit_kementerian
  );
  return { id, name };
}

function isActivityOwnedByCurrentMinistry(activity, ownedPengajuanIds) {
  const currentId = normalizeText(
    session.kementerian_id || session.kementerianId || session.id_kementerian || ""
  );
  const currentName = normalizeText(
    session.nama_unit || session.nama_kementerian || session.kementerian || ""
  );

  const owner = getActivityOwnerKey(activity);

  // Prioritas 1: identitas kementerian yang dikirim backend.
  if (currentId && owner.id) return currentId === owner.id;
  if (currentName && owner.name) return currentName === owner.name;

  // Prioritas 2: cocokkan ID pengajuan dengan daftar pengajuan milik
  // kementerian yang sudah diterima dari endpoint dashboard.
  const pengajuanId = normalizeText(
    activity?.pengajuan_id || activity?.nomor_pengajuan || activity?.id_pengajuan
  );
  return !!pengajuanId && ownedPengajuanIds.has(pengajuanId);
}

function getActivityTimestamp(item) {
  return (
    item?.waktu ||
    item?.timestamp ||
    item?.updated_at ||
    item?.update_at ||
    item?.status_updated_at ||
    item?.tanggal_keputusan ||
    item?.waktu_keputusan ||
    item?.tanggal ||
    item?.tanggal_pengajuan ||
    item?.created_at ||
    ""
  );
}

function isCompletedStatus(status) {
  const s = normalizeText(status);
  return (
    s.includes("selesai") ||
    s.includes("disetujui") ||
    s.includes("diterima")
  );
}

function buildDashboardActivities(items) {
  // Sumber aktivitas Dashboard adalah `riwayat_pengajuan`
  // yang dikirim backend melalui getDashboardKementerian.
  // Jangan membuat aktivitas sintetis dari sheet `pengajuan`.
  return Array.isArray(items) ? [...items] : [];
}

function renderActivities(items, ownedPengajuan) {
  const box = $("activityList");
  if (!box) return;

  const allActivities = buildDashboardActivities(items);

  if (!allActivities.length) {
    box.innerHTML = '<div class="empty-state">Belum ada aktivitas.</div>';
    return;
  }

  const ownedPengajuanIds = new Set(
    (Array.isArray(ownedPengajuan) ? ownedPengajuan : [])
      .map((x) =>
        normalizeText(
          x?.nomor_pengajuan || x?.pengajuan_id || x?.id_pengajuan || x?.id
        )
      )
      .filter(Boolean)
  );

  // Aktivitas dengan identitas kementerian tetap diverifikasi.
  // Aktivitas tanpa identitas pemilik mengikuti daftar pengajuan milik
  // kementerian dari endpoint getPengajuan.
  const ownedActivities = allActivities.filter((x) =>
    isActivityOwnedByCurrentMinistry(x, ownedPengajuanIds)
  );

  if (!ownedActivities.length) {
    box.innerHTML = '<div class="empty-state">Belum ada aktivitas pengajuan Anda.</div>';
    return;
  }

  // Aktivitas terbaru berada paling atas.
  const sorted = [...ownedActivities].sort((a, b) => {
    const ta = new Date(getActivityTimestamp(a)).getTime();
    const tb = new Date(getActivityTimestamp(b)).getTime();
    return tb - ta;
  });

  box.innerHTML = sorted
    .map((x) => {
      const dt = dateTimeID(getActivityTimestamp(x));
      return `
        <div class="activity-item">
          <div class="activity-dot" aria-hidden="true"></div>
          <div class="activity-content">
            <strong>${esc(x.aktivitas || "Aktivitas pengajuan")}</strong>
            <p>${esc(x.pengajuan_id || x.nomor_pengajuan || "-")}</p>
          </div>
          <time datetime="${esc(getActivityTimestamp(x))}">
            <span class="activity-date">${dt.date}</span>
            <span class="activity-time">${dt.time} WIB</span>
          </time>
        </div>
      `;
    })
    .join("");
}

async function load() {
  setProfile();

  if ($("currentDate")) {
    $("currentDate").textContent = dateID(new Date());
  }

  try {
    /*
     * Statistik dan aktivitas berasal dari getDashboardKementerian.
     * Backend membaca aktivitas langsung dari sheet
     * `riwayat_pengajuan` dan mempertahankan `pengajuan_id`.
     * Tabel Tindak Lanjut tetap mengambil data dari getPengajuan.
     */
    const dashboardPromise = api("getDashboardKementerian");

    const token = session.session_token || session.token || "";
    if (!token) {
      throw new Error(
        "Session token SITARA tidak tersedia. Silakan login kembali."
      );
    }

    const followUpPromise = fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getPengajuan",
        session_token: token,
      }),
    });

    const [dashboardResult, followUpResponse] = await Promise.all([
      dashboardPromise,
      followUpPromise,
    ]);

    if (!dashboardResult.success) {
      throw new Error(
        dashboardResult.message || "Gagal memuat dashboard."
      );
    }

    if (!followUpResponse.ok) {
      throw new Error(
        "Server pengajuan mengembalikan HTTP " + followUpResponse.status
      );
    }

    const followUpResult = await followUpResponse.json();

    if (!followUpResult.success || !Array.isArray(followUpResult.data)) {
      throw new Error(
        followUpResult.message || "Data tindak lanjut tidak tersedia."
      );
    }

    const d = dashboardResult.data || {};
    const stat = d.statistik || {};
    const activities = Array.isArray(d.aktivitas_terbaru)
      ? d.aktivitas_terbaru
      : [];

    /*
     * getPengajuan sudah memfilter data berdasarkan kementerian dari
     * session yang sedang login. Kita hanya mengambil tiga status
     * yang memang ditampilkan pada Tindak Lanjut:
     * - selesai/disetujui/diterima
     * - revisi
     * - ditolak
     */
    const ministryItems = followUpResult.data.filter(isOwnedByCurrentMinistry);
    const followUpItems = ministryItems.filter(isDashboardFollowUpItem);

    // Jangan gunakan agregat statistik backend untuk angka revisi karena
    // agregat tersebut belum membedakan unit yang menjadi tujuan revisi.
    setStats(stat, ministryItems);
    renderItems(followUpItems, activities);
    renderActivities(activities, followUpResult.data);
  } catch (e) {
    console.error("Dashboard Kemenhubker gagal dimuat:", e);

    if ($("recentList")) {
      $("recentList").innerHTML =
        `<tr><td colspan="5" class="empty-state">${esc(
          e.message || "Gagal memuat data."
        )}</td></tr>`;
    }

    if ($("activityList")) {
      $("activityList").innerHTML =
        '<div class="empty-state">Belum ada aktivitas.</div>';
    }
  }
}

$("logoutButton")?.addEventListener("click", () => {
  if (!confirm("Apakah kamu yakin ingin keluar dari SITARA?")) return;
  sessionStorage.removeItem("sitaraUser");
  location.href = "../../login/index.html";
});

load();
