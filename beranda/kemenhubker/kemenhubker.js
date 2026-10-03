// ==========================================
// SITARA
// KEMENTERIAN HUBUNGAN KERJA SAMA
// DASHBOARD JAVASCRIPT
// ==========================================



// ==========================================
// 1. CEK SESSION
// ==========================================

const sessionData =
    sessionStorage.getItem("sitaraUser");


if (!sessionData) {

    window.location.href =
        "../../login/index.html";

} else {

    try {

        const user =
            JSON.parse(sessionData);

        initializeKemenhubker(user);

    } catch (error) {

        console.error(
            "Session error:",
            error
        );

        sessionStorage.removeItem(
            "sitaraUser"
        );

        window.location.href =
            "../../login/index.html";

    }

}



// ==========================================
// 2. INISIALISASI
// ==========================================

function initializeKemenhubker(user) {

    displayCurrentDate();

    displayUserProfile(user);

    displayWelcome(user);

    initializeLogout();

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

        mensetkab: "MenSetKab",

        menkeu: "MenKeu",

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
        getInitials(name);


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
        "Selamat Datang, " +
        name + "!";

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
                "../../login/index.html";

        }
    );

}