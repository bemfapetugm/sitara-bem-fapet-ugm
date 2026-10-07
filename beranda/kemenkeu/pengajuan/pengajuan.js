/* SITARA — Pengajuan Masuk Kementerian Keuangan */
const API_URL="https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const LOGIN_URL="/login/index.html";
let user=null, rows=[];
try{user=JSON.parse(sessionStorage.getItem("sitaraUser")||"null");}catch(e){}
if(!user||String(user.role||"").toLowerCase()!=="kementerian"||String(user.kementerian_id||"").toUpperCase()!=="KEM002"){sessionStorage.removeItem("sitaraUser");location.href=LOGIN_URL;}else{init();}
function init(){
 const name=user.nama_unit||user.nama_lengkap||"Kementerian Keuangan", ini=initials(name);
 ["profileName"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=name;});
 ["profileAvatar","topbarAvatar"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=ini;});
 const role=document.getElementById("profileRole");if(role)role.textContent="Kementerian";
 const dateEl=document.getElementById("currentDate");if(dateEl)dateEl.textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 document.getElementById("logoutButton")?.addEventListener("click",logout);
 document.getElementById("historySearch")?.addEventListener("input",render);
 document.getElementById("historyStatus")?.addEventListener("change",render);
 load();
}
function initials(n){const p=String(n).trim().split(/\s+/).filter(Boolean);return p.length===1?p[0].slice(0,2).toUpperCase():p.slice(0,2).map(x=>x[0]).join("").toUpperCase();}
function logout(){if(confirm("Apakah kamu yakin ingin keluar dari SITARA?")){sessionStorage.removeItem("sitaraUser");location.href=LOGIN_URL;}}
async function load(){const box=document.getElementById("pengajuanList")||document.getElementById("historyList");try{const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"getPengajuanMasukKemenkeu",session_token:user.session_token})});const x=await r.json();if(!x.success)throw new Error(x.message||"Gagal memuat pengajuan.");rows=Array.isArray(x.data)?x.data:[];render();}catch(e){if(box)box.innerHTML=`<div class="empty-state">Gagal memuat data: ${esc(e.message)}</div>`;}}
function render(){const box=document.getElementById("pengajuanList");if(!box)return;const q=(document.getElementById("searchPengajuan")?.value||"").toLowerCase().trim();const f=rows.filter(x=>(!q||(x.pengajuan_id+" "+x.perihal+" "+x.asal_kementerian).toLowerCase().includes(q)));if(!f.length){box.innerHTML='<div class="empty-state">Belum ada Surat Pencairan Dana yang diteruskan ke Kementerian Keuangan.</div>';return;}box.innerHTML=f.map(x=>`<article class="pengajuan-row"><div><div class="pengajuan-number">${esc(x.pengajuan_id)}</div><h3>${esc(x.perihal||"Pengajuan")}</h3><p>${esc(x.jenis||"Proposal")} · ${esc(x.asal_kementerian||"-")}</p><small>${date(x.waktu_diterima)}</small></div><div class="row-actions"><span class="status-badge status-success">Diterima</span><button class="btn-primary" onclick="openDetail('${attr(x.pengajuan_id)}')">Detail</button></div></article>`).join("");}
function openDetail(id){location.href=`detail/index.html?id=${encodeURIComponent(id)}`;}
function date(v){const d=new Date(v);return Number.isNaN(d.getTime())?"-":d.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function attr(v){return esc(v);}
