/* =========================================================
   PENGAJUAN — KEMENTERIAN HUBUNGAN KERJA SAMA
   SITARA
========================================================= */


/* =========================================================
   SESSION
========================================================= */

const SITARA_SESSION_KEY = "sitaraUser";
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";


/* =========================================================
   DATA PENGAJUAN
   SEMENTARA KOSONG
   NANTI AKAN DIGANTI DENGAN DATA DARI APPS SCRIPT
========================================================= */

let pengajuanData = [];


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    initializeSession();

    initializeDate();

    initializeFilters();

    initializeLogout();

    await loadPengajuan();

});


/* =========================================================
   SESSION
========================================================= */

function initializeSession() {

    const storedUser = sessionStorage.getItem(SITARA_SESSION_KEY);

    if (!storedUser) {

        window.location.href = "/login/index.html";

        return;

    }


    let user;

    try {

        user = JSON.parse(storedUser);

    } catch (error) {

        console.error("Session SITARA tidak valid:", error);

        sessionStorage.removeItem(SITARA_SESSION_KEY);

        window.location.href = "/login/index.html";

        return;

    }


    const namaKementerian =
        user.nama_unit ||
        user.nama_lengkap ||
        "Kementerian";


    const namaPendek =
        getInitials(namaKementerian);


    /* PROFILE */

    const profileName =
        document.getElementById("profileName");

    const profileRole =
        document.getElementById("profileRole");

    const profileAvatar =
        document.getElementById("profileAvatar");

    const topbarAvatar =
        document.getElementById("topbarAvatar");


    if (profileName) {

        profileName.textContent =
            namaKementerian;

    }


    if (profileRole) {

        profileRole.textContent =
            "Kementerian";

    }


    if (profileAvatar) {

        profileAvatar.textContent =
            namaPendek;

    }


    if (topbarAvatar) {

        topbarAvatar.textContent =
            namaPendek;

    }


    /*

       Simpan user di window agar nantinya
       mudah digunakan ketika database sudah
       dihubungkan.

    */

    window.sitaraUser = user;

}

/* =========================================================
   LOAD DATA PENGAJUAN
========================================================= */

async function loadPengajuan() {

    try {

        if (
            !window.sitaraUser ||
            !window.sitaraUser.session_token
        ) {

            console.warn(
                "Session token tidak tersedia."
            );

            return;

        }


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
                        JSON.stringify({

                            action:
                                "getPengajuan",

                            session_token:
                                window.sitaraUser.session_token

                        })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Server mengembalikan HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        console.log(
            "Data pengajuan:",
            result
        );


        if (
            !result ||
            result.success !== true
        ) {

            throw new Error(
                result &&
                result.message
                    ? result.message
                    : "Gagal mengambil data pengajuan."
            );

        }


        pengajuanData =
            Array.isArray(
                result.data
            )
                ? result.data
                : [];


        renderPengajuan();


    } catch (error) {

        console.error(
            "Gagal memuat pengajuan:",
            error
        );


        pengajuanData = [];


        renderPengajuan();


        showTemporaryMessage(
            "Data pengajuan gagal dimuat.\n\n" +
            error.message
        );

    }

}

/* =========================================================
   INITIAL
========================================================= */

function initializeDate() {

    const dateElement =
        document.getElementById("currentDate");

    if (!dateElement) {
        return;
    }


    const now = new Date();


    const formattedDate =
        new Intl.DateTimeFormat(
            "id-ID",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(now);


    dateElement.textContent =
        formattedDate;

}


/* =========================================================
   FILTER/* =========================================================
   FILTER
========================================================= */

function initializeFilters() {

    const searchInput =
        document.getElementById(
            "searchPengajuan"
        );

    const jenisFilter =
        document.getElementById(
            "filterJenis"
        );

    const statusFilter =
        document.getElementById(
            "filterStatus"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderPengajuan
        );

    }


    if (jenisFilter) {

        jenisFilter.addEventListener(
            "change",
            renderPengajuan
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            renderPengajuan
        );

    }

}


/* =========================================================
   RENDER PENGAJUAN
========================================================= */

function renderPengajuan() {

    const tableBody =
        document.getElementById(
            "pengajuanTableBody"
        );


    if (!tableBody) {
        return;
    }


    const searchInput =
        document.getElementById(
            "searchPengajuan"
        );

    const jenisFilter =
        document.getElementById(
            "filterJenis"
        );

    const statusFilter =
        document.getElementById(
            "filterStatus"
        );


    const keyword =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const selectedJenis =
        jenisFilter
            ? jenisFilter.value
            : "";


    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "";


    const filteredData =
        pengajuanData.filter(item => {


            const nomor =
                String(
                    item.nomor_pengajuan || ""
                ).toLowerCase();


            const perihal =
                String(
                    item.perihal || ""
                ).toLowerCase();


            const matchesSearch =
                !keyword ||
                nomor.includes(keyword) ||
                perihal.includes(keyword);


            const matchesJenis =
                !selectedJenis ||
                item.jenis === selectedJenis;


            const matchesStatus =
                !selectedStatus ||
                item.status === selectedStatus;


            return (
                matchesSearch &&
                matchesJenis &&
                matchesStatus
            );

        });


    updateStatistics();


    /* EMPTY */

    if (filteredData.length === 0) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty-state"
                >

                    <div class="empty-icon">
                        ▧
                    </div>

                    <strong>
                        Belum ada pengajuan
                    </strong>

                    <span>
                        Pengajuan yang dibuat akan muncul di sini.
                    </span>

                </td>

            </tr>

        `;

        return;

    }


    /* TABLE */

    tableBody.innerHTML =
        filteredData
            .map(
                (item, index) =>
                    createPengajuanRow(
                        item,
                        index
                    )
            )
            .join("");

}


/* =========================================================
   CREATE TABLE ROW
========================================================= */

function createPengajuanRow(
    item,
    index
) {

    const nomor =
        escapeHtml(
            item.nomor_pengajuan || "-"
        );


    const jenis =
        getJenisLabel(
            item.jenis
        );


    const perihal =
        escapeHtml(
            item.perihal || "-"
        );


    const tanggal =
        formatTanggal(
            item.tanggal_pengajuan
        );


    const status =
        getStatusBadge(
            item.status
        );


    return `

        <tr>

            <td>
                ${index + 1}
            </td>

            <td>
                <strong>
                    ${nomor}
                </strong>
            </td>

            <td>
                ${jenis}
            </td>

            <td>
                ${perihal}
            </td>

            <td>
                ${tanggal}
            </td>

            <td>
                ${status}
            </td>

            <td>

                <button
                    type="button"
                    class="table-action"
                    onclick="lihatDetailPengajuan('${escapeAttribute(item.id || "")}')"
                >
                    Detail
                </button>

            </td>

        </tr>

    `;

}


/* =========================================================
   JENIS LABEL
========================================================= */

function getJenisLabel(type) {

    if (type === "proposal") {

        return `
            <span class="jenis-label proposal">
                Proposal
            </span>
        `;

    }


    if (type === "lpj") {

        return `
            <span class="jenis-label lpj">
                LPJ
            </span>
        `;

    }


    return "-";

}


/* =========================================================
   STATUS BADGE
========================================================= */

function normalizeStatusKey(status) {
    return String(status || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

function getStatusBadge(status) {

    const key = normalizeStatusKey(status);

    const labels = {

        diajukan: "Diajukan",

        diproses: "Diproses",

        revisi: "Perlu Revisi",

        menunggu_verifikasi: "Menunggu Verifikasi",

        perlu_verifikasi: "Perlu Verifikasi",

        menunggu_persetujuan_mensetkab: "Menunggu Persetujuan Mensetkab",

        menunggu_persetujuan_ketua: "Menunggu Persetujuan Ketua",

        menunggu_eksternal: "Menunggu Pihak Eksternal",

        dalam_proses: "Dalam Proses",

        menunggu_hasil_eksternal: "Menunggu Hasil Eksternal",

        diajukan_ke_dpm: "Diajukan ke DPM",

        disetujui_dpm: "Disetujui DPM",

        diajukan_ke_fakultas: "Diajukan ke Fakultas",

        disetujui_fakultas: "Disetujui Fakultas",

        selesai: "Selesai",

        ditolak: "Ditolak"

    };


    const label =
        labels[key] ||
        status ||
        "Tidak diketahui";


    return `
        <span class="status-badge status-${escapeAttribute(key || "unknown")}">
            ${escapeHtml(label)}
        </span>
    `;

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const total = pengajuanData.length;

    const normalizeStatus = value =>
        String(value || "")
            .trim()
            .toLowerCase()
            .replace(/\\s+/g, "_");

    const prosesStatuses = new Set([
        "diajukan",
        "diproses",
        "menunggu_verifikasi",
        "perlu_verifikasi",
        "menunggu_persetujuan_mensetkab",
        "menunggu_persetujuan_ketua",
        "menunggu_eksternal",
        "dalam_proses"
    ]);

    const proses = pengajuanData.filter(item =>
        prosesStatuses.has(normalizeStatus(item.status))
    ).length;

    const revisi = pengajuanData.filter(item =>
        normalizeStatus(item.status) === "revisi"
    ).length;

    const selesai = pengajuanData.filter(item =>
        normalizeStatus(item.status) === "selesai"
    ).length;

    setText("statTotal", total);
    setText("statProses", proses);
    setText("statRevisi", revisi);
    setText("statSelesai", selesai);
}

/* =========================================================
   DETAIL PENGAJUAN
========================================================= */

async function lihatDetailPengajuan(id) {

    if (!id) {

        console.warn(
            "ID pengajuan tidak tersedia."
        );

        return;

    }


    // ==========================================
    // TAMPILKAN LOADING
    // ==========================================

    showDetailModalLoading();


    try {

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
                        JSON.stringify({

                            action:
                                "getPengajuanDetail",

                            session_token:
                                window
                                    .sitaraUser
                                    .session_token,

                            pengajuan_id:
                                id

                        })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Server mengembalikan HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        console.log(
            "Detail pengajuan:",
            result
        );


        if (
            !result ||
            result.success !== true
        ) {

            throw new Error(
                result &&
                result.message
                    ? result.message
                    : "Gagal mengambil detail pengajuan."
            );

        }


        currentDetailData = result.data;

        showDetailModal(
            result.data
        );


    } catch (error) {

        console.error(
            "Gagal mengambil detail pengajuan:",
            error
        );


        closeDetailModal();


        showTemporaryMessage(
            "Detail pengajuan gagal dimuat.\n\n" +
            error.message
        );

    }

}

/* =========================================================
   DETAIL MODAL — LOADING
========================================================= */

function showDetailModalLoading() {

    let modal =
        document.getElementById(
            "detailPengajuanModal"
        );


    if (!modal) {

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "detailPengajuanModal";

        modal.className =
            "detail-modal-overlay";

        document.body.appendChild(
            modal
        );

    }


    modal.innerHTML = `

        <div class="detail-modal">

            <div class="detail-modal-header">

                <div>

                    <span class="detail-modal-kicker">
                        DETAIL PENGAJUAN
                    </span>

                    <h2>
                        Memuat data...
                    </h2>

                </div>


                <button
                    type="button"
                    class="detail-modal-close"
                    onclick="closeDetailModal()"
                >
                    ×
                </button>

            </div>


            <div class="detail-modal-loading">

                <div class="detail-spinner"></div>

                <span>
                    Memuat informasi pengajuan...
                </span>

            </div>

        </div>

    `;


    modal.classList.add(
        "show"
    );

}


/* =========================================================
   DETAIL MODAL
========================================================= */

function showDetailModal(data) {

    currentDetailData = data;

    const modal =
        document.getElementById(
            "detailPengajuanModal"
        );


    if (!modal) {
        return;
    }


    const pengajuan =
        data.pengajuan || {};


    const dokumen =
        prepareLatestDocuments(
            Array.isArray(data.dokumen)
                ? data.dokumen
                : []
        );


    const riwayat =
        Array.isArray(
            data.riwayat
        )
            ? data.riwayat
            : [];


    const jenis =
        String(
            pengajuan.jenis_pengajuan || ""
        )
        .trim()
        .toLowerCase();


    const status =
        String(
            pengajuan.status_pengajuan || ""
        )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            "_"
        );


    modal.innerHTML = `

        <div
            class="detail-modal"
            role="dialog"
            aria-modal="true"
        >

            <!-- HEADER -->

            <div class="detail-modal-header">

                <div>

                    <span class="detail-modal-kicker">
                        DETAIL PENGAJUAN
                    </span>

                    <h2>
                        ${escapeHtml(
                            pengajuan.pengajuan_id || "-"
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            pengajuan.judul_pengajuan || "-"
                        )}
                    </p>

                </div>


                <button
                    type="button"
                    class="detail-modal-close"
                    onclick="closeDetailModal()"
                    aria-label="Tutup"
                >
                    ×
                </button>

            </div>


            <!-- STATUS -->

            <div class="detail-status-bar">

                <div>

                    <span class="detail-label">
                        Status Pengajuan
                    </span>

                    ${getStatusBadge(status)}

                </div>


                <div>

                    <span class="detail-label">
                        Tahap Sekarang
                    </span>

                    <strong>
                        ${escapeHtml(
                            normalizeWorkflowUnitDisplay(pengajuan.tahap_sekarang)
                        )}
                    </strong>

                </div>

            </div>


            <!-- CONTENT -->

            <div class="detail-modal-body">


                <!-- INFORMASI PENGAJUAN -->

                <section class="detail-section">

                    <div class="detail-section-title">

                        <h3>
                            Informasi Pengajuan
                        </h3>

                    </div>


                    <div class="detail-grid">

                        ${detailItem(
                            "Nomor Pengajuan",
                            pengajuan.pengajuan_id
                        )}

                        ${detailItem(
                            "Jenis Pengajuan",
                            formatJenisDetail(
                                jenis
                            )
                        )}

                        ${detailItem(
                            "Tanggal Pengajuan",
                            formatTanggal(
                                pengajuan.tanggal_pengajuan
                            )
                        )}

                        ${detailItem(
                            "Penanggung Jawab",
                            pengajuan.penanggung_jawab
                        )}

                        ${detailItem(
                            "Kontak Penanggung Jawab",
                            pengajuan.kontak_penanggung_jawab
                        )}

                        ${detailItem(
                            "Perihal / Judul",
                            pengajuan.judul_pengajuan
                        )}

                    </div>

                </section>


                <!-- INFORMASI KEGIATAN -->

                <section class="detail-section">

                    <div class="detail-section-title">

                        <h3>
                            Informasi Kegiatan
                        </h3>

                    </div>


                    <div class="detail-grid">

                        ${detailItem(
                            "Tanggal Pelaksanaan",
                            formatTanggal(
                                pengajuan.tanggal_kegiatan
                            )
                        )}

                        ${detailItem(
                            "Waktu Mulai",
                            formatWaktu(
                                pengajuan.waktu_mulai
                            )
                        )}

                        ${detailItem(
                            "Waktu Selesai",
                            formatWaktu(
                                pengajuan.waktu_selesai
                            )
                        )}

                        ${detailItem(
                            "Tempat Pelaksanaan",
                            pengajuan.tempat_kegiatan
                        )}

                    </div>


                    ${
                        pengajuan.deskripsi_evaluasi
                            ? `

                                <div class="detail-long-item">

                                    <span>
                                        Deskripsi / Evaluasi Kegiatan
                                    </span>

                                    <p>
                                        ${escapeHtml(
                                            pengajuan.deskripsi_evaluasi
                                        )}
                                    </p>

                                </div>

                              `
                            : ""
                    }

                </section>


                <!-- DANA -->

                <section class="detail-section">

                    <div class="detail-section-title">

                        <h3>
                            Informasi Dana
                        </h3>

                    </div>


                    <div class="detail-grid">

                        ${detailItem(
                            "Sumber Dana",
                            pengajuan.sumber_dana
                        )}

                        ${detailItem(
                            "Jumlah Dana",
                            formatRupiah(
                                pengajuan.jumlah_dana
                            )
                        )}

                    </div>

                </section>


                <!-- DOKUMEN -->

                <section class="detail-section">

                    <div class="detail-section-title">

                        <h3>
                            Dokumen
                        </h3>

                        <span>
                            ${dokumen.length} dokumen aktif
                        </span>

                    </div>


                    <div class="detail-documents">

                        ${
                            dokumen.length
                                ? dokumen
                                    .map(
                                        item => createDetailDocument(
                                            item.latest,
                                            item.history
                                        )
                                    )
                                    .join("")
                                : `

                                    <div class="detail-empty">
                                        Belum ada dokumen.
                                    </div>

                                  `
                        }

                    </div>

                </section>


                <!-- RIWAYAT -->

                <section class="detail-section">

                    <div class="detail-section-title">

                        <h3>
                            Riwayat Pengajuan
                        </h3>

                    </div>


                    <div class="detail-timeline">

                        ${
                            riwayat.length
                                ? riwayat
                                    .map(
                                        createDetailHistory
                                    )
                                    .join("")
                                : `

                                    <div class="detail-empty">
                                        Belum ada riwayat pengajuan.
                                    </div>

                                  `
                        }

                    </div>

                </section>


                <!-- AKSI REVISI -->
                ${renderRevisionAction(
                    pengajuan,
                    status,
                    jenis
                )}

                <!-- CATATAN -->

                ${
                    pengajuan.catatan_pengajuan ||
                    pengajuan.catatan_terakhir
                        ? `

                            <section class="detail-section">

                                <div class="detail-section-title">

                                    <h3>
                                        Catatan
                                    </h3>

                                </div>


                                ${
                                    pengajuan.catatan_pengajuan
                                        ? `

                                            <div class="detail-long-item">

                                                <span>
                                                    Catatan Pengajuan
                                                </span>

                                                <p>
                                                    ${escapeHtml(
                                                        pengajuan.catatan_pengajuan
                                                    )}
                                                </p>

                                            </div>

                                          `
                                        : ""
                                }


                                ${
                                    pengajuan.catatan_terakhir
                                        ? `

                                            <div class="detail-long-item">

                                                <span>
                                                    Catatan Terakhir
                                                </span>

                                                <p>
                                                    ${escapeHtml(
                                                        pengajuan.catatan_terakhir
                                                    )}
                                                </p>

                                            </div>

                                          `
                                        : ""
                                }

                            </section>

                          `
                        : ""
                }

            </div>


            <!-- FOOTER -->

            <div class="detail-modal-footer">

                <button
                    type="button"
                    class="btn-secondary"
                    onclick="closeDetailModal()"
                >
                    Tutup
                </button>

            </div>

        </div>

    `;


    modal.classList.add(
        "show"
    );


    /*
     * Klik area luar modal
     * untuk menutup.
     */
    modal.onclick =
        function (event) {

            if (
                event.target ===
                modal
            ) {

                closeDetailModal();

            }

        };

}



/* =========================================================
   AKSI REVISI — KEMENTERIAN X
========================================================= */

function renderRevisionAction(
    pengajuan,
    status,
    jenis
) {

    const tahap =
        String(
            pengajuan.tahap_sekarang || ""
        ).trim();

    const kementerianId =
        String(
            window.sitaraUser?.kementerian_id || ""
        ).trim();

    /*
     * Tombol hanya muncul apabila:
     * - status = Revisi
     * - pengajuan dikembalikan ke kementerian
     *   yang sedang login.
     */
    if (
        status !== "revisi" ||
        !kementerianId ||
        tahap !== kementerianId
    ) {
        return "";
    }

    return `
        <section class="detail-revision-action">

            <div class="detail-revision-icon">
                ↻
            </div>

            <div class="detail-revision-content">

                <span class="detail-revision-label">
                    TINDAK LANJUT REVISI
                </span>

                <h3>
                    Pengajuan Perlu Diperbaiki
                </h3>

                <p>
                    Pengajuan ini telah dikembalikan oleh
                    Kementerian Sekretariat Kabinet. Perbaiki dokumen sesuai
                    catatan revisi, kemudian kirim ulang
                    pengajuan ke Kementerian Sekretariat Kabinet.
                </p>

                <button
                    type="button"
                    class="btn-revision-primary"
                    onclick="openResubmitModal(
                        '${escapeAttribute(
                            pengajuan.pengajuan_id || ""
                        )}',
                        '${escapeAttribute(
                            jenis || ""
                        )}'
                    )"
                >
                    Unggah Revisi &amp; Kirim Ulang
                </button>

            </div>

        </section>
    `;
}


/* =========================================================
   MODAL UNGGAH REVISI
========================================================= */

function openResubmitModal(
    pengajuanId,
    jenis
) {

    if (!pengajuanId) {
        showTemporaryMessage(
            "ID pengajuan tidak ditemukan."
        );
        return;
    }

    const modal =
        document.getElementById(
            "detailPengajuanModal"
        );

    if (!modal) {
        showTemporaryMessage(
            "Detail pengajuan tidak ditemukan."
        );
        return;
    }

    const normalizedJenis =
        String(
            jenis || ""
        ).trim().toLowerCase();

    const documentOptions =
        normalizedJenis === "proposal"
            ? [
                ["Proposal Kegiatan", "fileRevisiProposal"],
                ["Form Kegiatan", "fileRevisiFormKegiatan"],
                ["Surat Pencairan", "fileRevisiSuratPencairan"]
              ]
            : [
                ["Dokumen LPJ", "fileRevisiLPJ"]
              ];

    /*
     * Gunakan modal detail yang sama.
     * Jadi panel detail tidak tetap berada di belakang
     * dan tidak dibuat modal kedua di atasnya.
     */
    modal.innerHTML = `

        <div
            class="detail-modal"
            role="dialog"
            aria-modal="true"
        >

            <div class="resubmit-modal-header">

                <div>
                    <span class="resubmit-modal-kicker">
                        PERBAIKAN PENGAJUAN
                    </span>

                    <h2>
                        Unggah Dokumen Revisi
                    </h2>

                    <p>
                        ${escapeHtml(pengajuanId)}
                    </p>
                </div>

                <button
                    type="button"
                    class="resubmit-modal-close"
                    onclick="closeResubmitModal()"
                    aria-label="Kembali ke detail"
                >
                    ×
                </button>

            </div>

            <div class="resubmit-modal-body">

                <div class="resubmit-info-box">
                    <strong>
                        Petunjuk
                    </strong>
                    <span>
                        Unggah hanya dokumen yang telah diperbaiki
                        sesuai catatan revisi. Dokumen yang tidak
                        diperbaiki tidak perlu diunggah ulang.
                    </span>
                </div>

                <div class="resubmit-document-list">

                    ${documentOptions.map(function(option) {
                        return `
                            <div class="resubmit-file-group">

                                <label>
                                    ${escapeHtml(option[0])}
                                </label>

                                <input
                                    type="file"
                                    id="${escapeAttribute(option[1])}"
                                    accept=".pdf,.doc,.docx"
                                >

                                <small>
                                    PDF, DOC, atau DOCX · Maks. 10 MB
                                </small>

                            </div>
                        `;
                    }).join("")}

                </div>

            </div>

            <div class="resubmit-modal-footer">

                <button
                    type="button"
                    class="btn-secondary"
                    onclick="closeResubmitModal()"
                >
                    Kembali
                </button>

                <button
                    type="button"
                    class="btn-revision-primary"
                    id="btnSubmitResubmission"
                    onclick="submitResubmission(
                        '${escapeAttribute(pengajuanId)}',
                        '${escapeAttribute(normalizedJenis)}'
                    )"
                >
                    Kirim Ulang ke Kementerian Sekretariat Kabinet
                </button>

            </div>

        </div>
    `;
}



/* =========================================================
   SUBMIT REVISI
========================================================= */

async function submitResubmission(
    pengajuanId,
    jenis
) {

    const normalizedJenis =
        String(
            jenis || ""
        ).trim().toLowerCase();

    const inputs =
        normalizedJenis === "proposal"
            ? [
                ["fileRevisiProposal", "Proposal Kegiatan"],
                ["fileRevisiFormKegiatan", "Form Kegiatan"],
                ["fileRevisiSuratPencairan", "Surat Pencairan"]
              ]
            : [
                ["fileRevisiLPJ", "Dokumen LPJ"]
              ];

    const dokumen = [];
    let totalSize = 0;

    try {

        for (
            const [inputId, jenisDokumen]
            of inputs
        ) {

            const input =
                document.getElementById(
                    inputId
                );

            if (
                !input ||
                !input.files ||
                !input.files.length
            ) {
                continue;
            }

            const file =
                input.files[0];

            if (
                file.size >
                10 * 1024 * 1024
            ) {
                throw new Error(
                    "File " +
                    file.name +
                    " melebihi batas 10 MB."
                );
            }

            totalSize +=
                file.size;

            if (
                totalSize >
                25 * 1024 * 1024
            ) {
                throw new Error(
                    "Total ukuran dokumen revisi maksimal 25 MB."
                );
            }

            const base64 =
                await readFileAsBase64(
                    file
                );

            dokumen.push({
                jenis_dokumen:
                    jenisDokumen,
                name:
                    file.name,
                type:
                    file.type ||
                    "application/octet-stream",
                size:
                    file.size,
                data:
                    base64
            });

        }

        if (!dokumen.length) {
            showTemporaryMessage(
                "Silakan unggah minimal satu dokumen revisi."
            );
            return;
        }

        const confirmed =
            confirm(
                "Kirim dokumen revisi ini kembali ke Kementerian Sekretariat Kabinet?"
            );

        if (!confirmed) {
            return;
        }

        const button =
            document.getElementById(
                "btnSubmitResubmission"
            );

        if (button) {
            button.disabled = true;
            button.textContent =
                "Mengunggah...";
        }

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
                        JSON.stringify({
                            action:
                                "kirimUlangPengajuan",

                            session_token:
                                window
                                    .sitaraUser
                                    .session_token,

                            pengajuan_id:
                                pengajuanId,

                            dokumen:
                                dokumen
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                "Server mengembalikan HTTP " +
                response.status
            );
        }

        const result =
            await response.json();

        console.log(
            "Hasil kirim ulang:",
            result
        );

        if (
            !result ||
            result.success !== true
        ) {
            throw new Error(
                result &&
                result.message
                    ? result.message
                    : "Pengajuan gagal dikirim ulang."
            );
        }

        showTemporaryMessage(
            result.message ||
            "Pengajuan berhasil dikirim ulang ke Kementerian Sekretariat Kabinet."
        );

        closeDetailModal();

        await loadPengajuan();

    } catch (error) {

        console.error(
            "Kirim ulang pengajuan error:",
            error
        );

        showTemporaryMessage(
            error.message ||
            "Pengajuan gagal dikirim ulang."
        );

        const button =
            document.getElementById(
                "btnSubmitResubmission"
            );

        if (button) {
            button.disabled = false;
            button.textContent =
                "Kirim Ulang ke Kementerian Sekretariat Kabinet";
        }

    }

}


/* =========================================================
   BACA FILE SEBAGAI BASE64
========================================================= */

function readFileAsBase64(
    file
) {

    return new Promise(
        function(resolve, reject) {

            const reader =
                new FileReader();

            reader.onload =
                function(event) {

                    const result =
                        String(
                            event.target.result ||
                            ""
                        );

                    const commaIndex =
                        result.indexOf(",");

                    resolve(
                        commaIndex >= 0
                            ? result.substring(
                                commaIndex + 1
                              )
                            : result
                    );

                };

            reader.onerror =
                function() {
                    reject(
                        new Error(
                            "Gagal membaca file " +
                            file.name +
                            "."
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
   CLOSE MODAL UNGGAH REVISI
========================================================= */

function closeResubmitModal() {

    const modal =
        document.getElementById(
            "detailPengajuanModal"
        );

    if (!modal) {
        return;
    }

    if (currentDetailData) {
        showDetailModal(currentDetailData);
    } else {
        closeDetailModal();
    }
}



/* =========================================================
   DETAIL ITEM
========================================================= */

function detailItem(
    label,
    value
) {

    return `

        <div class="detail-item">

            <span>
                ${escapeHtml(
                    label || "-"
                )}
            </span>

            <strong>
                ${escapeHtml(
                    value === null ||
                    value === undefined ||
                    value === ""
                        ? "-"
                        : String(value)
                )}
            </strong>

        </div>

    `;

}


/* =========================================================
   FORMAT JENIS
========================================================= */

function formatJenisDetail(type) {

    if (type === "proposal") {
        return "Proposal";
    }


    if (type === "lpj") {
        return "Laporan Pertanggungjawaban (LPJ)";
    }


    return type || "-";

}


/* =========================================================
   FORMAT RUPIAH
========================================================= */

function formatRupiah(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "-";

    }


    const number =
        Number(
            String(value)
                .replace(
                    /[^0-9.-]/g,
                    ""
                )
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return String(value);

    }


    return new Intl.NumberFormat(
        "id-ID",
        {
            style:
                "currency",

            currency:
                "IDR",

            maximumFractionDigits:
                0

        }
    ).format(number);

}


/* =========================================================
   DOKUMEN DETAIL
========================================================= */

function prepareLatestDocuments(documents) {

    const groups = {};

    documents.forEach((doc, index) => {
        const jenis = String(
            doc.jenis_dokumen ||
            doc.jenis ||
            "Dokumen"
        ).trim();

        if (!groups[jenis]) groups[jenis] = [];

        groups[jenis].push({
            ...doc,
            __index: index
        });
    });

    return Object.values(groups).map(list => {
        list.sort((a, b) => {
            const ta = new Date(a.uploaded_at || 0).getTime();
            const tb = new Date(b.uploaded_at || 0).getTime();
            if (!isNaN(tb) && !isNaN(ta) && tb !== ta) return tb - ta;
            return (b.__index || 0) - (a.__index || 0);
        });

        return {
            latest: list[0],
            history: list.slice(1)
        };
    });
}

function formatDocumentVersionDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return "";
    return d.toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function createDetailDocument(
    documentData
) {

    const nama =
        documentData.nama_file ||
        "Dokumen";


    const jenis =
        documentData.jenis_dokumen ||
        "Dokumen";


    const url =
        documentData.file_url ||
        "";


    const ukuran =
        documentData.ukuran_file
            ? formatFileSizeDetail(
                documentData.ukuran_file
            )
            : "";


    return `

        <div class="detail-document">

            <div class="detail-document-icon">
                ▤
            </div>


            <div class="detail-document-info">

                <strong>
                    ${escapeHtml(
                        nama
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        jenis
                    )}
                    ${
                        ukuran
                            ? " · " +
                              escapeHtml(
                                  ukuran
                              )
                            : ""
                    }
                </span>

            </div>


            ${
                url
                    ? `

                        <a
                            href="${escapeAttribute(getDownloadUrl(documentData))}"
                            class="detail-document-button"
                            download
                        >
                            Download
                        </a>

                      `
                    : `

                        <span class="detail-document-unavailable">
                            Tidak tersedia
                        </span>

                      `
            }

        </div>

        ${formatDocumentVersionDate(documentData.uploaded_at) ? `
            <span class="detail-document-version">Versi terbaru · ${escapeHtml(formatDocumentVersionDate(documentData.uploaded_at))}</span>
        ` : `
            <span class="detail-document-version">Versi terbaru</span>
        `}

        ${Array.isArray(history) && history.length ? `
            <details class="detail-document-history">
                <summary>Riwayat versi (${history.length})</summary>
                <div class="detail-document-history-list">
                    ${history.map((oldDoc, index) => `
                        <div class="detail-document-history-item">
                            <div>
                                <strong>Versi ${history.length - index}</strong>
                                <span>${escapeHtml(oldDoc.nama_file || oldDoc.nama || "Dokumen")}${formatDocumentVersionDate(oldDoc.uploaded_at) ? " · " + escapeHtml(formatDocumentVersionDate(oldDoc.uploaded_at)) : ""}</span>
                            </div>
                            ${oldDoc.file_url ? `<a href="${escapeAttribute(getDownloadUrl(oldDoc))}" class="detail-document-history-download" download>Download</a>` : ""}
                        </div>
                    `).join("")}
                </div>
            </details>
        ` : ""}

    `;

}


/* =========================================================
   FORMAT UKURAN FILE
========================================================= */

function getDownloadUrl(documentData) {
    if (documentData && documentData.drive_file_id) {
        return "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(documentData.drive_file_id);
    }
    return documentData && documentData.file_url ? documentData.file_url : "";
}

function formatFileSizeDetail(
    bytes
) {

    const number =
        Number(bytes);


    if (
        !Number.isFinite(
            number
        ) ||
        number <= 0
    ) {

        return "-";

    }


    const mb =
        number /
        (
            1024 *
            1024
        );


    if (mb >= 1) {

        return (
            mb.toFixed(2) +
            " MB"
        );

    }


    return (
        Math.round(
            number / 1024
        ) +
        " KB"
    );

}


/* =========================================================
   LABEL UNIT WORKFLOW
========================================================= */

function normalizeWorkflowUnitDisplay(value) {
    const raw = String(value || "").trim();
    if (!raw) return "-";
    if (raw === "Biro AGATA" || raw.toLowerCase() === "agata" || raw.toLowerCase() === "kemensetkab" || raw.toLowerCase() === "mensetkab") {
        return raw.toLowerCase() === "mensetkab" ? "Menteri Sekretariat Kabinet" : "Kementerian Sekretariat Kabinet";
    }
    const user = window.sitaraUser || {};
    const currentId = String(user.kementerian_id || "").trim();
    const currentName = String(user.nama_unit || user.nama_kementerian || "").trim();
    if (currentId && raw === currentId && currentName) return currentName;
    const fallback = {
        "KEM001": "Kementerian Sekretariat Kabinet",
        "KEM003": "Kementerian Hubungan Kerja Sama"
    };
    return fallback[raw] || raw;
}

function normalizeWorkflowActionDisplay(value) {
    return String(value || "").replace(/Kemensetkab/g, "Kementerian Sekretariat Kabinet").replace(/Mensetkab/g, "Menteri Sekretariat Kabinet");
}

/* =========================================================
   RIWAYAT DETAIL
========================================================= */

function createDetailHistory(
    history
) {

    const aksi =
        history.aksi ||
        "Aktivitas pengajuan";


    const status =
        history.status ||
        "";


    const dariUnit =
        normalizeWorkflowUnitDisplay(history.dari_unit);


    const keUnit =
        normalizeWorkflowUnitDisplay(history.ke_unit);


    const catatan =
        history.catatan ||
        "";


    return `

        <div class="detail-timeline-item">

            <div class="detail-timeline-dot">
            </div>


            <div class="detail-timeline-content">

                <div class="detail-history-top">

                    <strong>
                        ${escapeHtml(
                            aksi
                        )}
                    </strong>

                    ${
                        status
                            ? getStatusBadge(
                                String(status)
                                    .toLowerCase()
                                    .replace(
                                        /\s+/g,
                                        "_"
                                    )
                              )
                            : ""
                    }

                </div>


                <span class="detail-history-time">

                    ${formatTanggalWaktu(
                        history.waktu
                    )}

                </span>


                <div class="detail-history-route">

                    ${escapeHtml(
                        dariUnit
                    )}

                    <span>
                        →
                    </span>

                    ${escapeHtml(
                        keUnit
                    )}

                </div>


                ${
                    catatan
                        ? `

                            <p class="detail-history-note">

                                ${escapeHtml(
                                    catatan
                                )}

                            </p>

                          `
                        : ""
                }

            </div>

        </div>

    `;

}


/* =========================================================
   FORMAT TANGGAL + WAKTU
========================================================= */

function formatTanggalWaktu(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return new Intl.DateTimeFormat(
        "id-ID",
        {
            day:
                "2-digit",

            month:
                "long",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    ).format(date);

}

/* =========================================================
   FORMAT WAKTU
========================================================= */

function formatWaktu(value) {

    /*
     * Jika kosong:
     * digunakan juga untuk LPJ karena
     * LPJ tidak memiliki waktu mulai/selesai.
     */
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "";

    }


    /*
     * Jika backend mengirim
     * format waktu langsung:
     *
     * HH:mm
     * HH:mm:ss
     */
    const stringValue =
        String(value).trim();


    const timeMatch =
        stringValue.match(
            /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
        );


    if (timeMatch) {

        const hour =
            String(
                timeMatch[1]
            ).padStart(
                2,
                "0"
            );

        const minute =
            String(
                timeMatch[2]
            ).padStart(
                2,
                "0"
            );

        return (
            hour +
            ":" +
            minute
        );

    }


    /*
     * Google Sheets dapat mengirim
     * nilai waktu sebagai Date:
     *
     * 1899-12-30T01:42:48.000Z
     *
     * Ambil jam dan menit saja.
     */
    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return new Intl.DateTimeFormat(
        "id-ID",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).format(date);

}

/* =========================================================
   CLOSE DETAIL
========================================================= */

function closeDetailModal() {

    const modal =
        document.getElementById(
            "detailPengajuanModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    setTimeout(
        function () {

            if (modal) {

                modal.remove();

            }

        },
        200
    );

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
        () => {

            const confirmed =
                confirm(
                    "Apakah Anda yakin ingin keluar dari SITARA?"
                );


            if (!confirmed) {
                return;
            }


            sessionStorage.removeItem(
                SITARA_SESSION_KEY
            );


            window.location.href =
                "/login/index.html";

        }
    );

}


/* =========================================================
   TEMPORARY MESSAGE
========================================================= */

function showTemporaryMessage(
    message
) {

    /*
        Untuk sekarang menggunakan alert
        sederhana.

        Nanti dapat diganti dengan
        notification/toast SITARA.
    */

    alert(message);

}


/* =========================================================
   HELPER — INITIALS
========================================================= */

function getInitials(name) {

    if (!name) {
        return "K";
    }


    const words =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (words.length === 1) {

        return words[0]
            .substring(0, 1)
            .toUpperCase();

    }


    return (
        words[0].substring(0, 1) +
        words[1].substring(0, 1)
    ).toUpperCase();

}


/* =========================================================
   HELPER — TEXT
========================================================= */

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   HELPER — FORMAT TANGGAL
========================================================= */

function formatTanggal(
    tanggal
) {

    if (!tanggal) {
        return "-";
    }


    const date =
        new Date(tanggal);


    if (Number.isNaN(date.getTime())) {
        return "-";
    }


    return new Intl.DateTimeFormat(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(date);

}


/* =========================================================
   HELPER — ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   HELPER — ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}


/* =========================================================
   DEBUG
========================================================= */

console.log(
    "SITARA — Halaman Pengajuan Kemenhubker berhasil dimuat."
);

/* =========================================================
   SITARA — KEMENHUBKER
   FALLBACK FIX: MODAL REVISI SELALU BISA DI-SCROLL
   Tambahkan sebagai script setelah pengajuan.js
========================================================= */

(function initSitaraRevisionModalScrollFix() {
    const applyFix = () => {
        const candidates = Array.from(document.querySelectorAll("body *"));

        const titleNode = candidates.find(el => {
            const t = (el.textContent || "").trim();
            return t.includes("Unggah Dokumen Revisi");
        });

        if (!titleNode) return;

        let modal = titleNode;
        for (let i = 0; i < 6 && modal; i++, modal = modal.parentElement) {
            const rect = modal.getBoundingClientRect();
            if (rect.width > 400 && rect.height > 250) break;
        }

        if (!modal) return;

        modal.style.maxHeight = "calc(100dvh - 32px)";
        modal.style.display = "flex";
        modal.style.flexDirection = "column";
        modal.style.minHeight = "0";
        modal.style.boxSizing = "border-box";

        const children = Array.from(modal.children);
        if (children.length >= 2) {
            const body = children.find(el => {
                const style = getComputedStyle(el);
                return style.overflowY !== "hidden" ||
                       el.querySelector('input[type="file"]');
            });

            if (body) {
                body.style.minHeight = "0";
                body.style.overflowY = "auto";
                body.style.overflowX = "hidden";
                body.style.flex = "1 1 auto";
                body.style.webkitOverflowScrolling = "touch";
            }
        }
    };

    document.addEventListener("DOMContentLoaded", applyFix);
    new MutationObserver(applyFix).observe(document.body, {
        childList: true,
        subtree: true
    });
})();
