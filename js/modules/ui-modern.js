/**
 * Modern UI logic for Private Portfolio
 * Focuses on styling enhancements and layout responsiveness
 */

export function applyTheme(theme = 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('prywatny-portfel-theme', theme);
}

export function setupModernLayout() {
  // Add glassmorphism support or modern CSS classes
  document.body.classList.add('modern-layout');
  
  // Responsive sidebar toggle logic if needed
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    // Logic for mobile view
  }
}

export function updateAccountChip(session) {
  const chip = document.getElementById('cloudAccountChip');
  const loginBtn = document.getElementById('cloudSyncLoginBtn');
  const emailLabel = document.getElementById('cloudAccountEmail');
  
  if (session && session.user) {
    if (chip) chip.hidden = false;
    if (loginBtn) loginBtn.hidden = true;
    if (emailLabel) emailLabel.textContent = session.user.email;
  } else {
    if (chip) chip.hidden = true;
    if (loginBtn) loginBtn.hidden = false;
  }
}
