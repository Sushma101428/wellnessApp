import { currentUser } from "./auth.js";
import { getReadings, getReadingsByDate, getAssignments, todayStr } from "./api.js";

const rootId = "app";

function kpiCard(title, value, unit, subtitle=""){
  return `
    <div class="card">
      <h3>${title}</h3>
      <p style="font-size:2.2rem;margin:6px 0">${value ?? "—"}${value != null && unit ? " " + unit : ""}</p>
      ${subtitle ? `<small>${subtitle}</small>` : ""}
    </div>
  `;
}
function latestNonNull(rows, fields){
  const sorted = [...rows].sort((a,b)=>a.date.localeCompare(b.date));
  for (let i = sorted.length - 1; i >= 0; i--){
    const r = sorted[i];
    if (fields.some(f => r[f] != null)) return r;
  }
  return null;
}

async function renderPatientDashboard(user){
  const today = todayStr();
  const all = await getReadings(user.id);

  if (!all.length) {
    const { seedDemoReadings } = await import("./api.js");
    document.getElementById(rootId).innerHTML = `
      <section class="card">
        <h3>No readings yet</h3>
        <p class="muted">Click below to create sample readings for the demo.</p>
        <button id="genReads" class="btn-primary">Generate sample readings</button>
      </section>`;
    document.getElementById("genReads").addEventListener("click", ()=>{
      seedDemoReadings(user.id);
      location.reload();
    });
    return;
  }

  const todayRow = all.find(r => r.date === today);
  const bpRow = todayRow ?? latestNonNull(all, ["bp_systolic","bp_diastolic"]);
  const hrRow = todayRow ?? latestNonNull(all, ["hr"]);
  const stRow = todayRow ?? latestNonNull(all, ["steps"]);

  const kpis = `
    <section class="grid kpis">
      ${kpiCard("Blood Pressure", bpRow ? `${bpRow.bp_systolic ?? "—"}/${bpRow.bp_diastolic ?? "—"}` : "—", "mmHg", bpRow?`as of ${bpRow.date}`:"")}
      ${kpiCard("Heart Rate", hrRow?.hr ?? null, "bpm", hrRow?`as of ${hrRow.date}`:"")}
      ${kpiCard("Steps", stRow?.steps ?? null, "steps", stRow?`as of ${stRow.date}`:"")}
    </section>`;

  const menu = `
    <section class="card mt-12">
      <h3>Menu</h3>
      <div class="menu-grid mt-12">
        <a href="trends.html">Trends</a>
        <a href="alerts.html">Alerts</a>
        <a href="profile.html">Profile</a>
        <a href="log-symptom.html">Log Symptom</a>
      </div>
    </section>`;

  document.getElementById(rootId).innerHTML = kpis + menu;
}

async function renderProviderDashboard(user){
  const today = todayStr();
  const patientIds = await getAssignments(user.id);

  let rowsHtml = "";
  for (const pid of patientIds){
    const todays = await getReadingsByDate(pid, today);
    let r = todays[0];
    if (!r){
      const all = await getReadings(pid);
      r = latestNonNull(all, ["bp_systolic","bp_diastolic","hr","steps"]) || {};
    }
    rowsHtml += `
      <tr>
        <td>${pid}</td>
        <td>${r.bp_systolic!=null && r.bp_diastolic!=null ? `${r.bp_systolic}/${r.bp_diastolic}` : "—"}</td>
        <td>${r.hr ?? "—"}</td>
        <td>${r.steps ?? "—"}</td>
        <td>${r.date ?? "—"}</td>
        <td><a class="link" href="patient-detail.html?pid=${encodeURIComponent(pid)}">View</a></td>
      </tr>`;
  }

  document.getElementById(rootId).innerHTML = `
    <section class="card">
      <div class="row between">
        <h2>Patient Updates</h2>
        <a class="btn-ghost" href="dashboard.html">Home</a>
      </div>
      <div style="overflow:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th align="left">Patient ID</th>
            <th align="left">BP (S/D)</th>
            <th align="left">Heart Rate</th>
            <th align="left">Steps</th>
            <th align="left">Reading Date</th>
            <th align="left">Details</th>
          </tr></thead>
          <tbody>${rowsHtml || `<tr><td colspan="6">No patients or no readings.</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
}

async function renderDashboard(){
  const u = currentUser();
  if (!u) return;
  if (u.role === "patient") await renderPatientDashboard(u);
  else await renderProviderDashboard(u);
}

if (location.pathname.endsWith("dashboard.html")) renderDashboard();


