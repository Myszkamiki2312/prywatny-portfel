export const STORAGE_KEY = "prywatny-portfel-state-v1";
export const LEGACY_STORAGE_KEYS = ["myfund-solo-state-v1"];
export const CLOUD_SYNC_KEY = "prywatny-portfel-cloud-sync-v1";

export const SUPABASE_APP_CONFIG = {
  url: window.PRIVATE_PORTFOLIO_SUPABASE?.url || "",
  anonKey: window.PRIVATE_PORTFOLIO_SUPABASE?.anonKey || "",
  resetRedirectUrl: window.PRIVATE_PORTFOLIO_SUPABASE?.resetRedirectUrl || "",
  confirmRedirectUrl: window.PRIVATE_PORTFOLIO_SUPABASE?.confirmRedirectUrl || ""
};

export const BACKEND_APP_CONFIG = {
  apiBase: window.PRIVATE_PORTFOLIO_BACKEND?.apiBase || "",
  apiToken: window.PRIVATE_PORTFOLIO_BACKEND?.apiToken || ""
};

export const API_BASE = (BACKEND_APP_CONFIG.apiBase || "").replace(/\/+$/, "");
export const API_TOKEN = String(BACKEND_APP_CONFIG.apiToken || "").trim();
export const CLOUD_LOGIN_REQUIRED = true;
export const PLAN_ORDER = ["Brak", "Basic", "Standard", "Pro", "Expert"];

export const PLAN_LIMITS = {
  Brak: { portfolios: 1, assets: 5, operations: 20 },
  Basic: { portfolios: 2, assets: 15, operations: 100 },
  Standard: { portfolios: 5, assets: 50, operations: 500 },
  Pro: { portfolios: 15, assets: 200, operations: 2000 },
  Expert: { portfolios: 100, assets: 1000, operations: 10000 },
};

export const OPERATION_TYPES = [
  { id: "buy", label: "Kupno", color: "var(--success)" },
  { id: "sell", label: "Sprzedaż", color: "var(--danger)" },
  { id: "dividend", label: "Dywidenda", color: "var(--info)" },
  { id: "tax", label: "Podatek", color: "var(--warning)" },
  { id: "fee", label: "Opłata", color: "var(--muted)" },
  { id: "deposit", label: "Wpłata", color: "var(--success-bright)" },
  { id: "withdraw", label: "Wypłata", color: "var(--danger-bright)" },
];

export const APPEARANCE_DEFAULTS = {
  theme: "dark",
  iconSet: "default",
  fontScale: "100%",
  animations: true,
  glassmorphism: true
};
