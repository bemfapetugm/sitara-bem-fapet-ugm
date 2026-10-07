const API_URL="https://script.google.com/macros/s/AKfycbwct7tEZPpWxZNRYElhCPGQkL7IXXN96PswSLwlwFwo5DZuD7mH5t3kHaTOq69Z86cn-g/exec";
const raw=sessionStorage.getItem("sitaraUser");
if(!raw) location.href="../../login/index.html";
let user={};
try{user=JSON.parse(raw||"{}")}catch(e){sessionStorage.removeItem("sitaraUser");location.href="../../login/index.html";}
const token=String(user.session_token||"").trim();
const $=id=>document.getElementById(id);
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function dt(v){if(!v)return "-";const d=new Date(v);return isNaN(d)?"-":d.toLocaleDateString("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});}
function ini(n){return String(n||"DPM").trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"DP";}
async function api(action,data={}){const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,session_token:token,...data})});return r.json();}
function profile(){const n=user.nama_lengkap||user.nama||user.name||"DPM",i=ini(n);$("profileName").textContent=n;$("welcomeTitle").textContent=n;$("profileAvatar").textContent=$("topbarAvatar").textContent=i;$("currentDate").textContent=dt(new Date());}
function renderRows(rows){if(!rows.length){$("recentList").innerHTML='<tr><td colspan="6" class="empty-state">Tidak ada pengajuan yang menunggu persetujuan DPM.</td></tr>';return;}$("recentList").innerHTML=rows.slice(0,8).map(x=>`<tr><td><strong>${esc(x.judul||x.pengajuan_id)}</strong><br><small>${esc(x.pengajuan_id)}</small></td><td>${esc(x.jenis||"-")}</td><td>${esc(x.asal_pengusul||"BEM Fakultas Peternakan UGM")}</td><td>${esc(dt(x.tanggal_pengajuan))}</td><td><span class="status-badge status-proses">${esc(x.status||"Menunggu Persetujuan DPM")}</span></td><td><a href="pengajuan/detail/index.html?id=${encodeURIComponent(x.pengajuan_id)}" class="btn-view-all">Buka</a></td></tr>`).join("");}
function renderActivity(rows){if(!rows.length){$("activityList").innerHTML='<div class="empty-state">Belum ada aktivitas DPM.</div>';return;}$("activityList").innerHTML=rows.slice(0,8).map(x=>`<div class="activity-item"><span class="activity-dot"></span><div><strong>${esc(x.aksi||"Aktivitas DPM")}</strong><p>${esc(x.judul||x.pengajuan_id||"")} · ${esc(dt(x.waktu))}</p></div></div>`).join("");}
async function load(){profile();if(!token)return;try{const r=await api("getDashboardDPM");if(!r.success)throw Error(r.message||"Gagal memuat dashboard DPM.");const d=r.data||{},s=d.statistik||{};$("statMenunggu").textContent=s.menunggu||0;$("statRevisi").textContent=s.revisi||0;$("statDisetujui").textContent=s.diputuskan||0;$("statTotal").textContent=s.total||0;renderRows(d.pengajuan_terbaru||[]);renderActivity(d.aktivitas_terbaru||[]);}catch(e){$("recentList").innerHTML=`<tr><td colspan="6" class="empty-state">${esc(e.message)}</td></tr>`;}}
$("logoutButton").onclick=()=>{sessionStorage.removeItem("sitaraUser");location.href="../../login/index.html"};load();
