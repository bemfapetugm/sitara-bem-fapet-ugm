const API_URL="https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const sessionData=sessionStorage.getItem("sitaraUser");
let user=null,rows=[],currentPage=1;
const PAGE_SIZE=30;
try{user=JSON.parse(sessionData||"null");}catch(e){}
if(!user||user.role!=="kementerian"||user.kementerian_id!=="KEM001"){window.location.href="/login/index.html";}else{initialize();}
function initialize(){const name=user.nama_lengkap||user.nama||"Kementerian Sekretariat Kabinet",initial="KS";document.getElementById("profileName").textContent=name;document.getElementById("profileAvatar").textContent=initial;document.getElementById("topbarAvatar").textContent=initial;document.getElementById("currentDate").textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});document.getElementById("logoutButton").addEventListener("click",()=>{if(!confirm("Apakah Anda yakin ingin keluar dari SITARA?"))return;sessionStorage.removeItem("sitaraUser");window.location.href="/login/index.html";});document.getElementById("historySearch").addEventListener("input",()=>{currentPage=1;render();});document.getElementById("historyStatus").addEventListener("change",()=>{currentPage=1;render();});load();}
async function load(){const box=document.getElementById("historyList");try{const response=await fetch(API_URL,{method:"POST",body:JSON.stringify({action:"getRiwayatPengajuan",session_token:user.session_token})});const result=await response.json();if(!result.success)throw new Error(result.message||"Gagal memuat riwayat.");rows=Array.isArray(result.data)?result.data:[];const statuses=[...new Set(rows.map(x=>getStatusInfo(x.status_riwayat).label).filter(Boolean))];document.getElementById("historyStatus").innerHTML='<option value="">Semua Status</option>'+statuses.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");render();}catch(error){box.innerHTML=`<div class="history-error"><strong>Gagal memuat riwayat</strong><br>${escapeHtml(error.message)}</div>`;}}
function render(){
  const q=document.getElementById("historySearch").value.trim().toLowerCase();
  const st=document.getElementById("historyStatus").value;
  const filtered=rows.filter(x=>{
    const text=(String(x.pengajuan_id||"")+" "+String(x.perihal||"")+" "+String(x.asal_kementerian||"")).toLowerCase();
    const label=getStatusInfo(x.status_riwayat).label;
    return(!q||text.includes(q))&&(!st||label===st);
  });
  filtered.sort((a,b)=>getTimestamp(b.waktu)-getTimestamp(a.waktu));

  const box=document.getElementById("historyList");
  if(!filtered.length){
    box.innerHTML='<div class="history-empty">Tidak ada riwayat yang sesuai.</div>';
    renderPagination(0,0,0,0);
    return;
  }
  const total=filtered.length;
  const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  currentPage=Math.min(Math.max(1,currentPage),totalPages);
  const startIndex=(currentPage-1)*PAGE_SIZE;
  const pageRows=filtered.slice(startIndex,startIndex+PAGE_SIZE);

  box.innerHTML=pageRows.map(x=>{
    const status=getStatusInfo(x.status_riwayat);
    return `<article class="history-card"><div class="history-card-head"><div><div class="history-number">${escapeHtml(x.pengajuan_id)}</div><div class="history-title">${escapeHtml(x.perihal||"Tanpa judul")}</div><div class="history-meta">${escapeHtml(getJenisLabel(x.jenis))} · ${escapeHtml(x.asal_kementerian||"-")}</div></div><span class="history-status status-${status.cls}">${escapeHtml(status.label)}</span></div><div class="history-flow"><span class="history-unit">${escapeHtml(formatUnit(x.dari_unit))}</span><span class="history-arrow">→</span><span class="history-unit">${escapeHtml(formatUnit(x.ke_unit))}</span></div><div class="history-action">${escapeHtml(x.aksi||"Perubahan status")}</div>${x.catatan?`<div class="history-note">${escapeHtml(x.catatan)}</div>`:""}<div class="history-time">${formatDateTime(x.waktu)}</div></article>`;
  }).join("");
  renderPagination(total,totalPages,startIndex+1,Math.min(startIndex+PAGE_SIZE,total));
}

function getTimestamp(value){
  if(!value) return 0;
  const timestamp=new Date(value).getTime();
  return Number.isFinite(timestamp)?timestamp:0;
}

function renderPagination(total,totalPages,firstItem,lastItem){
  let pagination=document.getElementById("historyPagination");
  if(!pagination){
    pagination=document.createElement("div");
    pagination.id="historyPagination";
    pagination.className="history-pagination";
    document.querySelector(".history-page").appendChild(pagination);
  }
  if(total===0){
    pagination.innerHTML="";
    return;
  }
  if(totalPages<=1){
    pagination.innerHTML=`<div class="history-pagination-summary">Menampilkan ${firstItem}–${lastItem} dari ${total} pengajuan</div>`;
    pagination.classList.add("is-single-page");
    return;
  }
  pagination.classList.remove("is-single-page");
  const makeButton=(label,page,disabled=false,active=false,ariaLabel="")=>
    `<button type="button" class="history-page-button${active?" active":""}" data-page="${page}" ${disabled?"disabled":""} ${active?'aria-current="page"':""} ${ariaLabel?`aria-label="${ariaLabel}"`:""}>${label}</button>`;
  const pages=[];
  pages.push(makeButton("‹",currentPage-1,currentPage===1,false,"Halaman sebelumnya"));
  const visible=new Set([1,totalPages,currentPage-1,currentPage,currentPage+1]);
  const numbers=[...visible].filter(n=>n>=1&&n<=totalPages).sort((a,b)=>a-b);
  let previous=0;
  for(const number of numbers){
    if(previous&&number-previous>1) pages.push('<span class="history-page-ellipsis" aria-hidden="true">…</span>');
    pages.push(makeButton(String(number),number,false,number===currentPage,`Halaman ${number}`));
    previous=number;
  }
  pages.push(makeButton("›",currentPage+1,currentPage===totalPages,false,"Halaman berikutnya"));
  pagination.innerHTML=`<div class="history-pagination-summary">Menampilkan ${firstItem}–${lastItem} dari ${total} pengajuan</div><nav class="history-pagination-controls" aria-label="Navigasi halaman riwayat">${pages.join("")}</nav>`;
  pagination.querySelectorAll("button[data-page]").forEach(button=>{
    button.addEventListener("click",()=>{
      const nextPage=Number(button.dataset.page);
      if(!Number.isInteger(nextPage)||nextPage<1||nextPage>totalPages||nextPage===currentPage)return;
      currentPage=nextPage;
      render();
      document.querySelector(".history-page")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
  });
}
function normalizeStatus(v){return String(v||"").trim().toLowerCase().replace(/_/g," ").replace(/\s+/g," ");}
function getStatusInfo(value){const raw=String(value||"").trim(),n=normalizeStatus(raw);const map=[[/^diajukan$/, ["Diajukan","diajukan"]],[/menunggu verifikasi|perlu verifikasi/, ["Menunggu Verifikasi","menunggu-verifikasi"]],[/perlu revisi|^revisi$/, ["Perlu Revisi","perlu-revisi"]],[/menunggu persetujuan mensetkab|menunggu persetujuan menteri sekretariat kabinet/, ["Menunggu Persetujuan Mensetkab","menunggu-mensetkab"]],[/menunggu persetujuan ketua bem|menunggu persetujuan ketua/, ["Menunggu Persetujuan Ketua BEM","menunggu-ketua"]],[/diajukan ke dpm/, ["Diajukan ke DPM","diajukan-dpm"]],[/disetujui dpm/, ["Disetujui DPM","disetujui-dpm"]],[/diajukan ke fakultas/, ["Diajukan ke Fakultas","diajukan-fakultas"]],[/disetujui fakultas/, ["Disetujui Fakultas","disetujui-fakultas"]],[/menunggu dokumen fakultas/, ["Menunggu Dokumen Fakultas","menunggu-fakultas"]],[/dalam proses|diproses|proses/, ["Dalam Proses","dalam-proses"]],[/selesai/, ["Selesai","selesai"]],[/ditolak/, ["Ditolak","ditolak"]]];for(const[rx,info]of map)if(rx.test(n))return{label:info[0],cls:info[1]};return{label:raw||"-",cls:"lainnya"};}
function formatUnit(value){const raw=String(value||"").trim(),n=raw.toLowerCase();if(raw==="KEM001"||n==="biro agata"||n==="kemensetkab")return"Kementerian Sekretariat Kabinet";if(n==="mensetkab"||n==="menteri sekretariat kabinet")return"Menteri Sekretariat Kabinet";if(n==="ketua"||n==="ketua bem")return"Ketua BEM";if(n==="kemenkeu"||n==="kementerian keuangan")return"Kementerian Keuangan";return raw;}
function getJenisLabel(v){const n=String(v||"").trim().toLowerCase();return n==="proposal"?"Proposal":n==="lpj"?"LPJ":String(v||"-");}
function formatDateTime(v){if(!v)return"-";const d=new Date(v);return isNaN(d)?"-":d.toLocaleString("id-ID",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
