// ========================================
// KONFIGURASI GOOGLE APPS SCRIPT
// ========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


// ========================================
// ELEMENT HTML
// ========================================

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const emailInput = document.getElementById("email");

const submitButton = document.getElementById("submitButton");
const buttonText = document.getElementById("buttonText");
const buttonSpinner = document.getElementById("buttonSpinner");

const messageBox = document.getElementById("message");


// ========================================
// NOTIFIKASI
// ========================================

function showMessage(message, type) {

    messageBox.textContent = message;

    messageBox.className = `message ${type}`;

    messageBox.classList.remove("hidden");

}


// ========================================
// LOADING BUTTON
// ========================================

function setLoading(isLoading) {

    submitButton.disabled = isLoading;

    buttonSpinner.classList.toggle("hidden", !isLoading);

    buttonText.textContent = isLoading
        ? "Mengirim..."
        : "Kirim Link Reset";

}


// ========================================
// SUBMIT LUPA PASSWORD
// ========================================

forgotPasswordForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
        showMessage("Silakan masukkan email terlebih dahulu.", "error");
        return;
    }

    // ========================================
    // VALIDASI URL BACKEND
    // ========================================

    if (
        !SCRIPT_URL ||
        SCRIPT_URL === "GANTI_DENGAN_URL_WEB_APP_GAS"
    ) {
        showMessage(
            "URL backend belum dikonfigurasi. Silakan hubungi administrator SITARA.",
            "error"
        );
        return;
    }

    setLoading(true);

    messageBox.classList.add("hidden");

    try {

        const response = await fetch(SCRIPT_URL, {

            method: "POST",

            body: JSON.stringify({
                action: "forgotPassword",
                email: email
            })

        });

        if (!response.ok) {
            throw new Error("HTTP_ERROR");
        }

        const result = await response.json();

        if (result.success) {

            showMessage(
                result.message ||
                "Jika email terdaftar, instruksi reset password akan dikirimkan.",
                "success"
            );

            forgotPasswordForm.reset();

        } else {

            showMessage(
                result.message ||
                "Permintaan belum dapat diproses. Silakan coba kembali.",
                "error"
            );

        }

    } catch (error) {

        console.error("Forgot Password Error:", error);

        showMessage(
            "Terjadi kendala saat menghubungi server. Silakan coba kembali.",
            "error"
        );

    } finally {

        setLoading(false);

    }

});