const API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";

const sessionData = sessionStorage.getItem("sitaraUser");

if (!sessionData) {
    window.location.href = "../../login/index.html";
} else {
    try {
        const user = JSON.parse(sessionData);
        const role = String(user.role || "").toLowerCase();
        if (role !== "mensetkab") {
            alert("Anda tidak memiliki akses ke dashboard Mensetkab.");
            sessionStorage.removeItem("sitaraUser");
            window.location.href = "../../login/index.html";
        } else {
            initialize(user);
        }
    } catch (e) {
        sessionStorage.removeItem("sitaraUser");
        window.location.href = "../../login/index.html";
    }
}

async function post(action, extra = {}) {
    const u = JSON.parse(sessionStorage.getItem("sitaraUser") || "{}");
    const payload = {
        action,
        session_token: u.session_token || u.token || "",
        ...extra
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    });

    return await response.json();
}

function initialize(user) {
    const name = user.nama_lengkap || user.nama || "Menteri Sekretariat Kabinet";
    const avatar = initials(name, "MS");

    document.getElementById("profileName").textContent = name;
    document.getElementById("profileRole").textContent = "Mensetkab";
    document.getElementById("profileAvatar").textContent = avatar;
    document.getElementById("topbarAvatar").textContent = avatar;
    document.getElementById("welcomeTitle").textContent = name;
    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    document.getElementById("logoutButton").addEventListener("click", logout);
    loadDashboard();
}

async function loadDashboard() {
    try {
        const result = await post("getDashboardMensetkab");
        if (!result.success) {
            throw new Error(result.message || "Gagal memuat dashboard.");
        }

        const d = result.data || {};

        document.getElementById("statMenunggu").textContent = d.total_menunggu_mensetkab ?? 0;
        document.getElementById("statProses").textContent = d.total_sedang_diproses ?? 0;
        document.getElementById("statRevisi").textContent = d.total_revisi ?? 0;
        document.getElementById("statSelesai").textContent = d.total_selesai ?? 0;

        renderLatest(d.pengajuan_terbaru || []);
        renderActivities(d.aktivitas_terbaru || []);
    } catch (e) {
        console.error(e);
        const msg = escapeHtml(e.message || "Gagal memuat data.");
        document.getElementById("latestBody").innerHTML =
            `<tr><td colspan="5" class="empty-state">${msg}</td></tr>`;
        document.getElementById("activity").innerHTML =
            `<div class="empty-state">${msg}</div>`;
    }
}

function renderLatest(rows) {
    const body = document.getElementById("latestBody");

    if (!rows.length) {
        body.innerHTML =
            '<tr><td colspan="5" class="empty-state">Belum ada pengajuan yang menunggu persetujuan.</td></tr>';
        return;
    }

    body.innerHTML = rows.slice(0, 10).map(x => `
        <tr>
            <td>
                <strong>${escapeHtml(x.nomor_pengajuan || x.pengajuan_id || "-")}</strong>
                <small>${escapeHtml(x.judul || "-")}</small>
            </td>
            <td>${escapeHtml(x.asal_kementerian || "-")}</td>
            <td><span class="type-badge ${typeClass(x.jenis)}">${escapeHtml(x.jenis || "-")}</span></td>
            <td>${statusBadge(x.status_label || x.status || "-")}</td>
            <td><a class="btn-open" href="pengajuan/detail/index.html?id=${encodeURIComponent(x.pengajuan_id || "")}">Buka</a></td>
        </tr>
    `).join("");
}

function renderActivities(rows) {
    const box = document.getElementById("activity");

    // Dashboard Mensetkab hanya menampilkan aktivitas yang memang
    // melibatkan Mensetkab/Kemensetkab/Ketua BEM, bukan seluruh riwayat.
    const relevant = (rows || []).filter(isRelevantMensetkabActivity);

    if (!relevant.length) {
        box.innerHTML = '<div class="empty-state">Belum ada aktivitas yang relevan.</div>';
        return;
    }

    box.innerHTML = relevant.slice(0, 8).map(x => `
        <div class="activity-item">
            <div class="activity-dot"></div>
            <div>
                <strong>${escapeHtml(x.aktivitas || "-")}</strong>
                <p>${escapeHtml((x.dari_unit || "-") + " → " + (x.ke_unit || "-"))} · ${statusBadge(x.status || "-")}</p>
            </div>
            <time>${formatDate(x.waktu)}</time>
        </div>
    `).join("");
}

function isRelevantMensetkabActivity(x) {
    const action = String(x.aktivitas || x.aksi || "").toLowerCase();
    const from = String(x.dari_unit || "").toLowerCase();
    const to = String(x.ke_unit || "").toLowerCase();
    const status = String(x.status || x.status_label || "").toLowerCase();

    // Hanya aktivitas keputusan/lanjutan yang relevan bagi Mensetkab.
    // Aktivitas awal seperti "Pengajuan dibuat", "diperbaiki",
    // atau "dikirim ulang" tidak ditampilkan.
    const decisionOrForwarding =
        action.includes("diverifikasi dan diteruskan ke mensetkab") ||
        action.includes("menunggu persetujuan mensetkab") ||
        action.includes("disetujui mensetkab") ||
        action.includes("disetujui dan diteruskan ke ketua bem") ||
        action.includes("diteruskan ke ketua bem") ||
        action.includes("disetujui ketua bem") ||
        action.includes("diteruskan ke kemensetkab") ||
        status.includes("menunggu persetujuan mensetkab") ||
        status.includes("menunggu ketua") ||
        status.includes("disetujui ketua");

    const hasRelevantActor =
        from.includes("mensetkab") ||
        to.includes("mensetkab") ||
        from.includes("menteri sekretariat kabinet") ||
        to.includes("menteri sekretariat kabinet") ||
        from.includes("ketua bem") ||
        to.includes("ketua bem");

    return decisionOrForwarding && hasRelevantActor;
}

function typeClass(value) {
    const s = String(value || "").toLowerCase();
    if (s.includes("proposal")) return "type-proposal";
    if (s.includes("lpj")) return "type-lpj";
    if (s.includes("surat")) return "type-surat";
    if (s.includes("rab") || s.includes("anggaran")) return "type-rab";
    if (s.includes("form")) return "type-form";
    return "type-other";
}

function statusBadge(status) {
    const s = String(status || "-").toLowerCase();
    let cls = "status-info";

    if (s.includes("selesai") || s.includes("disetujui")) {
        cls = "status-success";
    } else if (s.includes("revisi") || s.includes("menunggu")) {
        cls = "status-warning";
    } else if (s.includes("tolak")) {
        cls = "status-danger";
    }

    return `<span class="status-badge ${cls}">${escapeHtml(status)}</span>`;
}

function initials(name, fallback) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    return parts.length
        ? parts.slice(0, 2).map(x => x[0]).join("").toUpperCase()
        : fallback;
}

function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    }[c]));
}

function logout() {
    if (!confirm("Apakah Anda yakin ingin keluar dari SITARA?")) return;
    sessionStorage.removeItem("sitaraUser");
    window.location.href = "../../login/index.html";
}
