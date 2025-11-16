// ---------- helpers ----------
export function todayStr(){
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function yesterdayStr(){
  const d = new Date(); d.setDate(d.getDate()-1);
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
async function fetchJSON(path){
  try {
    const res = await fetch(`./${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (e) {
    console.warn(`Could not load ${path}. Using built-in demo data.`, e);
    return null; // signal to use fallback
  }
}
function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}
function lsSet(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// ---------- built-in DEMO data (only when files missing) ----------
function demoPatients(){
  return [
    { patient_id:"1001", name:"Ava Johnson", age:46, gender:"Female", email:"ava.johnson@example.com", phone:"555-0146", password:"pass1001" },
    { patient_id:"1002", name:"Liam Patel",  age:53, gender:"Male",   email:"liam.patel@example.com",  phone:"555-0192", password:"pass1002" }
  ];
}
function demoProviders(){
  return [
    { provider_id:"P9001", name:"Dr. Neha Sharma", email:"neha@example.com",   phone:"555-2100", password:"doc123" },
    { provider_id:"P9002", name:"PA Marcus Lee",   email:"marcus@example.com", phone:"555-2101", password:"pa2222" }
  ];
}
function demoAssignments(){
  return [
    { provider_id:"P9001", patient_ids:["1001","1002"] },
    { provider_id:"P9002", patient_ids:["1002"] }
  ];
}
function demoReadings(){
  const t = todayStr(), y = yesterdayStr();
  return [
    { patient_id:"1001", date:t, bp_systolic:130, bp_diastolic:83, hr:79, glucose:118, steps:5320 },
    { patient_id:"1001", date:y, bp_systolic:141, bp_diastolic:92, hr:86, glucose:184, steps:8123 },
    { patient_id:"1002", date:t, bp_systolic:119, bp_diastolic:77, hr:72, glucose:96,  steps:4050 },
    { patient_id:"1002", date:y, bp_systolic:122, bp_diastolic:79, hr:75, glucose:101, steps:6120 }
  ];
}

// ---------- credentials ----------
export async function validatePatient(id, password){
  const local = JSON.parse(localStorage.getItem(`patient_${id}`) || "null");
  if (local && local.password === password) return local;

  const file = await fetchJSON("data/mock-patients.json");
  const list = file ?? demoPatients();
  return list.find(p => p.patient_id === id && String(p.password) === String(password)) || null;
}
export async function validateProvider(id, password){
  const local = JSON.parse(localStorage.getItem(`provider_${id}`) || "null");
  if (local && local.password === password) return local;

  const file = await fetchJSON("data/mock-providers.json");
  const list = file ?? demoProviders();
  return list.find(p => p.provider_id === id && String(p.password) === String(password)) || null;
}

// ---------- profiles ----------
export async function getPatientProfile(id){
  const local = lsGet(`patient_profile_${id}`, null);
  const fromSignup = lsGet(`patient_${id}`, null);
  const file = await fetchJSON("data/mock-patients.json");
  const base = (file ?? demoPatients()).find(p => p.patient_id === String(id));
  return Object.assign({}, base, fromSignup, local);
}
export async function getProviderProfile(id){
  const local = lsGet(`provider_profile_${id}`, null);
  const fromSignup = lsGet(`provider_${id}`, null);
  const file = await fetchJSON("data/mock-providers.json");
  const base = (file ?? demoProviders()).find(p => p.provider_id === String(id));
  return Object.assign({}, base, fromSignup, local);
}
export function saveProfile(role, id, obj){
  localStorage.setItem(`${role}_profile_${id}`, JSON.stringify(obj));
}

// js/api.js (ONLY REPLACE THIS FUNCTION)

export function seedDemoReadings(patientId) {
  // yesterday = normal-ish, today = intentionally high to trigger alerts
  const today = todayStr();
  const d = new Date(); d.setDate(d.getDate() - 1);
  const y = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  const base = [
    // Yesterday: mostly normal values (usually no alerts)
    { patient_id: String(patientId), date: y,     bp_systolic: 128, bp_diastolic: 82, hr: 78, glucose: 112, steps: 5600 },
    // Today: high values designed to trigger alerts (>=140/90 BP or >=180 glucose)
    { patient_id: String(patientId), date: today, bp_systolic: 145, bp_diastolic: 92, hr: 112, glucose: 190, steps: 6100 }
  ];

  const key = `readings_${patientId}`;
  let existing = [];
  try { existing = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
  // don't duplicate if already seeded for today
  if (!existing.some(r => r.date === today)) {
    localStorage.setItem(key, JSON.stringify([...existing, ...base]));
  }
}

export async function getReadings(patientId){
  const file = await fetchJSON("data/mock-readings.json");
  const jsonRows = (file ?? demoReadings()).filter(r => r.patient_id === String(patientId));
  const localRows = lsGet(`readings_${patientId}`, []);
  return [...jsonRows, ...localRows].sort((a,b)=>a.date.localeCompare(b.date));
}
export async function getReadingsByDate(patientId, dateStr){
  const rows = await getReadings(patientId);
  return rows.filter(r => r.date === dateStr);
}
export async function getAssignments(providerId){
  const file = await fetchJSON("data/mock-assignments.json");
  const row = (file ?? demoAssignments()).find(a => a.provider_id === String(providerId));
  if (row && row.patient_ids?.length) return row.patient_ids;

  // default to all known patients (from file + locally created)
  const pfile = await fetchJSON("data/mock-patients.json");
  const list = pfile ?? demoPatients();
  const locals = Object.keys(localStorage)
    .filter(k=>k.startsWith("patient_") && !k.startsWith("patient_profile_"))
    .map(k=>JSON.parse(localStorage.getItem(k)));
  const ids = new Set([...list.map(p=>p.patient_id), ...locals.map(p=>p.patient_id)]);
  return Array.from(ids);
}
// List symptom logs saved for a patient (from localStorage)
export function getSymptoms(patientId){
  const out=[];
  for (let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if (k && k.startsWith(`symptom_${patientId}_`)){
      try{ out.push(JSON.parse(localStorage.getItem(k))); }catch{}
    }
  }
  // each entry looks like: {type, notes, severity}
  return out.reverse();
}

