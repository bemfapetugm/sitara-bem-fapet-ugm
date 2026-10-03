// ==========================================
// KONFIGURASI BACKEND SITARA
// ==========================================

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


// ==========================================
// AMBIL TOKEN DARI URL
// ==========================================

const params = new URLSearchParams(
  window.location.search
);

const token = params.get("token");


// ==========================================
// ELEMENT HTML
// ==========================================

const statusBox = document.getElementById(
  "verification-status"
);

const statusIcon = document.getElementById(
  "status-icon"
);


// ==========================================
// STATUS VERIFIKASI
// ==========================================

let isFinished = false;


// ==========================================
// TAMPILKAN HASIL VERIFIKASI
// ==========================================

function showResult(success, message) {

  if (isFinished) return;

  isFinished = true;


  // ========================================
  // VERIFIKASI BERHASIL
  // ========================================

  if (success) {

    statusIcon.textContent = "✓";

    statusBox.innerHTML = `
      <h2>Verifikasi Berhasil!</h2>

      <p>
        Email kamu berhasil diverifikasi.
        Akun SITARA telah aktif dan dapat digunakan
        untuk login.
      </p>

      <a href="../login/index.html" class="login-link">
        Kembali ke Login
      </a>
    `;

  }


  // ========================================
  // VERIFIKASI GAGAL
  // ========================================

  else {

    statusIcon.textContent = "!";

    statusBox.innerHTML = `
      <h2>Verifikasi Gagal</h2>
      <p></p>
    `;

    statusBox.querySelector("p").textContent =
      message || "Verifikasi gagal. Silakan coba kembali.";

  }

}


// ==========================================
// CALLBACK DARI GOOGLE APPS SCRIPT
// ==========================================

window.sitaraVerificationCallback = function(result) {

  // Validasi respons backend
  if (!result || result.type !== "SITARA_VERIFY") {

    showResult(
      false,
      "Respons dari server tidak valid."
    );

    return;
  }


  // Validasi token
  if (result.token !== token) {

    showResult(
      false,
      "Token verifikasi tidak sesuai."
    );

    return;
  }


  // Tampilkan hasil verifikasi
  showResult(
    result.success,
    result.message
  );

};


// ==========================================
// VALIDASI TOKEN
// ==========================================

if (!token) {

  showResult(
    false,
    "Token verifikasi tidak ditemukan."
  );

}


// ==========================================
// PROSES VERIFIKASI KE BACKEND
// ==========================================

else {

  const script = document.createElement("script");


  // URL JSONP Google Apps Script
  script.src =
    SCRIPT_URL +
    "?action=verify" +
    "&token=" + encodeURIComponent(token) +
    "&callback=sitaraVerificationCallback";


  // Jika gagal terhubung ke backend
  script.onerror = function() {

    showResult(
      false,
      "Tidak dapat menerima respons dari server. Silakan coba kembali."
    );

  };


  // Jalankan request verifikasi
  document.body.appendChild(script);


  // ========================================
  // TIMEOUT RESPONS BACKEND
  // ========================================

  setTimeout(function() {

    if (!isFinished) {

      showResult(
        false,
        "Server tidak memberikan respons. Muat ulang halaman atau hubungi administrator."
      );

    }

  }, 15000);

}