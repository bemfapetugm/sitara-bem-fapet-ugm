// ========================================
// KONFIGURASI GOOGLE APPS SCRIPT
// ========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


// ========================================
// ELEMENT HTML
// ========================================

const resetPasswordForm = document.getElementById("resetPasswordForm");

const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");

const submitButton = document.getElementById("submitButton");
const buttonText = document.getElementById("buttonText");
const buttonSpinner = document.getElementById("buttonSpinner");

const messageBox = document.getElementById("message");
const tokenMessage = document.getElementById("tokenMessage");


// ========================================
// AMBIL TOKEN DARI URL
// ========================================

const urlParams = new URLSearchParams(window.location.search);

const resetToken = urlParams.get("token");


// ========================================
// NOTIFIKASI
// ========================================

function showMessage(message, type) {

    messageBox.textContent = message;

    messageBox.className = `message ${type}`;

    messageBox.classList.remove("hidden");

}


function showTokenMessage(message, type) {

    tokenMessage.textContent = message;

    tokenMessage.className = `message ${type}`;

    tokenMessage.classList.remove("hidden");

}


// ========================================
// VALIDASI TOKEN DAN KONFIGURASI SERVER
// ========================================

function validateToken() {

    // Periksa token dari URL
    if (!resetToken) {

        showTokenMessage(
            "Token reset password tidak ditemukan. Silakan ajukan permintaan reset password kembali.",
            "error"
        );

        resetPasswordForm.classList.add("hidden");

        return false;
    }


    // Periksa konfigurasi URL backend
    if (
        !SCRIPT_URL ||
        SCRIPT_URL === "GANTI_DENGAN_URL_WEB_APP_GAS"
    ) {

        showTokenMessage(
            "Konfigurasi server belum tersedia. Silakan hubungi administrator SITARA.",
            "error"
        );

        resetPasswordForm.classList.add("hidden");

        return false;
    }


    // Jika token tersedia dan URL sudah dikonfigurasi
    submitButton.disabled = false;

    return true;

}


// ========================================
// LOADING BUTTON
// ========================================

function setLoading(isLoading) {

    submitButton.disabled = isLoading;

    buttonSpinner.classList.toggle("hidden", !isLoading);

    buttonText.textContent = isLoading
        ? "Memproses..."
        : "Reset Password";

}


// ========================================
// TOGGLE PASSWORD
// ========================================

document.querySelectorAll(".toggle-password").forEach(button => {

    button.addEventListener("click", function () {

        const targetId = this.dataset.target;

        const input = document.getElementById(targetId);

        if (input.type === "password") {

            input.type = "text";

            this.textContent = "Sembunyikan";

            this.setAttribute("aria-label", "Sembunyikan password");

        } else {

            input.type = "password";

            this.textContent = "Lihat";

            this.setAttribute("aria-label", "Tampilkan password");

        }

    });

});


// ========================================
// SUBMIT RESET PASSWORD
// ========================================

resetPasswordForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;


    // VALIDASI PASSWORD

    if (newPassword.length < 8) {

        showMessage(
            "Password baru minimal harus 8 karakter.",
            "error"
        );

        return;

    }


    // VALIDASI KONFIRMASI PASSWORD

    if (newPassword !== confirmPassword) {

        showMessage(
            "Konfirmasi password tidak sesuai.",
            "error"
        );

        confirmPasswordInput.focus();

        return;

    }


    // VALIDASI TOKEN

    if (!resetToken) {

        showMessage(
            "Token reset password tidak ditemukan.",
            "error"
        );

        return;

    }


    // MULAI LOADING

    setLoading(true);

    messageBox.classList.add("hidden");


    try {

        // KIRIM DATA KE GOOGLE APPS SCRIPT

        const response = await fetch(SCRIPT_URL, {

            method: "POST",

            // Menghindari preflight JSON content-type
            // pada permintaan lintas-origin.
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify({

                action: "resetPassword",

                token: resetToken,

                new_password: newPassword

            })

        });


        if (!response.ok) {

            throw new Error("HTTP_ERROR");

        }


        const result = await response.json();


        // ========================================
        // JIKA RESET PASSWORD BERHASIL
        // ========================================

        if (result.success) {

            // Tampilkan notifikasi keberhasilan
            showMessage(
                "Kata sandi akun SITARA Anda telah berhasil diperbarui. Silakan masuk kembali menggunakan kata sandi baru.",
                "success"
            );

            // Kosongkan form
            resetPasswordForm.reset();

            // Sembunyikan form reset password
            resetPasswordForm.classList.add("hidden");

            // Tombol kembali ke login pada footer tetap tersedia

        } else {

            // Jika reset password gagal
            showMessage(
                result.message ||
                "Password gagal diperbarui. Token mungkin sudah kedaluwarsa atau tidak valid.",
                "error"
            );

        }


    } catch (error) {

        console.error("Reset Password Error:", error);

        showMessage(
            "Terjadi kendala saat menghubungi server. Silakan coba kembali.",
            "error"
        );

    } finally {

        setLoading(false);

    }

});


// ========================================
// JALANKAN VALIDASI SAAT HALAMAN DIBUKA
// ========================================

validateToken();