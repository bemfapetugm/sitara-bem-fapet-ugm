// ==========================================
// SITARA - REGISTRATION JAVASCRIPT
// ==========================================


// ==========================================
// 1. URL GOOGLE APPS SCRIPT
// ==========================================

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


// ==========================================
// 2. SISTEM NOTIFIKASI MODERN SITARA
// ==========================================

let notificationCallback = null;

function createNotification() {

    if (document.getElementById("sitaraNotifOverlay")) {
        return;
    }

    const overlay = document.createElement("div");

    overlay.id = "sitaraNotifOverlay";
    overlay.className = "sitara-notif-overlay";

    overlay.innerHTML = `
        <div class="sitara-notif-card"
             role="alertdialog"
             aria-modal="true"
             aria-labelledby="sitaraNotifTitle"
             aria-describedby="sitaraNotifMessage">

            <button
                type="button"
                class="sitara-notif-close"
                id="sitaraNotifClose"
                aria-label="Tutup notifikasi">
                &times;
            </button>

            <div class="sitara-notif-icon"
                 id="sitaraNotifIcon">
                !
            </div>

            <div class="sitara-notif-content">

                <h2 class="sitara-notif-title"
                    id="sitaraNotifTitle">
                    Notifikasi
                </h2>

                <p class="sitara-notif-message"
                   id="sitaraNotifMessage">
                </p>

                <button
                    type="button"
                    class="sitara-notif-action"
                    id="sitaraNotifAction">
                    Mengerti
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    // Tombol tutup
    document
        .getElementById("sitaraNotifClose")
        .addEventListener("click", closeNotification);

    // Tombol mengerti
    document
        .getElementById("sitaraNotifAction")
        .addEventListener("click", closeNotification);

    // Tutup jika klik area luar kartu
    overlay.addEventListener("click", function (event) {

        if (event.target === overlay) {
            closeNotification();
        }

    });

}


// ==========================================
// 3. TAMPILKAN NOTIFIKASI
// ==========================================

function showNotification(message, type = "error", callback = null) {

    createNotification();

    const overlay = document.getElementById("sitaraNotifOverlay");

    const title = document.getElementById("sitaraNotifTitle");
    const text = document.getElementById("sitaraNotifMessage");
    const icon = document.getElementById("sitaraNotifIcon");

    notificationCallback = callback;

    // Isi notifikasi
    title.textContent = type === "success"
        ? "Berhasil"
        : "Registrasi Gagal";

    text.textContent = message;

    icon.textContent = type === "success"
        ? "✓"
        : "!";

    // Atur jenis notifikasi
    overlay.classList.remove("notif-success");

    if (type === "success") {
        overlay.classList.add("notif-success");
    }

    // Tampilkan notifikasi
    overlay.classList.add("active");

    // Cegah halaman bergulir
    document.body.style.overflow = "hidden";

}


// ==========================================
// 4. TUTUP NOTIFIKASI
// ==========================================

function closeNotification() {

    const overlay = document.getElementById("sitaraNotifOverlay");

    if (!overlay) return;

    overlay.classList.remove("active");

    document.body.style.overflow = "";

    if (typeof notificationCallback === "function") {

        const callback = notificationCallback;

        notificationCallback = null;

        callback();

    }

}


// Tutup dengan tombol Escape
document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        closeNotification();

    }

});


// ==========================================
// 5. TOGGLE PASSWORD
// ==========================================

const toggleButtons = document.querySelectorAll(".toggle-password");

const eyeOpen = `
    <svg xmlns="http://www.w3.org/2000/svg"
        width="22" height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round">

        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
`;

const eyeClosed = `
    <svg xmlns="http://www.w3.org/2000/svg"
        width="22" height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round">

        <path d="M3 3l18 18"/>
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/>
        <path d="M9.9 5.2A11.5 11.5 0 0 1 12 5c6.4 0 10 7 10 7a13.8 13.8 0 0 1-3 3.8"/>
        <path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10.8 10.8 0 0 0 4-.8"/>
    </svg>
`;

toggleButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        const targetId = button.getAttribute("data-target");

        const passwordInput = document.getElementById(targetId);

        if (!passwordInput) return;

        if (passwordInput.type === "password") {

            passwordInput.type = "text";

            button.innerHTML = eyeClosed;

            button.setAttribute(
                "aria-label",
                "Sembunyikan kata sandi"
            );

            button.setAttribute("aria-pressed", "true");

        } else {

            passwordInput.type = "password";

            button.innerHTML = eyeOpen;

            button.setAttribute(
                "aria-label",
                "Lihat kata sandi"
            );

            button.setAttribute("aria-pressed", "false");

        }

    });

});


// ==========================================
// 6. AMBIL DATA KEMENTERIAN
// ==========================================

async function loadKementerian() {

    const selectKementerian =
        document.getElementById("kementerian_id");

    if (!selectKementerian) return;

    selectKementerian.innerHTML = `
        <option value="">Memuat daftar kementerian...</option>
    `;

    selectKementerian.disabled = true;

    try {

        const response = await fetch(
            `${SCRIPT_URL}?action=getKementerian`
        );

        if (!response.ok) {
            throw new Error("Gagal menghubungi server.");
        }

        const result = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
            throw new Error("Data kementerian tidak valid.");
        }

        selectKementerian.innerHTML = `
            <option value="" selected disabled>
                Pilih kementerian
            </option>
        `;

        result.data.forEach(function (item) {

            const option = document.createElement("option");

            option.value = item.kementerian_id;

            option.textContent = item.nama_unit;

            selectKementerian.appendChild(option);

        });

        selectKementerian.disabled = false;

    } catch (error) {

        console.error("Gagal memuat kementerian:", error);

        selectKementerian.innerHTML = `
            <option value="" selected disabled>
                Gagal memuat kementerian
            </option>
        `;

        showNotification(
            "Daftar kementerian gagal dimuat. Periksa koneksi internet atau konfigurasi Apps Script.",
            "error"
        );

    }

}


// ==========================================
// 7. JALANKAN LOAD KEMENTERIAN
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    loadKementerian();

});

// ==========================================
// LOADING BUTTON REGISTRASI
// ==========================================

const registerButton = document.getElementById("registerButton");
const registerButtonText = document.getElementById("registerButtonText");
const registerSpinner = document.getElementById("registerSpinner");

function setRegisterLoading(isLoading) {

    if (!registerButton || !registerButtonText || !registerSpinner) {
        return;
    }

    // Nonaktifkan tombol saat proses berlangsung
    registerButton.disabled = isLoading;

    // Ubah teks tombol
    registerButtonText.textContent = isLoading
        ? "Memproses..."
        : "Daftar";

    // Tampilkan atau sembunyikan spinner
    registerSpinner.classList.toggle("hidden", !isLoading);
}

// ==========================================
// 8. PROSES REGISTRASI
// ==========================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        // Ambil data form
        const nama =
            document.getElementById("nama_lengkap").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const nim =
            document.getElementById("nim").value.trim();

        const noTelepon =
            document.getElementById("no_telepon").value.trim();

        const kementerian =
            document.getElementById("kementerian_id").value;

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;


        // ======================================
        // VALIDASI DATA WAJIB
        // ======================================

        if (!nama || !email || !nim || !noTelepon || !kementerian) {

            showNotification(
                "Semua data wajib diisi sebelum melakukan registrasi."
            );

            return;

        }


        // ======================================
        // VALIDASI PASSWORD
        // ======================================

        if (password.length < 8) {

            showNotification(
                "Kata sandi minimal harus terdiri dari 8 karakter."
            );

            document.getElementById("password").focus();

            return;

        }


        // ======================================
        // VALIDASI KONFIRMASI PASSWORD
        // ======================================

        if (password !== confirmPassword) {

            showNotification(
                "Konfirmasi kata sandi tidak sesuai. Silakan periksa kembali."
            );

            document.getElementById("confirmPassword").focus();

            return;

        }


        // ======================================
        // DATA REGISTRASI
        // ======================================

        const formData = {

            action: "register",

            nama_lengkap: nama,

            email: email,

            nim: nim,

            no_telepon: noTelepon,

            kementerian_id: kementerian,

            password: password

        };


        // ======================================
        // MULAI LOADING REGISTRASI
        // ======================================
        setRegisterLoading(true);
        try {

            // Kirim data ke Apps Script
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            // ======================================
            // REGISTRASI BERHASIL
            // ======================================
            if (result.success) {
                const successModal =
                    document.getElementById("successModal");
                if (successModal) {
                    successModal.classList.add("show");
                    document.body.style.overflow = "hidden";
                } else {
                    showNotification(
                        "Registrasi berhasil. Silakan masuk ke akun SITARA.",
                        "success",
                        function () {
                            window.location.href = "../login/index.html";
                        }
                    );
                }
            } else {

                // ==================================
                // REGISTRASI DITOLAK SERVER
                // ==================================
                showNotification(
                    result.message ||
                    "Registrasi gagal. Silakan coba kembali."
                );
            }
        } catch (error) {
            console.error("Kesalahan registrasi:", error);
            showNotification(
                "Tidak dapat memastikan hasil registrasi. Periksa koneksi internet dan database SITARA. Jika data mungkin sudah terkirim, cek sheet users sebelum mencoba mendaftar ulang."
            );
        } finally {

            // ======================================
            // HENTIKAN LOADING REGISTRASI
            // ======================================
            setRegisterLoading(false);
        }
    });
}

// ==========================================
// 9. MODAL SUKSES REGISTRASI
// ==========================================
const goToLoginButton = document.getElementById("goToLogin");
const closeSuccessModal = document.getElementById("closeSuccessModal");
function redirectToLogin() {
    window.location.href = "../login/index.html";
}

// Tombol Oke, Mengerti
if (goToLoginButton) {
    goToLoginButton.addEventListener("click", redirectToLogin);
}

// Tombol close (X)
if (closeSuccessModal) {
    closeSuccessModal.addEventListener("click", redirectToLogin);
}