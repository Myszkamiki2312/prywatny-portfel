import { showToast } from './utils.js';

export const confirmDialogRuntime = {
  resolve: null,
  reject: null
};

export function resolveConfirmDialog(confirmed) {
  if (confirmDialogRuntime.resolve) {
    confirmDialogRuntime.resolve(confirmed);
    confirmDialogRuntime.resolve = null;
  }
}

export function confirmAction(options = {}) {
  const backdrop = document.querySelector('.backdrop');
  // Logic to show a real modal instead of window.confirm could go here
  // For now, keeping it compatible with existing DOM if present
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmOverlay = document.getElementById('confirmOverlay');
  
  if (confirmOverlay) {
    if (confirmTitle) confirmTitle.textContent = options.title || 'Na pewno?';
    if (confirmMessage) confirmMessage.textContent = options.message || '';
    confirmOverlay.hidden = false;
    if (backdrop) backdrop.classList.add('active');
    
    return new Promise((resolve) => {
      confirmDialogRuntime.resolve = resolve;
    });
  }
  
  return Promise.resolve(window.confirm(options.message || options.title));
}

export function runAfterConfirm(options, callback) {
  confirmAction(options).then(confirmed => {
    if (confirmed) callback();
  });
}
