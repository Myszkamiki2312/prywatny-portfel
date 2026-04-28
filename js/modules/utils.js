export function toNum(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export function formatCurrency(value, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toNum(value));
}

export function formatPercent(value) {
  return (toNum(value) * 100).toFixed(2) + "%";
}

export function nowIso() {
  return new Date().toISOString();
}

export function debounce(fn, ms) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function showToast(message, type = "info", options = {}) {
  const toastHost = document.getElementById("toastHost");
  if (!toastHost) return;
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastHost.appendChild(toast);
  
  const ttl = options.ttlMs || 3000;
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 500);
  }, ttl);
}

export function formToObject(form) {
  if (!form) return {};
  const formData = new FormData(form);
  const obj = {};
  formData.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}
