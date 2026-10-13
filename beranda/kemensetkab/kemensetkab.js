// ==========================================
// SITARA
// KEMENTERIAN SEKRETARIAT KABINET
// DASHBOARD JAVASCRIPT
// ==========================================

// ==========================================
// API CONFIG
// ==========================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


// ==========================================
// 1. CEK SESSION
// ==========================================

const sessionData =
    sessionStorage.getItem("sitaraUser");


if (!sessionData) {

    window.location.href =
        "/login/index.html";

} else {

    try {

        const user =
            JSON.parse(sessionData);


        if (
            user.role !== "kementerian" ||
            user.kementerian_id !== "KEM001"
        ) {

            alert(
                "Anda tidak memiliki akses ke dashboard Kemensetkab."
            );


            sessionStorage.removeItem(
                "sitaraUser"
            );


            window.location.href =
                "/login/index.html";

        }
        else {

            initializeKemensetkab(user);

        }


    } catch (error) {

        console.error(
            "Session error:",
            error
        );


        sessionStorage.removeItem(
            "sitaraUser"
        );


        window.location.href =
            "/login/index.html";

    }

}

// ==========================================
// 2. INISIALISASI
// ==========================================

function initializeKemensetkab(user) {

    displayCurrentDate();

    displayUserProfile(user);

    displayWelcome(user);

    initializeLogout();

    loadDashboardKemensetkab(user);
    initializeChartPeriod();

}

// ==========================================
// LOAD DASHBOARD KEMENSETKAB
// ==========================================

async function loadDashboardKemensetkab(user) {

    try {


        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",

                    body: JSON.stringify({

                        action:
                        "getDashboardKemensetkab",

                        session_token:
                        user.session_token

                    })

                }
            );


        const result =
            await response.json();



        console.log(
            "Dashboard Kemensetkab:",
            result
        );



        if (!result.success) {

            console.error(
                result.message
            );

            return;

        }


        renderDashboardKemensetkab(
            result.data
        );



    }
    catch(error){

        console.error(
            "Load dashboard error:",
            error
        );

    }

}

// ==========================================
// 3. TANGGAL
// ==========================================

function displayCurrentDate() {

    const element =
        document.getElementById(
            "currentDate"
        );


    if (!element) return;


    const today =
        new Date();


    const formattedDate =
        today.toLocaleDateString(
            "id-ID",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );


    element.textContent =
        formattedDate;

}



// ==========================================
// 4. IDENTITAS USER
// ==========================================

function displayUserProfile(user) {

    // ======================================
    // NAMA USER
    // ======================================

    const name =
        user.nama_lengkap ||
        user.nama ||
        user.name ||
        user.full_name ||
        "Pengguna";


    // ======================================
    // ROLE USER
    // ======================================

    let role =
        String(
            user.role || "kementerian"
        )
            .trim()
            .toLowerCase();


    // Format role agar lebih rapi
    const roleLabel = {

        admin: "Admin",

        pimpinan: "Pimpinan",

        menko: "Menko",

        menteri: "Menteri",

        kementerian: "Kementerian",

        mensetkab: "Menteri Sekretariat Kabinet",

        menkeu: "Kementerian Keuangan",

        anggota: "Anggota",

        tamu: "Tamu"

    };


    role =
        roleLabel[role] ||
        "Pengguna";


    // ======================================
    // INISIAL USER
    // ======================================

    const initial =
        String(user.kementerian_id || "").trim() === "KEM001"
            ? "KS"
            : getInitials(name);


    // ======================================
    // AMBIL ELEMEN
    // ======================================

    const profileName =
        document.getElementById(
            "profileName"
        );


    const profileRole =
        document.getElementById(
            "profileRole"
        );


    const profileAvatar =
        document.getElementById(
            "profileAvatar"
        );


    const topbarAvatar =
        document.getElementById(
            "topbarAvatar"
        );


    // ======================================
    // TAMPILKAN NAMA
    // ======================================

    if (profileName) {

        profileName.textContent =
            name;

    }


    // ======================================
    // TAMPILKAN ROLE
    // ======================================

    if (profileRole) {

        profileRole.textContent =
            role;

    }


    // ======================================
    // TAMPILKAN INISIAL SIDEBAR
    // ======================================

    if (profileAvatar) {

        profileAvatar.textContent =
            initial;

    }


    // ======================================
    // TAMPILKAN INISIAL TOPBAR
    // ======================================

    if (topbarAvatar) {

        topbarAvatar.textContent =
            initial;

    }

}



// ==========================================
// 5. GENERATE INISIAL
// ==========================================

function getInitials(name) {

    if (!name) return "P";


    const parts =
        String(name)
            .trim()
            .split(/\s+/);


    // Jika hanya satu kata
    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }


    // Ambil dua kata pertama
    return parts
        .slice(0, 2)
        .map(function (part) {

            return part
                .charAt(0)
                .toUpperCase();

        })
        .join("");

}



// ==========================================
// 6. WELCOME
// ==========================================

function displayWelcome(user) {

    const name =
        user.nama_lengkap ||
        user.nama ||
        user.name ||
        "Pengguna";


    const welcomeTitle =
        document.getElementById(
            "welcomeTitle"
        );


    if (!welcomeTitle) return;


    welcomeTitle.textContent =
        "Selamat Datang, Kementerian Sekretariat Kabinet!";

}



// ==========================================
// 7. LOGOUT
// ==========================================

function initializeLogout() {

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (!logoutButton) return;


    logoutButton.addEventListener(
        "click",
        function () {

            const confirmation =
                confirm(
                    "Apakah kamu yakin ingin keluar dari SITARA?"
                );


            if (!confirmation) return;


            sessionStorage.removeItem(
                "sitaraUser"
            );


            window.location.href =
                "/login/index.html";

        }
    );

}

// ==========================================
// RENDER DASHBOARD KEMENSETKAB
// ==========================================

function renderDashboardKemensetkab(data) {
    const statistik = data?.statistik || {};

    // ==========================================
    // 1. STATISTIK UTAMA KEMENSETKAB
    // ==========================================
    // Menunggu Verifikasi = pengajuan yang menunggu verifikasi Kemensetkab
    // Perlu Perbaikan = revisi dari Mensetkab yang kembali ke Kemensetkab
    // Selesai = dokumen final Fakultas sudah selesai diproses Kemensetkab
    // Total Dokumen = dokumen yang tersimpan di SITARA
    setText("totalMenungguVerifikasi", statistik.menunggu_verifikasi ?? 0);
    setText("totalPerbaikan", statistik.perlu_revisi ?? 0);
    setText("totalSelesai", statistik.selesai ?? statistik.selesai_fakultas ?? 0);
    setText("totalDokumen", statistik.total_dokumen ?? 0);

    // ==========================================
    // 2. BADGE SIDEBAR
    // ==========================================
    const notifikasi = data?.notifikasi || {};
    setNavBadge("badgePengajuanMasuk", notifikasi.pengajuan_masuk);
    setNavBadge("badgePengajuanDpm", notifikasi.dpm);
    setNavBadge("badgeFakultas", notifikasi.fakultas);
    setNavBadge("badgePerluRevisi", notifikasi.perlu_revisi);

    // ==========================================
    // 3. GRAFIK STATISTIK PER SEMESTER
    // ==========================================
    window.kemensetkabMonthlyData = Array.isArray(data?.statistik_bulanan)
        ? data.statistik_bulanan
        : [];

    renderMonthlyChartForSemester(
        window.kemensetkabMonthlyData,
        getDefaultSemester()
    );

    // ==========================================
    // 4. DONUT JUMLAH PENGAJUAN PER KEMENTERIAN
    // ==========================================
    renderMinistryDonut(data?.pengajuan_per_kementerian || []);

    // ==========================================
    // 5. TABEL PENGAJUAN TERBARU
    // ==========================================
    const tableBody = document.getElementById("pengajuanTerbaruBody");
    if (!tableBody) return;

    const pengajuan = Array.isArray(data?.pengajuan_terbaru)
        ? data.pengajuan_terbaru
        : [];

    // Dashboard hanya menampilkan pekerjaan yang membutuhkan perhatian Kemensetkab.
    const relevantPengajuan = pengajuan.filter(item => {
        const status = normalizeStatus(item.status_label || item.status);
        const tahap = normalizeStatus(item.tahap_sekarang);

        const menungguVerifikasi =
            (
                status === "diajukan" ||
                status === "menunggu verifikasi" ||
                status === "perlu verifikasi"
            ) &&
            (tahap === "kemensetkab" || tahap === "biro agata" || tahap === "kem001");

        // Revisi yang dikerjakan oleh kementerian pengusul tidak
        // ditampilkan di dashboard Kemensetkab karena prosesnya
        // sedang berada di pihak kementerian tersebut.
        //
        // Yang ditampilkan sebagai pekerjaan revisi Kemensetkab
        // adalah "Perlu Revisi" yang sudah kembali ke KEM001
        // setelah diminta oleh Mensetkab.
        const menungguPerbaikanKemensetkab =
            status === "perlu revisi" &&
            tahap === "kem001";

        return menungguVerifikasi || menungguPerbaikanKemensetkab;
    });

    if (!relevantPengajuan.length) {
        tableBody.innerHTML = `
            <tr><td colspan="6" class="empty-state">Tidak ada pengajuan yang perlu ditindaklanjuti.</td></tr>
        `;
        return;
    }

    tableBody.innerHTML = relevantPengajuan.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td class="table-title" title="${escapeHtml(item.judul || item.perihal || "-")}">
                ${escapeHtml(item.judul || item.perihal || "-")}
            </td>
            <td class="table-date">${formatTanggalMasuk(item.tanggal_masuk || item.tanggal || item.tanggal_pengajuan || item.updated_at)}</td>
            <td class="table-ministry">${escapeHtml(item.asal_kementerian || "-")}</td>
            <td>${getJenisBadge(item.jenis)}</td>
            <td>${getStatusBadge(item.status_label || item.status)}</td>
        </tr>
    `).join("");
}

function initializeChartPeriod() {
    const select = document.getElementById("chartPeriod");
    if (!select) return;

    const defaultSemester = getDefaultSemester();
    select.value = String(defaultSemester);
    updateChartPeriodLabel(defaultSemester);

    select.addEventListener("change", function () {
        const semester = Number(this.value) === 2 ? 2 : 1;
        updateChartPeriodLabel(semester);
        renderMonthlyChartForSemester(
            window.kemensetkabMonthlyData || [],
            semester
        );
    });
}

function getDefaultSemester() {
    // Semester aktif berdasarkan bulan saat dashboard dibuka.
    // Jan–Jun = Semester 1, Jul–Des = Semester 2.
    return new Date().getMonth() < 6 ? 1 : 2;
}

function updateChartPeriodLabel(semester) {
    const label = document.getElementById("chartPeriodLabel");
    if (!label) return;

    const year = new Date().getFullYear();
    label.textContent = semester === 1
        ? `Rekapitulasi pengajuan Januari – Juni ${year}.`
        : `Rekapitulasi pengajuan Juli – Desember ${year}.`;
}

function renderMonthlyChartForSemester(items, semester) {
    const safeAll = Array.isArray(items) ? items : [];

    // Backend terbaru mengirim 12 bulan dalam satu tahun.
    // Jika data lama hanya 6 bulan, tetap ditangani tanpa error.
    const safeItems = safeAll.filter(item => {
        const month = Number(item?.month);
        if (month >= 1 && month <= 12) {
            return semester === 1 ? month <= 6 : month >= 7;
        }
        return false;
    });

    if (safeItems.length === 0 && safeAll.length > 0) {
        // Fallback untuk response lama yang belum memiliki field month:
        const start = semester === 1 ? 0 : 6;
        safeItems.push(...safeAll.slice(start, start + 6));
    }

    renderMonthlyChart(safeItems);
}

function renderMonthlyChart(items) {
    const container = document.getElementById("monthlyChart");
    if (!container) return;

    if (!Array.isArray(items) || !items.length) {
        container.innerHTML = '<div class="chart-loading">Belum ada data statistik.</div>';
        return;
    }

    // Statistik yang ditampilkan hanya:
    // Total Pengajuan, Selesai, dan Ditolak.
    const safeItems = items.map(item => ({
        label: String(item?.label || "-"),
        total: Number(item?.total) || 0,
        selesai: Number(item?.selesai) || 0,
        ditolak: Number(item?.ditolak) || 0
    }));

    const maxValue = Math.max(1, ...safeItems.map(item => item.total));
    const scaleValues = [
        maxValue,
        Math.ceil(maxValue * 0.75),
        Math.ceil(maxValue * 0.5),
        Math.ceil(maxValue * 0.25),
        0
    ];

    container.innerHTML = `
        <div class="chart-scale">
            ${scaleValues.map(value => `<span>${value}</span>`).join("")}
        </div>

        <div class="monthly-bars">
            ${safeItems.map(item => {
                const values = [
                    ["total", item.total],
                    ["done", item.selesai],
                    ["rejected", item.ditolak]
                ];

                return `
                    <div class="month-column">
                        <div class="month-bars">
                            ${values.map(([cls, value]) => {
                                const height = item.total > 0
                                    ? (value / maxValue) * 100
                                    : 0;

                                return `
                                    <div class="bar-wrap">
                                        <div
                                            class="month-bar ${cls}"
                                            style="height:${height}%"
                                            title="${cls}: ${value}"
                                        ></div>
                                    </div>
                                `;
                            }).join("")}
                        </div>
                        <span class="month-label">${escapeHtml(item.label)}</span>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderMinistryDonut(items) {
    const donut = document.getElementById("ministryDonut");
    const legend = document.getElementById("ministryLegend");
    const totalEl = document.getElementById("donutTotal");
    if (!donut || !legend) return;

    const safeItems = (Array.isArray(items) ? items : [])
        .map(item => ({
            nama: String(item?.nama || "Lainnya"),
            jumlah: Number(item?.jumlah) || 0
        }))
        .filter(item => item.jumlah > 0);

    const total = safeItems.reduce((sum, item) => sum + item.jumlah, 0);
    if (totalEl) totalEl.textContent = String(total);

    if (!safeItems.length || total <= 0) {
        donut.style.background = "conic-gradient(#e9e9e9 0 100%)";
        legend.innerHTML = '<div class="chart-loading">Belum ada data kementerian.</div>';
        return;
    }

    const colors = ["#5ac99a", "#ffd36a", "#ff7d88", "#aeb3bb", "#78a9e8", "#b78be8", "#8cc7b5"];
    let current = 0;
    const stops = safeItems.map((item, index) => {
        const start = current;
        current += (item.jumlah / total) * 100;
        return `${colors[index % colors.length]} ${start}% ${current}%`;
    });

    donut.style.background = `conic-gradient(${stops.join(", ")})`;

    legend.innerHTML = safeItems.map((item, index) => `
        <div class="ministry-item">
            <span class="dot" style="background:${colors[index % colors.length]}"></span>
            <span class="name" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</span>
            <span class="count">${item.jumlah}</span>
        </div>
    `).join("");
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Mengatur badge sidebar tanpa mengubah fungsi/menu lain.
// Nilai 0 atau kurang -> badge benar-benar disembunyikan.
// Nilai 1+ -> badge ditampilkan dengan jumlah aktual.
function setNavBadge(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
        el.textContent = "";
        el.hidden = true;
        return;
    }

    el.textContent = String(Math.floor(number));
    el.hidden = false;
}

function normalizeStatus(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\s+/g, " ");
}

function getStatusInfo(value) {
    const raw = String(value || "").trim();
    const normalized = normalizeStatus(raw);
    const map = [
        // Di Dashboard Kemensetkab, "Diajukan" berarti pengajuan
        // sudah masuk dan sedang menunggu proses verifikasi.
        [/^diajukan$/, ["Menunggu Verifikasi", "menunggu-verifikasi"]],
        [/menunggu verifikasi|perlu verifikasi/, ["Menunggu Verifikasi", "menunggu-verifikasi"]],
        [/perlu revisi|^revisi$/, ["Perlu Revisi", "perlu-revisi"]],
        [/menunggu persetujuan mensetkab|menunggu persetujuan menteri sekretariat kabinet/, ["Menunggu Persetujuan Mensetkab", "menunggu-mensetkab"]],
        [/menunggu persetujuan ketua bem|menunggu persetujuan ketua/, ["Menunggu Persetujuan Ketua BEM", "menunggu-ketua"]],
        [/diajukan ke dpm/, ["Diajukan ke DPM", "diajukan-dpm"]],
        [/disetujui dpm/, ["Disetujui DPM", "disetujui-dpm"]],
        [/diajukan ke fakultas/, ["Diajukan ke Fakultas", "diajukan-fakultas"]],
        [/disetujui fakultas/, ["Disetujui Fakultas", "disetujui-fakultas"]],
        [/menunggu dokumen fakultas/, ["Menunggu Dokumen Fakultas", "menunggu-fakultas"]],
        [/dalam proses|diproses|proses/, ["Dalam Proses", "dalam-proses"]],
        [/selesai/, ["Selesai", "selesai"]],
        [/ditolak|ditolak/, ["Ditolak", "ditolak"]]
    ];
    for (const [regex, info] of map) {
        if (regex.test(normalized)) return {label: info[0], cls: info[1]};
    }
    return {label: raw || "-", cls: "lainnya"};
}

function getStatusBadge(value) {
    const info = getStatusInfo(value);
    return `<span class="status-badge status-${info.cls}">${escapeHtml(info.label)}</span>`;
}

function getJenisBadge(value) {
    const raw = String(value || "").trim();
    const normalized = raw.toLowerCase();
    const label = normalized === "proposal" ? "Proposal" : normalized === "lpj" ? "LPJ" : (raw || "-");
    const cls = normalized === "proposal" ? "proposal" : normalized === "lpj" ? "lpj" : "lainnya";
    return `<span class="jenis-badge jenis-${cls}">${escapeHtml(label)}</span>`;
}

function formatTanggalMasuk(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return escapeHtml(String(value));
    }

    return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).replace(".", ":");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
