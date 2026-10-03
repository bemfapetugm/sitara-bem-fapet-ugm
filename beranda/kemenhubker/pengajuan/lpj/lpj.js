/* =========================================================
   SITARA
   PENGAJUAN LAPORAN PERTANGGUNGJAWABAN (LPJ)
   KEMENTERIAN HUBUNGAN KERJA SAMA
========================================================= */


/* =========================================================
   KONFIGURASI
========================================================= */

const LOGIN_URL =
    "../../../../login/index.html";

const PENGAJUAN_URL =
    "../index.html";

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


/*
 * Ukuran maksimum satu file:
 * 10 MB
 */
const MAX_FILE_SIZE =
    10 * 1024 * 1024;


/*
 * Format file LPJ yang diterima
 */
const ALLOWED_EXTENSIONS = [
    ".pdf",
    ".doc",
    ".docx"
];


/* =========================================================
   SESSION
========================================================= */

let currentUser = null;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
         * Cek session terlebih dahulu.
         */
        currentUser =
            checkSession();


        if (!currentUser) {
            return;
        }


        /*
         * Inisialisasi halaman.
         */
        initializePage();

    }
);


/* =========================================================
   CEK SESSION
========================================================= */

function checkSession() {

    const rawSession =
        sessionStorage.getItem(
            "sitaraUser"
        );


    /*
     * Tidak ada session.
     */
    if (!rawSession) {

        window.location.href =
            LOGIN_URL;

        return null;
    }


    let session;

    try {

        session =
            JSON.parse(
                rawSession
            );

    } catch (error) {

        console.error(
            "Session tidak valid:",
            error
        );

        sessionStorage.removeItem(
            "sitaraUser"
        );

        window.location.href =
            LOGIN_URL;

        return null;
    }


    /*
     * Session token wajib ada.
     */
    if (
        !session ||
        !session.session_token
    ) {

        sessionStorage.removeItem(
            "sitaraUser"
        );

        window.location.href =
            LOGIN_URL;

        return null;
    }


    /*
     * Halaman ini hanya untuk
     * role kementerian.
     */
    if (
        session.role !==
        "kementerian"
    ) {

        alert(
            "Anda tidak memiliki akses ke halaman ini."
        );

        window.location.href =
            LOGIN_URL;

        return null;
    }


    return session;
}


/* =========================================================
   INITIALIZE PAGE
========================================================= */

function initializePage() {

    /*
     * Tanggal pengajuan otomatis.
     */
    setTanggalPengajuan();


    /*
     * Informasi user.
     */
    initializeUserProfile();


    /*
     * Tanggal pada topbar.
     */
    initializeCurrentDate();


    /*
     * Form submit.
     */
    initializeForm();


    /*
     * File upload.
     */
    initializeFileInput();


    /*
     * Tombol logout.
     */
    initializeLogout();

}


/* =========================================================
   TANGGAL PENGAJUAN
========================================================= */

function setTanggalPengajuan() {

    const input =
        document.getElementById(
            "tanggalPengajuan"
        );


    if (!input) {
        return;
    }


    const now =
        new Date();


    /*
     * Menghasilkan YYYY-MM-DD
     * untuk input type=date.
     */
    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    input.value =
        `${year}-${month}-${day}`;

}


/* =========================================================
   USER PROFILE
========================================================= */

function initializeUserProfile() {

    // ======================================
    // NAMA USER
    // ======================================

    const name =
        currentUser.nama_lengkap ||
        currentUser.nama ||
        currentUser.name ||
        currentUser.full_name ||
        "Pengguna";


    // ======================================
    // ROLE USER
    // ======================================

    let role =
        String(
            currentUser.role ||
            "kementerian"
        )
        .trim()
        .toLowerCase();


    // ======================================
    // FORMAT ROLE
    // ======================================

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


/* =========================================================
   INISIAL AVATAR
========================================================= */

function getInitials(name) {

    const words =
        String(name || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!words.length) {
        return "K";
    }


    /*
     * Untuk nama panjang,
     * ambil dua huruf pertama
     * dari kata yang relevan.
     */
    if (words.length === 1) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        words[0].charAt(0) +
        words[1].charAt(0)
    ).toUpperCase();

}


/* =========================================================
   CURRENT DATE TOPBAR
========================================================= */

function initializeCurrentDate() {

    const element =
        document.getElementById(
            "currentDate"
        );


    if (!element) {
        return;
    }


    const today =
        new Date();


    const formattedDate =
        today.toLocaleDateString(
            "id-ID",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );


    element.textContent =
        formattedDate;

}


/* =========================================================
   FORM
========================================================= */

function initializeForm() {

    const form =
        document.getElementById(
            "formLPJ"
        );


    if (!form) {

        console.warn(
            "Form LPJ tidak ditemukan."
        );

        return;
    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            await submitLPJ();

        }
    );

}


/* =========================================================
   FILE INPUT
========================================================= */

function initializeFileInput() {

    const input =
        document.getElementById(
            "fileLPJ"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "change",
        function () {

            updateFileLabel(
                input
            );

        }
    );

}


/* =========================================================
   UPDATE FILE LABEL
========================================================= */

function updateFileLabel(input) {

    if (
        !input ||
        !input.files ||
        !input.files.length
    ) {
        return;
    }


    const file =
        input.files[0];


    const container =
        input.closest(
            ".file-upload"
        );


    if (!container) {
        return;
    }


    const title =
        container.querySelector(
            ".file-upload-info strong"
        );


    const description =
        container.querySelector(
            ".file-upload-info span"
        );


    if (title) {

        title.textContent =
            file.name;

    }


    if (description) {

        description.textContent =
            formatFileSize(
                file.size
            );

    }

}


/* =========================================================
   FORMAT FILE SIZE
========================================================= */

function formatFileSize(bytes) {

    if (!bytes) {
        return "0 KB";
    }


    const mb =
        bytes / (
            1024 * 1024
        );


    if (mb >= 1) {

        return (
            mb.toFixed(2) +
            " MB"
        );

    }


    const kb =
        bytes / 1024;


    return (
        kb.toFixed(0) +
        " KB"
    );

}


/* =========================================================
   VALIDASI FORM LPJ
========================================================= */

function validateLPJForm() {

    const form =
        document.getElementById(
            "formLPJ"
        );


    if (!form) {

        alert(
            "Form LPJ tidak ditemukan."
        );

        return false;
    }


    /*
     * Validasi HTML5.
     */
    if (
        !form.checkValidity()
    ) {

        form.reportValidity();

        return false;
    }


    /*
     * Validasi file.
     */
    if (
        !validateLPJFile()
    ) {

        return false;
    }


    /*
     * Validasi jumlah dana.
     */
    const totalDana =
        Number(
            getValue(
                "totalDana"
            )
        );


    if (
        !Number.isFinite(
            totalDana
        ) ||
        totalDana < 0
    ) {

        alert(
            "Total dana tidak valid."
        );

        document
            .getElementById(
                "totalDana"
            )
            ?.focus();

        return false;
    }


    return true;

}


/* =========================================================
   VALIDASI FILE LPJ
========================================================= */

function validateLPJFile() {

    const input =
        document.getElementById(
            "fileLPJ"
        );


    if (
        !input ||
        !input.files ||
        !input.files.length
    ) {

        alert(
            "Dokumen LPJ wajib diunggah."
        );

        if (input) {
            input.focus();
        }

        return false;
    }


    const file =
        input.files[0];


    const fileName =
        file.name.toLowerCase();


    /*
     * Cek ekstensi.
     */
    const validExtension =
        ALLOWED_EXTENSIONS.some(
            function (extension) {

                return fileName.endsWith(
                    extension
                );

            }
        );


    if (!validExtension) {

        alert(
            "Dokumen LPJ harus berformat PDF, Word (.doc), atau Word (.docx)."
        );

        input.value =
            "";

        resetFileLabel(
            input
        );

        input.focus();

        return false;
    }


    /*
     * Cek ukuran.
     */
    if (
        file.size >
        MAX_FILE_SIZE
    ) {

        alert(
            "Ukuran dokumen LPJ maksimal 10 MB."
        );

        input.value =
            "";

        resetFileLabel(
            input
        );

        input.focus();

        return false;
    }


    return true;

}


/* =========================================================
   RESET FILE LABEL
========================================================= */

function resetFileLabel(input) {

    if (!input) {
        return;
    }


    const container =
        input.closest(
            ".file-upload"
        );


    if (!container) {
        return;
    }


    const title =
        container.querySelector(
            ".file-upload-info strong"
        );


    const description =
        container.querySelector(
            ".file-upload-info span"
        );


    if (title) {

        title.textContent =
            "Pilih Dokumen LPJ";

    }


    if (description) {

        description.textContent =
            "Format PDF / Word · Wajib";

    }

}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(id) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return "";
    }


    return String(
        element.value || ""
    ).trim();

}


/* =========================================================
   FILE → BASE64
========================================================= */

function getFileData(
    inputId,
    jenisDokumen
) {

    return new Promise(
        function (resolve, reject) {

            const input =
                document.getElementById(
                    inputId
                );


            if (
                !input ||
                !input.files ||
                !input.files.length
            ) {

                reject(
                    new Error(
                        "File tidak ditemukan."
                    )
                );

                return;
            }


            const file =
                input.files[0];


            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    const result =
                        String(
                            event.target.result ||
                            ""
                        );


                    /*
                     * Hapus prefix:
                     *
                     * data:application/pdf;base64,
                     *
                     * sehingga yang dikirim
                     * hanya Base64.
                     */
                    const commaIndex =
                        result.indexOf(
                            ","
                        );


                    const base64 =
                        commaIndex >= 0
                            ? result.substring(
                                commaIndex + 1
                            )
                            : result;


                    resolve({

                        jenis_dokumen:
                            jenisDokumen,

                        name:
                            file.name,

                        size:
                            file.size,

                        type:
                            file.type,

                        data:
                            base64

                    });

                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Gagal membaca dokumen LPJ."
                        )
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/* =========================================================
   KUMPULKAN DATA LPJ
========================================================= */

async function collectLPJData() {

    /*
     * Dokumen LPJ.
     */
    const dokumenLPJ =
        await getFileData(
            "fileLPJ",
            "Dokumen LPJ"
        );


    return {

        jenis_pengajuan:
            "LPJ",

        judul_pengajuan:
            getValue("judulKegiatan"),

        tanggal_kegiatan:
            getValue("tanggalPelaksanaan"),

        tempat_kegiatan:
            getValue("tempatPelaksanaan"),

        jumlah_dana:
            getValue("totalDana"),

        sumber_dana:
            getValue("sumberDana"),

        penanggung_jawab:
            getValue("penanggungJawab"),

        kontak_penanggung_jawab:
            getValue("kontakPenanggungJawab"),

        deskripsi_evaluasi:
            getValue("deskripsiEvaluasi"),

        catatan_pengajuan:
            getValue("catatan"),


        dokumen:
            [
                dokumenLPJ
            ]

    };

}


/* =========================================================
   SUBMIT LPJ
========================================================= */

async function submitLPJ() {

    /*
     * Validasi.
     */
    if (
        !validateLPJForm()
    ) {

        return;
    }


    const button =
        document.getElementById(
            "btnSubmitLPJ"
        );


    /*
     * Simpan teks tombol.
     */
    const originalText =
        button
            ? button.textContent
            : "Kirim Pengajuan";


    try {

        /*
         * Disable tombol agar
         * tidak terjadi double submit.
         */
        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Mengirim...";

        }


        /*
         * Kumpulkan data.
         */
        const lpjData =
            await collectLPJData();


        console.log(
            "Data LPJ:",
            lpjData
        );


        /*
         * Payload ke Apps Script.
         */
        const payload = {

            action:
                "createPengajuan",

            session_token:
                currentUser.session_token,


            ...lpjData

        };


        /*
         * Kirim ke backend.
         *
         * Content-Type text/plain
         * digunakan agar kompatibel
         * dengan endpoint Apps Script.
         */
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
                            payload
                        )

                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Server mengembalikan HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        console.log(
            "Response backend:",
            result
        );


        /*
         * Backend gagal.
         */
        if (
            !result ||
            result.success !== true
        ) {

            throw new Error(
                result &&
                result.message
                    ? result.message
                    : "Pengajuan LPJ gagal diproses."
            );

        }


        /*
         * BERHASIL
         */
        alert(
            "Pengajuan LPJ berhasil dikirim."
        );


        /*
         * Kembali ke halaman pengajuan.
         */
        window.location.href =
            PENGAJUAN_URL;


    } catch (error) {

        console.error(
            "Gagal mengirim LPJ:",
            error
        );


        alert(
            "Pengajuan LPJ gagal dikirim.\n\n" +
            error.message
        );


    } finally {

        /*
         * Aktifkan kembali tombol.
         */
        if (button) {

            button.disabled =
                false;

            button.textContent =
                originalText;

        }

    }

}


/* =========================================================
   LOGOUT
========================================================= */

function initializeLogout() {

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (!logoutButton) {
        return;
    }


    logoutButton.addEventListener(
        "click",
        function () {

            const confirmed =
                confirm(
                    "Apakah Anda yakin ingin keluar dari SITARA?"
                );


            if (!confirmed) {
                return;
            }


            /*
             * Hapus session lokal.
             */
            sessionStorage.removeItem(
                "sitaraUser"
            );


            /*
             * Kembali ke login.
             */
            window.location.href =
                LOGIN_URL;

        }
    );

}