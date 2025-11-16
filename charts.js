import { currentUser } from "./auth.js";
import { getReadings } from "./api.js";

let chart;

function getQueryId(){
  const url = new URL(location.href);
  return url.searchParams.get("pid"); // used on patient-detail.html for provider
}

function draw(metric, data){
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const labels = data.map(d => d.date);

  const datasets =
    metric === "bp" ? [
      { label: "Systolic",  data: data.map(d => d.bp_systolic) },
      { label: "Diastolic", data: data.map(d => d.bp_diastolic) }
    ] : metric === "hr" ? [
      { label: "Heart Rate", data: data.map(d => d.hr) }
    ] : metric === "glucose" ? [
      { label: "Glucose", data: data.map(d => d.glucose) }
    ] : [
      { label: "Steps", data: data.map(d => d.steps) }
    ];

  chart?.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "top" } }
    }
  });
}

(async function init(){
  const qid = getQueryId();
  const user = currentUser();
  const targetId = qid || user.id;

  const rows = (await getReadings(targetId)).sort((a,b)=>a.date.localeCompare(b.date));
  if (!rows.length){
    const wrap = document.querySelector(".chart-wrap");
    if (wrap) wrap.innerHTML = `<div class="muted">No readings available.</div>`;
    return;
  }

  let metric = "bp";
  draw(metric, rows);

  document.querySelectorAll(".segmented button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".segmented button").forEach(b=>b.classList.remove("on"));
      btn.classList.add("on");
      metric = btn.dataset.metric;
      draw(metric, rows);
    });
  });
})();





