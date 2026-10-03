// ==========================================
// SITARA
// DETAIL PENGAJUAN KEMENSETKAB
// ==========================================

const API_URL =
  "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";

// ==========================================
// SESSION
// ==========================================

const sessionData = sessionStorage.getItem("sitaraUser");

if (!sessionData) {
  window.location.href = "../../../login/index.html";
}

const user = JSON.parse(sessionData);

// ==========================================
// AMBIL ID DARI URL
// ==========================================

const params = new URLSearchParams(window.location.search);

const pengajuanId = params.get("id");

if (!pengajuanId) {
  alert("ID pengajuan tidak ditemukan.");
}

// ==========================================
// LOAD DETAIL
// ==========================================

loadDetailPengajuan();

async function loadDetailPengajuan() {
  try {
    const response = await fetch(API_URL, {
      method: "POST",

      body: JSON.stringify({
        action: "getDetailPengajuanKemensetkab",

        session_token: user.session_token,

        pengajuan_id: pengajuanId,
      }),
    });

    const result = await response.json();

    console.log("Detail Pengajuan:", result);

    if (!result.success) {
      console.error(result.message);

      return;
    }

    renderDetail(result.data);
  } catch (error) {
    console.error("Detail error:", error);
  }
}

function renderDetail(data) {
  const container = document.getElementById("detailContainer");

  container.innerHTML = `


<div class="detail-card">


<div class="detail-header">


<h2>
${data.nomor_pengajuan}
</h2>


<span class="status-badge">

${data.status}

</span>


</div>



<div class="detail-grid">


<div>

<label>
Asal Kementerian
</label>

<p>
${data.asal_kementerian}
</p>

</div>



<div>

<label>
Jenis Pengajuan
</label>

<p>
${data.jenis}
</p>

</div>



<div>

<label>
Judul Pengajuan
</label>

<p>
${data.judul}
</p>

</div>



<div>

<label>
Tanggal Pengajuan
</label>

<p>
${formatTanggal(data.tanggal_pengajuan)}
</p>

</div>



<div>

<label>
Tempat Kegiatan
</label>

<p>
${data.tempat || "-"}
</p>

</div>



<div>

<label>
Jumlah Dana
</label>

<p>
${formatRupiah(data.jumlah_dana)}
</p>

</div>


</div>


</div>



<div class="detail-card">
    <h3>
        Status Pengajuan
    </h3>
    
    ${renderTimeline(data)}
</div>

<div class="detail-card">
    <h3>
        Dokumen Terlampir
    </h3>
    
    ${renderDokumen(data.dokumen)}
</div>


`;
}

function renderDokumen(dokumen) {
  if (!dokumen || dokumen.length === 0) {
    return `
<p>
Belum ada dokumen.
</p>
`;
  }

  return dokumen
    .map(function (doc) {
      return `

<div class="document-item">


<strong>
📄 ${doc.nama}
</strong>



<a 
    href="${doc.url}"
    target="_blank"
>
    Lihat Dokumen 
</a>


</div>

`;
    })
    .join("");
}

function renderTimeline(data) {
  const status = String(data.status || "").toLowerCase();

  let verifikasi = "";
  let selesai = "";

  if (
    status.includes("verifikasi") ||
    status.includes("diproses") ||
    status.includes("diterima")
  ) {
    verifikasi = "active";
  }

  if (status.includes("selesai") || status.includes("disetujui")) {
    selesai = "active";
  }

  return `


<div class="timeline">


<div class="timeline-item active">


<div class="timeline-dot"></div>


<div class="timeline-content">


<h4>
Diajukan
</h4>


<p>
Pengajuan telah diterima oleh sistem.
</p>


</div>


</div>





<div class="timeline-item ${verifikasi}">


<div class="timeline-dot"></div>


<div class="timeline-content">


<h4>
Verifikasi
</h4>


<p>
${data.tahap || "Menunggu proses verifikasi."}
</p>


</div>


</div>





<div class="timeline-item ${selesai}">


<div class="timeline-dot"></div>


<div class="timeline-content">


<h4>
Selesai
</h4>


<p>
${data.catatan || "Pengajuan belum selesai."}
</p>


</div>


</div>



</div>


`;
}

function formatTanggal(tanggal) {
  if (!tanggal) return "-";

  return new Date(tanggal).toLocaleDateString("id-ID");
}

function formatRupiah(value) {
  if (!value) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(value);
}
