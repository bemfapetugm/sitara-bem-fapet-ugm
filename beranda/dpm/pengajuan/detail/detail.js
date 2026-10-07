const API_URL="https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const raw=sessionStorage.getItem("sitaraUser");
if(!raw)location.href="../../../../login/index.html";
const user=JSON.parse(raw||"{}"),token=String(user.session_token||"");
const id=new URLSearchParams(location.search).get("id");
const $=x=>document.getElementById(x);
let pending=null, currentDocs=[];

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function dt(v){if(!v)return "-";const d=new Date(v);return isNaN(d)?"-":d.toLocaleDateString("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});}
function ini(n){return String(n||"DPM").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"DP";}
async function api(action,data={}){const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,session_token:token,...data})});return r.json();}
function row(label,value){return `<div class="info-row"><span>${esc(label)}</span><strong>${esc(value||"-")}</strong></div>`;}
function primaryDoc(docs,jenis){
  const target=String(jenis||"").trim().toLowerCase()==="lpj"?"dokumen lpj":"proposal kegiatan";
  return (Array.isArray(docs)?docs:[]).filter(d=>String(d.jenis_dokumen||d.jenis||"").trim().toLowerCase()===target)
    .sort((a,b)=>new Date(b.uploaded_at||0)-new Date(a.uploaded_at||0))[0]||null;
}
function downloadUrl(d){
  if (d.drive_file_id) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(d.drive_file_id)}`;
  }

  return d.file_url || d.url || "";
}
function render(d){
  const p=d.pengajuan||d;
  const mainDoc=primaryDoc(d.dokumen||[],p.jenis);
  currentDocs=mainDoc?[mainDoc]:[];
  const hist=Array.isArray(d.riwayat)?d.riwayat:[];
  const url=mainDoc?downloadUrl(mainDoc):"";
  const docHtml=mainDoc?`<div class="doc-item">
    <div class="doc-main">
      <div class="doc-name">${esc(mainDoc.nama_file||mainDoc.nama||mainDoc.jenis_dokumen||"Dokumen")}</div>
      <div class="doc-meta">${esc(mainDoc.jenis_dokumen||mainDoc.jenis||"")}${mainDoc.nomor_surat?" · "+esc(mainDoc.nomor_surat):""}</div>
    </div>
    ${url?`<a class="download" href="${esc(url)}">Download</a>`:`<span class="download-disabled">Tidak tersedia</span>`}
  </div>`:'<div class="empty-state">Dokumen utama belum tersedia.</div>';
  const histHtml=hist.length?hist.map(x=>`<div class="timeline-item">
    <span class="timeline-dot"></span>
    <div>
      <strong>${esc(x.aksi||"Aktivitas DPM")}</strong>
      <p>BEM Fakultas Peternakan UGM → DPM · ${esc(dt(x.waktu))}</p>
      ${x.catatan?`<small>${esc(x.catatan)}</small>`:""}
    </div>
  </div>`).join(""):'<div class="empty-state">Belum ada aktivitas DPM.</div>';

  $("detail").innerHTML=`
  <section class="welcome-section">
    <div><p class="welcome-label">${esc(p.jenis||"Pengajuan")}</p><h1>${esc(p.judul||p.judul_pengajuan||"-")}</h1><p>${esc(p.status||"Menunggu Persetujuan DPM")}</p></div>
    <div class="welcome-icon">✓</div>
  </section>
  <div class="detail-grid">
    <div class="info-card">
      <h3>Informasi Pengajuan</h3>
      ${row("Nomor Pengajuan",p.pengajuan_id||id)}
      ${row("Asal Permohonan","BEM Fakultas Peternakan UGM")}
      ${row("Jenis Dokumen",p.jenis)}
      ${row("Tanggal Pengajuan",dt(p.tanggal_pengajuan))}
      ${row("Status",p.status)}
      ${row("Tahap",p.tahap_sekarang||"DPM")}
    </div>
    <div class="info-card">
      <h3>Keputusan DPM</h3>
      <p class="decision-description">Tinjau dokumen utama sebelum memberikan keputusan.</p>
      <div class="decision-bar">
        <button type="button" class="btn btn-revisi" id="revBtn">Revisi</button>
        <button type="button" class="btn btn-success" id="appBtn">Disetujui</button>
      </div>
    </div>
  </div>
  <div class="document-card">
    <div class="section-heading"><div><h3>Dokumen</h3><p>Dokumen utama yang perlu ditinjau dan ditandatangani DPM.</p></div></div>
    ${docHtml}
  </div>
  <div class="timeline-card">
    <h3>Aktivitas DPM</h3>
    ${histHtml}
  </div>`;

  $("revBtn").onclick=()=>openModal("revisi",currentDocs);
  $("appBtn").onclick=()=>openModal("setujui",currentDocs);
}
function openModal(action,docs){
  pending=action;
  $("modal").classList.add("show");
  $("modal").setAttribute("aria-hidden","false");
  $("modalNote").value="";
  $("noteWrap").style.display=action==="revisi"?"block":"none";
  $("uploadWrap").style.display=action==="setujui"?"block":"none";
  if(action==="revisi"){
    $("modalTitle").textContent="Minta Revisi";
    $("modalText").textContent="Sampaikan catatan revisi yang akan diteruskan kepada BEM Fakultas Peternakan UGM.";
    $("noteLabel").textContent="Catatan Revisi";
    $("modalNote").placeholder="Tuliskan bagian yang perlu direvisi...";
    $("confirmBtn").textContent="Kirim Revisi";
    $("confirmBtn").className="btn btn-revisi";
  }else{
    $("modalTitle").textContent="Setujui Pengajuan";
    $("modalText").textContent="Unggah satu dokumen final yang telah ditandatangani DPM sebelum dikembalikan ke BEM Fakultas Peternakan UGM.";
    $("confirmBtn").textContent="Disetujui";
    $("confirmBtn").className="btn btn-success";
    const d=docs[0];
    $("uploadList").innerHTML=d?`<div class="upload-row">
      <div class="upload-meta"><strong>${esc(d.jenis_dokumen||d.jenis||"Dokumen")}</strong><span>${esc(d.nama_file||d.nama||"Dokumen")}</span></div>
      <label class="file-input-label"><span class="file-choice-text">Pilih Word</span>
        <input class="final-file" type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-dokumen-id="${esc(d.dokumen_id||"")}">
      </label>
    </div>`:'<div class="upload-empty">Dokumen utama belum tersedia.</div>';
    const input=$(".final-file");
    if(input){
      const label=input.closest(".file-input-label");
      // Pastikan kontrol file benar-benar menerima klik di semua browser.
      // CSS lama memberi pointer-events:none pada input tersembunyi sehingga
      // klik tombol dapat gagal membuka/menyimpan pilihan file.
      if(label){
        label.style.position="relative";
        input.style.position="absolute";
        input.style.inset="0";
        input.style.width="100%";
        input.style.height="100%";
        input.style.opacity="0";
        input.style.pointerEvents="auto";
        input.style.cursor="pointer";
        input.style.zIndex="5";
      }
      const updateSelectedFile=()=>{
        const l=input.closest(".file-input-label");
        const f=input.files && input.files.length ? input.files[0] : null;
        const t=l?.querySelector(".file-choice-text");
        if(t){
          t.textContent=f ? "✓ " + f.name : "Pilih Word";
          t.title=f ? f.name : "";
        }
        if(l)l.classList.toggle("has-file",!!f);
      };
      input.onchange=updateSelectedFile;
      input.addEventListener("change",updateSelectedFile);
    }
  }
}
function closeModal(){
  $("modal").classList.remove("show");
  $("modal").setAttribute("aria-hidden","true");
  pending=null;
}
$("closeBtn").onclick=closeModal;
$("cancelBtn").onclick=closeModal;
$("modal").onclick=e=>{if(e.target===$("modal"))closeModal();};
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const x=String(r.result||"");resolve(x.includes(",")?x.split(",")[1]:x)};r.onerror=()=>reject(new Error("Gagal membaca file: "+file.name));r.readAsDataURL(file);});}
async function uploadAll(){
  const input=document.querySelector(".final-file");
  if(!input)throw Error("Dokumen utama tidak ditemukan.");
  const file=input.files && input.files.length ? input.files[0] : null;
  if(!file)throw Error("Dokumen final bertanda tangan belum dipilih. Klik tombol Pilih Word lalu pilih file .doc/.docx dari laptop.");
  if(!/\.(doc|docx)$/i.test(file.name))throw Error("Dokumen final harus berupa Word (.doc/.docx).");
  if(file.size>15*1024*1024)throw Error("Ukuran dokumen maksimal 15 MB.");
  const sourceId=String(input.dataset.dokumenId||"").trim();
  if(!sourceId)throw Error("ID dokumen sumber tidak ditemukan. Silakan muat ulang halaman.");
  const label=input.closest(".file-input-label");
  const text=label?.querySelector(".file-choice-text");
  if(text)text.textContent="Mengunggah...";
  const data=await fileToBase64(file);
  if(!data)throw Error("File tidak berhasil dibaca oleh browser.");
  const mime=file.type||(/\.docx$/i.test(file.name)?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":"application/msword");
  const r=await api("uploadDokumenFinalDPM",{
    pengajuan_id:id,
    dokumen_id:sourceId,
    file:{name:file.name,type:mime,data:data}
  });
  if(!r.success)throw Error(r.message||"Gagal mengunggah dokumen final.");
  const uploadedId=String(r.data?.dokumen_id||"").trim();
  if(!uploadedId)throw Error("File sudah dikirim tetapi ID dokumen hasil upload tidak diterima.");
  if(text)text.textContent="✓ "+file.name;
  return [uploadedId];
}
$("confirmBtn").onclick=async()=>{
  if(!pending)return;
  const action=pending,b=$("confirmBtn");
  b.disabled=true;
  try{
    let uploaded=[];
    const note=$("modalNote").value.trim();
    if(action==="setujui")uploaded=await uploadAll();
    else if(!note)throw Error("Catatan revisi wajib diisi.");
    const r=await api("prosesPersetujuanDPM",{pengajuan_id:id,aksi:action,catatan:action==="revisi"?note:"",uploaded_doc_ids:uploaded});
    if(!r.success)throw Error(r.message||"Gagal memproses pengajuan.");
    closeModal();
    alert(r.message||"Berhasil.");
    location.href="../index.html";
  }catch(e){
    alert(e.message||"Terjadi kesalahan.");
    b.disabled=false;
    b.textContent=action==="revisi"?"Kirim Revisi":"Disetujui";
  }
};
$("logoutButton").onclick=()=>{sessionStorage.removeItem("sitaraUser");location.href="../../../../login/index.html"};
async function load(){
  const n=user.nama_lengkap||user.nama||"DPM",i=ini(n);
  $("profileName").textContent=n;$("profileAvatar").textContent=$("topbarAvatar").textContent=i;$("currentDate").textContent=dt(new Date());
  if(!id){$("detail").innerHTML='<div class="empty-state">ID pengajuan tidak ditemukan.</div>';return;}
  try{
    const r=await api("getDetailPengajuanDPM",{pengajuan_id:id});
    if(!r.success)throw Error(r.message||"Gagal memuat detail.");
    render(r.data||{});
  }catch(e){$("detail").innerHTML=`<div class="empty-state">${esc(e.message)}</div>`;}
}
load();
