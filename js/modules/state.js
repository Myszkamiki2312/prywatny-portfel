import { STORAGE_KEY, LEGACY_STORAGE_KEYS } from './constants.js';
import { nowIso } from './utils.js';

export function defaultState() {
  return {
    meta: {
      activePlan: "Expert",
      baseCurrency: "PLN",
      createdAt: nowIso(),
      fxRates: {},
      theme: "dark"
    },
    portfolios: [],
    assets: [],
    operations: []
  };
}

export function loadState() {
  const storageCandidates = [STORAGE_KEY].concat(LEGACY_STORAGE_KEYS);
  for (const key of storageCandidates) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      // Simplified normalization for the module
      if (key !== STORAGE_KEY) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch (e) {
      continue;
    }
  }
  return defaultState();
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
