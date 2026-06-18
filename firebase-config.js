// Firebase integration and Synchronization Engine for OneClick Analytics

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let firebaseStorage = null;
let isFirebaseConnected = false;
let currentFirebaseUser = null;

// Mock Cloud Firestore emulators in localStorage
const MOCK_CLOUD_STORE_KEY = "oneclick_mock_cloud_workspaces";
const MOCK_CLOUD_REPORTS_KEY = "oneclick_mock_cloud_reports";
const MOCK_CLOUD_TEMPLATES_KEY = "oneclick_mock_cloud_templates";
const MOCK_CLOUD_SETTINGS_KEY = "oneclick_mock_cloud_settings";

function getMockCloudWorkspaces() {
  try {
    const data = localStorage.getItem(MOCK_CLOUD_STORE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}
function saveMockCloudWorkspace(workspace) {
  const store = getMockCloudWorkspaces();
  store[workspace.workspaceId] = workspace;
  localStorage.setItem(MOCK_CLOUD_STORE_KEY, JSON.stringify(store));
}
function deleteMockCloudWorkspace(workspaceId) {
  const store = getMockCloudWorkspaces();
  delete store[workspaceId];
  localStorage.setItem(MOCK_CLOUD_STORE_KEY, JSON.stringify(store));
}

// Mock Firebase Storage using IndexedDB (to avoid localStorage 5MB size limit)
const STORAGE_DB_NAME = 'oneclick_mock_storage_db';
const STORAGE_STORE_NAME = 'mock_files';

function openStorageDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORAGE_STORE_NAME)) {
        db.createObjectStore(STORAGE_STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function saveFileToMockStorage(key, blob) {
  return openStorageDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORAGE_STORE_NAME);
      const request = store.put(blob, key);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

function getFileFromMockStorage(key) {
  return openStorageDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_STORE_NAME, 'readonly');
      const store = tx.objectStore(STORAGE_STORE_NAME);
      const request = store.get(key);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

function deleteFileFromMockStorage(key) {
  return openStorageDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORAGE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORAGE_STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

// 1. Initializer
function initFirebaseEngine() {
  let config = null;
  try {
    const storedConfig = localStorage.getItem("oneclick_firebase_config");
    if (storedConfig) {
      config = JSON.parse(storedConfig);
    }
  } catch (e) {
    console.error("Failed to parse stored Firebase config:", e);
  }

  const badge = document.getElementById("firebase-status-badge");
  const badgeText = document.getElementById("firebase-status-text");

  const isValidConfig = config && 
                        config.apiKey && 
                        config.apiKey.trim() !== "" && 
                        !config.apiKey.startsWith("YOUR_");

  if (isValidConfig) {
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(config);
      } else {
        firebaseApp = firebase.app();
      }
      firebaseAuth = firebase.auth();
      firestoreDb = firebase.firestore();
      firebaseStorage = firebase.storage();
      isFirebaseConnected = true;

      if (badge && badgeText) {
        badge.innerHTML = `
          <span class="status-dot online"></span>
          <span id="firebase-status-text">Connected to Firebase Cloud</span>
        `;
      }
      console.log("Firebase initialized successfully with custom config.");
    } catch (err) {
      console.error("Firebase initialization failed:", err);
      isFirebaseConnected = false;
      if (badge && badgeText) {
        badge.innerHTML = `
          <span class="status-dot error"></span>
          <span id="firebase-status-text">Connection Error: ${err.message.substring(0, 30)}...</span>
        `;
      }
    }
  } else {
    isFirebaseConnected = false;
    firebaseApp = null;
    firebaseAuth = null;
    firestoreDb = null;
    firebaseStorage = null;
    if (badge && badgeText) {
      badge.innerHTML = `
        <span class="status-dot offline"></span>
        <span id="firebase-status-text">Sandbox Emulation Mode (IndexedDB Mock Cloud)</span>
      `;
    }
    console.log("Firebase running in sandbox mode.");
  }

  // Inject topbar status indicators
  injectSyncIndicators();

  // Listen to network status changes
  window.addEventListener('online', () => window.setCloudSyncStatus('syncing'));
  window.addEventListener('offline', () => window.setCloudSyncStatus('offline'));

  if (isFirebaseConnected && firebaseAuth) {
    firebaseAuth.onAuthStateChanged((user) => {
      handleAuthStateChanged(user);
    });
  } else {
    const mockUserSession = localStorage.getItem("oneclick_mock_user_session");
    if (mockUserSession) {
      try {
        handleAuthStateChanged(JSON.parse(mockUserSession));
      } catch (e) {
        handleAuthStateChanged(null);
      }
    } else {
      handleAuthStateChanged(null);
    }
  }
}

// Dynamic Topbar Sync badge injector
function injectSyncIndicators() {
  const topbarRights = document.querySelectorAll('.topbar-right, .ws-top-right');
  topbarRights.forEach((container, idx) => {
    if (!container.querySelector('.topbar-sync-status')) {
      const pill = document.createElement('div');
      pill.className = 'topbar-sync-status saved';
      pill.title = 'Database Sync Status';
      pill.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="sync-icon">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
        <span class="sync-text">Saved</span>
      `;
      container.insertBefore(pill, container.firstChild);
    }
  });

  if (!navigator.onLine) {
    window.setCloudSyncStatus('offline');
  } else {
    window.setCloudSyncStatus('synced');
  }
}

window.setCloudSyncStatus = function(state) {
  const indicators = document.querySelectorAll('.topbar-sync-status');
  indicators.forEach(el => {
    el.className = 'topbar-sync-status ' + state;
    const textEl = el.querySelector('.sync-text');
    if (!textEl) return;
    
    if (state === 'saved') {
      textEl.innerText = 'Saved';
    } else if (state === 'saving') {
      textEl.innerText = 'Saving...';
    } else if (state === 'offline') {
      textEl.innerText = 'Offline';
    } else if (state === 'syncing') {
      textEl.innerText = 'Syncing...';
    } else if (state === 'synced') {
      textEl.innerText = 'Cloud Synced';
    }
  });
};

// 2. Auth State Handler
function handleAuthStateChanged(user) {
  currentFirebaseUser = user;
  const syncStatusEl = document.getElementById("firebase-sync-status");
  const sidebarUserCard = document.getElementById("sidebar-user-card");

  if (user) {
    // Logged In State
    if (syncStatusEl) {
      syncStatusEl.innerHTML = `
        <div style="color: var(--success); font-weight:600; display:flex; align-items:center; gap:6px;">
          <span>✓ Active Synced Session</span>
        </div>
        <div style="font-size:11px; color:var(--text-secondary); margin-top: 4px;">
          Signed in as <strong>${user.email}</strong>. Data backups are fully automated.
        </div>
      `;
    }

    if (sidebarUserCard) {
      const initials = getInitials(user.displayName || user.email || "User");
      sidebarUserCard.innerHTML = `
        <div class="user-avatar-wrap">
          ${user.photoURL ? 
            `<img src="${user.photoURL}" class="user-avatar" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid var(--bg-card);" referrerpolicy="no-referrer"/>` : 
            `<div class="user-avatar" id="user-avatar-initials" style="border:2px solid var(--bg-card);">${initials}</div>`
          }
          <div class="user-status" id="user-status-indicator" style="background-color: var(--success);"></div>
        </div>
        <div class="user-info">
          <div class="user-name" id="sidebar-username" title="${user.displayName || 'Google User'}">${user.displayName || 'Google User'}</div>
          <div class="user-role" id="sidebar-user-role" title="${user.email}">${user.email.substring(0, 18)}${user.email.length > 18 ? '...' : ''}</div>
        </div>
        <button class="user-menu-btn" id="btn-user-logout" aria-label="Sign Out" title="Sign Out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      `;

      const logoutBtn = document.getElementById("btn-user-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          signOutUser();
        });
      }
    }

    updateUsernameDOM(user.displayName || "Google User");
    if (user.photoURL) {
      const headerAvatars = document.querySelectorAll(".topbar-avatar");
      headerAvatars.forEach(el => {
        el.innerHTML = `<img src="${user.photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;" referrerpolicy="no-referrer"/>`;
      });
    }

    // Check Migration eligibility
    checkMigrationStatus(user);

  } else {
    // Logged Out State
    if (syncStatusEl) {
      syncStatusEl.innerText = "Sign in with Google in the sidebar to sync your workspaces.";
    }

    if (sidebarUserCard) {
      sidebarUserCard.innerHTML = `
        <button class="google-signin-btn" id="btn-google-login" title="Sign in with Google">
          <div class="google-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
          </div>
          <span class="google-btn-text">Sign in with Google</span>
        </button>
      `;

      const loginBtn = document.getElementById("btn-google-login");
      if (loginBtn) {
        loginBtn.addEventListener("click", () => {
          signInWithGoogle();
        });
      }
    }

    const localUsername = localStorage.getItem("oneclick_username");
    updateUsernameDOM(localUsername || "Nishant S.");
  }
}

function getInitials(name) {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return "US";
}

function signInWithGoogle() {
  if (isFirebaseConnected && firebaseAuth) {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebaseAuth.signInWithPopup(provider)
      .then((result) => {
        showToast("Signed in as " + result.user.displayName, "success");
      })
      .catch((error) => {
        console.error("Sign in failed:", error);
        showToast("Sign in failed: " + error.message, "error");
      });
  } else {
    openMockLoginPopup();
  }
}

function signOutUser() {
  if (isFirebaseConnected && firebaseAuth) {
    firebaseAuth.signOut().then(() => {
      showToast("Signed out successfully", "info");
    });
  } else {
    localStorage.removeItem("oneclick_mock_user_session");
    handleAuthStateChanged(null);
    showToast("Signed out from Sandbox", "info");
    if (window.loadAndRenderProjects) window.loadAndRenderProjects();
    if (window.loadAndRenderDashboard) window.loadAndRenderDashboard();
  }
}

function openMockLoginPopup() {
  const w = 480;
  const h = 580;
  const left = window.screen.width / 2 - w / 2;
  const top = window.screen.height / 2 - h / 2;
  
  const popup = window.open(
    "",
    "GoogleSignInEmulation",
    `width=${w},height=${h},left=${left},top=${top},status=no,resizable=no`
  );
  
  if (!popup) {
    alert("Popup blocker active! Please enable popups to sign in with Google.");
    return;
  }

  const isDark = !document.body.classList.contains("light-theme");
  const bg = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F8FAFC" : "#1F2937";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const cardBg = isDark ? "#161B22" : "#F3F4F6";

  popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sign in — Google Accounts</title>
      <meta charset="UTF-8"/>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: ${bg};
          color: ${text};
          margin: 0;
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .container {
          width: 100%;
          max-width: 380px;
          text-align: center;
        }
        .logo {
          margin-bottom: 16px;
        }
        h1 {
          font-size: 22px;
          font-weight: 500;
          margin: 0 0 8px 0;
        }
        p {
          font-size: 14px;
          color: #94A3B8;
          margin: 0 0 32px 0;
        }
        .account-card {
          background-color: ${cardBg};
          border: 1px solid ${border};
          border-radius: 8px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
          text-align: left;
          margin-bottom: 12px;
        }
        .account-card:hover {
          transform: translateY(-1px);
          border-color: #4285F4;
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #6366F1;
          color: white;
          font-weight: bold;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .info {
          flex-grow: 1;
        }
        .name {
          font-weight: 600;
          font-size: 14px;
        }
        .email {
          font-size: 12px;
          color: #64748B;
        }
        .add-account {
          display: block;
          text-align: center;
          font-size: 13px;
          color: #4285F4;
          margin-top: 24px;
          text-decoration: none;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
        </div>
        <h1>Choose an account</h1>
        <p>to continue to OneClick Pro</p>
        
        <div class="account-card" onclick="selectAccount('Nishant Patil', 'nishant.patil@oneclick.io')">
          <div class="avatar">NP</div>
          <div class="info">
            <div class="name">Nishant Patil</div>
            <div class="email">nishant.patil@oneclick.io</div>
          </div>
        </div>

        <div class="account-card" onclick="selectAccount('Nishant S.', 'nishant.s@gmail.com')">
          <div class="avatar" style="background:#8B5CF6;">NS</div>
          <div class="info">
            <div class="name">Nishant S.</div>
            <div class="email">nishant.s@gmail.com</div>
          </div>
        </div>

        <a href="#" class="add-account" onclick="customAccount()">Use another account</a>
      </div>

      <script>
        function selectAccount(name, email) {
          window.opener.handleMockLoginSuccess(name, email);
          window.close();
        }
        function customAccount() {
          const email = prompt("Enter simulated email address:", "user@domain.com");
          if (email) {
            const name = email.split('@')[0].toUpperCase();
            selectAccount(name, email);
          }
        }
      </script>
    </body>
    </html>
  `);
}

window.handleMockLoginSuccess = function(name, email) {
  const user = {
    uid: "mock_" + email.replace(/[@.]/g, "_"),
    displayName: name,
    email: email,
    photoURL: null
  };
  localStorage.setItem("oneclick_mock_user_session", JSON.stringify(user));
  showToast("Welcome back, " + name, "success");
  handleAuthStateChanged(user);
};


// 3. STORAGE WORKFLOW HELPERS (Real Storage & Emulated IndexedDB)

function uploadDatasetFileToStorage(uid, workspaceId, fileOrBlob, fileName) {
  if (isFirebaseConnected && firebaseStorage) {
    const storagePath = `users/${uid}/datasets/${workspaceId}_${fileName}`;
    const ref = firebaseStorage.ref().child(storagePath);
    return ref.put(fileOrBlob).then(() => {
      return ref.getDownloadURL().then(url => {
        return { fileUrl: url, storagePath: storagePath };
      });
    });
  } else {
    // Sandbox Mock Upload
    const key = `${workspaceId}_${fileName}`;
    return saveFileToMockStorage(key, fileOrBlob).then(() => {
      const mockUrl = `mock-storage://users/${uid}/datasets/${key}`;
      return { fileUrl: mockUrl, storagePath: `users/${uid}/datasets/${key}` };
    });
  }
}

function getDatasetFileFromStorage(fileUrl) {
  if (fileUrl.startsWith('mock-storage://')) {
    const parts = fileUrl.split('/');
    const key = parts[parts.length - 1];
    return getFileFromMockStorage(key);
  } else {
    // Real fetch
    return fetch(fileUrl).then(res => {
      if (!res.ok) throw new Error("Failed to download dataset from Storage.");
      return res.blob();
    });
  }
}

function deleteDatasetFileFromStorage(fileUrl) {
  if (fileUrl.startsWith('mock-storage://')) {
    const parts = fileUrl.split('/');
    const key = parts[parts.length - 1];
    return deleteFileFromMockStorage(key);
  } else if (isFirebaseConnected && firebaseStorage) {
    try {
      const ref = firebaseStorage.refFromURL(fileUrl);
      return ref.delete().catch(e => console.warn("Storage file delete failed:", e));
    } catch (e) {
      console.warn("Storage url ref extract failed:", e);
      return Promise.resolve();
    }
  }
  return Promise.resolve();
}


// 4. SETTINGS, REPORTS, TEMPLATES SYNCHRONIZATION HELPERS

// Report Cloud Actions
function saveReportToFirestore(uid, reportId, reportState) {
  if (isFirebaseConnected && firestoreDb) {
    return firestoreDb.collection("users")
      .doc(uid)
      .collection("reports")
      .doc(reportId)
      .set(reportState)
      .catch(e => console.error("Cloud report save failed:", e));
  } else {
    const reports = JSON.parse(localStorage.getItem(MOCK_CLOUD_REPORTS_KEY) || "{}");
    reports[reportId] = reportState;
    localStorage.setItem(MOCK_CLOUD_REPORTS_KEY, JSON.stringify(reports));
    return Promise.resolve();
  }
}

function deleteReportFromFirestore(uid, reportId) {
  if (isFirebaseConnected && firestoreDb) {
    return firestoreDb.collection("users")
      .doc(uid)
      .collection("reports")
      .doc(reportId)
      .delete()
      .catch(e => console.error("Cloud report delete failed:", e));
  } else {
    const reports = JSON.parse(localStorage.getItem(MOCK_CLOUD_REPORTS_KEY) || "{}");
    delete reports[reportId];
    localStorage.setItem(MOCK_CLOUD_REPORTS_KEY, JSON.stringify(reports));
    return Promise.resolve();
  }
}

function getAllReportsFromFirestore(uid) {
  if (isFirebaseConnected && firestoreDb) {
    return firestoreDb.collection("users")
      .doc(uid)
      .collection("reports")
      .get()
      .then(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        return list;
      })
      .catch(e => {
        console.error("Cloud reports fetch failed:", e);
        return [];
      });
  } else {
    const reports = JSON.parse(localStorage.getItem(MOCK_CLOUD_REPORTS_KEY) || "{}");
    return Promise.resolve(Object.values(reports));
  }
}

// Settings Cloud Actions
function saveSettingsToFirestore(uid, settings) {
  if (isFirebaseConnected && firestoreDb) {
    return firestoreDb.collection("users")
      .doc(uid)
      .collection("settings")
      .doc("default")
      .set(settings)
      .catch(e => console.error("Cloud settings save failed:", e));
  } else {
    localStorage.setItem(MOCK_CLOUD_SETTINGS_KEY, JSON.stringify(settings));
    return Promise.resolve();
  }
}

function getSettingsFromFirestore(uid) {
  if (isFirebaseConnected && firestoreDb) {
    return firestoreDb.collection("users")
      .doc(uid)
      .collection("settings")
      .doc("default")
      .get()
      .then(doc => doc.exists ? doc.data() : null)
      .catch(e => {
        console.error("Cloud settings fetch failed:", e);
        return null;
      });
  } else {
    const settings = localStorage.getItem(MOCK_CLOUD_SETTINGS_KEY);
    return Promise.resolve(settings ? JSON.parse(settings) : null);
  }
}


// 5. WORKSPACE SYNC WRAPPER WITH STORAGE INTEGRATION

function saveWorkspaceToFirestore(uid, workspace) {
  // Clone workspace to avoid modifying the original local reference in-memory
  const cloudWorkspace = JSON.parse(JSON.stringify(workspace));
  if (cloudWorkspace.datasetData) {
    cloudWorkspace.datasetData.gridData = [];
    cloudWorkspace.datasetData.originalGridData = [];
  }
  cloudWorkspace.isCloudSyncTruncated = true;

  if (isFirebaseConnected && firestoreDb) {
    return firestoreDb.collection("users")
      .doc(uid)
      .collection("workspaces")
      .doc(cloudWorkspace.workspaceId)
      .set(cloudWorkspace)
      .then(() => {
        console.log("Workspace metadata saved to Firestore successfully.");
      })
      .catch(err => {
        console.error("Firestore save failed:", err);
      });
  } else {
    saveMockCloudWorkspace(cloudWorkspace);
    return Promise.resolve();
  }
}

function deleteWorkspaceFromFirestore(uid, workspaceId) {
  // Find storage file ref if present
  getWorkspaceFromFirestore(uid, workspaceId).then(ws => {
    if (ws && ws.datasetMetadata && ws.datasetMetadata.fileUrl) {
      deleteDatasetFileFromStorage(ws.datasetMetadata.fileUrl);
    }
  });

  if (isFirebaseConnected && firestoreDb) {
    return firestoreDb.collection("users")
      .doc(uid)
      .collection("workspaces")
      .doc(workspaceId)
      .delete()
      .catch(err => console.error("Firestore workspace delete failed:", err));
  } else {
    deleteMockCloudWorkspace(workspaceId);
    return Promise.resolve();
  }
}

function getAllWorkspacesFromFirestore(uid) {
  if (isFirebaseConnected && firestoreDb) {
    return firestoreDb.collection("users")
      .doc(uid)
      .collection("workspaces")
      .get()
      .then(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        return list;
      })
      .catch(err => {
        console.error("Firestore workspaces list failed:", err);
        return [];
      });
  } else {
    const store = getMockCloudWorkspaces();
    return Promise.resolve(Object.values(store));
  }
}

function getWorkspaceFromFirestore(uid, workspaceId) {
  if (isFirebaseConnected && firestoreDb) {
    return firestoreDb.collection("users")
      .doc(uid)
      .collection("workspaces")
      .doc(workspaceId)
      .get()
      .then(doc => doc.exists ? doc.data() : null)
      .catch(e => null);
  } else {
    const store = getMockCloudWorkspaces();
    return Promise.resolve(store[workspaceId] || null);
  }
}


// 6. LOCAL MIGRATION TRIGGER PIPELINE

function checkMigrationStatus(user) {
  const uid = user.uid || user.email;
  const isMigrated = localStorage.getItem(`oneclick_migrated_${uid}`);
  if (isMigrated === "true") {
    // Proceed to load and sync Cloud directly
    syncCloudAndLocal(uid);
    return;
  }

  // Check if there are local workspaces in IndexedDB
  getAllWorkspacesFromDB().then(workspaces => {
    if (workspaces && workspaces.length > 0) {
      // Display the Migration modal Dialog
      const modal = document.getElementById("migration-modal");
      if (modal) {
        modal.style.display = "flex";
        
        // Wire buttons
        const btnMigrate = document.getElementById("btn-migrate-now");
        const btnSkip = document.getElementById("btn-migrate-skip");
        
        if (btnMigrate) {
          btnMigrate.onclick = () => {
            modal.style.display = "none";
            runMigrationPipeline(uid);
          };
        }
        if (btnSkip) {
          btnSkip.onclick = () => {
            modal.style.display = "none";
            localStorage.setItem(`oneclick_migrated_${uid}`, "true");
            syncCloudAndLocal(uid);
          };
        }
      } else {
        // Fallback sync directly
        syncCloudAndLocal(uid);
      }
    } else {
      // No workspaces offline, skip modal and sync direct
      localStorage.setItem(`oneclick_migrated_${uid}`, "true");
      syncCloudAndLocal(uid);
    }
  }).catch(err => {
    console.error("Migration check failed:", err);
    syncCloudAndLocal(uid);
  });
}

function runMigrationPipeline(uid) {
  console.log("Migration pipeline started...");
  showToast("Migration started: secure cloud upload in progress...", "info");
  window.setCloudSyncStatus('syncing');

  getAllWorkspacesFromDB().then(async (workspaces) => {
    let successCount = 0;
    
    for (const ws of workspaces) {
      try {
        let finalWorkspace = ws;
        
        // Check if data grid is present locally
        if (ws.datasetData && ws.datasetData.gridData && ws.datasetData.gridData.length > 0) {
          // Reconstruct source CSV from grid data
          const headersList = ws.datasetData.headers.map(h => ws.datasetData.headerNames[h] || h);
          const fullRows = [headersList, ...ws.datasetData.gridData];
          const csvString = Papa.unparse(fullRows);
          const blob = new Blob([csvString], { type: "text/csv" });
          
          // Upload sheet binary to Storage
          const storageResult = await uploadDatasetFileToStorage(uid, ws.workspaceId, blob, ws.fileName);
          
          // Truncate full grid from Firestore document body
          finalWorkspace = JSON.parse(JSON.stringify(ws));
          finalWorkspace.datasetData.gridData = [];
          finalWorkspace.datasetData.originalGridData = [];
          finalWorkspace.isCloudSyncTruncated = true;
          
          // Save Storage References
          finalWorkspace.datasetMetadata = {
            fileUrl: storageResult.fileUrl,
            storagePath: storageResult.storagePath,
            fileSize: blob.size,
            fileType: "CSV",
            rowCount: ws.rowCount,
            columnCount: ws.columnCount,
            headers: ws.datasetData.headers,
            columnTypes: ws.datasetData.columnTypes || []
          };
        }
        
        // Save to Firestore workspaces subcollection
        await saveWorkspaceToFirestore(uid, finalWorkspace);
        successCount++;
      } catch (err) {
        console.error("Migration failed for workspace ID " + ws.workspaceId, err);
      }
    }

    // Migrate Local Dashboards/Reports
    const reportKeys = Object.keys(localStorage).filter(k => k.startsWith('oneclick_dash_'));
    for (const key of reportKeys) {
      try {
        const cleanId = key.replace('oneclick_dash_', '');
        const state = JSON.parse(localStorage.getItem(key));
        await saveReportToFirestore(uid, cleanId, state);
      } catch (e) {
        console.error("Dashboard migration failed for key " + key, e);
      }
    }

    localStorage.setItem(`oneclick_migrated_${uid}`, "true");
    showToast(`Migration successful! Saved ${successCount} projects to the Cloud.`, "success");
    window.setCloudSyncStatus('synced');
    
    // Sync remaining items from Cloud
    syncCloudAndLocal(uid);

  }).catch(e => {
    console.error("Migration execution failed:", e);
    showToast("Migration failed: " + e.message, "error");
    window.setCloudSyncStatus('offline');
  });
}


// 7. BI-DIRECTIONAL WORKSPACE & USER PREFERENCES SYNC PIPELINE

function syncCloudAndLocal(uid) {
  if (!uid) return;

  console.log("Starting full cloud synchronization...");
  window.setCloudSyncStatus('syncing');

  // Synchronize Workspaces, Reports, Settings
  Promise.all([
    getAllWorkspacesFromDB(),
    getAllWorkspacesFromFirestore(uid),
    getAllReportsFromFirestore(uid),
    getSettingsFromFirestore(uid)
  ]).then(async ([localWorkspaces, cloudWorkspaces, cloudReports, cloudSettings]) => {
    
    // A. Sync Workspaces
    const localWsMap = new Map(localWorkspaces.map(w => [w.workspaceId, w]));
    const cloudWsMap = new Map(cloudWorkspaces.map(w => [w.workspaceId, w]));
    const processedWsIds = new Set();
    const wsLocalPromises = [];
    const wsCloudPromises = [];

    // Cloud Workspaces sync
    for (const [wsId, cloudWs] of cloudWsMap.entries()) {
      processedWsIds.add(wsId);
      const localWs = localWsMap.get(wsId);

      if (!localWs) {
        console.log(`Sync: Cloud workspace to local IndexedDB: ${wsId}`);
        wsLocalPromises.push(saveWorkspaceToDB(cloudWs));
      } else {
        const cloudTime = cloudWs.lastOpenedTimestamp || 0;
        const localTime = localWs.lastOpenedTimestamp || 0;

        if (cloudTime > localTime) {
          const mergedWs = { ...cloudWs };
          // Do not delete local copy of raw sheets if Cloud copy is truncated
          if (cloudWs.isCloudSyncTruncated && localWs.datasetData && localWs.datasetData.gridData && localWs.datasetData.gridData.length > 0) {
            mergedWs.datasetData.gridData = localWs.datasetData.gridData;
            mergedWs.datasetData.originalGridData = localWs.datasetData.originalGridData;
          }
          console.log(`Sync: Cloud workspace (newer) to local: ${wsId}`);
          wsLocalPromises.push(saveWorkspaceToDB(mergedWs));
        } else if (localTime > cloudTime) {
          console.log(`Sync: Newer Local workspace to Cloud: ${wsId}`);
          wsCloudPromises.push(saveWorkspaceToFirestore(uid, localWs));
        }
      }
    }

    // Local-only Workspaces sync
    for (const [wsId, localWs] of localWsMap.entries()) {
      if (!processedWsIds.has(wsId)) {
        console.log(`Sync: Uploading Local workspace to Cloud: ${wsId}`);
        
        let uploadWs = localWs;
        // If local workspace contains grid rows, rebuild blob and save to storage
        if (localWs.datasetData && localWs.datasetData.gridData && localWs.datasetData.gridData.length > 0 && (!localWs.datasetMetadata || !localWs.datasetMetadata.fileUrl)) {
          try {
            const headersList = localWs.datasetData.headers.map(h => localWs.datasetData.headerNames[h] || h);
            const fullRows = [headersList, ...localWs.datasetData.gridData];
            const csvString = Papa.unparse(fullRows);
            const blob = new Blob([csvString], { type: "text/csv" });
            const storageResult = await uploadDatasetFileToStorage(uid, localWs.workspaceId, blob, localWs.fileName);
            
            uploadWs = JSON.parse(JSON.stringify(localWs));
            uploadWs.datasetData.gridData = [];
            uploadWs.datasetData.originalGridData = [];
            uploadWs.isCloudSyncTruncated = true;
            uploadWs.datasetMetadata = {
              fileUrl: storageResult.fileUrl,
              storagePath: storageResult.storagePath,
              fileSize: blob.size,
              fileType: "CSV",
              rowCount: localWs.rowCount,
              columnCount: localWs.columnCount,
              headers: localWs.datasetData.headers,
              columnTypes: localWs.datasetData.columnTypes || []
            };
          } catch(err) {
            console.error("Failed to build storage reference for sync: " + wsId, err);
          }
        }
        wsCloudPromises.push(saveWorkspaceToFirestore(uid, uploadWs));
      }
    }

    await Promise.all(wsLocalPromises);
    await Promise.all(wsCloudPromises);

    // B. Sync Reports / Dashboards
    const cloudReportsMap = new Map(cloudReports.map(r => [r.id || r.savedAt, r]));
    const localReportKeys = Object.keys(localStorage).filter(k => k.startsWith('oneclick_dash_'));
    const localReportsMap = new Map();
    localReportKeys.forEach(k => {
      try {
        const cleanId = k.replace('oneclick_dash_', '');
        const state = JSON.parse(localStorage.getItem(k));
        localReportsMap.set(cleanId, state);
      } catch (e) {}
    });

    const reportCloudPromises = [];
    const processedReportIds = new Set();

    for (const [rId, cloudRep] of cloudReportsMap.entries()) {
      processedReportIds.add(rId);
      const localRep = localReportsMap.get(rId);

      if (!localRep) {
        console.log(`Sync: Cloud Report to Local: ${rId}`);
        localStorage.setItem(`oneclick_dash_${rId}`, JSON.stringify(cloudRep));
      } else {
        const cloudTime = new Date(cloudRep.savedAt || 0).getTime();
        const localTime = new Date(localRep.savedAt || 0).getTime();

        if (cloudTime > localTime) {
          console.log(`Sync: Cloud Report (newer) to Local: ${rId}`);
          localStorage.setItem(`oneclick_dash_${rId}`, JSON.stringify(cloudRep));
        } else if (localTime > cloudTime) {
          console.log(`Sync: Newer Local Report to Cloud: ${rId}`);
          reportCloudPromises.push(saveReportToFirestore(uid, rId, localRep));
        }
      }
    }

    for (const [rId, localRep] of localReportsMap.entries()) {
      if (!processedReportIds.has(rId)) {
        console.log(`Sync: Local Report to Cloud: ${rId}`);
        reportCloudPromises.push(saveReportToFirestore(uid, rId, localRep));
      }
    }

    await Promise.all(reportCloudPromises);

    // C. Sync User Settings
    if (cloudSettings) {
      console.log("Syncing Cloud user settings...");
      // Apply theme
      const isDarkTheme = cloudSettings.theme !== 'light-theme';
      if (isDarkTheme) {
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
      
      // Save delay preferences
      if (cloudSettings.username) localStorage.setItem('oneclick_username', cloudSettings.username);
      if (cloudSettings.autosaveDelay) localStorage.setItem('oneclick_autosave_delay', cloudSettings.autosaveDelay);
      if (cloudSettings.exportFormat) localStorage.setItem('oneclick_export_format', cloudSettings.exportFormat);
      
      // Update Settings Form views
      if (window.loadAndRenderSettings) window.loadAndRenderSettings();
    } else {
      // Cloud Settings not set: upload local configs
      const currentSettings = {
        theme: document.body.classList.contains('light-theme') ? 'light-theme' : 'dark-theme',
        username: localStorage.getItem('oneclick_username') || 'Nishant S.',
        autosaveDelay: localStorage.getItem('oneclick_autosave_delay') || '5000',
        exportFormat: localStorage.getItem('oneclick_export_format') || 'CSV',
        updatedAt: Date.now()
      };
      await saveSettingsToFirestore(uid, currentSettings);
    }

    console.log("Full sync complete.");
    window.setCloudSyncStatus('synced');

    // Re-render dashboards & lists
    if (window.loadAndRenderProjects) window.loadAndRenderProjects();
    if (window.loadAndRenderDashboard) window.loadAndRenderDashboard();

  }).catch(err => {
    console.error("Full cloud sync pipeline failed:", err);
    window.setCloudSyncStatus('offline');
  });
}
