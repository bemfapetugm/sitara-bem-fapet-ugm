// ==========================================
// SITARA - ADMIN DASHBOARD JAVASCRIPT
// ==========================================


// ==========================================
// 1. CEK SESI DAN HAK AKSES ADMIN
// ==========================================

const userSession = sessionStorage.getItem("sitaraUser");

// Jika belum login, arahkan ke halaman login
if (!userSession) {

    window.location.href = "../../login/index.html";

} else {

    try {

        const user = JSON.parse(userSession);

        const role = String(user.role || "")
            .trim()
            .toLowerCase();

        // Pastikan hanya Admin yang dapat membuka dashboard ini
        if (role !== "admin") {

            const roleRoutes = {

                anggota: "../anggota/index.html",

                pimpinan: "../pimpinan/index.html"

            };

            const destination = roleRoutes[role];

            if (destination) {

                window.location.href = destination;

            } else {

                sessionStorage.removeItem("sitaraUser");

                window.location.href = "../../login/index.html";

            }

        } else {

            // Jika role admin, jalankan dashboard
            initializeAdminDashboard(user);

        }

    } catch (error) {

        console.error("Session error:", error);

        sessionStorage.removeItem("sitaraUser");

        window.location.href = "../../login/index.html";

    }

}


// ==========================================
// 2. INISIALISASI ADMIN DASHBOARD
// ==========================================

function initializeAdminDashboard(user) {

    // Tampilkan tanggal
    displayCurrentDate();

    // Tampilkan identitas Admin
    displayAdminProfile(user);

    // Aktifkan tombol logout
    initializeLogout();

}


// ==========================================
// 3. MENAMPILKAN TANGGAL OTOMATIS
// ==========================================

function displayCurrentDate() {

    const dateElement = document.getElementById("currentDate");

    if (!dateElement) return;

    const today = new Date();

    const formattedDate = today.toLocaleDateString("id-ID", {

        weekday: "long",

        day: "numeric",

        month: "long",

        year: "numeric"

    });

    dateElement.textContent = formattedDate;

}


// ==========================================
// 4. MENAMPILKAN IDENTITAS ADMIN
// ==========================================

function displayAdminProfile(user) {

    // Ambil nama dari data sesi
    const adminName =
        user.nama ||
        user.name ||
        user.full_name ||
        user.nama_lengkap ||
        "Administrator";

    // Ambil role
    const adminRole = String(user.role || "Admin")
        .trim();

    // Ambil inisial nama
    const initial = adminName
        .trim()
        .charAt(0)
        .toUpperCase();

    // Elemen identitas Admin
    const profileName = document.querySelector(".profile-info h4");

    const profileRole = document.querySelector(".profile-info p");

    const profileAvatar = document.querySelector(".profile-avatar");

    const topbarAvatar = document.querySelector(".topbar-avatar");


    // Tampilkan nama Admin
    if (profileName) {

        profileName.textContent = adminName;

    }

    // Tampilkan role Admin
    if (profileRole) {

        profileRole.textContent = adminRole;

    }

    // Tampilkan inisial pada avatar sidebar
    if (profileAvatar) {

        profileAvatar.textContent = initial;

    }

    // Tampilkan inisial pada avatar header
    if (topbarAvatar) {

        topbarAvatar.textContent = initial;

    }

}


// ==========================================
// 5. SISTEM LOGOUT
// ==========================================

function initializeLogout() {

    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", function () {

        const confirmation = confirm(
            "Apakah kamu yakin ingin keluar dari SITARA?"
        );

        if (!confirmation) return;

        // Hapus sesi pengguna
        sessionStorage.removeItem("sitaraUser");

        // Arahkan kembali ke halaman login
        window.location.href = "../../login/index.html";

    });

}