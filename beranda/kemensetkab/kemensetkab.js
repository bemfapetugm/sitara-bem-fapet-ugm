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

    setText("totalPengajuan", statistik.total_pengajuan ?? 0);
    setText("totalProses", statistik.sedang_diproses ?? 0);
    setText("totalRevisi", statistik.perlu_revisi ?? 0);
    setText("totalDokumen", statistik.total_dokumen ?? 0);

    const tableBody = document.getElementById("pengajuanTerbaruBody");
    if (!tableBody) return;

    const pengajuan = Array.isArray(data?.pengajuan_terbaru)
        ? data.pengajuan_terbaru
        : [];

    if (!pengajuan.length) {
        tableBody.innerHTML = `
            <tr><td colspan="5" class="empty-state">Belum ada pengajuan masuk.</td></tr>
        `;
        return;
    }

    tableBody.innerHTML = pengajuan.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.nomor_pengajuan || "-")}</strong></td>
            <td>${escapeHtml(item.asal_kementerian || "-")}</td>
            <td>${getJenisBadge(item.jenis)}</td>
            <td>${getStatusBadge(item.status_label || item.status)}</td>
        </tr>
    `).join("");
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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
        [/^diajukan$/, ["Diajukan", "diajukan"]],
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

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
