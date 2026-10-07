const SCRIPT_URL="https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const session=JSON.parse(sessionStorage.getItem("sitaraUser")||"{}");
const token=String(session.session_token||"").trim();
const id=new URLSearchParams(location.search).get("id");
const $=x=>document.getElementById(x);

function esc(v){
  return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function dt(v){
  if(!v)return "-";
  const d=new Date(v);
  return isNaN(d)?"-":d.toLocaleDateString("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
}
function ini(n){
  return String(n||"Ketua BEM").trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
}
async function api(action,data={}){
  const r=await fetch(SCRIPT_URL,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify({action,session_token:token,...data})
  });
  const j=await r.json();
  return j;
}
function profile(){
  const n=session.nama_lengkap||session.nama||session.name||"Ketua BEM";
  $("profileName").textContent=n;
  $("profileAvatar").textContent=$("topbarAvatar").textContent=ini(n);
  $("currentDate").textContent=dt(new Date());
}
function row(label,value){
  return `<div class="info-row"><span>${esc(label)}</span><strong>${esc(value||"-")}</strong></div>`;
}
function render(d){
  const payload=d||{};
  const p=payload.pengajuan||payload.data?.pengajuan||payload;
  const docs=Array.isArray(payload.dokumen)?payload.dokumen:[];
  const hist=Array.isArray(payload.riwayat)?payload.riwayat:[];
  p.__docs=docs;

  const docHtml=docs.length?docs.map(x=>`
    <div class="doc-item">
      <div>
        <div class="doc-name">${esc(x.nama_file||x.nama||x.jenis||"Dokumen")}</div>
        <div class="doc-meta">${esc(x.jenis||"")} ${x.is_final?"· Dokumen Final":""}${x.nomor_surat?" · "+esc(x.nomor_surat):""}</div>
      </div>
      ${x.url?`<a class="btn-primary" href="${esc(x.url)}" target="_blank" rel="noopener">Download</a>`:""}
    </div>`).join("")
    :'<div class="empty-state">Dokumen tidak ditemukan.</div>';

  const histHtml=hist.length?hist.map(x=>`
    <div class="timeline-item">
      <span class="timeline-dot"></span>
      <div>
        <strong>${esc(x.aksi||"Aktivitas")}</strong>
        <p>${esc(x.dari_unit||"")} ${x.ke_unit?"→ "+esc(x.ke_unit):""} · ${dt(x.waktu)}</p>
        ${x.catatan?`<small>${esc(x.catatan)}</small>`:""}
      </div>
    </div>`).join("")
    :'<div class="empty-state">Belum ada riwayat.</div>';

  $("detail").innerHTML=`
    <section class="welcome-section">
      <div>
        <p class="welcome-label">${esc(p.jenis||"Pengajuan")}</p>
        <h1>${esc(p.judul||p.judul_pengajuan||"-")}</h1>
        <p>${esc(p.status||"Menunggu Persetujuan Ketua BEM")}</p>
      </div>
      <div class="welcome-icon">✓</div>
    </section>

    <div class="detail-grid">
      <div class="info-card">
        <h3>Informasi Pengajuan</h3>
        ${row("Nomor Pengajuan",p.pengajuan_id||id)}
        ${row("Asal Kementerian",p.asal_kementerian||p.nama_kementerian)}
        ${row("Jenis Dokumen",p.jenis)}
        ${row("Tanggal Pengajuan",dt(p.tanggal_pengajuan))}
        ${row("Status",p.status)}
        ${row("Tahap",p.tahap_sekarang||"Ketua BEM")}
      </div>

      <div class="info-card">
        <h3>Keputusan Ketua BEM</h3>
        <p style="margin-top:8px;color:#777">Tinjau dokumen terbaru sebelum memberikan keputusan.</p>
        <div class="decision-bar">
          <button class="btn-secondary" data-action="revisi">Minta Revisi</button>
          <button class="btn-primary" data-action="setujui">Setujui</button>
          <button class="btn-danger" data-action="tolak">Tolak</button>
        </div>
      </div>
    </div>

    <div class="document-card">
      <h3>Dokumen</h3>
      ${docHtml}
    </div>

    <div class="timeline-card">
      <h3>Riwayat</h3>
      ${histHtml}
    </div>`;

  document.querySelectorAll("[data-action]").forEach(b=>{
    b.addEventListener("click",()=>openDecision(b.dataset.action,p));
  });
}

let pending=null;

function setModalMode(action,p){
  const modal=$("modal");
  const noteWrap=$("noteWrap");
  const uploadWrap=$("uploadWrap");
  const note=$("modalNote");
  const title=$("modalTitle");
  const text=$("modalText");
  const confirm=$("confirmBtn");
  // Reset modal state setiap kali dibuka agar field dari modal sebelumnya tidak ikut terbawa.
  note.value="";
  noteWrap.style.display="none";
  uploadWrap.style.display="none";
  $("uploadList").innerHTML="";
  if(action==="revisi"){
    title.textContent="Minta Revisi";
    text.textContent="Berikan catatan revisi yang akan diteruskan kepada Mensetkab.";
    noteWrap.style.display="block";
    $("noteLabel").textContent="Catatan Revisi";
    note.placeholder="Tuliskan bagian yang perlu direvisi...";
    uploadWrap.style.display="none";
    confirm.textContent="Kirim Revisi";
    confirm.className="btn-warning";
  }else if(action==="tolak"){
    title.textContent="Tolak Pengajuan";
    text.textContent="Berikan alasan penolakan. Alasan akan diteruskan kepada kementerian pengaju.";
    noteWrap.style.display="block";
    $("noteLabel").textContent="Alasan Penolakan";
    note.placeholder="Tuliskan alasan penolakan...";
    uploadWrap.style.display="none";
    confirm.textContent="Tolak Pengajuan";
    confirm.className="btn-danger";
  }else{
    title.textContent="Setujui Pengajuan";
    text.textContent="Unggah seluruh dokumen final sebelum pengajuan diteruskan kembali ke Mensetkab.";
    noteWrap.style.display="none";
    uploadWrap.style.display="block";
    confirm.textContent="Submit & Setujui";
    confirm.className="btn-success";
    const docs=Array.isArray(p.__docs)?p.__docs:[];
    if(!docs.length){
      $("uploadList").innerHTML='<div class="upload-empty">Dokumen pengajuan tidak ditemukan.</div>';
    }else{
      $("uploadList").innerHTML=docs.map((d,i)=>`<div class="upload-row"><div class="upload-meta"><strong>${esc(d.jenis||d.nama_file||("Dokumen "+(i+1)))}</strong><span>${esc(d.nama_file||"Dokumen")}${d.nomor_surat?" · "+esc(d.nomor_surat):""}</span></div><label class="file-input-label"><span class="file-choice-text">Pilih Word</span><input class="final-file" type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-dokumen-id="${esc(d.dokumen_id||"")}" data-index="${i}"></label></div>`).join("");

      document.querySelectorAll(".final-file").forEach(input=>{
        input.addEventListener("change",()=>{
          const label=input.closest(".file-input-label");
          const text=label?.querySelector(".file-choice-text");
          const file=input.files?.[0];
          if(text){
            text.textContent=file ? "✓ "+file.name : "Pilih Word";
          }
          if(label) label.classList.toggle("has-file",!!file);
        });
      });
    }
  }
  // Pastikan modal persetujuan tidak pernah menampilkan catatan revisi/penolakan.
  if(action==="setujui") {
    noteWrap.style.display="none";
    note.value="";
  }
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  setTimeout(()=>{
    const first=action==="setujui"?document.querySelector(".final-file"):$("modalNote");
    if(first) first.focus();
  },50);
}

function openDecision(a,p){
  pending={aksi:a,pengajuan:p};
  setModalMode(a,p);
}

function closeModal(){
  $("modal").classList.remove("show");
  $("modal").setAttribute("aria-hidden","true");
  pending=null;
}

$("cancelBtn").onclick=closeModal;
$("closeBtn").onclick=closeModal;
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("modal").classList.contains("show"))closeModal();});

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const result=String(reader.result||"");
      resolve(result.includes(",")?result.split(",")[1]:result);
    };
    reader.onerror=()=>reject(new Error("Gagal membaca file: "+file.name));
    reader.readAsDataURL(file);
  });
}

async function collectFinalFiles(){
  const inputs=[...document.querySelectorAll(".final-file")];
  if(!inputs.length) throw new Error("Dokumen pengajuan tidak ditemukan.");

  const selected=[];
  for(const input of inputs){
    if(!input.files||!input.files[0]) throw new Error("Semua dokumen final wajib diunggah.");
    const file=input.files[0];
    if(!/\.(doc|docx)$/i.test(file.name)) throw new Error("Semua dokumen final harus berupa Word (.doc atau .docx).");
    if(file.size>15*1024*1024) throw new Error("Ukuran setiap dokumen maksimal 15 MB.");
    selected.push({
      source_dokumen_id:input.dataset.dokumenId||"",
      name:file.name,
      type:file.type,
      file
    });
  }

  const uploadedIds=[];
  for(let i=0;i<selected.length;i++){
    const item=selected[i];
    const inputsNow=[...document.querySelectorAll(".final-file")];
    const currentInput=inputsNow[i];
    const label=currentInput?.closest(".file-input-label");
    const text=label?.querySelector(".file-choice-text");
    if(text) text.textContent="Mengunggah...";

    const data=await fileToBase64(item.file);
    const r=await api("uploadDokumenFinalKetuaBEM",{
      pengajuan_id:id,
      dokumen_id:item.source_dokumen_id,
      file:{
        name:item.name,
        type:item.type,
        data:data
      }
    });

    if(!r.success) throw new Error(r.message||("Gagal mengunggah "+item.name+"."));
    uploadedIds.push(r.data?.dokumen_id||"");

    if(text){
      text.textContent="✓ "+item.name;
    }
  }

  if(uploadedIds.some(x=>!x)) throw new Error("Sebagian dokumen final tidak berhasil disimpan.");
  return {
    uploaded_doc_ids:uploadedIds,
    source_dokumen_ids:selected.map(x=>x.source_dokumen_id)
  };
}

$("confirmBtn").onclick=async()=>{
  if(!pending)return;
  const action=pending.aksi;
  const b=$("confirmBtn");
  let note=$("modalNote").value.trim();
  b.disabled=true;
  b.textContent="Memproses...";
  try{
    let uploadResult={uploaded_doc_ids:[],source_dokumen_ids:[]};
    if(action==="setujui") uploadResult=await collectFinalFiles();
    if((action==="revisi"||action==="tolak")&&!note) throw new Error(action==="revisi"?"Catatan revisi wajib diisi.":"Alasan penolakan wajib diisi.");
    const r=await api("prosesPersetujuanKetuaBEM",{
      pengajuan_id:id,
      aksi:action,
      catatan:note,
      uploaded_doc_ids:uploadResult.uploaded_doc_ids,
      source_dokumen_ids:uploadResult.source_dokumen_ids
    });
    if(!r.success)throw Error(r.message||"Gagal memproses keputusan.");
    closeModal();
    alert(r.message||"Keputusan berhasil disimpan.");
    location.href="../index.html";
  }catch(e){
    alert(e.message||"Terjadi kesalahan.");
    b.disabled=false;
    if(action==="revisi") b.textContent="Kirim Revisi";
    else if(action==="tolak") b.textContent="Tolak Pengajuan";
    else b.textContent="Submit & Setujui";
  }
};

$("logoutButton").onclick=()=>{
  sessionStorage.removeItem("sitaraUser");
  location.href="../../../../login/index.html";
};

async function load(){
  profile();
  if(!token){
    $("detail").innerHTML='<div class="empty-state">Sesi tidak ditemukan. Silakan login kembali.</div>';
    return;
  }
  if(!id){
    $("detail").innerHTML='<div class="empty-state">ID pengajuan tidak ditemukan.</div>';
    return;
  }
  try{
    const r=await api("getDetailPengajuanKetuaBEM",{pengajuan_id:id});
    if(!r.success)throw Error(r.message||"Gagal memuat detail pengajuan.");
    render(r.data||{});
  }catch(e){
    $("detail").innerHTML=`<div class="empty-state">${esc(e.message||"Gagal memuat detail pengajuan.")}</div>`;
  }
}
load();
