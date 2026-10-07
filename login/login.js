// ==========================================
// SITARA - LOGIN JAVASCRIPT
// ==========================================


// ==========================================
// 1. URL GOOGLE APPS SCRIPT
// ==========================================

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


// ==========================================
// 2. FITUR LIHAT / SEMBUNYIKAN PASSWORD
// ==========================================

const passwordInput =
    document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const eyeIcon =
    document.getElementById("eyeIcon");


if (
    togglePassword &&
    passwordInput &&
    eyeIcon
) {

    togglePassword.addEventListener(
        "click",
        function () {

            if (
                passwordInput.type ===
                "password"
            ) {

                passwordInput.type =
                    "text";

                eyeIcon.innerHTML = `
                    <path d="M3 3l18 18"/>
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/>
                    <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5
                    c6.4 0 10 7 10 7a15.5 15.5 0 0 1-4 4.7"/>
                    <path d="M6.6 6.6C3.6 8.4 2 12 2 12
                    s3.6 7 10 7a10.8 10.8 0 0 0 4.1-.8"/>
                `;

                togglePassword.setAttribute(
                    "aria-label",
                    "Sembunyikan password"
                );

            } else {

                passwordInput.type =
                    "password";

                eyeIcon.innerHTML = `
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/>
                    <circle cx="12" cy="12" r="3"/>
                `;

                togglePassword.setAttribute(
                    "aria-label",
                    "Lihat password"
                );

            }

        }
    );

}


// ==========================================
// 3. ELEMEN FORM LOGIN
// ==========================================

const loginForm =
    document.getElementById("loginForm");

const loginButton =
    document.getElementById("loginButton");

const loginButtonText =
    document.getElementById(
        "loginButtonText"
    );

const loginSpinner =
    document.getElementById(
        "loginSpinner"
    );


// ==========================================
// 4. SISTEM NOTIFIKASI LOGIN
// ==========================================

let notificationTimer;


const loginNotification =
    document.createElement("div");

loginNotification.id =
    "loginNotification";

loginNotification.className =
    "login-notification";


loginNotification.innerHTML = `
    <div
        class="notification-icon"
        id="notificationIcon"
    ></div>

    <div class="notification-content">

        <strong
            id="notificationTitle"
        ></strong>

        <p
            id="notificationText"
        ></p>

    </div>

    <button
        type="button"
        class="notification-close"
        aria-label="Tutup notifikasi"
    >
        &times;
    </button>
`;


document.body.appendChild(
    loginNotification
);


// ==========================================
// 5. FUNGSI MENUTUP NOTIFIKASI
// ==========================================

function hideLoginNotification() {

    loginNotification.classList.remove(
        "show"
    );

    clearTimeout(
        notificationTimer
    );

}


// ==========================================
// 6. FUNGSI MENAMPILKAN NOTIFIKASI
// ==========================================

function showLoginMessage(
    message,
    success = false
) {

    const title =
        document.getElementById(
            "notificationTitle"
        );

    const text =
        document.getElementById(
            "notificationText"
        );

    const icon =
        document.getElementById(
            "notificationIcon"
        );


    clearTimeout(
        notificationTimer
    );


    title.textContent =
        success
            ? "Berhasil"
            : "Login Gagal";


    text.textContent =
        message;


    loginNotification.classList.remove(
        "notification-success",
        "notification-error",
        "show"
    );


    loginNotification.classList.add(
        success
            ? "notification-success"
            : "notification-error"
    );


    icon.innerHTML =
        success
            ? "&#10003;"
            : "!";


    requestAnimationFrame(
        () => {

            loginNotification.classList.add(
                "show"
            );

        }
    );


    notificationTimer =
        setTimeout(
            () => {

                hideLoginNotification();

            },
            4000
        );

}


// ==========================================
// 7. EVENT TOMBOL TUTUP NOTIFIKASI
// ==========================================

loginNotification
    .querySelector(
        ".notification-close"
    )
    .addEventListener(
        "click",
        function () {

            hideLoginNotification();

        }
    );


// ==========================================
// 8. FUNGSI LOADING LOGIN
// ==========================================

function setLoginLoading(
    isLoading
) {

    if (
        !loginButton ||
        !loginButtonText ||
        !loginSpinner
    ) {

        return;

    }


    loginButton.disabled =
        isLoading;


    loginButtonText.textContent =
        isLoading
            ? "Memproses..."
            : "Masuk";


    loginSpinner.classList.toggle(
        "hidden",
        !isLoading
    );

}


// ==========================================
// 9. ROLE ROUTES
// ==========================================

const ROLE_ROUTES = {

    admin:
        "../beranda/admin/index.html",

    anggota:
        "../beranda/anggota/index.html",

    pimpinan:
        "../beranda/pimpinan/index.html",

    dpm:
        "../beranda/dpm/index.html",

    menko:
        "../beranda/menko/index.html",

    menteri:
        "../beranda/menteri/index.html",

    mensetkab:
        "../beranda/mensetkab/index.html",

    menkeu:
        "../beranda/kemenkeu/index.html",

    tamu:
        "../beranda/tamu/index.html"

};

// ==========================================
// 10. PROSES LOGIN
// ==========================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // ==================================
            // AMBIL DATA INPUT
            // ==================================

            const identifier =
                document
                    .getElementById("email")
                    .value
                    .trim();


            const password =
                passwordInput.value;


            // ==================================
            // VALIDASI INPUT
            // ==================================

            if (
                !identifier ||
                !password
            ) {

                showLoginMessage(
                    "Email/NIM dan kata sandi wajib diisi."
                );

                return;

            }


            // ==================================
            // MULAI LOADING
            // ==================================

            hideLoginNotification();

            setLoginLoading(true);


            try {

                // ==================================
                // DATA LOGIN
                // ==================================

                const loginData = {

                    action:
                        "login",

                    identifier:
                        identifier,

                    password:
                        password

                };


                // ==================================
                // KIRIM KE GOOGLE APPS SCRIPT
                // ==================================

                const response =
                    await fetch(
                        SCRIPT_URL,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "text/plain;charset=utf-8"

                            },

                            body:
                                JSON.stringify(
                                    loginData
                                )

                        }
                    );


                // ==================================
                // BACA RESPONSE
                // ==================================

                const result =
                    await response.json();

                console.log("=== RESPONSE LOGIN SITARA ===");
                console.log(result);
                console.log("success:", result.success);
                console.log("message:", result.message);
                console.log("data:", result.data);


                // ==================================
                // JIKA LOGIN GAGAL
                // ==================================

                if (
                    !result.success
                ) {

                    showLoginMessage(
                        result.message ||
                        "Email/NIM atau kata sandi tidak sesuai."
                    );

                    return;

                }


                // ==================================
                // LOGIN BERHASIL
                // ==================================

                const user =
                    result.data;


                if (!user) {

                    showLoginMessage(
                        "Data akun tidak ditemukan. Silakan coba kembali."
                    );

                    return;

                }


                // ==================================
                // NORMALISASI ROLE
                // ==================================

                const role =
                    String(
                        user.role || ""
                    )
                        .trim()
                        .toLowerCase();


                // ==================================
                // CEK ROLE
                // ==================================

                let destination = null;


                /*
                * Routing berdasarkan role
                */

                if (
                    role === "kementerian"
                ) {


                    const kementerianId =
                        String(
                            user.kementerian_id || ""
                        )
                        .trim()
                        .toUpperCase();



                    /*
                    * Routing dashboard berdasarkan kementerian
                    */

                    const KEMENTERIAN_ROUTES = {


                        KEM001:
                            "../beranda/kemensetkab/index.html",


                        KEM002:
                            "../beranda/kemenkeu/index.html",


                        KEM003:
                            "../beranda/kemenhubker/index.html",


                        KEM004:
                            "../beranda/komdig/index.html",


                        KEM005:
                            "../beranda/kaderisasi/index.html",


                        KEM006:
                            "../beranda/kemenpora/index.html",


                        KEM007:
                            "../beranda/adkesma/index.html",


                        KEM008:
                            "../beranda/kreativitas/index.html",


                        KEM009:
                            "../beranda/analisis/index.html",


                        KEM010:
                            "../beranda/sosial/index.html"

                    };


                    destination =
                        KEMENTERIAN_ROUTES[
                            kementerianId
                        ];



                } else {


                    /*
                    * Role non kementerian
                    */

                    destination =
                        ROLE_ROUTES[role];

                }



                if (!destination) {


                    sessionStorage.removeItem(
                        "sitaraUser"
                    );


                    showLoginMessage(
                        "Dashboard untuk akun ini belum tersedia."
                    );


                    return;

                }


                // ==================================
                // SIMPAN SESSION
                // ==================================

                sessionStorage.setItem(
                    "sitaraUser",
                    JSON.stringify(user)
                );


                // ==================================
                // ALIHKAN
                // ==================================

                window.location.href =
                    destination;


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                showLoginMessage(
                    "Tidak dapat terhubung ke server SITARA. Coba lagi."
                );


            } finally {

                setLoginLoading(
                    false
                );

            }

        }
    );

}