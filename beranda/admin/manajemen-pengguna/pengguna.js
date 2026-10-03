// ==========================================
// SITARA - MANAJEMEN PENGGUNA
// pengguna.js
// ==========================================

const API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";

// ==========================================
// STATE
// ==========================================

let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const rowsPerPage = 10;


// ==========================================
// ELEMENT
// ==========================================

const totalUsers = document.getElementById("totalUsers");
const activeUsers = document.getElementById("activeUsers");
const pendingUsers = document.getElementById("pendingUsers");
const inactiveUsers = document.getElementById("inactiveUsers");

const searchUser = document.getElementById("searchUser");
const filterRole = document.getElementById("filterRole");
const filterStatus = document.getElementById("filterStatus");

const userTableBody = document.getElementById("userTableBody");
const pagination = document.getElementById("pagination");
const tableInfo = document.getElementById("tableInfo");

const btnTambahPengguna =
    document.getElementById("btnTambahPengguna");


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
// CHECK ADMIN SESSION
// ==========================================

function checkAdminSession() {

    const user = getSessionUser();

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

    return user;
}


// ==========================================
// LOAD USERS
// ==========================================

async function loadUsers() {

    const user = checkAdminSession();

    if (!user) return;

    try {

        userTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;">
                    Memuat data pengguna...
                </td>
            </tr>
        `;

        const response = await fetch(
            API_URL,
            {
                method: "POST",

                body: JSON.stringify({
                    action: "getUsers",
                    session_token:
                        user.session_token
                })
            }
        );

        const result =
            await response.json();

        console.log(
            "Response getUsers:",
            result
        );

        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal mengambil data pengguna."
            );
        }

        allUsers =
            Array.isArray(result.data)
                ? result.data
                : [];

        filteredUsers = [...allUsers];

        updateStatistics();

        applyFilters();

    } catch (error) {

        console.error(
            "Error loadUsers:",
            error
        );

        userTableBody.innerHTML = `
            <tr>
                <td colspan="8"
                    style="text-align:center; color:#b42318;">
                    Gagal memuat data pengguna.
                </td>
            </tr>
        `;

        alert(
            "Gagal memuat data pengguna: " +
            error.message
        );
    }
}


// ==========================================
// STATISTICS
// ==========================================

function updateStatistics() {

    const total =
        allUsers.length;

    const active =
        allUsers.filter(
            user =>
                normalize(user.status_akun) === "aktif"
        ).length;

    const pending =
        allUsers.filter(
            user =>
                normalize(user.status_akun) === "pending" ||
                normalize(user.status_akun) === "menunggu_verifikasi"
        ).length;

    const inactive =
        allUsers.filter(
            user =>
                normalize(user.status_akun) === "nonaktif" ||
                normalize(user.status_akun) === "tidak aktif"
        ).length;

    totalUsers.textContent = total;
    activeUsers.textContent = active;
    pendingUsers.textContent = pending;
    inactiveUsers.textContent = inactive;
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
// FILTER
// ==========================================

function applyFilters() {

    const keyword =
        normalize(searchUser.value);

    const role =
        normalize(filterRole.value);

    const status =
        normalize(filterStatus.value);

    filteredUsers =
        allUsers.filter(user => {

            const searchableText = [

                user.nama_lengkap,
                user.email,
                user.nim,
                user.no_telepon,
                user.nama_kementerian,
                user.kementerian_id

            ]
                .join(" ")
                .toLowerCase();

            const matchSearch =
                !keyword ||
                searchableText.includes(keyword);

            const matchRole =
                !role ||
                normalize(user.role) === role;

            const matchStatus =
                !status ||
                normalize(user.status_akun) === status;

            return (
                matchSearch &&
                matchRole &&
                matchStatus
            );
        });

    currentPage = 1;

    renderTable();
    renderPagination();
    updateTableInfo();
}


// ==========================================
// RENDER TABLE
// ==========================================

function renderTable() {

    userTableBody.innerHTML = "";

    if (filteredUsers.length === 0) {

        userTableBody.innerHTML = `
            <tr>
                <td colspan="8"
                    style="text-align:center;">
                    Tidak ada pengguna yang ditemukan.
                </td>
            </tr>
        `;

        return;
    }

    const startIndex =
        (currentPage - 1) * rowsPerPage;

    const endIndex =
        startIndex + rowsPerPage;

    const pageUsers =
        filteredUsers.slice(
            startIndex,
            endIndex
        );


    pageUsers.forEach(
        (user, index) => {

            const rowNumber =
                startIndex + index + 1;

            const userId =
                escapeAttribute(user.user_id);


            const tr =
                document.createElement("tr");


            tr.innerHTML = `

                <!-- NO -->
                <td>
                    ${rowNumber}
                </td>


                <!-- PENGGUNA -->
                <td>
                    <div class="user-name">
                        ${escapeHTML(
                            user.nama_lengkap
                        )}
                    </div>
                </td>


                <!-- EMAIL -->
                <td>
                    ${escapeHTML(
                        user.email || "-"
                    )}
                </td>


                <!-- NIM -->
                <td>
                    ${escapeHTML(
                        user.nim || "-"
                    )}
                </td>


                <!-- KEMENTERIAN -->
                <td>
                    ${escapeHTML(
                        user.nama_kementerian || "-"
                    )}
                </td>


                <!-- ROLE -->
                <td>
                    ${createRoleBadge(
                        user.role
                    )}
                </td>


                <!-- STATUS -->
                <td>
                    ${createStatusBadge(
                        user.status_akun
                    )}
                </td>


                <!-- AKSI -->
                <td>

                    <div class="user-actions">

                        <button
                            type="button"
                            class="btn-action edit"
                            onclick="viewUser('${userId}')"
                            title="Lihat/Edit pengguna">
                            Lihat/Edit
                        </button>


                        <button
                            type="button"
                            class="btn-action warning"
                            onclick="deactivateUser('${userId}')"
                            title="Nonaktifkan pengguna">
                            Nonaktifkan
                        </button>


                        <button
                            type="button"
                            class="btn-action delete"
                            onclick="deleteUser('${userId}')"
                            title="Hapus pengguna">
                            Hapus
                        </button>

                    </div>

                </td>

            `;

            userTableBody.appendChild(tr);

        }
    );
}


// ==========================================
// ROLE BADGE
// ==========================================

function createRoleBadge(role) {

    const roleText =
        role || "-";

    const roleClass = normalize(roleText);

    return `
        <span class="badge badge-role ${escapeAttribute(roleClass)}">
            ${escapeHTML(roleText)}
        </span>
    `;
}


// ==========================================
// STATUS BADGE
// ==========================================

function createStatusBadge(status) {

    const normalized =
        normalize(status);

    let className =
        "badge-status";

    let text =
        status || "-";


    if (normalized === "aktif") {

        className += " active";

    } else if (
        normalized === "pending" ||
        normalized === "menunggu_verifikasi"
    ) {

        className += " pending";

    } else if (
        normalized === "nonaktif" ||
        normalized === "tidak aktif"
    ) {

        className += " inactive";

    }


    return `
        <span class="badge ${className}">
            ${escapeHTML(text)}
        </span>
    `;
}


// ==========================================
// VIEW / EDIT USER
// ==========================================

function viewUser(userId) {

    if (!userId) {

        alert(
            "ID pengguna tidak ditemukan."
        );

        return;
    }

    window.location.href =
        "./edit-pengguna/index.html?id=" +
        encodeURIComponent(userId);
}


// ==========================================
// DEACTIVATE USER
// ==========================================

async function deactivateUser(userId) {

    if (!userId) {

        alert(
            "ID pengguna tidak ditemukan."
        );

        return;
    }


    const user =
        allUsers.find(
            item =>
                String(item.user_id) ===
                String(userId)
        );


    if (!user) {

        alert(
            "Data pengguna tidak ditemukan."
        );

        return;
    }


    const nama =
        user.nama_lengkap || "pengguna";


    const confirmed =
        confirm(
            `Apakah Anda yakin ingin menonaktifkan akun "${nama}"?\n\n` +
            "Pengguna tidak akan dapat login, " +
            "tetapi data akun tetap disimpan."
        );


    if (!confirmed) {
        return;
    }


    const sessionUser =
        checkAdminSession();

    if (!sessionUser) return;


    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",

                    body: JSON.stringify({

                        action:
                            "deactivateUser",

                        session_token:
                            sessionUser.session_token,

                        user_id:
                            userId

                    })
                }
            );


        const result =
            await response.json();


        console.log(
            "Response deactivateUser:",
            result
        );


        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal menonaktifkan pengguna."
            );
        }


        alert(
            result.message ||
            "Pengguna berhasil dinonaktifkan."
        );


        await loadUsers();


    } catch (error) {

        console.error(
            "Error deactivateUser:",
            error
        );


        alert(
            "Gagal menonaktifkan pengguna: " +
            error.message
        );
    }
}


// ==========================================
// DELETE USER
// ==========================================

async function deleteUser(userId) {

    if (!userId) {

        alert(
            "ID pengguna tidak ditemukan."
        );

        return;
    }


    const user =
        allUsers.find(
            item =>
                String(item.user_id) ===
                String(userId)
        );


    if (!user) {

        alert(
            "Data pengguna tidak ditemukan."
        );

        return;
    }


    const nama =
        user.nama_lengkap || "pengguna";


    const confirmed =
        confirm(
            `PERINGATAN!\n\n` +
            `Anda akan menghapus akun "${nama}".\n\n` +
            "Data pengguna akan dihapus secara permanen " +
            "dari database dan tidak dapat dikembalikan.\n\n" +
            "Apakah Anda benar-benar ingin melanjutkan?"
        );


    if (!confirmed) {
        return;
    }


    const secondConfirmation =
        confirm(
            `Konfirmasi terakhir:\n\n` +
            `Hapus permanen akun "${nama}"?`
        );


    if (!secondConfirmation) {
        return;
    }


    const sessionUser =
        checkAdminSession();

    if (!sessionUser) return;


    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",

                    body: JSON.stringify({

                        action:
                            "deleteUser",

                        session_token:
                            sessionUser.session_token,

                        user_id:
                            userId

                    })
                }
            );


        const result =
            await response.json();


        console.log(
            "Response deleteUser:",
            result
        );


        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal menghapus pengguna."
            );
        }


        alert(
            result.message ||
            "Pengguna berhasil dihapus."
        );


        await loadUsers();


    } catch (error) {

        console.error(
            "Error deleteUser:",
            error
        );


        alert(
            "Gagal menghapus pengguna: " +
            error.message
        );
    }
}


// ==========================================
// PAGINATION
// ==========================================

function renderPagination() {

    pagination.innerHTML = "";

    const totalPages =
        Math.ceil(
            filteredUsers.length /
            rowsPerPage
        );


    if (totalPages <= 1) {
        return;
    }


    // PREVIOUS

    const previousButton =
        document.createElement("button");

    previousButton.textContent = "‹";

    previousButton.className =
        "pagination-btn";

    previousButton.disabled =
        currentPage === 1;


    previousButton.addEventListener(
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                renderTable();
                renderPagination();
                updateTableInfo();

            }
        }
    );


    pagination.appendChild(
        previousButton
    );


    // PAGE NUMBERS

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement("button");

        button.textContent = page;

        button.className =
            "pagination-btn" +
            (
                page === currentPage
                    ? " active"
                    : ""
            );


        button.addEventListener(
            "click",
            () => {

                currentPage = page;

                renderTable();
                renderPagination();
                updateTableInfo();

            }
        );


        pagination.appendChild(button);

    }


    // NEXT

    const nextButton =
        document.createElement("button");

    nextButton.textContent = "›";

    nextButton.className =
        "pagination-btn";

    nextButton.disabled =
        currentPage === totalPages;


    nextButton.addEventListener(
        "click",
        () => {

            if (
                currentPage <
                totalPages
            ) {

                currentPage++;

                renderTable();
                renderPagination();
                updateTableInfo();

            }
        }
    );


    pagination.appendChild(
        nextButton
    );
}


// ==========================================
// TABLE INFO
// ==========================================

function updateTableInfo() {

    if (!tableInfo) {
        return;
    }


    const total =
        filteredUsers.length;


    if (total === 0) {

        tableInfo.textContent =
            "Menampilkan 0 pengguna";

        return;
    }


    const start =
        (currentPage - 1) *
        rowsPerPage + 1;


    const end =
        Math.min(
            currentPage * rowsPerPage,
            total
        );


    tableInfo.textContent =
        `Menampilkan ${start}–${end} dari ${total} pengguna`;
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// ESCAPE ATTRIBUTE
// ==========================================

function escapeAttribute(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


// ==========================================
// TAMBAH PENGGUNA
// ==========================================

if (btnTambahPengguna) {

    btnTambahPengguna.addEventListener(
        "click",
        () => {

            window.location.href =
                "./tambah-pengguna/index.html";

        }
    );
}


// ==========================================
// EVENT LISTENER
// ==========================================

if (searchUser) {

    searchUser.addEventListener(
        "input",
        applyFilters
    );
}


if (filterRole) {

    filterRole.addEventListener(
        "change",
        applyFilters
    );
}


if (filterStatus) {

    filterStatus.addEventListener(
        "change",
        applyFilters
    );
}


// ==========================================
// ADMIN SHELL
// ==========================================

function initializeAdminShell(user) {

    const adminName =
        user.nama ||
        user.name ||
        user.full_name ||
        user.nama_lengkap ||
        "Administrator";

    const adminRole = String(user.role || "Admin").trim();

    const initial = adminName.trim().charAt(0).toUpperCase();

    const dateElement = document.getElementById("currentDate");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    const profileName = document.querySelector(".profile-info h4");
    const profileRole = document.querySelector(".profile-info p");
    const profileAvatar = document.querySelector(".profile-avatar");
    const topbarAvatar = document.querySelector(".topbar-avatar");

    if (profileName) profileName.textContent = adminName;
    if (profileRole) profileRole.textContent = adminRole;
    if (profileAvatar) profileAvatar.textContent = initial;
    if (topbarAvatar) topbarAvatar.textContent = initial;

    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            if (!confirm("Apakah Anda yakin ingin keluar dari SITARA?")) return;
            sessionStorage.removeItem("sitaraUser");
            window.location.href = "../../../login/index.html";
        });
    }
}


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const user = checkAdminSession();

        if (!user) return;

        const role = normalize(user.role);

        if (role !== "admin") {
            const routes = {
                anggota: "../../anggota/index.html",
                pimpinan: "../../pimpinan/index.html"
            };

            window.location.href =
                routes[role] || "../../../login/index.html";

            return;
        }

        initializeAdminShell(user);
        loadUsers();

    }
);