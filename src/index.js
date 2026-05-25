import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ============================================
// PWA Service Worker Registration
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available - show update notification
                console.log('New version available! Refresh to update.');
                showUpdateBanner();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

// ============================================
// PWA Install Prompt
// ============================================
let deferredPrompt = null;
let installBannerShown = false;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📲 PWA beforeinstallprompt fired!');
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;

  // Show the install banner after a short delay
  if (!installBannerShown) {
    setTimeout(showInstallBanner, 3000);
  }
});

// Hide banner when app is already installed
window.addEventListener('appinstalled', () => {
  console.log('PWA installed successfully!');
  deferredPrompt = null;
  removeInstallBanner();
  // Clear stored prompt
  localStorage.setItem('pwa_installed', 'true');
  // Update any "Install" buttons to show "Installed ✓"
  document.querySelectorAll('.btn-install-app').forEach(btn => {
    btn.innerHTML = '✓ Already Installed';
    btn.disabled = true;
    btn.style.opacity = '0.6';
  });
});

// Listen for custom install trigger from React components
window.addEventListener('trigger-pwa-install', async () => {
  if (deferredPrompt) {
    window.__deferredPromptFired = true;
    console.log('📲 Triggering PWA install dialog...');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('User install choice:', outcome);
    deferredPrompt = null;
    removeInstallBanner();
  } else if (isPWA) {
    window.__deferredPromptFired = true; // already installed counts as success
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:12px 24px;border-radius:24px;z-index:9999;font-family:system-ui;font-weight:600;box-shadow:0 4px 20px rgba(16,185,129,0.4);animation:slideUp 0.3s ease-out;';
    toast.textContent = '✓ App is already installed!';
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.4s'; setTimeout(() => toast.remove(), 400); }, 2500);
  } else {
    // PWA install not available — notify React to show guide
    console.log('⚠️ PWA install not available (beforeinstallprompt never fired). Showing guide.');
    window.dispatchEvent(new CustomEvent('show-generic-install-guide'));
  }
});

// Listen for guide trigger from landing page install buttons
window.addEventListener('show-generic-install-guide', () => {
  const guideEl = document.getElementById('get-app');
  if (guideEl) {
    guideEl.scrollIntoView({ behavior: 'smooth' });
    guideEl.querySelector('.install-guides')?.classList.add('highlight-pulse');
    setTimeout(() => guideEl.querySelector('.install-guides')?.classList.remove('highlight-pulse'), 2000);
  }
});

// Check if user already dismissed or installed
const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
              window.navigator.standalone ||
              localStorage.getItem('pwa_installed') === 'true';

function showInstallBanner() {
  if (installBannerShown || isPWA) return;

  // Check if user previously dismissed
  const dismissed = localStorage.getItem('pwa_dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed, 10);
    // Show again after 7 days
    if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
  }

  installBannerShown = true;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <style>
      #pwa-install-banner {
        position: fixed;
        bottom: 80px;
        left: 16px;
        right: 16px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        color: white;
        border-radius: 16px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        z-index: 9999;
        box-shadow: 0 8px 40px rgba(0,0,0,0.3);
        animation: slideUp 0.4s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        border: 1px solid rgba(255,255,255,0.1);
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #pwa-install-banner .pwa-icon {
        font-size: 36px;
        flex-shrink: 0;
      }
      #pwa-install-banner .pwa-text {
        flex: 1;
        min-width: 0;
      }
      #pwa-install-banner .pwa-title {
        font-weight: 700;
        font-size: 15px;
        margin-bottom: 2px;
      }
      #pwa-install-banner .pwa-subtitle {
        font-size: 12px;
        color: #94a3b8;
      }
      #pwa-install-banner .pwa-install-btn {
        background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 24px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 15px rgba(37,99,235,0.4);
      }
      #pwa-install-banner .pwa-install-btn:hover {
        transform: scale(1.05);
      }
      #pwa-install-banner .pwa-close {
        background: none;
        border: none;
        color: #64748b;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        position: absolute;
        top: 8px;
        right: 12px;
        line-height: 1;
      }
      @media (max-width: 480px) {
        #pwa-install-banner { bottom: 75px; padding: 14px 16px; gap: 10px; }
        #pwa-install-banner .pwa-icon { font-size: 28px; }
        #pwa-install-banner .pwa-title { font-size: 13px; }
        #pwa-install-banner .pwa-install-btn { padding: 8px 16px; font-size: 12px; }
      }
    </style>
    <div class="pwa-icon">📱</div>
    <div class="pwa-text">
      <div class="pwa-title">Install Linguaclass</div>
      <div class="pwa-subtitle">Add to home screen for a better experience</div>
    </div>
    <button class="pwa-install-btn" id="pwa-install-action">Install</button>
    <button class="pwa-close" id="pwa-install-dismiss">&times;</button>
  `;

  document.body.appendChild(banner);

  document.getElementById('pwa-install-action').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('User install choice:', outcome);
      deferredPrompt = null;
    }
    removeInstallBanner();
  });

  document.getElementById('pwa-install-dismiss').addEventListener('click', () => {
    removeInstallBanner();
    localStorage.setItem('pwa_dismissed', Date.now().toString());
  });
}

function removeInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(20px)';
    banner.style.transition = 'all 0.3s ease';
    setTimeout(() => banner.remove(), 300);
  }
  installBannerShown = false;
}

function showUpdateBanner() {
  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.innerHTML = `
    <style>
      #pwa-update-banner {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: #2563eb;
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        z-index: 9999;
        font-family: system-ui, sans-serif;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(37,99,235,0.4);
        animation: slideDown 0.3s ease-out;
        border: none;
      }
      @keyframes slideDown {
        from { transform: translate(-50%, -40px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    </style>
    🔄 New update available — tap to refresh
  `;
  banner.addEventListener('click', () => {
    window.location.reload();
  });
  document.body.appendChild(banner);
  setTimeout(() => {
    if (banner.parentNode) banner.remove();
  }, 8000);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
