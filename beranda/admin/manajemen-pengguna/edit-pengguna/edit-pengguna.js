// ==========================================
// SITARA - EDIT PENGGUNA
// edit-pengguna.js
// ==========================================

const API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";

// ==========================================
// ELEMENT
// ==========================================

const formEditPengguna = document.getElementById("formEditPengguna");

const userIdInput = document.getElementById("user_id");
const namaLengkapInput = document.getElementById("nama_lengkap");
const emailInput = document.getElementById("email");
const nimInput = document.getElementById("nim");
const noTeleponInput = document.getElementById("no_telepon");
const kementerianSelect = document.getElementById("kementerian_id");
const roleSelect = document.getElementById("role");
const statusAkun = document.getElementById("statusAkun");

const btnBatal = document.getElementById("btnBatal");
const btnSimpan = document.getElementById("btnSimpan");
const btnLogout = document.getElementById("btnLogout");
const tanggalSekarang = document.getElementById("tanggalSekarang");

// ==========================================
// ATURAN KEMENTERIAN BERDASARKAN ROLE
// ==========================================

const rolesWajibKementerian = [
    "mensetkab",
    "menkeu",
    "menteri",
    "kementerian",
    "anggota"
];

function updateKementerianRequirement() {

    const selectedRole =
        normalize(roleSelect.value);

    const wajibKementerian =
        rolesWajibKementerian.includes(selectedRole);

    const label =
        document.querySelector(
            'label[for="kementerian_id"]'
        );

    const indicator =
        document.getElementById(
            "kementerianRequired"
        );

    if (wajibKementerian) {

        kementerianSelect.disabled = false;
        kementerianSelect.required = true;

        if (indicator) {
            indicator.style.display = "inline";
        }

        if (label) {
            label.classList.remove("optional");
        }

    } else {

        kementerianSelect.required = false;
        kementerianSelect.value = "";

        if (indicator) {
            indicator.style.display = "none";
        }

        if (label) {
            label.classList.add("optional");
        }

    }
}

// ==========================================
// SESSION
// ==========================================

function getSessionUser() {

    try {

        const session = sessionStorage.getItem("sitaraUser");

        if (!session) {
            return null;
        }

        return JSON.parse(session);

    } catch (error) {

        console.error("Gagal membaca session:", error);

        return null;
    }
}


// ==========================================
// CHECK ADMIN SESSION
// ==========================================

function checkAdminSession() {

    const user = getSessionUser();

    if (!user) {

        alert("Sesi login tidak ditemukan. Silakan login kembali.");

        window.location.href = "../../../../login/index.html";

        return null;
    }

    if (!user.session_token) {

        alert("Token sesi tidak ditemukan. Silakan login kembali.");

        window.location.href = "../../../../login/index.html";

        return null;
    }

    if (normalize(user.role) !== "admin") {

        alert("Anda tidak memiliki akses ke halaman ini.");

        window.location.href = "../../../../index.html";

        return null;
    }

    return user;
}


// ==========================================
// GET USER ID FROM URL
// ==========================================

function getUserIdFromURL() {

    const params = new URLSearchParams(window.location.search);

    return (
        params.get("user_id") ||
        params.get("id")
    );
}


// ==========================================
// LOAD USER DATA
// ==========================================

async function loadUserData() {

    const sessionUser = checkAdminSession();

    if (!sessionUser) return;

    const userId = getUserIdFromURL();

    if (!userId) {

        alert("ID pengguna tidak ditemukan.");

        window.location.href = "../index.html";

        return;
    }

    userIdInput.value = userId;

    try {

        setFormLoading(true);

        const response = await fetch(API_URL, {

            method: "POST",

            body: JSON.stringify({
                action: "getUserById",
                session_token: sessionUser.session_token,
                user_id: userId
            })

        });

        const result = await response.json();

        console.log("Response getUserById:", result);

        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal mengambil data pengguna."
            );

        }

        if (!result.data) {

            throw new Error(
                "Data pengguna tidak ditemukan."
            );

        }

        populateUserForm(result.data);

    } catch (error) {

        console.error("Error loadUserData:", error);

        alert(
            "Gagal memuat data pengguna: " +
            error.message
        );

        window.location.href = "../index.html";

    } finally {

        setFormLoading(false);

    }
}


// ==========================================
// POPULATE FORM
// ==========================================

function populateUserForm(user) {

    userIdInput.value =
        user.user_id || "";

    namaLengkapInput.value =
        user.nama_lengkap || "";

    emailInput.value =
        user.email || "";

    nimInput.value =
        user.nim || "";

    noTeleponInput.value =
        user.no_telepon || "";

    roleSelect.value =
        user.role || "";

    statusAkun.textContent =
        user.status_akun || "-";

    setStatusStyle(
        user.status_akun
    );

    loadKementerian(
        user.kementerian_id || ""
    ).then(() => {

        updateKementerianRequirement();

    });

}


// ==========================================
// LOAD KEMENTERIAN
// ==========================================

async function loadKementerian(selectedKementerianId = "") {

    try {

        kementerianSelect.innerHTML = `
            <option value="">
                Memuat kementerian...
            </option>
        `;

        const response = await fetch(
            `${API_URL}?action=getKementerian`
        );

        const result = await response.json();

        console.log(
            "Response getKementerian:",
            result
        );

        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal mengambil data kementerian."
            );

        }

        const kementerianList =
            Array.isArray(result.data)
                ? result.data
                : [];

        kementerianSelect.innerHTML = `
            <option value="">
                Pilih kementerian
            </option>
        `;

        kementerianList.forEach(kementerian => {

            const option =
                document.createElement("option");

            option.value =
                kementerian.kementerian_id || "";

            option.textContent =
                kementerian.nama_unit || "-";

            if (
                String(kementerian.kementerian_id) ===
                String(selectedKementerianId)
            ) {

                option.selected = true;

            }

            kementerianSelect.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Error loadKementerian:",
            error
        );

        kementerianSelect.innerHTML = `
            <option value="">
                Gagal memuat kementerian
            </option>
        `;

        throw error;
    }
}


// ==========================================
// SAVE CHANGES
// ==========================================

async function updateUser() {

    const sessionUser = checkAdminSession();

    if (!sessionUser) return;

    const userId = userIdInput.value.trim();

    if (!userId) {

        alert("ID pengguna tidak ditemukan.");

        return;
    }

    const namaLengkap =
        namaLengkapInput.value.trim();

    const email =
        emailInput.value.trim();

    const nim =
        nimInput.value.trim();

    const noTelepon =
        noTeleponInput.value.trim();

    const kementerianId =
        kementerianSelect.value;

    const role =
        roleSelect.value;

    // ======================================
    // VALIDATION
    // ======================================

    if (!namaLengkap) {

        alert("Nama lengkap wajib diisi.");

        namaLengkapInput.focus();

        return;
    }

    if (!email) {

        alert("Email wajib diisi.");

        emailInput.focus();

        return;
    }

    if (!isValidEmail(email)) {

        alert("Format email tidak valid.");

        emailInput.focus();

        return;
    }

    if (!nim) {

        alert("NIM wajib diisi.");

        nimInput.focus();

        return;
    }

    if (!noTelepon) {

        alert("Nomor telepon wajib diisi.");

        noTeleponInput.focus();

        return;
    }

    const rolesWajibKementerian = [
        "mensetkab",
        "menkeu",
        "menteri",
        "kementerian",
        "anggota"
    ];

    const wajibKementerian =
        rolesWajibKementerian.includes(
            normalize(role)
        );

    if (
        wajibKementerian &&
        !kementerianId
    ) {

        alert(
            "Kementerian wajib dipilih untuk role " +
            role + "."
        );

        kementerianSelect.focus();

        return;
    }

    if (!role) {

        alert("Role wajib dipilih.");

        roleSelect.focus();

        return;
    }


    // ======================================
    // CONFIRM
    // ======================================

    const confirmed = confirm(
        "Simpan perubahan data pengguna ini?"
    );

    if (!confirmed) {
        return;
    }


    // ======================================
    // SUBMIT
    // ======================================

    try {

        setSavingState(true);

        const response = await fetch(API_URL, {

            method: "POST",

            body: JSON.stringify({

                action: "updateUser",

                session_token:
                    sessionUser.session_token,

                user_id: userId,

                nama_lengkap: namaLengkap,

                email: email,

                nim: nim,

                no_telepon: noTelepon,

                kementerian_id: kementerianId,

                role: role

            })

        });

        const result = await response.json();

        console.log(
            "Response updateUser:",
            result
        );

        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal menyimpan perubahan."
            );

        }

        alert(
            result.message ||
            "Data pengguna berhasil diperbarui."
        );

        window.location.href = "../index.html";

    } catch (error) {

        console.error(
            "Error updateUser:",
            error
        );

        alert(
            "Gagal menyimpan perubahan: " +
            error.message
        );

    } finally {

        setSavingState(false);

    }
}


// ==========================================
// STATUS STYLE
// ==========================================

function setStatusStyle(status) {

    const normalized =
        normalize(status);

    statusAkun.classList.remove(
        "active",
        "pending",
        "inactive"
    );

    if (normalized === "aktif") {

        statusAkun.classList.add("active");

    } else if (
        normalized === "pending" ||
        normalized === "menunggu_verifikasi"
    ) {

        statusAkun.classList.add("pending");

    } else if (
        normalized === "nonaktif" ||
        normalized === "tidak aktif"
    ) {

        statusAkun.classList.add("inactive");

    }

}


// ==========================================
// SAVING STATE
// ==========================================

function setSavingState(isSaving) {

    if (isSaving) {

        btnSimpan.disabled = true;

        btnSimpan.textContent =
            "Menyimpan...";

        btnBatal.disabled = true;

    } else {

        btnSimpan.disabled = false;

        btnSimpan.textContent =
            "Simpan Perubahan";

        btnBatal.disabled = false;

    }

}


// ==========================================
// FORM LOADING
// ==========================================

function setFormLoading(isLoading) {

    const inputs = formEditPengguna.querySelectorAll(
        "input, select, button"
    );

    inputs.forEach(element => {

        element.disabled = isLoading;

    });

}


// ==========================================
// VALIDATE EMAIL
// ==========================================

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}


// ==========================================
// NORMALIZE
// ==========================================

function normalize(value) {

    return String(value || "")
        .trim()
        .toLowerCase();

}


// ==========================================
// CURRENT DATE
// ==========================================

function showCurrentDate() {

    if (!tanggalSekarang) return;

    const now = new Date();

    const options = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    };

    tanggalSekarang.textContent =
        now.toLocaleDateString(
            "id-ID",
            options
        );

}


// ==========================================
// CANCEL
// ==========================================

if (btnBatal) {

    btnBatal.addEventListener(
        "click",
        () => {

            window.location.href =
                "../index.html";

        }
    );

}


// ==========================================
// LOGOUT
// ==========================================

if (btnLogout) {

    btnLogout.addEventListener(
        "click",
        () => {

            const confirmed = confirm(
                "Apakah Anda yakin ingin keluar?"
            );

            if (!confirmed) return;

            sessionStorage.removeItem(
                "sitaraUser"
            );

            window.location.href =
                "../../../../login/index.html";

        }
    );

}

// ==========================================
// ROLE CHANGE
// ==========================================

if (roleSelect) {

    roleSelect.addEventListener(
        "change",
        updateKementerianRequirement
    );

}

// ==========================================
// FORM SUBMIT
// ==========================================

if (formEditPengguna) {

    formEditPengguna.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            updateUser();

        }
    );

}


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const user =
            checkAdminSession();

        if (!user) return;

        initializeAdminShell(user);
        loadUserData();

    }
);

// ==========================================
// ADMIN SHELL
// ==========================================

function initializeAdminShell(user) {

    const adminName =
        user.nama_lengkap ||
        user.nama ||
        user.name ||
        user.full_name ||
        "admin";

    const adminRole =
        String(user.role || "admin").trim();

    const initial =
        adminName.trim().charAt(0).toUpperCase();

    const profileName =
        document.querySelector(".profile-info h4");

    const profileRole =
        document.querySelector(".profile-info p");

    const profileAvatar =
        document.querySelector(".profile-avatar");

    const topbarAvatar =
        document.querySelector(".topbar-avatar");

    if (profileName) {
        profileName.textContent = adminName;
    }

    if (profileRole) {
        profileRole.textContent = adminRole;
    }

    if (profileAvatar) {
        profileAvatar.textContent = initial;
    }

    if (topbarAvatar) {
        topbarAvatar.textContent = initial;
    }
}