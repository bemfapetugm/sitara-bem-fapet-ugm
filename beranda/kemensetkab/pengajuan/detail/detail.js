const API_URL = "https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const sessionData = sessionStorage.getItem("sitaraUser");
if (!sessionData) window.location.href = "/login/index.html";
let user = null;
try { user = JSON.parse(sessionData); } catch (e) { sessionStorage.removeItem("sitaraUser"); window.location.href = "/login/index.html"; }
if (user && (user.role !== "kementerian" || user.kementerian_id !== "KEM001")) { alert("Anda tidak memiliki akses halaman ini."); window.location.href = "/login/index.html"; }
const pengajuanId = new URLSearchParams(window.location.search).get("id");
let currentData = null;
if (!pengajuanId) document.getElementById("detailContainer").innerHTML = `<div class="error-state"><h3>ID pengajuan tidak ditemukan</h3><p>Silakan kembali ke Pengajuan Masuk.</p></div>`; else initialize();

function initialize(){displayCurrentDate();displayUserProfile();initializeLogout();loadDetailPengajuan();}
async function loadDetailPengajuan(){
  try{
    const response=await fetch(API_URL,{method:"POST",body:JSON.stringify({action:"getDetailPengajuanKemensetkab",session_token:user.session_token,pengajuan_id:pengajuanId})});
    const result=await response.json();
    if(!result.success) throw new Error(result.message||"Gagal memuat detail pengajuan.");
    currentData=result.data;renderDetail(currentData);initializeFacultyFilePickers();
  }catch(error){console.error(error);document.getElementById("detailContainer").innerHTML=`<div class="error-state"><h3>Gagal memuat detail</h3><p>${escapeHtml(error.message)}</p><a class="back-button inline" href="../index.html">Kembali ke Pengajuan Masuk</a></div>`;}
}
function renderDetail(data){
  const status=getStatusInfo(data.status);
  const category=getCategory(data);
  document.getElementById("detailContainer").innerHTML=`
    <div class="detail-card">
      <div class="detail-header"><div><span class="detail-label">Nomor Pengajuan</span><h2>${escapeHtml(data.nomor_pengajuan||"-")}</h2></div><span class="status-badge status-${status.cls}">${escapeHtml(status.label)}</span></div>
      <div class="detail-grid">
        ${item("Asal Kementerian",data.asal_kementerian)}${item("Jenis Pengajuan",getJenisLabel(data.jenis))}${item("Sumber Dana",data.sumber_dana)}${item("Tanggal Pengajuan",formatTanggal(data.tanggal_pengajuan))}${item("Judul Pengajuan",data.judul)}${item("Nomor Surat",data.nomor_surat)}${item("Tanggal Kegiatan",formatTanggal(data.tanggal_kegiatan))}${item("Tempat Kegiatan",data.tempat)}${item("Jumlah Dana",formatRupiah(data.jumlah_dana))}${item("Penanggung Jawab",data.penanggung_jawab)}${item("Kontak Penanggung Jawab",data.kontak)}${item("Tahap Sekarang",formatUnit(data.tahap))}
      </div>
      <div class="note-box"><span>Catatan Terakhir</span><p>${escapeHtml(data.catatan||"Tidak ada catatan.")}</p></div>
    </div>
    <div class="detail-card"><h3>Alur Pengajuan</h3>${renderTimeline(data)}</div>
    <div class="detail-card"><h3>Dokumen Terlampir</h3>${renderDokumen(data.dokumen)}</div>
    ${renderFinalFacultyPanel(data)}
    ${renderActionPanel(data,category)}
  `;
}
function item(label,value){return `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value??"-")}</strong></div>`;}
function getCategory(data){
  const status=normalizeStatus(data.status),stage=normalizeStatus(data.tahap);
  if(status.includes("selesai"))return"selesai";
  if(status.includes("eksternal")||stage.includes("eksternal"))return"eksternal";
  if(status.includes("revisi")||status.includes("perbaikan")){if(stage==="kem001"||stage.includes("kemensetkab"))return"perbaikan";return"menunggu_revisi";}
  if(status.includes("menunggu verifikasi")||status.includes("perlu verifikasi")||status==="diajukan")return"verifikasi";
  return"proses";
}
function renderActionPanel(data,category){
  if(category==="menunggu_revisi")return`<div class="action-card"><div><h3>Menunggu Perbaikan Kementerian X</h3><p>Pengajuan telah dikembalikan oleh Kemensetkab kepada ${escapeHtml(data.asal_kementerian||"Kementerian X")} untuk diperbaiki. Setelah diperbaiki dan dikirim ulang, pengajuan akan kembali ke Kemensetkab untuk diverifikasi.</p></div></div>`;
  if(category==="perbaikan")return`<div class="action-card"><div><h3>Perlu Perbaikan Kemensetkab</h3><p>Pengajuan ini dikembalikan oleh Menteri Sekretariat Kabinet kepada Kemensetkab.</p></div></div>`;
  if(String(data.status||"").trim()==="Disetujui Ketua BEM" && String(data.tahap||"").trim()==="KEM001" && ["proposal","lpj"].includes(String(data.jenis||"").trim().toLowerCase())) return `<div class="action-card"><div><h3>Teruskan ke DPM</h3><p>Ketua BEM telah menyetujui pengajuan. Periksa dokumen final, lalu teruskan Proposal atau LPJ kepada DPM.</p></div><div class="action-buttons"><button class="primary-button" id="btnKirimDPM" onclick="kirimKeDPM()">Teruskan ke DPM</button></div></div>`;
  if(String(data.status||"").trim()==="Disetujui DPM" && String(data.tahap||"").trim()==="KEM001" && String(data.jenis||"").trim().toLowerCase()==="proposal") return `<div class="action-card"><div><h3>Kirim ke Fakultas</h3><p>DPM telah menyetujui proposal. SITARA akan mengirim paket dokumen final ke Fakultas Peternakan UGM melalui satu email otomatis.</p></div><div class="action-buttons"><button class="primary-button" id="btnKirimFakultas" onclick="kirimKeFakultas()">Kirim ke Fakultas</button></div></div>`;
  if(category!=="verifikasi")return"";
  return`<div class="action-card"><div><h3>Tindak Lanjut Verifikasi</h3><p>Pastikan data dan dokumen sudah lengkap sebelum diteruskan.</p></div><div class="action-buttons"><button class="secondary-button" id="btnRevisi" onclick="mintaRevisi()">Minta Revisi</button><button class="primary-button" id="btnSetujui" onclick="setujuiPengajuan()">Setujui &amp; Teruskan</button></div></div>`;
}
function prepareLatestDocuments(docs){const groups={};(Array.isArray(docs)?docs:[]).forEach((doc,index)=>{const jenis=String(doc.jenis||doc.jenis_dokumen||"Dokumen").trim();if(!groups[jenis])groups[jenis]=[];groups[jenis].push({...doc,__index:index});});return Object.values(groups).map(list=>{list.sort((a,b)=>{const ta=new Date(a.uploaded_at||0).getTime(),tb=new Date(b.uploaded_at||0).getTime();if(!isNaN(tb)&&!isNaN(ta)&&tb!==ta)return tb-ta;return(b.__index||0)-(a.__index||0);});return{latest:list[0],history:list.slice(1)};});}
function getDownloadUrl(doc){if(doc.drive_file_id)return"https://drive.google.com/uc?export=download&id="+encodeURIComponent(doc.drive_file_id);return doc.url||"#";}
function renderDokumen(docs){const grouped=prepareLatestDocuments(docs);if(!grouped.length)return`<div class="empty-document">Belum ada dokumen terlampir.</div>`;return`<div class="document-list">${grouped.map(({latest,history})=>`<div class="document-version-group"><div class="document-item"><div><strong>📄 ${escapeHtml(latest.nama||"Dokumen")}</strong><span>${escapeHtml(latest.jenis||"")} · Versi terbaru${formatDocumentVersionDate(latest.uploaded_at)?" · "+escapeHtml(formatDocumentVersionDate(latest.uploaded_at)):""}</span></div><a href="${escapeHtml(getDownloadUrl(latest))}" target="_blank" rel="noopener" download>Download ↓</a></div>${history.length?`<details class="document-history"><summary>Riwayat versi (${history.length})</summary><div class="document-history-list">${history.map((oldDoc,index)=>`<div class="document-history-item"><div><strong>Versi lama</strong><span>${escapeHtml(oldDoc.nama||"Dokumen")}${formatDocumentVersionDate(oldDoc.uploaded_at)?" · "+escapeHtml(formatDocumentVersionDate(oldDoc.uploaded_at)):""}</span></div>${oldDoc.url||oldDoc.drive_file_id?`<a href="${escapeHtml(getDownloadUrl(oldDoc))}" target="_blank" rel="noopener" download>Download</a>`:""}</div>`).join("")}</div></details>`:""}</div>`).join("")}</div>`;}
function renderTimeline(data){
  const riwayat=Array.isArray(data.riwayat)?data.riwayat:[];
  if(!riwayat.length)return`<div class="timeline"><div class="timeline-item active"><div class="timeline-dot"></div><div><h4>Pengajuan Diterima</h4><p>Pengajuan dibuat dan masuk ke SITARA.</p></div></div></div>`;
  return`<div class="timeline">${riwayat.map((item,index)=>{const from=formatUnit(item.dari_unit),to=formatUnit(item.ke_unit),action=item.aksi||"Perubahan status",status=getStatusInfo(item.status),note=item.catatan?`<p>${escapeHtml(item.catatan)}</p>`:"",time=formatDateTime(item.waktu);return`<div class="timeline-item ${index===riwayat.length-1?"active":""}"><div class="timeline-dot"></div><div><h4>${escapeHtml(action)}</h4><p>${escapeHtml(from)} → ${escapeHtml(to)} · <span class="timeline-status status-${status.cls}">${escapeHtml(status.label)}</span></p>${note}${time?`<small>${escapeHtml(time)}</small>`:""}</div></div>`;}).join("")}</div>`;
}
function mintaRevisi(){const catatan=prompt("Tuliskan catatan perbaikan untuk Kementerian X:");if(catatan===null)return;if(!catatan.trim()){alert("Catatan revisi wajib diisi.");return;}if(!confirm("Kirim permintaan revisi kepada "+(currentData?.asal_kementerian||"Kementerian X")+"?"))return;prosesVerifikasi("revisi",catatan.trim());}
function setujuiPengajuan(){if(!confirm("Setujui pengajuan ini dan teruskan kepada Menteri Sekretariat Kabinet?"))return;prosesVerifikasi("setujui","");}
async function prosesVerifikasi(aksi,catatan){
  const btn1=document.getElementById("btnRevisi"),btn2=document.getElementById("btnSetujui");
  [btn1,btn2].forEach(btn=>{if(btn){btn.disabled=true;btn.style.opacity=".6";btn.style.pointerEvents="none";}});
  try{
    const response=await fetch(API_URL,{method:"POST",body:JSON.stringify({action:"prosesVerifikasiPengajuan",session_token:user.session_token,pengajuan_id:pengajuanId,aksi,catatan})});
    const result=await response.json();
    if(!result.success)throw new Error(result.message||"Proses verifikasi gagal.");
    alert(result.message||"Perubahan berhasil disimpan dan notifikasi telah diproses.");
    await loadDetailPengajuan();
  }catch(error){alert("Gagal memproses pengajuan: "+error.message);[btn1,btn2].forEach(btn=>{if(btn){btn.disabled=false;btn.style.opacity="1";btn.style.pointerEvents="auto";}});}
}
function getStatusInfo(value){const raw=String(value||"").trim(),n=normalizeStatus(raw);const map=[[/^diajukan$/, ["Diajukan","diajukan"]],[/menunggu verifikasi|perlu verifikasi/, ["Menunggu Verifikasi","menunggu-verifikasi"]],[/perlu revisi|^revisi$/, ["Perlu Revisi","perlu-revisi"]],[/menunggu persetujuan mensetkab|menunggu persetujuan menteri sekretariat kabinet/, ["Menunggu Persetujuan Mensetkab","menunggu-mensetkab"]],[/menunggu persetujuan ketua bem|menunggu persetujuan ketua/, ["Menunggu Persetujuan Ketua BEM","menunggu-ketua"]],[/diajukan ke dpm/, ["Diajukan ke DPM","diajukan-dpm"]],[/disetujui dpm/, ["Disetujui DPM","disetujui-dpm"]],[/diajukan ke fakultas/, ["Diajukan ke Fakultas","diajukan-fakultas"]],[/disetujui fakultas/, ["Disetujui Fakultas","disetujui-fakultas"]],[/menunggu dokumen fakultas/, ["Menunggu Dokumen Fakultas","menunggu-fakultas"]],[/dalam proses|diproses|proses/, ["Dalam Proses","dalam-proses"]],[/selesai/, ["Selesai","selesai"]],[/ditolak/, ["Ditolak","ditolak"]]];for(const[rx,info]of map)if(rx.test(n))return{label:info[0],cls:info[1]};return{label:raw||"-",cls:"lainnya"};}
function normalizeStatus(v){return String(v||"").trim().toLowerCase().replace(/_/g," ").replace(/\s+/g," ");}
function getJenisLabel(value){const raw=String(value||"").trim(),n=raw.toLowerCase();return n==="proposal"?"Proposal":n==="lpj"?"LPJ":raw||"-";}
function formatUnit(value){const raw=String(value||"").trim(),n=raw.toLowerCase();if(raw==="KEM001"||n==="biro agata"||n==="kemensetkab")return"Kementerian Sekretariat Kabinet";if(n==="mensetkab"||n==="menteri sekretariat kabinet")return"Menteri Sekretariat Kabinet";if(n==="ketua"||n==="ketua bem")return"Ketua BEM";if(n==="kemenkeu"||n==="kementerian keuangan")return"Kementerian Keuangan";return raw;}
function formatDocumentVersionDate(value){if(!value)return"";const d=new Date(value);return isNaN(d)?"":d.toLocaleString("id-ID",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function formatDateTime(value){if(!value)return"";const d=new Date(value);if(isNaN(d))return"";return d.toLocaleString("id-ID",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function displayCurrentDate(){const el=document.getElementById("currentDate");if(el)el.textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
function displayUserProfile(){const name=user.nama_lengkap||user.nama||"Kementerian Sekretariat Kabinet",initial=String(user.kementerian_id||"")==="KEM001"?"KS":getInitials(name);document.getElementById("profileName").textContent=name;document.getElementById("profileRole").textContent="Kementerian";document.getElementById("profileAvatar").textContent=initial;document.getElementById("topbarAvatar").textContent=initial;}
function getInitials(name){const p=String(name||"").trim().split(/\s+/).filter(Boolean);return p.length>1?(p[0][0]+p[1][0]).toUpperCase():String(p[0]||"KS").substring(0,2).toUpperCase();}
function initializeLogout(){document.getElementById("logoutButton")?.addEventListener("click",()=>{if(!confirm("Apakah Anda yakin ingin keluar dari SITARA?"))return;sessionStorage.removeItem("sitaraUser");window.location.href="/login/index.html";});}
function formatTanggal(value){if(!value)return"-";const d=new Date(value);return isNaN(d)?value:d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});}
function formatRupiah(value){if(value===null||value===undefined||value==="")return"-";const n=Number(value);return isNaN(n)?value:new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);}
function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}



function renderFinalFacultyPanel(data){
  const status=String(data.status||"").trim();
  const stage=String(data.tahap||"").trim();
  const jenis=String(data.jenis||"").trim().toLowerCase();
  if(jenis!=="proposal" || stage!=="FAKULTAS" || !["Diajukan ke Fakultas","Menunggu Dokumen Fakultas"].includes(status)) return "";
  const docs=Array.isArray(data.dokumen)?data.dokumen:[];
  const hasPeminjaman=docs.some(d=>{
    const haystack=[d.jenis,d.jenis_dokumen,d.nama,d.nama_file,d.file_name,d.judul,d.keterangan].map(v=>String(v??"")).join(" ").toLowerCase();
    return /peminjaman\s*fasilitas/.test(haystack);
  }) || /peminjaman\s*fasilitas/i.test(String(data.jenis_peminjaman||data.dokumen_peminjaman||data.peminjaman_fasilitas||""));
  return `<div class="detail-card faculty-final-card">
    <h3>Berkas Final Dokumen Fakultas</h3>
    <p class="faculty-final-intro">Fakultas melakukan persetujuan melalui email. Setelah menerima kembali berkas final, unduh secara manual lalu unggah berkas tersebut di sini.</p>
    <div class="faculty-final-grid">
      ${facultyFileField("finalPencairan","Surat Pencairan Dana","Wajib")}
      ${hasPeminjaman?facultyFileField("finalPeminjaman","Surat Peminjaman Fasilitas","Wajib karena pengajuan memiliki peminjaman"):""}
    </div>
    <div class="action-buttons faculty-final-actions"><button class="primary-button" id="btnSimpanFinalFakultas" onclick="simpanDokumenFinalFakultas()">Simpan & Kirim Dokumen Final</button></div>
  </div>`;
}
function facultyFileField(id,title,badge){
  return `<div class="faculty-file-field"><div class="faculty-file-head"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(badge)}</span></div><label class="faculty-file-label"><input type="file" id="${id}" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><span class="faculty-file-choice" id="${id}Text">Pilih File</span></label></div>`;
}
function initializeFacultyFilePickers(){
  ["finalPencairan","finalPeminjaman"].forEach(id=>{
    const input=document.getElementById(id), text=document.getElementById(id+"Text");
    if(!input||!text)return;
    input.addEventListener("change",()=>{const f=input.files&&input.files[0];text.textContent=f?"✓ "+f.name:"Pilih File";input.closest(".faculty-file-label")?.classList.toggle("has-file",!!f);});
  });
}
async function fileToPayload(input,kind){
  const file=input?.files?.[0];
  if(!file)return null;
  return await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{const result=String(reader.result||"");resolve({kind,name:file.name,type:file.type||"",data:result.includes(",")?result.split(",")[1]:result});};
    reader.onerror=()=>reject(new Error("File "+file.name+" gagal dibaca."));
    reader.readAsDataURL(file);
  });
}
async function simpanDokumenFinalFakultas(){
  const btn=document.getElementById("btnSimpanFinalFakultas");
  if(!btn||!pengajuanId)return;
  const pencairan=document.getElementById("finalPencairan");
  const peminjaman=document.getElementById("finalPeminjaman");
  if(!pencairan?.files?.length){alert("Surat Pencairan Dana wajib diunggah.");return;}
  if(peminjaman && !peminjaman.files.length){alert("Surat Peminjaman Fasilitas wajib diunggah karena pengajuan ini memiliki peminjaman fasilitas.");return;}
  if(!confirm("Simpan berkas final dari Fakultas ke SITARA sekaligus disposisikan ke akun Kementerian pengaju dan akun Kementerian Keuangan?\n\nSurat Pencairan Dana masuk ke kedua akun SITARA. Surat Peminjaman Fasilitas, jika ada, hanya masuk ke akun Kementerian pengaju. Tidak ada pengiriman email pada tahap ini."))return;
  btn.disabled=true;btn.textContent="Menyimpan & Mengirim...";
  try{
    const files=[await fileToPayload(pencairan,"Surat Pencairan Dana")];
    if(peminjaman?.files?.length)files.push(await fileToPayload(peminjaman,"Surat Peminjaman Fasilitas"));
    const response=await fetch(API_URL,{method:"POST",body:JSON.stringify({action:"uploadDokumenFinalFakultas",session_token:user.session_token,pengajuan_id:pengajuanId,files})});
    const result=await response.json();
    if(!result.success)throw new Error(result.message||"Gagal menyimpan dokumen final Fakultas.");
    alert(result.message||"Dokumen final Fakultas berhasil disimpan dan dikirim.");
    await loadDetailPengajuan();
  }catch(error){alert("Gagal mengunggah dokumen final Fakultas: "+(error.message||"Terjadi kesalahan."));btn.disabled=false;btn.textContent="Simpan & Kirim Dokumen Final";}
}

async function kirimKeDPM(){
  const btn=document.getElementById("btnKirimDPM");
  if(!btn||!pengajuanId)return;
  if(!confirm("Teruskan pengajuan ini ke DPM?"))return;
  btn.disabled=true;btn.textContent="Mengirim...";
  try{
    const response=await fetch(API_URL,{method:"POST",body:JSON.stringify({action:"kirimKeDPM",session_token:user.session_token,pengajuan_id:pengajuanId})});
    const result=await response.json();
    if(!result.success)throw new Error(result.message||"Gagal meneruskan pengajuan ke DPM.");
    alert(result.message||"Pengajuan berhasil diteruskan ke DPM.");
    window.location.href="../index.html";
  }catch(error){alert(error.message||"Terjadi kesalahan.");btn.disabled=false;btn.textContent="Teruskan ke DPM";}
}


async function kirimKeFakultas(){
  const btn=document.getElementById("btnKirimFakultas");
  if(!btn||!pengajuanId)return;
  if(!confirm("Kirim paket dokumen final pengajuan ini ke Fakultas Peternakan UGM?\n\nDokumen yang akan dikirim: Proposal Kegiatan, Form Kegiatan, Surat Pencairan Dana, dan Surat Peminjaman Fasilitas jika ada."))return;
  btn.disabled=true;
  btn.textContent="Mengirim...";
  try{
    const response=await fetch(API_URL,{method:"POST",body:JSON.stringify({action:"kirimKeFakultas",session_token:user.session_token,pengajuan_id:pengajuanId})});
    const result=await response.json();
    if(!result.success)throw new Error(result.message||"Gagal mengirim pengajuan ke Fakultas.");
    alert(result.message||"Pengajuan berhasil dikirim ke Fakultas.");
    await loadDetailPengajuan();
  }catch(error){
    alert("Gagal mengirim ke Fakultas: "+(error.message||"Terjadi kesalahan."));
    btn.disabled=false;
    btn.textContent="Kirim ke Fakultas";
  }
}
