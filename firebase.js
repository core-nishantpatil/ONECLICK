// OneClick v3 — Firebase Integration UI Glue

window.populateFirebaseInputs = function() {
  // Populate Firebase inputs if config is saved
  try {
    const storedConfig = localStorage.getItem("oneclick_firebase_config");
    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      if (document.getElementById("fb-apiKey")) document.getElementById("fb-apiKey").value = config.apiKey || "";
      if (document.getElementById("fb-authDomain")) document.getElementById("fb-authDomain").value = config.authDomain || "";
      if (document.getElementById("fb-projectId")) document.getElementById("fb-projectId").value = config.projectId || "";
      if (document.getElementById("fb-storageBucket")) document.getElementById("fb-storageBucket").value = config.storageBucket || "";
      if (document.getElementById("fb-messagingSenderId")) document.getElementById("fb-messagingSenderId").value = config.messagingSenderId || "";
      if (document.getElementById("fb-appId")) document.getElementById("fb-appId").value = config.appId || "";
    }
  } catch (e) {
    console.error("Error loading firebase settings inputs:", e);
  }
};

window.updateUsernameDOM = function(username) {
  if (!username) username = "Nishant S.";
  
  const heroHighlight = document.querySelector('.db-hero-highlight');
  if (heroHighlight) heroHighlight.innerText = username;
  
  const userNames = document.querySelectorAll('.user-name');
  userNames.forEach(el => el.innerText = username);
  
  const parts = username.split(' ');
  let initials = 'NS';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].substring(0, 2).toUpperCase();
  }
  
  const userAvatars = document.querySelectorAll('.user-avatar, .topbar-avatar');
  userAvatars.forEach(el => el.innerText = initials);
};

window.wireGlobalUploadButtons = function() {
  const fileInput = document.getElementById('dataset-file-input');
  if (!fileInput) return;
  
  const uploadButtonIds = [
    'db-btn-upload',
    'db-btn-empty-upload',
    'proj-btn-upload-new',
    'btn-proj-empty-upload',
    'ds-btn-upload',
    'btn-ds-empty-upload'
  ];
  
  uploadButtonIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      });
    }
  });
};

/* ═══════════════════════════ INITIALIZATION & INTERACTIVE EVENTS ═══════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase Cloud Engine
  if (typeof initFirebaseEngine === 'function') {
    initFirebaseEngine();
  }

  // Toggle Custom Firebase configuration visibility
  const toggleConfigBtn = document.getElementById('btn-toggle-config-fields');
  const configFieldsContainer = document.getElementById('firebase-config-fields');
  if (toggleConfigBtn && configFieldsContainer) {
    toggleConfigBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = configFieldsContainer.style.display === 'none' || configFieldsContainer.style.display === '';
      configFieldsContainer.style.display = isHidden ? 'flex' : 'none';
      toggleConfigBtn.innerText = isHidden ? 'Hide Settings' : 'Show Settings';
    });
  }

  // Save Custom Firebase Credentials
  const saveFbConfigBtn = document.getElementById('btn-save-fb-config');
  if (saveFbConfigBtn) {
    saveFbConfigBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const apiKey = document.getElementById('fb-apiKey').value.trim();
      const authDomain = document.getElementById('fb-authDomain').value.trim();
      const projectId = document.getElementById('fb-projectId').value.trim();
      const storageBucket = document.getElementById('fb-storageBucket').value.trim();
      const messagingSenderId = document.getElementById('fb-messagingSenderId').value.trim();
      const appId = document.getElementById('fb-appId').value.trim();

      if (!apiKey || !projectId) {
        showToast("API Key and Project ID are required!", "error");
        return;
      }

      const config = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
      localStorage.setItem('oneclick_firebase_config', JSON.stringify(config));
      showToast("Firebase credentials saved. Reinitializing...", "success");
      
      // Re-initialize Firebase Engine
      if (typeof initFirebaseEngine === 'function') {
        initFirebaseEngine();
      }
    });
  }

  // Reset/Clear Firebase Credentials
  const clearFbConfigBtn = document.getElementById('btn-clear-fb-config');
  if (clearFbConfigBtn) {
    clearFbConfigBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('oneclick_firebase_config');
      document.getElementById('fb-apiKey').value = '';
      document.getElementById('fb-authDomain').value = '';
      document.getElementById('fb-projectId').value = '';
      document.getElementById('fb-storageBucket').value = '';
      document.getElementById('fb-messagingSenderId').value = '';
      document.getElementById('fb-appId').value = '';
      
      showToast("Reset to default sandbox settings.", "info");
      
      if (typeof initFirebaseEngine === 'function') {
        initFirebaseEngine();
      }
    });
  }
});
