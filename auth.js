export function login({ id, role, name }) {
  localStorage.setItem("rpm_user", JSON.stringify({ id, role, name, ts: Date.now() }));
}
export function currentUser() {
  const raw = localStorage.getItem("rpm_user");
  return raw ? JSON.parse(raw) : null;
}
export function logout() {
  localStorage.removeItem("rpm_user");
  location.href = "index.html";
}
export function requireAuth() {
  if (!currentUser()) location.href = "index.html";
}



  