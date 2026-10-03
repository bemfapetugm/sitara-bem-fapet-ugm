/* =========================================================
   SITARA
   PENGAJUAN PROPOSAL
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


/* =========================================================
   VARIABEL GLOBAL
========================================================= */

let currentUser = null;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        currentUser =
            checkSession();

        if (!currentUser) {
            return;
        }


        initializePage(
            currentUser
        );


        initializeForm();


        initializeFileInputs();


        initializeDateLimits();

    }
);


/* =========================================================
   CEK SESSION
========================================================= */

function checkSession() {

    const sessionData =
        sessionStorage.getItem(
            "sitaraUser"
        );


    if (!sessionData) {

        window.location.href =
            LOGIN_URL;

        return null;
    }


    try {

        const user =
            JSON.parse(
                sessionData
            );


        if (!user) {

            sessionStorage.removeItem(
                "sitaraUser"
            );

            window.location.href =
                LOGIN_URL;

            return null;
        }


        if (!user.session_token) {

            sessionStorage.removeItem(
                "sitaraUser"
            );

            window.location.href =
                LOGIN_URL;

            return null;
        }


        const role =
            String(
                user.role || ""
            )
            .trim()
            .toLowerCase();


        /*
         * Halaman ini hanya untuk
         * akun kementerian.
         */

        if (
            role !== "kementerian"
        ) {

            alert(
                "Anda tidak memiliki akses ke halaman pengajuan proposal."
            );

            window.location.href =
                LOGIN_URL;

            return null;
        }


        return user;


    } catch (error) {

        console.error(
            "Session error:",
            error
        );


        sessionStorage.removeItem(
            "sitaraUser"
        );


        window.location.href =
            LOGIN_URL;


        return null;
    }
}


/* =========================================================
   INITIALIZE PAGE
========================================================= */

function initializePage(user) {

    displayCurrentDate();


    displayUserProfile(
        user
    );


    displayKementerian(
        user
    );


    displaySubmissionDate();


    initializeLogout();

}


/* =========================================================
   TANGGAL TOPBAR
========================================================= */

function displayCurrentDate() {

    const element =
        document.getElementById(
            "currentDate"
        );


    if (!element) {
        return;
    }


    const today =
        new Date();


    element.textContent =
        today.toLocaleDateString(
            "id-ID",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

}


/* =========================================================
   IDENTITAS USER
========================================================= */

function displayUserProfile(user) {

    const nama =
        user.nama_lengkap ||
        user.nama ||
        user.name ||
        user.full_name ||
        "Pengguna";


    const role =
        String(
            user.role || "Kementerian"
        )
        .trim();


    const initial =
        getInitial(
            nama
        );


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


    if (profileName) {

        profileName.textContent =
            nama;

    }


    if (profileRole) {

        profileRole.textContent =
            formatRole(
                role
            );

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


/* =========================================================
   KEMENTERIAN OTOMATIS
========================================================= */

function displayKementerian(user) {

    const input =
        document.getElementById(
            "namaKementerian"
        );


    if (!input) {
        return;
    }


    /*
     * Backend login SITARA dapat memberikan
     * nama kementerian pada session.
     */

    const namaUnit =
        user.nama_unit ||
        user.nama_kementerian ||
        user.kementerian_nama ||
        "";


    if (namaUnit) {

        input.value =
            namaUnit;

        return;
    }


    /*
     * Fallback sementara.
     */

    input.value =
        "Kementerian Hubungan Kerja Sama";

}


/* =========================================================
   TANGGAL PENGAJUAN OTOMATIS
========================================================= */

function displaySubmissionDate() {

    const input =
        document.getElementById(
            "tanggalPengajuan"
        );


    if (!input) {
        return;
    }


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        )
        .padStart(
            2,
            "0"
        );


    input.value =
        `${year}-${month}-${day}`;

}


/* =========================================================
   BATAS TANGGAL PELAKSANAAN
========================================================= */

function initializeDateLimits() {

    const tanggal =
        document.getElementById(
            "tanggalPelaksanaan"
        );


    if (!tanggal) {
        return;
    }


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        )
        .padStart(
            2,
            "0"
        );


    tanggal.min =
        `${year}-${month}-${day}`;

}


/* =========================================================
   FORM
========================================================= */

function initializeForm() {

    const form =
        document.getElementById(
            "formProposal"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            submitProposal();

        }
    );


    /*
     * Validasi waktu.
     */

    const waktuMulai =
        document.getElementById(
            "waktuMulai"
        );


    const waktuSelesai =
        document.getElementById(
            "waktuSelesai"
        );


    if (waktuMulai) {

        waktuMulai.addEventListener(
            "change",
            validateTime
        );

    }


    if (waktuSelesai) {

        waktuSelesai.addEventListener(
            "change",
            validateTime
        );

    }


    /*
     * Format nomor rekening.
     */

    const nomorRekening =
        document.getElementById(
            "nomorRekening"
        );


    if (nomorRekening) {

        nomorRekening.addEventListener(
            "input",
            function () {

                this.value =
                    this.value.replace(
                        /\D/g,
                        ""
                    );

            }
        );

    }

}


/* =========================================================
   VALIDASI WAKTU
========================================================= */

function validateTime() {

    const waktuMulai =
        document.getElementById(
            "waktuMulai"
        );


    const waktuSelesai =
        document.getElementById(
            "waktuSelesai"
        );


    if (
        !waktuMulai ||
        !waktuSelesai
    ) {
        return true;
    }


    if (
        !waktuMulai.value ||
        !waktuSelesai.value
    ) {
        return true;
    }


    if (
        waktuSelesai.value <=
        waktuMulai.value
    ) {

        waktuSelesai.setCustomValidity(
            "Waktu selesai harus lebih dari waktu mulai."
        );


        return false;

    }


    waktuSelesai.setCustomValidity(
        ""
    );


    return true;

}


/* =========================================================
   FILE INPUT
========================================================= */

function initializeFileInputs() {

    const fileInputs =
        document.querySelectorAll(
            'input[type="file"]'
        );


    fileInputs.forEach(
        function (input) {

            input.addEventListener(
                "change",
                function () {

                    updateFileName(
                        input
                    );

                }
            );

        }
    );

}


/* =========================================================
   MENAMPILKAN NAMA FILE
========================================================= */

function updateFileName(input) {

    const file =
        input.files &&
        input.files.length
            ? input.files[0]
            : null;


    if (!file) {
        return;
    }


    const fileName =
        file.name.toLowerCase();


    const validExtension =
        fileName.endsWith(
            ".doc"
        ) ||
        fileName.endsWith(
            ".docx"
        );


    if (!validExtension) {

        alert(
            "Dokumen harus menggunakan format Word (.doc atau .docx)."
        );


        input.value =
            "";


        resetFileLabel(
            input
        );


        return;
    }


    const uploadBox =
        input.closest(
            ".file-upload"
        );


    if (!uploadBox) {
        return;
    }


    const strong =
        uploadBox.querySelector(
            ".file-upload-info strong"
        );


    const span =
        uploadBox.querySelector(
            ".file-upload-info span"
        );


    if (strong) {

        strong.textContent =
            file.name;

    }


    if (span) {

        span.textContent =
            formatFileSize(
                file.size
            );

    }

}


/* =========================================================
   RESET FILE LABEL
========================================================= */

function resetFileLabel(input) {

    const uploadBox =
        input.closest(
            ".file-upload"
        );


    if (!uploadBox) {
        return;
    }


    const strong =
        uploadBox.querySelector(
            ".file-upload-info strong"
        );


    const span =
        uploadBox.querySelector(
            ".file-upload-info span"
        );


    const id =
        input.id;


    const defaultLabels = {

        fileProposal:
            [
                "Pilih Proposal Kegiatan",
                "Format Word (.doc/.docx) · Wajib"
            ],

        fileFormKegiatan:
            [
                "Pilih Form Kegiatan",
                "Format Word (.doc/.docx) · Wajib"
            ],

        fileSuratPencairan:
            [
                "Pilih Surat Pencairan",
                "Format Word (.doc/.docx) · Wajib"
            ],

        fileSuratPeminjaman:
            [
                "Pilih Surat Peminjaman",
                "Format Word (.doc/.docx) · Opsional"
            ]

    };


    const label =
        defaultLabels[id];


    if (!label) {
        return;
    }


    if (strong) {

        strong.textContent =
            label[0];

    }


    if (span) {

        span.textContent =
            label[1];

    }

}


/* =========================================================
   FORMAT FILE SIZE
========================================================= */

function formatFileSize(bytes) {

    if (!bytes) {
        return "0 KB";
    }


    const kb =
        bytes / 1024;


    if (kb < 1024) {

        return (
            Math.round(kb) +
            " KB"
        );

    }


    const mb =
        kb / 1024;


    return (
        mb.toFixed(2) +
        " MB"
    );

}


/* =========================================================
   SUBMIT PROPOSAL
========================================================= */

async function submitProposal() {

    const form =
        document.getElementById(
            "formProposal"
        );


    if (!form) {
        return;
    }


    // ==========================================
    // VALIDASI FORM
    // ==========================================

    if (
        !form.checkValidity()
    ) {

        form.reportValidity();

        return;

    }


    // ==========================================
    // VALIDASI WAKTU
    // ==========================================

    if (
        !validateTime()
    ) {

        alert(
            "Waktu selesai harus lebih dari waktu mulai."
        );

        return;

    }


    // ==========================================
    // VALIDASI FILE
    // ==========================================

    if (
        !validateProposalFiles()
    ) {

        return;

    }


    // ==========================================
    // SESSION
    // ==========================================

    if (
        !currentUser ||
        !currentUser.session_token
    ) {

        alert(
            "Session tidak ditemukan. Silakan login kembali."
        );

        window.location.href =
            LOGIN_URL;

        return;

    }


    // ==========================================
    // BUTTON
    // ==========================================

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    const originalText =
        submitButton
            ? submitButton.textContent
            : "Ajukan Proposal";


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Mengirim...";

    }


    try {

        // ==========================================
        // BACA FILE + DATA FORM
        // ==========================================

        const proposalData =
            await collectProposalData();


        console.log(
            "Data Proposal siap dikirim:",
            proposalData
        );


        // ==========================================
        // KIRIM KE GOOGLE APPS SCRIPT
        // ==========================================

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
                            proposalData
                        )

                }
            );


        const result =
            await response.json();


        console.log(
            "Response createPengajuan:",
            result
        );


        // ==========================================
        // GAGAL
        // ==========================================

        if (
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Pengajuan gagal dikirim."
            );

        }


        // ==========================================
        // BERHASIL
        // ==========================================

        const pengajuanId =
            result.data &&
            result.data.pengajuan_id
                ? result.data.pengajuan_id
                : "-";


        alert(
            "Pengajuan berhasil dikirim.\n\n" +
            "Nomor Pengajuan: " +
            pengajuanId +
            "\n\n" +
            "Pengajuan selanjutnya akan diproses oleh Biro AGATA."
        );


        // ==========================================
        // REDIRECT
        // ==========================================

        window.location.href =
            PENGAJUAN_URL;


    } catch (error) {

        console.error(
            "submitProposal error:",
            error
        );


        alert(
            error.message ||
            "Terjadi kesalahan saat mengirim pengajuan."
        );


        // Kembalikan tombol
        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                originalText;

        }

    }

}

/* =========================================================
   VALIDASI FILE PROPOSAL
========================================================= */

function validateProposalFiles() {

    const requiredFiles = [

        "fileProposal",

        "fileFormKegiatan",

        "fileSuratPencairan"

    ];


    for (
        let i = 0;
        i < requiredFiles.length;
        i++
    ) {

        const input =
            document.getElementById(
                requiredFiles[i]
            );


        if (
            !input ||
            !input.files ||
            !input.files.length
        ) {

            alert(
                "Dokumen wajib belum lengkap."
            );


            if (input) {
                input.focus();
            }


            return false;
        }


        const fileName =
            input.files[0]
                .name
                .toLowerCase();


        if (
            !fileName.endsWith(".doc") &&
            !fileName.endsWith(".docx")
        ) {

            alert(
                "Semua dokumen wajib harus berformat Word (.doc atau .docx)."
            );


            input.value =
                "";


            resetFileLabel(
                input
            );


            input.focus();


            return false;
        }

    }


    /*
     * File opsional.
     */

    const optionalFile =
        document.getElementById(
            "fileSuratPeminjaman"
        );


    if (
        optionalFile &&
        optionalFile.files &&
        optionalFile.files.length
    ) {

        const fileName =
            optionalFile.files[0]
                .name
                .toLowerCase();


        if (
            !fileName.endsWith(".doc") &&
            !fileName.endsWith(".docx")
        ) {

            alert(
                "Surat Peminjaman Fasilitas dan Tempat harus berformat Word (.doc atau .docx)."
            );


            optionalFile.value =
                "";


            resetFileLabel(
                optionalFile
            );


            optionalFile.focus();


            return false;
        }

    }


    return true;

}


/* =========================================================
   KUMPULKAN DATA FORM
========================================================= */

async function collectProposalData() {

    const getValue =
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            return element
                ? element.value.trim()
                : "";

        };


    return {

        // ==========================================
        // PENGAJUAN
        // ==========================================

        action:
            "createPengajuan",

        session_token:
            currentUser.session_token,

        jenis_pengajuan:
            "Proposal",


        // ==========================================
        // SUMBER DANA
        // ==========================================

        sumber_dana:
            getValue(
                "sumberDana"
            ),


        // ==========================================
        // IDENTITAS
        // ==========================================

        kementerian_id:
            currentUser.kementerian_id || "",

        kementerian:
            getValue(
                "namaKementerian"
            ),

        pengaju_user_id:
            currentUser.user_id || "",

        tanggal_pengajuan:
            getValue(
                "tanggalPengajuan"
            ),

        penanggung_jawab:
            getValue(
                "penanggungJawab"
            ),

        kontak_penanggung_jawab:
            getValue(
                "kontakPenanggungJawab"
            ),


        // ==========================================
        // INFORMASI PROPOSAL
        // ==========================================

        judul_proposal:
            getValue(
                "judulProposal"
            ),

        /*
         * Backend menggunakan judul_pengajuan.
         */
        judul_pengajuan:
            getValue(
                "judulProposal"
            ),

        nomor_surat:
            getValue(
                "nomorSurat"
            ),

        tanggal_pelaksanaan:
            getValue(
                "tanggalPelaksanaan"
            ),

        /*
         * Backend menggunakan tanggal_kegiatan.
         */
        tanggal_kegiatan:
            getValue(
                "tanggalPelaksanaan"
            ),

        waktu_mulai:
            getValue(
                "waktuMulai"
            ),

        waktu_selesai:
            getValue(
                "waktuSelesai"
            ),

        tempat_pelaksanaan:
            getValue(
                "tempatPelaksanaan"
            ),

        /*
         * Backend menggunakan tempat_kegiatan.
         */
        tempat_kegiatan:
            getValue(
                "tempatPelaksanaan"
            ),

        deskripsi_kegiatan:
            getValue(
                "deskripsiKegiatan"
            ),


        // ==========================================
        // ANGGARAN
        // ==========================================

        total_dana:
            normalizeAmount(
                getValue(
                    "totalDana"
                )
            ),

        jumlah_dana:
            normalizeAmount(
                getValue(
                    "totalDana"
                )
            ),

        nomor_rekening:
            getValue(
                "nomorRekening"
            ),

        bank_rekening:
            getValue(
                "bankRekening"
            ),


        // ==========================================
        // CATATAN
        // ==========================================

        catatan:
            getValue(
                "catatan"
            ),


        // ==========================================
        // DOKUMEN
        // ==========================================

        dokumen: [

            await getFileData(
                "fileProposal",
                "Proposal Kegiatan"
            ),

            await getFileData(
                "fileFormKegiatan",
                "Form Kegiatan"
            ),

            await getFileData(
                "fileSuratPencairan",
                "Surat Pencairan"
            ),

            await getFileData(
                "fileSuratPeminjaman",
                "Surat Peminjaman"
            )

        ].filter(Boolean)

    };

}

/* =========================================================
   NORMALISASI JUMLAH DANA
========================================================= */

function normalizeAmount(value) {

    if (!value) {
        return "";
    }


    let text =
        String(value)
            .trim();


    /*
     * Hilangkan simbol mata uang
     * dan karakter selain angka,
     * titik, koma.
     */

    text =
        text.replace(
            /[^\d.,-]/g,
            ""
        );


    if (!text) {
        return "";
    }


    /*
     * Jika terdapat titik dan koma,
     * kita anggap titik sebagai pemisah
     * ribuan dan koma sebagai desimal.
     */

    if (
        text.includes(".") &&
        text.includes(",")
    ) {

        text =
            text.replace(
                /\./g,
                ""
            );

        text =
            text.replace(
                ",",
                "."
            );

    }

    /*
     * Jika hanya koma,
     * periksa apakah koma kemungkinan
     * pemisah desimal.
     */

    else if (
        text.includes(",")
    ) {

        const parts =
            text.split(",");


        if (
            parts.length === 2 &&
            parts[1].length <= 2
        ) {

            text =
                text.replace(
                    ",",
                    "."
                );

        } else {

            text =
                text.replace(
                    /,/g,
                    ""
                );

        }

    }

    /*
     * Jika hanya titik dan tiga digit
     * setelahnya, anggap sebagai pemisah
     * ribuan.
     */

    else if (
        text.includes(".")
    ) {

        const parts =
            text.split(".");


        if (
            parts.length > 1 &&
            parts
                .slice(1)
                .every(
                    function (part) {
                        return part.length === 3;
                    }
                )
        ) {

            text =
                text.replace(
                    /\./g,
                    ""
                );

        }

    }


    const number =
        Number(
            text
        );


    if (
        Number.isNaN(
            number
        )
    ) {

        return value;

    }


    return number;

}


/* =========================================================
   DATA FILE
========================================================= */

async function getFileData(
    id,
    jenisDokumen
) {

    const input =
        document.getElementById(
            id
        );


    if (
        !input ||
        !input.files ||
        !input.files.length
    ) {

        return null;

    }


    const file =
        input.files[0];


    const base64 =
        await readFileAsBase64(
            file
        );


    return {

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

    };

}

// ==========================================
// BACA FILE → BASE64
// ==========================================

function readFileAsBase64(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    const result =
                        String(
                            reader.result || ""
                        );


                    /*
                     * FileReader menghasilkan:
                     *
                     * data:application/...;base64,XXXX
                     *
                     * Yang dikirim ke backend
                     * hanya bagian XXXX.
                     */

                    const commaIndex =
                        result.indexOf(",");


                    if (
                        commaIndex === -1
                    ) {

                        reject(
                            new Error(
                                "Gagal membaca file."
                            )
                        );

                        return;

                    }


                    resolve(
                        result.substring(
                            commaIndex + 1
                        )
                    );

                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Gagal membaca file " +
                            file.name
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
   FORMAT ROLE
========================================================= */

function formatRole(role) {

    const value =
        String(
            role || ""
        )
        .trim()
        .toLowerCase();


    const roleNames = {

        kementerian:
            "Kementerian",

        menteri:
            "Menteri",

        mensetkab:
            "Menteri Sekretaris Kabinet",

        menkeu:
            "Menteri Keuangan",

        anggota:
            "Anggota"

    };


    return (
        roleNames[value] ||
        role ||
        "Pengguna"
    );

}


/* =========================================================
   INITIAL
========================================================= */

function getInitial(name) {

    const value =
        String(
            name || ""
        )
        .trim();


    if (!value) {
        return "U";
    }


    /*
     * Ambil inisial dari dua kata pertama
     * jika tersedia.
     */

    const words =
        value
            .split(/\s+/)
            .filter(Boolean);


    if (
        words.length >= 2
    ) {

        return (
            words[0].charAt(0) +
            words[1].charAt(0)
        )
        .toUpperCase();

    }


    return value
        .charAt(0)
        .toUpperCase();

}


/* =========================================================
   LOGOUT
========================================================= */

function initializeLogout() {

    const button =
        document.getElementById(
            "logoutButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        function () {

            const confirmed =
                confirm(
                    "Apakah Anda yakin ingin keluar dari SITARA?"
                );


            if (!confirmed) {
                return;
            }


            sessionStorage.removeItem(
                "sitaraUser"
            );


            window.location.href =
                LOGIN_URL;

        }
    );

}