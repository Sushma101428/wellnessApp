import { requireAuth, logout } from "./auth.js";
document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
});



