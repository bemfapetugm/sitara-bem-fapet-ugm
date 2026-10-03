// ==========================================
// SITARA
// KEMENTERIAN SEKRETARIAT KABINET
// DASHBOARD JAVASCRIPT
// ==========================================

// ==========================================
// API CONFIG
// ==========================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


// ==========================================
// 1. CEK SESSION
// ==========================================

const sessionData =
    sessionStorage.getItem("sitaraUser");


if (!sessionData) {

    window.location.href =
        "../../login/index.html";

} else {

    try {

        const user =
            JSON.parse(sessionData);


        if (
            user.role !== "kementerian" ||
            user.kementerian_id !== "KEM001"
        ) {

            alert(
                "Anda tidak memiliki akses ke dashboard Kemensetkab."
            );


            sessionStorage.removeItem(
                "sitaraUser"
            );


            window.location.href =
                "../../login/index.html";

        }
        else {

            initializeKemensetkab(user);

        }


    } catch (error) {

        console.error(
            "Session error:",
            error
        );


        sessionStorage.removeItem(
            "sitaraUser"
        );


        window.location.href =
            "../../login/index.html";

    }

}

// ==========================================
// 2. INISIALISASI
// ==========================================

function initializeKemensetkab(user) {

    displayCurrentDate();

    displayUserProfile(user);

    displayWelcome(user);

    initializeLogout();

    loadDashboardKemensetkab(user);

}

// ==========================================
// LOAD DASHBOARD KEMENSETKAB
// ==========================================

async function loadDashboardKemensetkab(user) {

    try {


        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",

                    body: JSON.stringify({

                        action:
                        "getDashboardKemensetkab",

                        session_token:
                        user.session_token

                    })

                }
            );


        const result =
            await response.json();



        console.log(
            "Dashboard Kemensetkab:",
            result
        );



        if (!result.success) {

            console.error(
                result.message
            );

            return;

        }


        renderDashboardKemensetkab(
            result.data
        );



    }
    catch(error){

        console.error(
            "Load dashboard error:",
            error
        );

    }

}

// ==========================================
// 3. TANGGAL
// ==========================================

function displayCurrentDate() {

    const element =
        document.getElementById(
            "currentDate"
        );


    if (!element) return;


    const today =
        new Date();


    const formattedDate =
        today.toLocaleDateString(
            "id-ID",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );


    element.textContent =
        formattedDate;

}



// ==========================================
// 4. IDENTITAS USER
// ==========================================

function displayUserProfile(user) {

    // ======================================
    // NAMA USER
    // ======================================

    const name =
        user.nama_lengkap ||
        user.nama ||
        user.name ||
        user.full_name ||
        "Pengguna";


    // ======================================
    // ROLE USER
    // ======================================

    let role =
        String(
            user.role || "kementerian"
        )
            .trim()
            .toLowerCase();


    // Format role agar lebih rapi
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



// ==========================================
// 5. GENERATE INISIAL
// ==========================================

function getInitials(name) {

    if (!name) return "P";


    const parts =
        String(name)
            .trim()
            .split(/\s+/);


    // Jika hanya satu kata
    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }


    // Ambil dua kata pertama
    return parts
        .slice(0, 2)
        .map(function (part) {

            return part
                .charAt(0)
                .toUpperCase();

        })
        .join("");

}



// ==========================================
// 6. WELCOME
// ==========================================

function displayWelcome(user) {

    const name =
        user.nama_lengkap ||
        user.nama ||
        user.name ||
        "Pengguna";


    const welcomeTitle =
        document.getElementById(
            "welcomeTitle"
        );


    if (!welcomeTitle) return;


    welcomeTitle.textContent =
        "Selamat Datang, Kementerian Sekretariat Kabinet!";

}



// ==========================================
// 7. LOGOUT
// ==========================================

function initializeLogout() {

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (!logoutButton) return;


    logoutButton.addEventListener(
        "click",
        function () {

            const confirmation =
                confirm(
                    "Apakah kamu yakin ingin keluar dari SITARA?"
                );


            if (!confirmation) return;


            sessionStorage.removeItem(
                "sitaraUser"
            );


            window.location.href =
                "../../login/index.html";

        }
    );

}

// ==========================================
// RENDER DASHBOARD KEMENSETKAB
// ==========================================

function renderDashboardKemensetkab(data) {


    // ===============================
    // STATISTIK
    // ===============================

    const statistik =
        data.statistik;


    if (statistik) {


        const totalPengajuan =
            document.getElementById(
                "totalPengajuan"
            );


        const totalProses =
            document.getElementById(
                "totalProses"
            );


        const totalRevisi =
            document.getElementById(
                "totalRevisi"
            );


        const totalDokumen =
            document.getElementById(
                "totalDokumen"
            );


        if (totalPengajuan) {

            totalPengajuan.textContent =
                statistik.total_pengajuan;

        }


        if (totalProses) {

            totalProses.textContent =
                statistik.sedang_diproses;

        }


        if (totalRevisi) {

            totalRevisi.textContent =
                statistik.perlu_revisi;

        }


        if (totalDokumen) {

            totalDokumen.textContent =
                statistik.total_dokumen;

        }

    }

        // ===============================
    // TABEL PENGAJUAN TERBARU
    // ===============================

    const tableBody =
        document.getElementById(
            "pengajuanTerbaruBody"
        );


    if (tableBody) {


        const pengajuan =
            data.pengajuan_terbaru || [];


        // Jika belum ada data

        if (pengajuan.length === 0) {

            tableBody.innerHTML = `

                <tr>

                    <td 
                        colspan="5"
                        class="empty-state"
                    >
                        Belum ada pengajuan masuk.
                    </td>

                </tr>

            `;

        }


        else {


            tableBody.innerHTML = "";


            pengajuan.forEach(
                function(item, index) {


                    const row = `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>


                        <td>
                            ${item.nomor_pengajuan || "-"}
                        </td>


                        <td>
                            ${item.asal_kementerian || "-"}
                        </td>


                        <td>
                            ${item.jenis || "-"}
                        </td>


                        <td>
                            <span class="status-badge">
                                ${item.status || "-"}
                            </span>
                        </td>


                    </tr>

                    `;


                    tableBody.innerHTML += row;


                }
            );


        }

    }

}