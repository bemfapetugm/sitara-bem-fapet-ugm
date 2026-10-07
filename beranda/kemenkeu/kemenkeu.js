/* SITARA — Kementerian Keuangan */
const API_URL="https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const LOGIN_URL="/login/index.html";
let user=null;
try{user=JSON.parse(sessionStorage.getItem("sitaraUser")||"null");}catch(e){}
if(!user||String(user.role||"").toLowerCase()!=="kementerian"||String(user.kementerian_id||"").toUpperCase()!=="KEM002"){
  sessionStorage.removeItem("sitaraUser"); window.location.href=LOGIN_URL;
}else{init();}
function init(){
  const name=user.nama_unit||user.nama_lengkap||"Kementerian Keuangan";
  const initials=getInitials(name);
  ["profileName"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=name;});
  ["profileRole"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent="Kementerian";});
  ["profileAvatar","topbarAvatar"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=initials;});
  const d=document.getElementById("currentDate"); if(d)d.textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const w=document.getElementById("welcomeTitle"); if(w)w.textContent="Selamat Datang, "+name+"!";
  document.getElementById("logoutButton")?.addEventListener("click",logout);
  load();
}
function getInitials(n){const p=String(n||"Kementerian Keuangan").trim().split(/\s+/).filter(Boolean);return p.length===1?p[0].slice(0,2).toUpperCase():p.slice(0,2).map(x=>x[0]).join("").toUpperCase();}
function logout(){if(!confirm("Apakah kamu yakin ingin keluar dari SITARA?"))return;sessionStorage.removeItem("sitaraUser");location.href=LOGIN_URL;}
async function load(){
 try{
  const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"getDashboardKemenkeu",session_token:user.session_token})});
  const x=await r.json(); if(!x.success)throw new Error(x.message||"Gagal memuat dashboard.");
  const s=x.data?.statistik||{};
  set("totalPengajuan",s.pengajuan_masuk??0); set("totalProses",s.surat_pencairan_dana??0); set("totalRevisi",s.selesai??0); set("totalDokumen",s.total_dokumen??0);
  render(x.data?.aktivitas_terbaru||[]);
 }catch(e){console.error(e);render([]);}
}
function set(id,v){const e=document.getElementById(id);if(e)e.textContent=String(v);}
function render(items){const b=document.getElementById("activityTable");if(!b)return;if(!items.length){b.innerHTML='<tr><td colspan="4" class="empty-state">Belum ada dokumen masuk.</td></tr>';return;}b.innerHTML=items.slice(0,20).map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.pengajuan_id||"-")}</strong><br><small>${esc(x.perihal||"Surat Pencairan Dana")}</small></td><td>${date(x.waktu)}</td><td><span class="dashboard-status status-success">Diterima</span></td></tr>`).join("");}
function date(v){const d=new Date(v);return Number.isNaN(d.getTime())?"-":d.toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
