const SCRIPT_URL="https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const session=JSON.parse(sessionStorage.getItem("sitaraUser")||"{}");
const token=String(session.session_token||"").trim();
const $=id=>document.getElementById(id);
let rows=[], page=1;
const PAGE_SIZE=30;
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function asDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
function dateLabel(v){const d=asDate(v);return d?d.toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}):String(v||"Tanggal tidak tersedia");}
function dateTimeLabel(v){const d=asDate(v);return d?d.toLocaleString("id-ID",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):dateLabel(v);}
function initials(n){return String(n||"DPM").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"DP";}
async function api(action,data={}){const response=await fetch(SCRIPT_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,session_token:token,...data})});return response.json();}
function textOf(row){return [row.status,row.aksi,row.keterangan,row.catatan,row.ke_unit,row.dari_unit,row.judul,row.nama_pengajuan,row.jenis,row.tipe_dokumen].join(" ").toLowerCase();}
function statusKind(row){
  const t=textOf(row);
  if(/mengirimkan kembali dokumen revisi ke dpm|dikembalikan ke dpm|revisi diterima dpm/.test(t))return "returned";
  if(/revisi|dikembalikan|perbaikan|ditolak sementara/.test(t))return "revision";
  return "approved";
}
function statusLabel(row){
  const kind=statusKind(row);
  return kind==="revision"?"Dikembalikan untuk Revisi":kind==="returned"?"Dokumen Revisi Diterima DPM":"Disetujui";
}
function docKind(row){const t=[row.jenis,row.tipe_dokumen,row.judul,row.nama_pengajuan].join(" ").toLowerCase();return /\blpj\b|laporan pertanggungjawaban/.test(t)?"LPJ":"Proposal";}
function titleOf(row){return row.judul||row.nama_pengajuan||row.pengajuan_id||"Pengajuan tanpa judul";}
function originOf(row){return row.dari_unit||row.asal_pengajuan||row.unit_pengusul||row.nama_kementerian||"Asal pengajuan tidak tersedia";}
function descriptionOf(row){
  const explicit=row.keterangan||row.catatan||row.deskripsi;
  if(explicit)return explicit;
  return statusKind(row)==="revision"?"Pengajuan dikembalikan ke Kemensetkab untuk ditindaklanjuti dan direvisi.":"Pengajuan telah disetujui dan tercatat dalam riwayat DPM.";
}
function filteredRows(){
  const q=($("search").value||"").trim().toLowerCase(), type=$("typeFilter").value, status=$("statusFilter").value, sort=$("sortFilter").value;
  let result=rows.filter(r=>{
    const kind=docKind(r).toLowerCase();
    return (!q||JSON.stringify(r).toLowerCase().includes(q))&&(!type||kind===type)&&(!status||statusKind(r)===status);
  });
  result.sort((a,b)=>{
    const da=asDate(a.waktu||a.tanggal||a.created_at), db=asDate(b.waktu||b.tanggal||b.created_at);
    const va=da?da.getTime():0,vb=db?db.getTime():0;
    return sort==="oldest"?va-vb:vb-va;
  });
  return result;
}
function closeDetailModal(){
  const modal=$("historyDetailModal");
  if(modal)modal.remove();
  document.removeEventListener("keydown",onDetailKeydown);
}
function onDetailKeydown(e){if(e.key==="Escape")closeDetailModal();}
function showDetailModal(row){
  closeDetailModal();
  const docName=row.dokumen_nama||"Dokumen terbaru belum tersedia";
  const uploaded=row.dokumen_uploaded_at?dateTimeLabel(row.dokumen_uploaded_at):"Waktu unggah tidak tersedia";
  const fileUrl=String(row.dokumen_url||"").trim();
  const driveId=String(row.drive_file_id||"").trim();
  const downloadUrl=driveId?"https://drive.google.com/uc?export=download&id="+encodeURIComponent(driveId):fileUrl;
  const modal=document.createElement("div");
  modal.id="historyDetailModal";modal.className="history-modal-backdrop";
  modal.innerHTML=`<section class="history-modal" role="dialog" aria-modal="true" aria-labelledby="historyModalTitle">
    <header class="history-modal-header"><div><span class="history-modal-eyebrow">ARSIP DPM</span><h2 id="historyModalTitle">Detail Riwayat Pengajuan</h2><p>${esc(row.pengajuan_id||"Nomor pengajuan tidak tersedia")}</p></div><button type="button" class="history-modal-close" aria-label="Tutup">×</button></header>
    <div class="history-modal-body">
      <div class="history-modal-field"><span>Judul Pengajuan</span><strong>${esc(titleOf(row))}</strong></div>
      <div class="history-modal-field"><span>Status Tindak Lanjut</span><strong>${esc(statusLabel(row))}</strong></div>
      <div class="history-modal-field"><span>Aktivitas</span><strong>${esc(row.aksi||row.status||"Aktivitas DPM")}</strong></div>
      <div class="history-modal-field"><span>Catatan</span><p>${esc(row.catatan||row.keterangan||"Tidak ada catatan tambahan.")}</p></div>
      <div class="history-latest-document"><div class="history-latest-icon"><i data-lucide="file-check-2"></i></div><div class="history-latest-copy"><span>Dokumen versi terbaru</span><strong>${esc(docName)}</strong><small>${esc(row.dokumen_jenis||"Dokumen pengajuan")} · ${esc(uploaded)}${row.dokumen_versi?" · Versi "+esc(row.dokumen_versi):""}</small></div></div>
      ${fileUrl?`<div class="history-modal-actions"><a class="history-modal-action secondary" href="${esc(fileUrl)}" target="_blank" rel="noopener">Buka Dokumen <i data-lucide="external-link"></i></a><a class="history-modal-action primary" href="${esc(downloadUrl)}" target="_blank" rel="noopener">Unduh Dokumen <i data-lucide="download"></i></a></div>`:`<p class="history-document-missing">Tautan dokumen terbaru belum tersedia untuk pengajuan ini.</p>`}
    </div>
  </section>`;
  modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest(".history-modal-close"))closeDetailModal();});
  document.body.appendChild(modal);
  document.addEventListener("keydown",onDetailKeydown);
  if(window.lucide)window.lucide.createIcons();
}
function render(){
  const filtered=filteredRows(), totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  page=Math.min(page,totalPages);
  const visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  $("resultCount").textContent=`Menampilkan ${filtered.length?((page-1)*PAGE_SIZE+1):0}–${Math.min(page*PAGE_SIZE,filtered.length)} dari ${filtered.length} riwayat`;
  $("list").innerHTML=visible.length?visible.map((r,i)=>{
    const kind=statusKind(r), doc=docKind(r), date=r.waktu||r.tanggal||r.created_at;
    const isLpj=doc==="LPJ";
    const icon=isLpj?"file-text":"file-check";
    const target=r.ke_unit||"Kemensetkab";
    return `<article class="history-card ${kind}">
      <div class="history-card-top"><span class="history-status ${kind}"><i data-lucide="${kind==="revision"?"alert-triangle":"check-circle-2"}"></i>${statusLabel(r)}</span><span class="history-date"><i data-lucide="calendar-days"></i>${esc(dateTimeLabel(date))}</span></div>
      <div class="history-card-main"><div class="history-doc-icon ${isLpj?"lpj":"proposal"}"><i data-lucide="${icon}"></i></div><div class="history-card-copy"><h3>${esc(titleOf(r))}</h3><p class="history-origin"><i data-lucide="landmark"></i>${esc(originOf(r))}</p><p class="history-description">${esc(descriptionOf(r))}</p></div></div>
      <div class="history-card-bottom"><span class="history-type ${isLpj?"lpj":"proposal"}"><i data-lucide="file"></i>${doc}</span><button type="button" class="history-detail" data-row="${esc(r.pengajuan_id||r.id||"")}" data-index="${(page-1)*PAGE_SIZE+i}">Lihat Detail <i data-lucide="arrow-right"></i></button></div>
    </article>`;
  }).join(""):`<div class="history-empty"><span><i data-lucide="archive"></i></span><h3>Belum ada riwayat</h3><p>Riwayat pengajuan yang disetujui atau dikembalikan untuk revisi akan muncul di sini.</p></div>`;
  $("pagination").innerHTML=filtered.length>PAGE_SIZE?`<button type="button" data-page="${page-1}" ${page===1?"disabled":""} aria-label="Halaman sebelumnya"><i data-lucide="chevron-left"></i></button>${Array.from({length:totalPages},(_,i)=>i+1).map(n=>`<button type="button" data-page="${n}" class="${n===page?"active":""}">${n}</button>`).join("")}<button type="button" data-page="${page+1}" ${page===totalPages?"disabled":""} aria-label="Halaman berikutnya"><i data-lucide="chevron-right"></i></button>`:"";
  if(window.lucide)window.lucide.createIcons();
}
async function load(){
  const name=session.nama_lengkap||session.nama||session.name||"Dewan Perwakilan Mahasiswa";
  $("profileName").textContent=name;$("profileAvatar").textContent=$("topbarAvatar").textContent=initials(name);
  $("currentDate").textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  try{
    if(!token)throw new Error("Sesi tidak ditemukan. Silakan masuk kembali ke SITARA.");
    const result=await api("getRiwayatDPM");
    if(!result.success)throw new Error(result.message||"Riwayat gagal dimuat.");
    rows=Array.isArray(result.data)?result.data:[];
    render();
  }catch(error){
    $("resultCount").textContent="Riwayat belum dapat dimuat";
    $("list").innerHTML=`<div class="history-empty history-error"><span><i data-lucide="alert-circle"></i></span><h3>Riwayat belum tersedia</h3><p>${esc(error.message||"Terjadi kendala saat mengambil data.")}</p><button type="button" id="retryLoad">Coba Lagi</button></div>`;
    $("pagination").innerHTML="";
    if(window.lucide)window.lucide.createIcons();
    const retry=$("retryLoad");if(retry)retry.addEventListener("click",load);
  }
}
["search","typeFilter","statusFilter","sortFilter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",()=>{page=1;render();}));
$("resetFilters").addEventListener("click",(event)=>{
  event.preventDefault();
  $("search").value="";
  $("typeFilter").selectedIndex=0;
  $("statusFilter").selectedIndex=0;
  $("sortFilter").value="newest";
  page=1;
  render();
});
$("pagination").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(!b||b.disabled)return;page=Number(b.dataset.page)||1;render();});
$("list").addEventListener("click",e=>{
  const b=e.target.closest(".history-detail");if(!b)return;
  const index=Number(b.dataset.index);
  const row=visibleRowForDetail(b.dataset.row,index);
  if(row)showDetailModal(row);
});
function visibleRowForDetail(id,index){
  const current=filteredRows();
  const indexed=current[index];
  if(indexed && String(indexed.pengajuan_id||indexed.id||"")===String(id))return indexed;
  return current.find(r=>String(r.pengajuan_id||r.id||"")===String(id))||rows.find(r=>String(r.pengajuan_id||r.id||"")===String(id))||null;
}
$("logoutButton").onclick=()=>{sessionStorage.removeItem("sitaraUser");location.href="../../../login/index.html";};
load();
