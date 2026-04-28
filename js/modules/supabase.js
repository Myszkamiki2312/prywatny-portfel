import { CLOUD_SYNC_KEY, SUPABASE_APP_CONFIG } from './constants.js';
import { showToast, nowIso } from './utils.js';

export function defaultCloudSyncConfig() {
  return {
    url: SUPABASE_APP_CONFIG.url || "",
    anonKey: SUPABASE_APP_CONFIG.anonKey || "",
    email: "",
    lastPush: null,
    lastPull: null,
    autoPush: true,
  };
}

export function loadCloudSyncConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_SYNC_KEY);
    if (!raw) return defaultCloudSyncConfig();
    return JSON.parse(raw);
  } catch (e) {
    return defaultCloudSyncConfig();
  }
}

export async function supabaseRequest(path, options = {}, config) {
  const url = `${config.url}${path}`;
  const headers = {
    "apikey": config.anonKey,
    "Authorization": `Bearer ${config.session?.access_token || config.anonKey}`,
    "Content-Type": "application/json",
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.msg || `Supabase error: ${response.status}`);
  }
  return await response.json();
}

export async function pushCloudState(state, config) {
  const payload = {
    user_id: config.session?.user?.id,
    state_json: state,
    updated_at: nowIso()
  };

  return await supabaseRequest("/rest/v1/app_states", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Prefer": "resolution=merge-duplicates" }
  }, config);
}

export async function authenticateWithCloud(email, password, config) {
  const payload = await supabaseRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }, config);
  return payload;
}

export async function signUpWithCloud(email, password, config) {
  return await supabaseRequest("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }, config);
}

export async function resetPasswordWithCloud(email, config) {
  return await supabaseRequest("/auth/v1/recover", {
    method: "POST",
    body: JSON.stringify({ email })
  }, config);
}
