// ==========================================
// SITARA - TAMBAH PENGGUNA
// tambah-pengguna.js
// ==========================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


// ==========================================
// ELEMENT
// ==========================================

const formTambahPengguna =
    document.getElementById("formTambahPengguna");

const namaLengkap =
    document.getElementById("nama_lengkap");

const email =
    document.getElementById("email");

const nim =
    document.getElementById("nim");

const noTelepon =
    document.getElementById("no_telepon");

const kementerian =
    document.getElementById("kementerian_id");

const role =
    document.getElementById("role");

const password =
    document.getElementById("password");

const confirmPassword =
    document.getElementById("confirm_password");

const btnSimpan =
    document.getElementById("btnSimpan");

const btnBatal =
    document.getElementById("btnBatal");

const btnLogout =
    document.getElementById("btnLogout");


// ==========================================
// ROLE YANG DIIZINKAN
// ==========================================

const ALLOWED_ROLES = [
    "admin",
    "pimpinan",
    "menko",
    "menteri",
    "kementerian",
    "mensetkab",
    "menkeu",
    "anggota",
    "tamu"
];


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
// CEK SESSION ADMIN
// ==========================================

function checkAdminSession() {

    const user =
        getSessionUser();

    if (!user) {

        alert(
            "Sesi login tidak ditemukan. Silakan login kembali."
        );

        window.location.href =
            "../../../login/index.html";

        return null;
    }

    if (!user.session_token) {

        alert(
            "Token sesi tidak ditemukan. Silakan login kembali."
        );

        window.location.href =
            "../../../login/index.html";

        return null;
    }

    if (
        String(user.role || "")
            .trim()
            .toLowerCase() !== "admin"
    ) {

        alert(
            "Anda tidak memiliki akses ke halaman ini."
        );

        window.location.href =
            "../../index.html";

        return null;
    }

    return user;
}


// ==========================================
// LOAD KEMENTERIAN
// ==========================================

async function loadKementerian() {

    try {

        kementerian.innerHTML = `
            <option value="">
                Memuat kementerian...
            </option>
        `;

        const response =
            await fetch(
                `${API_URL}?action=getKementerian`
            );

        const result =
            await response.json();

        console.log(
            "Response kementerian:",
            result
        );

        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal mengambil data kementerian."
            );
        }

        kementerian.innerHTML = `
            <option value="">
                Pilih kementerian
            </option>
        `;

        const data =
            Array.isArray(result.data)
                ? result.data
                : [];

        data.forEach(item => {

            const option =
                document.createElement("option");

            option.value =
                item.kementerian_id;

            option.textContent =
                item.nama_unit;

            kementerian.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Error load kementerian:",
            error
        );

        kementerian.innerHTML = `
            <option value="">
                Gagal memuat kementerian
            </option>
        `;

        alert(
            "Gagal memuat data kementerian: " +
            error.message
        );

    }
}


// ==========================================
// VALIDASI ROLE
// ==========================================

function validateRole() {

    const selectedRole =
        String(role.value || "")
            .trim()
            .toLowerCase();

    if (!selectedRole) {

        alert(
            "Role pengguna wajib dipilih."
        );

        role.focus();

        return false;
    }

    if (
        !ALLOWED_ROLES.includes(
            selectedRole
        )
    ) {

        alert(
            "Role pengguna tidak valid."
        );

        role.focus();

        return false;
    }

    return true;
}


// ==========================================
// SUBMIT
// ==========================================

async function submitForm(event) {

    event.preventDefault();

    const user =
        checkAdminSession();

    if (!user) return;


    // ======================================
    // VALIDASI ROLE
    // ======================================

    if (!validateRole()) {
        return;
    }


    // ======================================
    // VALIDASI PASSWORD
    // ======================================

    if (
        password.value.length < 8
    ) {

        alert(
            "Password minimal 8 karakter."
        );

        password.focus();

        return;
    }


    if (
        password.value !==
        confirmPassword.value
    ) {

        alert(
            "Konfirmasi password tidak sesuai."
        );

        confirmPassword.focus();

        return;
    }


    // ======================================
    // LOADING
    // ======================================

    btnSimpan.disabled = true;

    btnSimpan.textContent =
        "Menyimpan...";


    try {

        const selectedRole =
            String(role.value || "")
                .trim()
                .toLowerCase();


        const response =
            await fetch(API_URL, {

                method: "POST",

                body: JSON.stringify({

                    action:
                        "createUser",

                    session_token:
                        user.session_token,

                    nama_lengkap:
                        namaLengkap.value.trim(),

                    email:
                        email.value.trim(),

                    nim:
                        nim.value.trim(),

                    no_telepon:
                        noTelepon.value.trim(),

                    kementerian_id:
                        kementerian.value,

                    role:
                        selectedRole,

                    password:
                        password.value,

                    confirm_password:
                        confirmPassword.value

                })

            });


        const result =
            await response.json();


        console.log(
            "Response createUser:",
            result
        );


        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal menambahkan pengguna."
            );

        }


        alert(
            "Pengguna berhasil ditambahkan."
        );


        window.location.href =
            "../index.html";


    } catch (error) {

        console.error(
            "Error createUser:",
            error
        );

        alert(
            "Gagal menambahkan pengguna: " +
            error.message
        );

    } finally {

        btnSimpan.disabled = false;

        btnSimpan.textContent =
            "Simpan Pengguna";

    }

}


// ==========================================
// BATAL
// ==========================================

if (btnBatal) {

    btnBatal.addEventListener(
        "click",
        () => {

            const confirmCancel =
                confirm(
                    "Batalkan penambahan pengguna?"
                );

            if (!confirmCancel) return;

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

            const confirmLogout =
                confirm(
                    "Apakah Anda yakin ingin keluar?"
                );

            if (!confirmLogout) return;

            sessionStorage.removeItem(
                "sitaraUser"
            );

            window.location.href =
                "../../../login/index.html";

        }
    );

}


// ==========================================
// FORM EVENT
// ==========================================

if (formTambahPengguna) {

    formTambahPengguna.addEventListener(
        "submit",
        submitForm
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

        loadKementerian();
        updateKementerianRequirement();

        const dateElement =
            document.getElementById(
                "tanggalSekarang"
            );

        if (dateElement) {

            dateElement.textContent =
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

    }
);

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


// ==========================================
// UPDATE STATUS FIELD KEMENTERIAN
// ==========================================

function updateKementerianRequirement() {

    const selectedRole =
        String(role.value || "")
            .trim()
            .toLowerCase();

    const wajibKementerian =
        rolesWajibKementerian.includes(
            selectedRole
        );

    const kementerianLabel =
        document.querySelector(
            'label[for="kementerian_id"]'
        );

    const requiredIndicator =
        document.getElementById(
            "kementerianRequired"
        );


    if (wajibKementerian) {

        kementerian.required = true;

        if (requiredIndicator) {
            requiredIndicator.style.display = "inline";
        }

        if (kementerianLabel) {
            kementerianLabel.classList.remove(
                "optional"
            );
        }

    } else {

        kementerian.required = false;

        kementerian.value = "";

        if (requiredIndicator) {
            requiredIndicator.style.display = "none";
        }

        if (kementerianLabel) {
            kementerianLabel.classList.add(
                "optional"
            );
        }

    }

}

// ==========================================
// ROLE CHANGE
// ==========================================

if (role) {

    role.addEventListener(
        "change",
        updateKementerianRequirement
    );

}