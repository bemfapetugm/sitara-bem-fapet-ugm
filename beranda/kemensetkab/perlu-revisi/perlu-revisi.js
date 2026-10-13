const API_URL="https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const sessionData=sessionStorage.getItem("sitaraUser");
if(!sessionData) window.location.href="/login/index.html";
let currentUser=null;
try{currentUser=JSON.parse(sessionData);}catch(e){sessionStorage.removeItem("sitaraUser");window.location.href="/login/index.html";}
if(currentUser&&(currentUser.role!=="kementerian"||currentUser.kementerian_id!=="KEM001")){alert("Anda tidak memiliki akses halaman ini.");window.location.href="/login/index.html";}
let rows=[];
let filteredRows=[];

document.addEventListener("DOMContentLoaded",()=>{
  displayCurrentDate();
  displayUserProfile();
  initializeLogout();
  initializeContentControls();
  initializeRevisionModal();
  load();
});

async function load(){
  const box=document.getElementById("revisionContainer");
  box.innerHTML=`<div class="loading">Memuat pengajuan yang perlu direvisi...</div>`;
  try{
    const r=await fetch(API_URL,{method:"POST",body:JSON.stringify({action:"getPerluRevisiKemensetkab",session_token:currentUser.session_token})});
    const result=await r.json();
    if(!result.success) throw new Error(result.message||"Gagal memuat Perlu Revisi.");
    rows=Array.isArray(result.data)?result.data:[];
    updateRevisionCount();
    applyFilters();
  }catch(e){
    box.innerHTML=`<div class="error-state"><h3>Gagal memuat Perlu Revisi</h3><p>${escapeHtml(e.message)}</p><button class="retry-button" onclick="load()">Coba Lagi</button></div>`;
  }
}

function initializeContentControls(){
  const search=document.getElementById("revisionSearch");
  search?.addEventListener("input",applyFilters);
  initializeRevisionSort();
}

function initializeRevisionSort(){
  const control=document.getElementById("revisionSortControl");
  const trigger=document.getElementById("revisionSortTrigger");
  const menu=document.getElementById("revisionSortMenu");
  const valueEl=document.getElementById("revisionSortValue");
  if(!control||!trigger||!menu||!valueEl)return;

  const options=[...menu.querySelectorAll(".revision-sort-option")];

  const close=()=>{
    control.classList.remove("is-open");
    trigger.setAttribute("aria-expanded","false");
  };

  trigger.addEventListener("click",(event)=>{
    event.preventDefault();
    if(control.classList.contains("is-open")) close();
    else{
      control.classList.add("is-open");
      trigger.setAttribute("aria-expanded","true");
    }
  });

  options.forEach(option=>{
    option.addEventListener("click",()=>{
      const selectedLabel=option.querySelector("span")?.textContent?.trim()||"Terbaru";
      valueEl.textContent=selectedLabel;
      options.forEach(item=>{
        const selected=item===option;
        item.classList.toggle("is-selected",selected);
        item.setAttribute("aria-selected",selected?"true":"false");
      });
      close();
      applyFilters();
    });
  });

  document.addEventListener("click",(event)=>{
    if(!control.contains(event.target))close();
  });

  document.addEventListener("keydown",(event)=>{
    if(event.key==="Escape")close();
  });
}

function updateRevisionCount(){
  const count=rows.length;
  const countEl=document.getElementById("revisionCount");
  if(countEl) countEl.textContent=count;
}

function applyFilters(){
  const query=(document.getElementById("revisionSearch")?.value||"").trim().toLowerCase();
  const sort=document.querySelector("#revisionSortMenu .revision-sort-option.is-selected")?.dataset.value||"terbaru";
  filteredRows=rows.filter(x=>{
    const haystack=[x.nomor_pengajuan,x.id,x.pengajuan_id,x.perihal,x.asal_kementerian,x.jenis,x.catatan_terakhir].map(v=>String(v||"").toLowerCase()).join(" ");
    return !query||haystack.includes(query);
  });
  filteredRows.sort((a,b)=>{
    if(sort==="nomor") return String(a.nomor_pengajuan||a.id||"").localeCompare(String(b.nomor_pengajuan||b.id||""),"id",{numeric:true,sensitivity:"base"});
    const da=parseDate(a.tanggal_pengajuan)?.getTime()||0;
    const db=parseDate(b.tanggal_pengajuan)?.getTime()||0;
    return sort==="terlama"?da-db:db-da;
  });
  render(filteredRows,query);
}

function render(data,query=""){
  const box=document.getElementById("revisionContainer");
  if(!data.length){
    box.innerHTML=`<div class="empty-state"><div class="empty-icon"><i data-lucide="check-circle-2"></i></div><h3>${query?"Pengajuan tidak ditemukan":"Tidak ada revisi"}</h3><p>${query?"Coba gunakan kata kunci lain untuk mencari pengajuan.":"Saat ini tidak ada pengajuan yang menunggu perbaikan Kemensetkab."}</p></div>`;
    refreshIcons();
    return;
  }
  box.innerHTML=data.map((x,index)=>{
    const note=x.catatan_terakhir?escapeHtml(x.catatan_terakhir):"Belum ada catatan revisi yang tercatat.";
    const id=escapeAttribute(x.id||x.pengajuan_id||"");
    return `<article class="revision-card">
      <div class="revision-main">
        <div class="revision-type-icon">${getJenisIcon(x.jenis)}</div>
        <div class="revision-main-copy">
          <div class="revision-number">${escapeHtml(x.nomor_pengajuan||x.id||"-")}</div>
          <h3 class="revision-title">${escapeHtml(x.perihal||"Tanpa judul")}</h3>
          <div class="revision-meta">
            <span class="revision-meta-item"><i data-lucide="landmark"></i>${escapeHtml(x.asal_kementerian||"-")}</span>
            <span class="revision-meta-item"><i data-lucide="file-text"></i>${escapeHtml(formatJenis(x.jenis))}</span>
            <span class="revision-meta-item"><i data-lucide="calendar-days"></i>${escapeHtml(formatTanggal(x.tanggal_pengajuan))}</span>
          </div>
        </div>
      </div>
      <div class="revision-note">
        <div class="revision-note-head"><i data-lucide="message-circle"></i><span>Catatan Revisi Mensetkab</span></div>
        <p class="revision-note-text">${note}</p>
      </div>
      <div class="revision-action">
        <span class="revision-status"><i data-lucide="alert-circle"></i>Perlu Revisi</span>
        <button class="detail-button" onclick="bukaModulPerbaikan('${id}')"><span>Lihat Detail <i data-lucide="arrow-right"></i></span></button>
      </div>
    </article>`;
  }).join("");
  refreshIcons();
}

function getJenisIcon(v){
  const n=String(v||"").trim().toLowerCase();
  if(n==="lpj") return '<i data-lucide="file-check-2"></i>';
  if(n==="proposal") return '<i data-lucide="file-text"></i>';
  return '<i data-lucide="file"></i>';
}
function formatJenis(v){const n=String(v||"").trim().toLowerCase();return n==="proposal"?"Proposal":n==="lpj"?"LPJ":String(v||"-");}

let activeRevision=null;
let revisionFiles=new Map();

function bukaModulPerbaikan(id){
  const item=rows.find(x=>String(x.id||x.pengajuan_id||"")===String(id));
  if(!item)return;
  activeRevision=item;revisionFiles=new Map();
  const modal=document.getElementById("revisionModal");
  document.getElementById("revisionModalBody").innerHTML='<div class="loading">Memuat dokumen pengajuan...</div>';
  modal.hidden=false;document.body.classList.add("revision-modal-open");updateRevisionSubmit();
  postRevisionAction("getDetailPengajuanKemensetkab",{pengajuan_id:id}).then(result=>{
    if(!result.success)throw new Error(result.message||"Gagal memuat dokumen pengajuan.");
    renderRevisionModal(result.data||{},item);
  }).catch(error=>{
    document.getElementById("revisionModalBody").innerHTML=`<div class="error-state"><h3>Dokumen tidak dapat dimuat</h3><p>${escapeHtml(error.message)}</p></div>`;
  });
}

function renderRevisionModal(detail,item){
  const body=document.getElementById("revisionModalBody");
  const docs=Array.isArray(detail.dokumen)?detail.dokumen:[];
  const latest=new Map();
  docs.forEach(doc=>{
    const key=String(doc.jenis||"Dokumen").trim().toLowerCase();
    const t=new Date(doc.uploaded_at||0).getTime()||0,old=latest.get(key);
    if(!old||t>=(new Date(old.uploaded_at||0).getTime()||0))latest.set(key,doc);
  });
  const list=[...latest.values()];
  body.innerHTML=`
    <div class="revision-modal-note"><strong>Catatan Revisi Mensetkab</strong><p>${escapeHtml(detail.catatan||item.catatan_terakhir||"Belum ada catatan revisi.")}</p></div>
    <div class="revision-modal-summary"><div><span>Nomor Pengajuan</span><strong>${escapeHtml(detail.nomor_pengajuan||item.nomor_pengajuan||item.id||"-")}</strong></div><div><span>Perihal</span><strong>${escapeHtml(detail.judul||item.perihal||"-")}</strong></div><div><span>Asal Kementerian</span><strong>${escapeHtml(detail.asal_kementerian||item.asal_kementerian||"-")}</strong></div></div>
    <div class="revision-documents-heading"><h3>Dokumen Pengajuan</h3><p>Unggah hanya dokumen yang diperbaiki. Semua unggahan bersifat opsional; minimal satu dokumen perlu dikirim.</p></div>
    <div class="revision-upload-list">${list.length?list.map((doc,i)=>`<article class="revision-upload-card" data-key="${escapeAttribute(String(doc.jenis||"Dokumen"))}"><div class="revision-upload-info"><strong>${escapeHtml(doc.jenis||"Dokumen")}</strong><span class="revision-optional-badge">Opsional</span><p>Dokumen saat ini: ${escapeHtml(doc.nama||"Dokumen sebelumnya")}</p>${doc.drive_file_id?`<a class="revision-download-link" href="https://drive.google.com/uc?export=download&amp;id=${encodeURIComponent(String(doc.drive_file_id).trim())}" target="_blank" rel="noopener" title="Download ${escapeAttribute(doc.nama||doc.jenis||"dokumen")}">Download dokumen</a>`:""}</div><div class="revision-upload-control"><input type="file" class="revision-file-input" id="revisionFile${i}" data-key="${escapeAttribute(String(doc.jenis||"Dokumen"))}" data-index="${i}" data-kind="${escapeAttribute(String(doc.jenis||"Dokumen"))}" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"><label for="revisionFile${i}">＋ Pilih dokumen hasil perbaikan</label><div class="revision-selected-file" id="revisionSelected${i}" hidden></div><small>Maksimal 10 MB per file</small></div></article>`).join(""):'<div class="empty-state"><h3>Dokumen tidak ditemukan</h3><p>Belum ada dokumen pada pengajuan ini.</p></div>'}</div>`;
  body.querySelectorAll(".revision-file-input").forEach(input=>input.addEventListener("change",handleRevisionFile));
  updateRevisionSubmit();
}

async function handleRevisionFile(event){
  const input=event.target,file=input.files&&input.files[0];if(!file)return;
  if(file.size>10*1024*1024){alert("Ukuran file maksimal 10 MB.");input.value="";return;}
  try{
    const data=await fileToBase64(file),key=input.dataset.key,index=input.dataset.index;
    revisionFiles.set(key,{jenis_dokumen:input.dataset.kind,name:file.name,type:file.type||"application/octet-stream",size:file.size,data});
    const slot=document.getElementById("revisionSelected"+index);slot.hidden=false;
    slot.innerHTML=`<strong>${escapeHtml(file.name)}</strong> <button type="button">Hapus</button>`;
    slot.querySelector("button").addEventListener("click",()=>{revisionFiles.delete(key);input.value="";slot.hidden=true;slot.innerHTML="";updateRevisionSubmit();});
  }catch(e){alert("File tidak dapat dibaca.");}
  updateRevisionSubmit();
}
function updateRevisionSubmit(){
  const button=document.getElementById("revisionModalSubmit"),hint=document.getElementById("revisionModalHint");
  if(button)button.disabled=revisionFiles.size===0;
  if(hint)hint.textContent=revisionFiles.size?`${revisionFiles.size} dokumen dipilih untuk dikirim.`:"Pilih minimal satu dokumen hasil perbaikan. Dokumen lain tidak wajib diperbarui.";
}
function closeRevisionModal(){document.getElementById("revisionModal").hidden=true;document.body.classList.remove("revision-modal-open");activeRevision=null;revisionFiles=new Map();}
function initializeRevisionModal(){
  document.getElementById("revisionModalClose")?.addEventListener("click",closeRevisionModal);
  document.getElementById("revisionModalCancel")?.addEventListener("click",closeRevisionModal);
  document.getElementById("revisionModal")?.addEventListener("click",e=>{if(e.target.id==="revisionModal")closeRevisionModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.getElementById("revisionModal").hidden)closeRevisionModal();});
  document.getElementById("revisionModalSubmit")?.addEventListener("click",submitRevisionDocuments);
}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const s=String(r.result||"");resolve(s.split(",").pop());};r.onerror=reject;r.readAsDataURL(file);});}
async function postRevisionAction(action,extra={}){const r=await fetch(API_URL,{method:"POST",body:JSON.stringify({action,session_token:currentUser.session_token,...extra})});return r.json();}
async function submitRevisionDocuments(){
  if(!activeRevision||!revisionFiles.size)return;
  const button=document.getElementById("revisionModalSubmit");button.disabled=true;button.textContent="Mengirim...";
  try{
    const result=await postRevisionAction("kirimPerbaikanDokumenKemensetkab",{pengajuan_id:activeRevision.id||activeRevision.pengajuan_id,dokumen:[...revisionFiles.values()]});
    if(!result.success)throw new Error(result.message||"Gagal mengirim dokumen.");
    alert(result.message||"Dokumen perbaikan berhasil dikirim.");closeRevisionModal();await load();
  }catch(e){alert(e.message||"Gagal mengirim dokumen.");}
  finally{button.textContent="Kirim Perbaikan";button.disabled=revisionFiles.size===0;}
}

function parseDate(v){if(!v)return null;const d=new Date(v);return isNaN(d)?null:d;}
function formatTanggal(v){if(!v)return"-";const d=parseDate(v);return d?d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):String(v);}
function displayCurrentDate(){const el=document.getElementById("currentDate");if(el)el.textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
function displayUserProfile(){const name=currentUser?.nama_lengkap||currentUser?.nama||"Kementerian Sekretariat Kabinet",initial="KS";document.getElementById("profileName").textContent=name;document.getElementById("profileRole").textContent="Kementerian";document.getElementById("profileAvatar").textContent=initial;document.getElementById("topbarAvatar").textContent=initial;}
function initializeLogout(){document.getElementById("logoutButton")?.addEventListener("click",()=>{if(!confirm("Apakah Anda yakin ingin keluar dari SITARA?"))return;sessionStorage.removeItem("sitaraUser");window.location.href="/login/index.html";});}
function refreshIcons(){if(window.lucide?.createIcons) window.lucide.createIcons();}
function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function escapeAttribute(v){return String(v??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
