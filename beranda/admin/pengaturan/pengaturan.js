// ==========================================
// SITARA - PENGATURAN AKUN
// pengaturan.js
// ==========================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


// ==========================================
// ELEMENT
// ==========================================

const formProfilAkun =
    document.getElementById("formProfilAkun");

const formKeamanan =
    document.getElementById("formKeamanan");

const namaLengkap =
    document.getElementById("nama_lengkap");

const email =
    document.getElementById("email");

const nim =
    document.getElementById("nim");

const noTelepon =
    document.getElementById("no_telepon");

const kementerian =
    document.getElementById("kementerian");

const role =
    document.getElementById("role");

const btnSimpanProfil =
    document.getElementById("btnSimpanProfil");

const passwordSaatIni =
    document.getElementById("password_saat_ini");

const passwordBaru =
    document.getElementById("password_baru");

const konfirmasiPassword =
    document.getElementById("konfirmasi_password");

const btnUbahPassword =
    document.getElementById("btnUbahPassword");

const currentDate =
    document.getElementById("currentDate");

const logoutButton =
    document.getElementById("logoutButton");


// ==========================================
// SESSION
// ==========================================

function getSessionUser() {

    try {

        const session =
            sessionStorage.getItem("sitaraUser");

        if (!session) {
            return null;
        }

        return JSON.parse(session);

    } catch (error) {

        console.error(
            "Gagal membaca session:",
            error
        );

        return null;
    }
}


// ==========================================
// VALIDASI ADMIN
// ==========================================

function checkAdminSession() {

    const user =
        getSessionUser();

    if (!user) {

        alert(
            "Sesi login tidak ditemukan. Silakan login kembali."
        );

        window.location.href =
            "/login/index.html";

        return null;
    }

    const userRole =
        String(user.role || "")
            .trim()
            .toLowerCase();

    if (userRole !== "admin") {

        const routes = {

            anggota:
                "../anggota/index.html",

            pimpinan:
                "../pimpinan/index.html"

        };

        window.location.href =
            routes[userRole] ||
            "../../../login/index.html";

        return null;
    }

    if (!user.session_token) {

        alert(
            "Token sesi tidak ditemukan. Silakan login kembali."
        );

        sessionStorage.removeItem("sitaraUser");

        window.location.href =
            "/login/index.html";

        return null;
    }

    return user;
}


// ==========================================
// TAMPILKAN SHELL ADMIN
// ==========================================

function initializeAdminShell(user) {

    const adminName =
        user.nama_lengkap ||
        user.nama ||
        "admin";

    const adminRole =
        String(user.role || "admin")
            .trim();

    const initial =
        adminName
            .trim()
            .charAt(0)
            .toUpperCase();

    // Tanggal

    if (currentDate) {

        currentDate.textContent =
            new Date().toLocaleDateString(
                "id-ID",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );
    }

    // Profil sidebar

    const profileName =
        document.querySelector(
            ".profile-info h4"
        );

    const profileRole =
        document.querySelector(
            ".profile-info p"
        );

    const profileAvatar =
        document.querySelector(
            ".profile-avatar"
        );

    const topbarAvatar =
        document.querySelector(
            ".topbar-avatar"
        );

    if (profileName) {

        profileName.textContent =
            adminName;
    }

    if (profileRole) {

        profileRole.textContent =
            adminRole;
    }

    if (profileAvatar) {

        profileAvatar.textContent =
            initial;
    }

    if (topbarAvatar) {

        topbarAvatar.textContent =
            initial;
    }
}


// ==========================================
// API REQUEST
// ==========================================

async function apiRequest(payload) {

    const response =
        await fetch(
            API_URL,
            {
                method: "POST",

                body: JSON.stringify(
                    payload
                )
            }
        );

    const result =
        await response.json();

    return result;
}


// ==========================================
// LOAD PROFILE
// ==========================================

async function loadProfile() {

    const user =
        checkAdminSession();

    if (!user) return;

    try {

        const result =
            await apiRequest({

                action:
                    "getProfile",

                session_token:
                    user.session_token

            });

        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal mengambil data profil."
            );
        }

        const profile =
            result.data;

        // ======================================
        // ISI FORM
        // ======================================

        if (namaLengkap) {

            namaLengkap.value =
                profile.nama_lengkap || "";
        }

        if (email) {

            email.value =
                profile.email || "";
        }

        if (nim) {

            nim.value =
                profile.nim || "";
        }

        if (noTelepon) {

            noTelepon.value =
                profile.no_telepon || "";
        }

        if (kementerian) {

            kementerian.value =
                profile.nama_kementerian || "";
        }

        if (role) {

            role.value =
                profile.role || "admin";
        }

        // ======================================
        // UPDATE SESSION FRONTEND
        // ======================================

        const updatedUser = {

            ...user,

            user_id:
                profile.user_id,

            nama_lengkap:
                profile.nama_lengkap,

            email:
                profile.email,

            nim:
                profile.nim,

            no_telepon:
                profile.no_telepon,

            kementerian_id:
                profile.kementerian_id,

            role:
                profile.role

        };

        sessionStorage.setItem(
            "sitaraUser",
            JSON.stringify(
                updatedUser
            )
        );

        initializeAdminShell(
            updatedUser
        );

    } catch (error) {

        console.error(
            "Load profile error:",
            error
        );

        alert(
            "Gagal memuat data profil: " +
            error.message
        );
    }
}


// ==========================================
// SIMPAN PROFIL
// ==========================================

if (formProfilAkun) {

    formProfilAkun.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const user =
                checkAdminSession();

            if (!user) return;

            if (!namaLengkap.value.trim()) {

                alert(
                    "Nama lengkap wajib diisi."
                );

                namaLengkap.focus();

                return;
            }

            if (!email.value.trim()) {

                alert(
                    "Email wajib diisi."
                );

                email.focus();

                return;
            }

            if (!nim.value.trim()) {

                alert(
                    "NIM wajib diisi."
                );

                nim.focus();

                return;
            }

            if (!noTelepon.value.trim()) {

                alert(
                    "Nomor telepon wajib diisi."
                );

                noTelepon.focus();

                return;
            }

            btnSimpanProfil.disabled =
                true;

            btnSimpanProfil.textContent =
                "Menyimpan...";

            try {

                const result =
                    await apiRequest({

                        action:
                            "updateProfile",

                        session_token:
                            user.session_token,

                        nama_lengkap:
                            namaLengkap.value.trim(),

                        email:
                            email.value.trim(),

                        nim:
                            nim.value.trim(),

                        no_telepon:
                            noTelepon.value.trim()

                    });

                if (!result.success) {

                    throw new Error(
                        result.message ||
                        "Gagal memperbarui profil."
                    );
                }

                // ==================================
                // UPDATE SESSION
                // ==================================

                const updatedUser = {

                    ...user,

                    nama_lengkap:
                        result.data.nama_lengkap,

                    email:
                        result.data.email,

                    nim:
                        result.data.nim,

                    no_telepon:
                        result.data.no_telepon

                };

                sessionStorage.setItem(
                    "sitaraUser",
                    JSON.stringify(
                        updatedUser
                    )
                );

                initializeAdminShell(
                    updatedUser
                );

                alert(
                    "Profil akun berhasil diperbarui."
                );

            } catch (error) {

                console.error(
                    "Update profile error:",
                    error
                );

                alert(
                    "Gagal memperbarui profil: " +
                    error.message
                );

            } finally {

                btnSimpanProfil.disabled =
                    false;

                btnSimpanProfil.textContent =
                    "Simpan Perubahan";
            }
        }
    );
}


// ==========================================
// UBAH PASSWORD
// ==========================================

if (formKeamanan) {

    formKeamanan.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const user =
                checkAdminSession();

            if (!user) return;

            if (
                !passwordSaatIni.value
            ) {

                alert(
                    "Kata sandi saat ini wajib diisi."
                );

                passwordSaatIni.focus();

                return;
            }

            if (
                passwordBaru.value.length < 8
            ) {

                alert(
                    "Kata sandi baru minimal 8 karakter."
                );

                passwordBaru.focus();

                return;
            }

            if (
                passwordBaru.value !==
                konfirmasiPassword.value
            ) {

                alert(
                    "Konfirmasi kata sandi tidak sesuai."
                );

                konfirmasiPassword.focus();

                return;
            }

            btnUbahPassword.disabled =
                true;

            btnUbahPassword.textContent =
                "Mengubah...";

            try {

                const result =
                    await apiRequest({

                        action:
                            "changePassword",

                        session_token:
                            user.session_token,

                        current_password:
                            passwordSaatIni.value,

                        new_password:
                            passwordBaru.value,

                        confirm_password:
                            konfirmasiPassword.value

                    });

                if (!result.success) {

                    throw new Error(
                        result.message ||
                        "Gagal mengubah kata sandi."
                    );
                }

                // ==================================
                // RESET FORM
                // ==================================

                formKeamanan.reset();

                alert(
                    "Kata sandi berhasil diubah."
                );

            } catch (error) {

                console.error(
                    "Change password error:",
                    error
                );

                alert(
                    "Gagal mengubah kata sandi: " +
                    error.message
                );

            } finally {

                btnUbahPassword.disabled =
                    false;

                btnUbahPassword.textContent =
                    "Ubah Kata Sandi";
            }
        }
    );
}


// ==========================================
// LOGOUT
// ==========================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            const confirmation =
                confirm(
                    "Apakah Anda yakin ingin keluar dari SITARA?"
                );

            if (!confirmation) {
                return;
            }

            sessionStorage.removeItem(
                "sitaraUser"
            );

            window.location.href =
                "/login/index.html";
        }
    );
}


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const user =
            checkAdminSession();

        if (!user) return;

        initializeAdminShell(
            user
        );

        await loadProfile();

    }
);