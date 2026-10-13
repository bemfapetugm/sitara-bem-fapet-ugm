const API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";

const sessionData = sessionStorage.getItem("sitaraUser");

if (!sessionData) {
    window.location.href = "../../login/index.html";
} else {
    let user = null;

    // Hanya kegagalan membaca data sesi yang dianggap sebagai sesi rusak.
    // Kesalahan saat inisialisasi UI tidak boleh otomatis menghapus sesi/login.
    try {
        user = JSON.parse(sessionData);
    } catch (e) {
        console.error("Data sesi SITARA tidak valid:", e);
        sessionStorage.removeItem("sitaraUser");
        window.location.href = "../../login/index.html";
    }

    if (user) {
        // Trim mencegah role seperti "mensetkab " ditolak karena spasi.
        const role = String(user.role || "").trim().toLowerCase();

        if (role !== "mensetkab") {
            console.error("Role tidak sesuai untuk dashboard Mensetkab:", user.role);
            alert("Anda tidak memiliki akses ke dashboard Mensetkab.");
            sessionStorage.removeItem("sitaraUser");
            window.location.href = "../../login/index.html";
        } else {
            // Jangan bungkus initialize() dengan catch parsing sesi.
            // Error elemen UI tidak boleh membuat pengguna ter-logout otomatis.
            initialize(user);
        }
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

    setTextIfExists("profileName", name);
    setTextIfExists("profileRole", "Mensetkab");
    setTextIfExists("profileAvatar", avatar);
    setTextIfExists("topbarAvatar", avatar);
    setTextIfExists("welcomeTitle", name);
    setTextIfExists(
        "currentDate",
        new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        })
    );

    const logoutButton = document.getElementById("logoutBtn");
    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    } else {
        console.warn('Elemen "#logoutBtn" tidak ditemukan pada halaman Mensetkab.');
    }

    loadDashboard();
}

function setTextIfExists(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Elemen "#${id}" tidak ditemukan pada halaman Mensetkab.`);
    }
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
        renderStatusDistribution(d);
        renderMonthlyChart(d.rekap_bulanan || []);
        refreshIcons();
    } catch (e) {
        console.error(e);
        const msg = escapeHtml(e.message || "Gagal memuat data.");
        document.getElementById("latestBody").innerHTML =
            `<tr><td colspan="7" class="empty-state">${msg}</td></tr>`;
        document.getElementById("activity").innerHTML =
            `<tr><td colspan="4" class="empty-state">${msg}</td></tr>`;
        document.getElementById("monthlyChart").innerHTML = `<div class="empty-state">${msg}</div>`;
    }
}

function renderLatest(rows) {
    const body = document.getElementById("latestBody");

    if (!rows.length) {
        body.innerHTML =
            '<tr><td colspan="7" class="empty-state"><span class="empty-state-icon"><i data-lucide="inbox"></i></span><strong>Belum ada pengajuan</strong><small>Saat ini belum ada pengajuan yang menunggu persetujuan.</small></td></tr>';
        refreshIcons();
        return;
    }

    body.innerHTML = rows.slice(0, 10).map((x, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(x.judul || "-")}</strong><small>${escapeHtml(x.nomor_pengajuan || x.pengajuan_id || "-")}</small></td>
            <td>${escapeHtml(x.asal_kementerian || "-")}</td>
            <td><span class="type-badge ${typeClass(x.jenis)}">${escapeHtml(x.jenis || "-")}</span></td>
            <td>${escapeHtml(formatDate(x.tanggal_pengajuan))}</td>
            <td>${statusBadge(x.status_label || x.status || "-")}</td>
            <td><a class="btn-open" href="pengajuan/detail/index.html?id=${encodeURIComponent(x.pengajuan_id || "")}">Detail</a></td>
        </tr>
    `).join("");
}

function renderActivities(rows) {
    const box = document.getElementById("activity");
    const relevant = (rows || []).filter(isRelevantMensetkabActivity);

    if (!relevant.length) {
        box.innerHTML = '<tr><td colspan="4" class="empty-state"><span class="empty-state-icon"><i data-lucide="file-text"></i></span><small>Belum ada aktivitas terbaru.</small></td></tr>';
        refreshIcons();
        return;
    }

    box.innerHTML = relevant.slice(0, 8).map(x => `
        <tr>
            <td>${escapeHtml(formatDateTime(x.waktu))}</td>
            <td><strong>${escapeHtml(x.aktivitas || "-")}</strong></td>
            <td>${escapeHtml(x.pengajuan_id || "-")}</td>
            <td>${escapeHtml([x.dari_unit, x.ke_unit].filter(Boolean).join(" → ") || x.catatan || x.status || "-")}</td>
        </tr>
    `).join("");
}

function renderStatusDistribution(data) {
    const values = [
        { label: "Menunggu Persetujuan", value: Number(data.total_menunggu_mensetkab) || 0, key: "waiting" },
        { label: "Sedang Diproses", value: Number(data.total_sedang_diproses) || 0, key: "processing" },
        { label: "Perlu Revisi", value: Number(data.total_revisi) || 0, key: "revision" },
        { label: "Selesai", value: Number(data.total_selesai) || 0, key: "complete" }
    ];
    const total = values.reduce((sum, item) => sum + item.value, 0);
    setTextIfExists("statusTotal", total.toLocaleString("id-ID"));

    const colors = { waiting: "#D98187", processing: "#EBCB9B", revision: "#F0644B", complete: "#62B68F" };
    let angle = 0;
    const stops = values.map(item => {
        const share = total ? item.value / total * 100 : 0;
        const start = angle;
        angle += share;
        return `${colors[item.key]} ${start}% ${angle}%`;
    });
    const donut = document.getElementById("statusDonut");
    if (donut) {
        donut.style.background = total
            ? `conic-gradient(${stops.join(", ")})`
            : "conic-gradient(#E9E3DE 0% 100%)";
        donut.setAttribute("aria-label", values.map(v => `${v.label}: ${v.value}`).join(", "));
    }

    const legend = document.getElementById("statusLegend");
    if (legend) {
        legend.innerHTML = values.map(item => {
            const percent = total ? Math.round(item.value / total * 100) : 0;
            return `<div class="legend-row"><span class="legend-dot ${item.key}"></span><span>${item.label}</span><strong>${item.value.toLocaleString("id-ID")}</strong><small>${percent}%</small></div>`;
        }).join("");
    }
}

function renderMonthlyChart(months) {
    const box = document.getElementById("monthlyChart");
    if (!box) return;
    const data = Array.isArray(months) ? months : [];
    const labels = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    const values = labels.map((label, index) => {
        const match = data.find(item => Number(item.month) === index || String(item.label || "").toLowerCase() === label.toLowerCase());
        return match ? Math.max(0, Number(match.total) || 0) : 0;
    });
    const maxValue = Math.max(4, ...values);
    const width = 560, height = 180, left = 28, right = 8, top = 12, bottom = 30;
    const plotW = width - left - right, plotH = height - top - bottom;
    const points = values.map((v, i) => {
        const x = left + (plotW / 11) * i;
        const y = top + plotH - (v / maxValue) * plotH;
        return { x, y, value: v, label: labels[i] };
    });
    const grid = Array.from({length: 5}, (_, i) => {
        const y = top + (plotH / 4) * i;
        const value = Math.ceil(maxValue) - Math.round((Math.ceil(maxValue) / 4) * i);
        return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" class="chart-grid-line"/><text x="${left-8}" y="${y+4}" text-anchor="end" class="chart-axis-label">${Math.max(0,value)}</text>`;
    }).join("");
    const path = points.map((p,i) => `${i ? "L":"M"} ${p.x} ${p.y}`).join(" ");
    const dots = points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.2" class="chart-point"><title>${p.label}: ${p.value}</title></circle><text x="${p.x}" y="${height-9}" text-anchor="middle" class="chart-axis-label">${p.label}</text>`).join("");
    box.innerHTML = `<svg class="monthly-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Rekap jumlah pengajuan yang diverifikasi per bulan">${grid}<path d="${path}" class="chart-line"/>${dots}</svg>`;
}

function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) :
        date.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
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
