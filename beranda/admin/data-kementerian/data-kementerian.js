/* =========================================================
   DATA KEMENTERIAN
   admin/data-kementerian/data-kementerian.js
   ========================================================= */

const API_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


/* =========================================================
   SESSION
   ========================================================= */

function checkAdminSession() {

    const sessionData = sessionStorage.getItem("sitaraUser");

    if (!sessionData) {
        window.location.href = "../../../login/index.html";
        return null;
    }

    try {

        const user = JSON.parse(sessionData);

        if (!user.session_token) {
            sessionStorage.removeItem("sitaraUser");
            window.location.href = "../../../login/index.html";
            return null;
        }

        const role = String(user.role || "").trim().toLowerCase();

        if (role !== "admin") {
            window.location.href = "../../../login/index.html";
            return null;
        }

        return user;

    } catch (error) {

        console.error("Session error:", error);

        sessionStorage.removeItem("sitaraUser");
        window.location.href = "../../../login/index.html";

        return null;
    }
}


/* =========================================================
   INITIALIZE ADMIN SHELL
   ========================================================= */

function initializeAdminShell(user) {

    const adminName =
        user.nama_lengkap ||
        user.nama ||
        user.name ||
        user.full_name ||
        "admin";

    const adminRole =
        String(user.role || "admin").trim();

    const initial =
        adminName.trim().charAt(0).toUpperCase();

    const profileName =
        document.querySelector(".profile-info h4");

    const profileRole =
        document.querySelector(".profile-info p");

    const profileAvatar =
        document.querySelector(".profile-avatar");

    const topbarAvatar =
        document.querySelector(".topbar-avatar");

    if (profileName) {
        profileName.textContent = adminName;
    }

    if (profileRole) {
        profileRole.textContent = adminRole;
    }

    if (profileAvatar) {
        profileAvatar.textContent = initial;
    }

    if (topbarAvatar) {
        topbarAvatar.textContent = initial;
    }
}


/* =========================================================
   GLOBAL VARIABLE
   ========================================================= */

let currentAdmin = null;
let kementerianData = [];


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    currentAdmin = checkAdminSession();

    if (!currentAdmin) {
        return;
    }

    initializeAdminShell(currentAdmin);

    initializeDate();

    initializeEvents();

    loadKementerianData();

});


/* =========================================================
   DATE
   ========================================================= */

function initializeDate() {

    const dateElement =
        document.getElementById("currentDate");

    if (!dateElement) {
        return;
    }

    const now = new Date();

    const options = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    };

    dateElement.textContent =
        now.toLocaleDateString("id-ID", options);
}


/* =========================================================
   EVENTS
   ========================================================= */

function initializeEvents() {

    const btnRefresh =
        document.getElementById("btnRefresh");
    
    const btnAddKementerian =
        document.getElementById("btnAddKementerian");

    const btnCloseAddModal =
        document.getElementById("btnCloseAddModal");

    const btnCancelAdd =
        document.getElementById("btnCancelAdd");

    const formAdd =
        document.getElementById("formAddKementerian");

    const btnRetry =
        document.getElementById("btnRetry");

    const btnCloseModal =
        document.getElementById("btnCloseModal");

    const btnCancelEdit =
        document.getElementById("btnCancelEdit");

    const formEdit =
        document.getElementById("formEditKementerian");

    const toastClose =
        document.getElementById("toastClose");
    
    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    if (btnRefresh) {
        btnRefresh.addEventListener("click", () => {
            loadKementerianData();
        });
    }

    if (btnRetry) {
        btnRetry.addEventListener("click", () => {
            loadKementerianData();
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener("click", closeEditModal);
    }

    if (btnCancelEdit) {
        btnCancelEdit.addEventListener("click", closeEditModal);
    }

    if (formEdit) {
        formEdit.addEventListener("submit", handleEditSubmit);
    }

    if (toastClose) {
        toastClose.addEventListener("click", hideToast);
    }

    /* Tutup modal ketika klik area luar */

    const modal =
        document.getElementById("editModal");

    if (modal) {

        modal.addEventListener("click", (event) => {

            if (event.target === modal) {
                closeEditModal();
            }

        });

    }

    /* ==================================================
    TAMBAH KEMENTERIAN
    ================================================== */

    if (btnAddKementerian) {
        btnAddKementerian.addEventListener(
            "click",
            openAddModal
        );
    }

    if (btnCloseAddModal) {
        btnCloseAddModal.addEventListener(
            "click",
            closeAddModal
        );
    }

    /* =========================================================
    OPEN ADD MODAL
    ========================================================= */

    function openAddModal() {

        const modal =
            document.getElementById("addModal");

        if (!modal) {
            return;
        }

        const form =
            document.getElementById(
                "formAddKementerian"
            );

        if (form) {
            form.reset();
        }

        /* Default status = Aktif */

        const statusInput =
            document.getElementById(
                "add_status"
            );

        if (statusInput) {
            statusInput.value = "Aktif";
        }

        modal.classList.add("show");

        document.body.style.overflow = "hidden";

        const namaInput =
            document.getElementById(
                "add_nama_unit"
            );

        if (namaInput) {

            setTimeout(() => {
                namaInput.focus();
            }, 100);

        }

    }

    /* =========================================================
    CLOSE ADD MODAL
    ========================================================= */

    function closeAddModal() {

        const modal =
            document.getElementById("addModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("show");

        document.body.style.overflow = "";

        const form =
            document.getElementById(
                "formAddKementerian"
            );

        if (form) {
            form.reset();
        }

    }

    /* =========================================================
    HANDLE ADD SUBMIT
    ========================================================= */

    async function handleAddSubmit(event) {

        event.preventDefault();

        const namaInput =
            document.getElementById(
                "add_nama_unit"
            );

        const emailKementerianInput =
            document.getElementById(
                "add_email_kementerian"
            );

        const emailMenteriInput =
            document.getElementById(
                "add_email_menteri"
            );

        const statusInput =
            document.getElementById(
                "add_status"
            );

        const namaUnit =
            namaInput
                ? namaInput.value.trim()
                : "";

        const emailKementerian =
            emailKementerianInput
                ? emailKementerianInput.value.trim()
                : "";

        const emailMenteri =
            emailMenteriInput
                ? emailMenteriInput.value.trim()
                : "";

        const status =
            statusInput
                ? statusInput.value.trim()
                : "";


        /* =========================
        VALIDASI
        ========================= */

        if (!namaUnit) {

            showToast(
                "error",
                "Data Tidak Valid",
                "Nama kementerian wajib diisi."
            );

            if (namaInput) {
                namaInput.focus();
            }

            return;
        }


        if (
            emailKementerian &&
            !isValidEmail(emailKementerian)
        ) {

            showToast(
                "error",
                "Email Tidak Valid",
                "Format email kementerian tidak valid."
            );

            if (emailKementerianInput) {
                emailKementerianInput.focus();
            }

            return;
        }


        if (
            emailMenteri &&
            !isValidEmail(emailMenteri)
        ) {

            showToast(
                "error",
                "Email Tidak Valid",
                "Format email Menteri tidak valid."
            );

            if (emailMenteriInput) {
                emailMenteriInput.focus();
            }

            return;
        }


        if (
            emailKementerian &&
            emailMenteri &&
            emailKementerian.toLowerCase() ===
            emailMenteri.toLowerCase()
        ) {

            showToast(
                "error",
                "Email Tidak Valid",
                "Email akun Kementerian dan email Menteri harus berbeda."
            );

            return;
        }


        if (
            status !== "Aktif" &&
            status !== "Nonaktif"
        ) {

            showToast(
                "error",
                "Status Tidak Valid",
                "Status kementerian tidak valid."
            );

            return;
        }


        /* =========================
        LOADING
        ========================= */

        setCreateButtonLoading(true);


        try {

            const response =
                await fetch(API_URL, {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body: JSON.stringify({

                        action:
                            "createKementerian",

                        session_token:
                            currentAdmin.session_token,

                        nama_unit:
                            namaUnit,

                        email_kementerian:
                            emailKementerian,

                        email_menteri:
                            emailMenteri,

                        status:
                            status

                    })

                });


            const result =
                await response.json();


            console.log(
                "createKementerian:",
                result
            );


            if (!result.success) {

                throw new Error(
                    result.message ||
                    "Gagal menambahkan kementerian."
                );

            }


            closeAddModal();


            showToast(
                "success",
                "Berhasil Ditambahkan",
                "Data kementerian berhasil ditambahkan."
            );


            await loadKementerianData();


        } catch (error) {

            console.error(
                "Create kementerian error:",
                error
            );


            showToast(
                "error",
                "Gagal Menambahkan",
                error.message ||
                "Terjadi kesalahan saat menambahkan kementerian."
            );


        } finally {

            setCreateButtonLoading(false);

        }

    }

    /* =========================================================
    CREATE BUTTON LOADING
    ========================================================= */

    function setCreateButtonLoading(isLoading) {

        const button =
            document.getElementById(
                "btnCreateKementerian"
            );

        const text =
            document.getElementById(
                "createButtonText"
            );

        const spinner =
            document.getElementById(
                "createButtonSpinner"
            );


        if (button) {
            button.disabled = isLoading;
        }


        if (text) {

            text.style.display =
                isLoading
                    ? "none"
                    : "inline";

        }


        if (spinner) {

            spinner.style.display =
                isLoading
                    ? "block"
                    : "none";

        }

    }

    if (btnCancelAdd) {
        btnCancelAdd.addEventListener(
            "click",
            closeAddModal
        );
    }

    if (formAdd) {
        formAdd.addEventListener(
            "submit",
            handleAddSubmit
        );
    }


    /* Tutup modal tambah ketika klik area luar */

    const addModal =
        document.getElementById("addModal");

    if (addModal) {

        addModal.addEventListener(
            "click",
            (event) => {

                if (event.target === addModal) {
                    closeAddModal();
                }

            }
        );

    }

}


/* =========================================================
   LOAD DATA KEMENTERIAN
   ========================================================= */

async function loadKementerianData() {

    showTableLoading();

    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify({

                action: "getKementerianAdmin",

                session_token:
                    currentAdmin.session_token

            })

        });

        const result = await response.json();

        console.log("getKementerianAdmin:", result);

        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal mengambil data kementerian."
            );

        }

        kementerianData =
            Array.isArray(result.data)
                ? result.data
                : [];

        updateStatistics(kementerianData);

        renderTable(kementerianData);

    } catch (error) {

        console.error(
            "Load kementerian error:",
            error
        );

        showTableError(
            error.message ||
            "Terjadi kesalahan saat mengambil data."
        );

    }

}


/* =========================================================
   UPDATE STATISTICS
   ========================================================= */

function updateStatistics(data) {

    const total =
        data.length;

    const aktif =
        data.filter(item =>
            String(item.status || "")
                .trim()
                .toLowerCase() === "aktif"
        ).length;

    const nonaktif =
        data.filter(item =>
            String(item.status || "")
                .trim()
                .toLowerCase() === "nonaktif"
        ).length;

    const totalElement =
        document.getElementById("totalKementerian");

    const aktifElement =
        document.getElementById("totalAktif");

    const nonaktifElement =
        document.getElementById("totalNonaktif");

    if (totalElement) {
        totalElement.textContent = total;
    }

    if (aktifElement) {
        aktifElement.textContent = aktif;
    }

    if (nonaktifElement) {
        nonaktifElement.textContent = nonaktif;
    }

}


/* =========================================================
   RENDER TABLE
   ========================================================= */

function renderTable(data) {

    const loading =
        document.getElementById("tableLoading");

    const error =
        document.getElementById("tableError");

    const wrapper =
        document.getElementById("tableWrapper");

    const emptyState =
        document.getElementById("emptyState");

    const tbody =
        document.getElementById(
            "kementerianTableBody"
        );

    if (loading) {
        loading.style.display = "none";
    }

    if (error) {
        error.style.display = "none";
    }

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (!data || data.length === 0) {

        if (wrapper) {
            wrapper.style.display = "none";
        }

        if (emptyState) {
            emptyState.style.display = "block";
        }

        return;
    }

    if (emptyState) {
        emptyState.style.display = "none";
    }

    if (wrapper) {
        wrapper.style.display = "block";
    }

    data.forEach((item) => {

        const row =
            document.createElement("tr");

        const status =
            String(item.status || "")
                .trim()
                .toLowerCase();

        const statusClass =
            status === "aktif"
                ? "aktif"
                : "nonaktif";

        const statusText =
            status === "aktif"
                ? "Aktif"
                : "Nonaktif";

        const emailKementerian =
            item.email_kementerian
                ? escapeHtml(item.email_kementerian)
                : '<span class="email-empty">Belum diatur</span>';

        const emailMenteri =
            item.email_menteri
                ? escapeHtml(item.email_menteri)
                : '<span class="email-empty">Belum diatur</span>';

        row.innerHTML = `

            <td>
                <span class="kementerian-id">
                    ${escapeHtml(item.kementerian_id || "-")}
                </span>
            </td>

            <td>
                <div class="kementerian-name">
                    ${escapeHtml(item.nama_unit || "-")}
                </div>
            </td>

            <td>
                <span class="email-text">
                    ${emailKementerian}
                </span>
            </td>

            <td>
                <span class="email-text">
                    ${emailMenteri}
                </span>
            </td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>

            <td class="action-cell">

                <button
                    type="button"
                    class="btn-edit"
                    data-id="${escapeHtml(item.kementerian_id || "")}"
                >
                    ✎&nbsp; Edit
                </button>

            </td>

        `;

        tbody.appendChild(row);

    });

    /* Event tombol edit */

    const editButtons =
        tbody.querySelectorAll(".btn-edit");

    editButtons.forEach(button => {

        button.addEventListener("click", () => {

            const id =
                button.getAttribute("data-id");

            openEditModal(id);

        });

    });

}


/* =========================================================
   OPEN EDIT MODAL
   ========================================================= */

function openEditModal(kementerianId) {

    const data =
        kementerianData.find(item =>
            String(item.kementerian_id) ===
            String(kementerianId)
        );

    if (!data) {

        showToast(
            "error",
            "Data Tidak Ditemukan",
            "Data kementerian tidak ditemukan."
        );

        return;
    }

    const modal =
        document.getElementById("editModal");

    if (!modal) {
        return;
    }

    const idInput =
        document.getElementById(
            "edit_kementerian_id"
        );

    const namaInput =
        document.getElementById(
            "edit_nama_unit"
        );

    const emailKementerianInput =
        document.getElementById(
            "edit_email_kementerian"
        );

    const emailMenteriInput =
        document.getElementById(
            "edit_email_menteri"
        );

    const statusInput =
        document.getElementById(
            "edit_status"
        );

    if (idInput) {
        idInput.value =
            data.kementerian_id || "";
    }

    if (namaInput) {
        namaInput.value =
            data.nama_unit || "";
    }

    if (emailKementerianInput) {
        emailKementerianInput.value =
            data.email_kementerian || "";
    }

    if (emailMenteriInput) {
        emailMenteriInput.value =
            data.email_menteri || "";
    }

    if (statusInput) {
        const currentStatus =
            String(data.status || "")
                .trim()
                .toLowerCase();

        if (currentStatus === "aktif") {
            statusInput.value = "Aktif";
        } else if (currentStatus === "nonaktif") {
            statusInput.value = "Nonaktif";
        } else {
            statusInput.value = "";
        }
    }

    modal.classList.add("show");

    document.body.style.overflow = "hidden";

    if (namaInput) {
        setTimeout(() => {
            namaInput.focus();
        }, 100);
    }

}


/* =========================================================
   CLOSE EDIT MODAL
   ========================================================= */

function closeEditModal() {

    const modal =
        document.getElementById("editModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("show");

    document.body.style.overflow = "";

    const form =
        document.getElementById(
            "formEditKementerian"
        );

    if (form) {
        form.reset();
    }

}


/* =========================================================
   HANDLE EDIT SUBMIT
   ========================================================= */

async function handleEditSubmit(event) {

    event.preventDefault();

    const idInput =
        document.getElementById(
            "edit_kementerian_id"
        );

    const namaInput =
        document.getElementById(
            "edit_nama_unit"
        );

    const emailKementerianInput =
        document.getElementById(
            "edit_email_kementerian"
        );

    const emailMenteriInput =
        document.getElementById(
            "edit_email_menteri"
        );

    const statusInput =
        document.getElementById(
            "edit_status"
        );

    const saveButton =
        document.getElementById(
            "btnSaveKementerian"
        );

    const saveButtonText =
        document.getElementById(
            "saveButtonText"
        );

    const saveButtonSpinner =
        document.getElementById(
            "saveButtonSpinner"
        );

    const kementerianId =
        idInput
            ? idInput.value.trim()
            : "";

    const namaUnit =
        namaInput
            ? namaInput.value.trim()
            : "";

    const emailKementerian =
        emailKementerianInput
            ? emailKementerianInput.value.trim()
            : "";

    const emailMenteri =
        emailMenteriInput
            ? emailMenteriInput.value.trim()
            : "";

    const status =
        statusInput
            ? statusInput.value.trim()
            : "";

    /* =========================
       VALIDASI
       ========================= */

    if (!kementerianId) {

        showToast(
            "error",
            "Data Tidak Valid",
            "ID kementerian tidak ditemukan."
        );

        return;
    }

    if (!namaUnit) {

        showToast(
            "error",
            "Data Tidak Valid",
            "Nama kementerian wajib diisi."
        );

        if (namaInput) {
            namaInput.focus();
        }

        return;
    }

    if (
        emailKementerian &&
        !isValidEmail(emailKementerian)
    ) {

        showToast(
            "error",
            "Email Tidak Valid",
            "Format email kementerian tidak valid."
        );

        if (emailKementerianInput) {
            emailKementerianInput.focus();
        }

        return;
    }

    if (
        emailMenteri &&
        !isValidEmail(emailMenteri)
    ) {

        showToast(
            "error",
            "Email Tidak Valid",
            "Format email menteri tidak valid."
        );

        if (emailMenteriInput) {
            emailMenteriInput.focus();
        }

        return;
    }

    if (
        status !== "Aktif" &&
        status !== "Nonaktif"
    ) {

        showToast(
            "error",
            "Status Tidak Valid",
            "Status kementerian tidak valid."
        );

        return;
    }

    /* =========================
       LOADING
       ========================= */

    setSaveButtonLoading(true);

    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify({

                action: "updateKementerian",

                session_token:
                    currentAdmin.session_token,

                kementerian_id:
                    kementerianId,

                nama_unit:
                    namaUnit,

                email_kementerian:
                    emailKementerian,

                email_menteri:
                    emailMenteri,

                status:
                    status

            })

        });

        const result =
            await response.json();

        console.log(
            "updateKementerianAdmin:",
            result
        );

        if (!result.success) {

            throw new Error(
                result.message ||
                "Gagal memperbarui data kementerian."
            );

        }

        closeEditModal();

        showToast(
            "success",
            "Berhasil Disimpan",
            "Data kementerian berhasil diperbarui."
        );

        await loadKementerianData();

    } catch (error) {

        console.error(
            "Update kementerian error:",
            error
        );

        showToast(
            "error",
            "Gagal Menyimpan",
            error.message ||
            "Terjadi kesalahan saat menyimpan data."
        );

    } finally {

        setSaveButtonLoading(false);

    }

}


/* =========================================================
   SAVE BUTTON LOADING
   ========================================================= */

function setSaveButtonLoading(isLoading) {

    const button =
        document.getElementById(
            "btnSaveKementerian"
        );

    const text =
        document.getElementById(
            "saveButtonText"
        );

    const spinner =
        document.getElementById(
            "saveButtonSpinner"
        );

    if (button) {
        button.disabled = isLoading;
    }

    if (text) {
        text.style.display =
            isLoading
                ? "none"
                : "inline";
    }

    if (spinner) {
        spinner.style.display =
            isLoading
                ? "block"
                : "none";
    }

}


/* =========================================================
   TABLE LOADING
   ========================================================= */

function showTableLoading() {

    const loading =
        document.getElementById(
            "tableLoading"
        );

    const error =
        document.getElementById(
            "tableError"
        );

    const wrapper =
        document.getElementById(
            "tableWrapper"
        );

    const emptyState =
        document.getElementById(
            "emptyState"
        );

    if (loading) {
        loading.style.display = "block";
    }

    if (error) {
        error.style.display = "none";
    }

    if (wrapper) {
        wrapper.style.display = "none";
    }

    if (emptyState) {
        emptyState.style.display = "none";
    }

}


/* =========================================================
   TABLE ERROR
   ========================================================= */

function showTableError(message) {

    const loading =
        document.getElementById(
            "tableLoading"
        );

    const error =
        document.getElementById(
            "tableError"
        );

    const wrapper =
        document.getElementById(
            "tableWrapper"
        );

    const emptyState =
        document.getElementById(
            "emptyState"
        );

    const errorMessage =
        document.getElementById(
            "errorMessage"
        );

    if (loading) {
        loading.style.display = "none";
    }

    if (wrapper) {
        wrapper.style.display = "none";
    }

    if (emptyState) {
        emptyState.style.display = "none";
    }

    if (errorMessage) {
        errorMessage.textContent =
            message ||
            "Terjadi kesalahan."
    }

    if (error) {
        error.style.display = "block";
    }

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(type, title, message) {

    const toast =
        document.getElementById("toast");

    const toastIcon =
        document.getElementById("toastIcon");

    const toastTitle =
        document.getElementById("toastTitle");

    const toastMessage =
        document.getElementById("toastMessage");

    if (!toast) {
        return;
    }

    if (toastTitle) {
        toastTitle.textContent = title;
    }

    if (toastMessage) {
        toastMessage.textContent = message;
    }

    if (toastIcon) {

        if (type === "success") {

            toastIcon.textContent = "✓";

            toastIcon.style.background =
                "var(--success-bg)";

            toastIcon.style.color =
                "var(--success)";

        } else {

            toastIcon.textContent = "!";

            toastIcon.style.background =
                "#FFF4F3";

            toastIcon.style.color =
                "var(--primary)";

        }

    }

    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer =
        setTimeout(() => {
            hideToast();
        }, 4000);

}


function hideToast() {

    const toast =
        document.getElementById("toast");

    if (toast) {
        toast.classList.remove("show");
    }

}


/* =========================================================
   VALIDATE EMAIL
   ========================================================= */

function isValidEmail(email) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(email);

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

    const confirmation = confirm(
        "Apakah kamu yakin ingin keluar dari SITARA?"
    );

    if (!confirmation) {
        return;
    }

    sessionStorage.removeItem("sitaraUser");

    window.location.href =
        "../../../login/index.html";

}