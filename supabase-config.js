// Developer config for cloud-only mode.
// This publishable key is safe for the app because app_states has RLS policies.
window.PRIVATE_PORTFOLIO_SUPABASE = {
  url: "https://kcvrgbzluyjvuynqoezd.supabase.co",
  anonKey: "sb_publishable_g9Ki1EBtOPDFyErEVcqajA_29nJZANV",
  resetRedirectUrl: "https://myszkamiki2312.github.io/prywatny-portfel/reset-password.html"
};

// Leave apiBase empty for local desktop backend (/api).
// For cloud backend use e.g. "https://twoj-backend.onrender.com/api".
window.PRIVATE_PORTFOLIO_BACKEND = {
  apiBase: "",
  apiToken: ""
};
