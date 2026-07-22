// OneClick v3 — Global Workspace Search & Command Palette (Ctrl+K)

(function() {
  // Inject Command Palette Styles
  if (!document.getElementById('oneclick-command-palette-styles')) {
    const styles = document.createElement('style');
    styles.id = 'oneclick-command-palette-styles';
    styles.innerHTML = `
      .cmd-palette-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 15, 23, 0.65);
        backdrop-filter: blur(8px);
        z-index: 99999;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-top: 15vh;
        animation: paletteFadeIn 0.15s ease-out;
      }
      .cmd-palette-modal {
        background: #181825;
        border: 1px solid #313244;
        border-radius: 14px;
        width: 600px;
        max-width: 90%;
        box-shadow: 0 24px 60px rgba(0,0,0,0.65);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        color: #cdd6f4;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        animation: paletteSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .cmd-palette-input-wrapper {
        display: flex;
        align-items: center;
        border-bottom: 1px solid #313244;
        padding: 16px 20px;
        background: #11111b;
      }
      .cmd-palette-icon {
        font-size: 20px;
        margin-right: 14px;
        color: #a6adc8;
        display: flex;
        align-items: center;
      }
      .cmd-palette-input {
        background: transparent;
        border: none;
        outline: none;
        color: #cdd6f4;
        font-size: 16px;
        flex: 1;
        font-family: inherit;
      }
      .cmd-palette-list {
        max-height: 350px;
        overflow-y: auto;
        padding: 10px;
      }
      .cmd-palette-item {
        display: flex;
        align-items: center;
        padding: 11px 15px;
        border-radius: 8px;
        cursor: pointer;
        user-select: none;
        transition: background 0.1s ease, color 0.1s ease;
        margin-bottom: 2px;
      }
      .cmd-palette-item:hover, .cmd-palette-item.active {
        background: #313244;
        color: #f5c2e7;
      }
      .cmd-palette-item-icon {
        margin-right: 14px;
        font-size: 18px;
        display: flex;
        align-items: center;
      }
      .cmd-palette-item-text {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
      }
      .cmd-palette-shortcut {
        font-size: 11px;
        background: #1e1e2e;
        color: #bac2de;
        padding: 3px 7px;
        border-radius: 5px;
        font-family: monospace;
        border: 1px solid #45475a;
      }
      .cmd-palette-empty {
        padding: 24px;
        text-align: center;
        color: #9399b2;
        font-size: 14px;
      }
      
      @keyframes paletteFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes paletteSlideDown {
        from { transform: translateY(-20px) scale(0.97); }
        to { transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(styles);
  }

  // Palette Commands Setup
  const paletteCommands = [
    {
      icon: '📊',
      text: 'Switch to Dashboard Canvas View',
      shortcut: 'Ctrl+D',
      action: () => {
        if (window.switchToDashboardView) window.switchToDashboardView();
      }
    },
    {
      icon: '🧮',
      text: 'Switch to Spreadsheet View',
      shortcut: 'Ctrl+S',
      action: () => {
        if (window.switchToSheetView) window.switchToSheetView();
      }
    },
    {
      icon: '🔍',
      text: 'Run Data Quality Scan & Preprocessing',
      shortcut: 'Alt+Q',
      action: () => {
        const btn = document.getElementById('ws-btn-analyze');
        if (btn) btn.click();
      }
    },
    {
      icon: '💾',
      text: 'Save Current Workspace to IndexedDB',
      shortcut: 'Ctrl+Shift+S',
      action: () => {
        const btn = document.getElementById('ws-btn-save');
        if (btn) btn.click();
      }
    },
    {
      icon: '📤',
      text: 'Export Dataset to CSV (Download)',
      shortcut: '',
      action: () => {
        const btn = document.getElementById('ws-btn-export');
        if (btn) btn.click();
      }
    },
    {
      icon: '🤖',
      text: 'Ask AI Analyst Universal Intelligence',
      shortcut: '',
      action: () => {
        const btn = document.getElementById('floating-copilot-btn');
        if (btn) btn.click();
      }
    },
    {
      icon: '🌓',
      text: 'Toggle Dark / Light Theme Mode',
      shortcut: '',
      action: () => {
        const themeBtn = document.getElementById('theme-toggle-btn') || document.querySelector('.theme-toggle');
        if (themeBtn) themeBtn.click();
      }
    },
    {
      icon: '🧹',
      text: 'Clear All Grid Filters & Reset Sorts',
      shortcut: '',
      action: () => {
        const clearBtn = document.getElementById('tb-clear-filters');
        if (clearBtn) clearBtn.click();
        const resetBtn = document.getElementById('tb-reset-sort');
        if (resetBtn) resetBtn.click();
      }
    },
    {
      icon: '⚙️',
      text: 'Reset Database and Storage Settings',
      shortcut: '',
      action: () => {
        const resetDbBtn = document.getElementById('btn-reset-db');
        if (resetDbBtn) resetDbBtn.click();
      }
    }
  ];

  let currentBackdrop = null;
  let activeIndex = 0;
  let filteredCommands = [];

  function openCommandPalette() {
    if (currentBackdrop) {
      closeCommandPalette();
      return;
    }

    filteredCommands = [...paletteCommands];
    activeIndex = 0;

    // Create Elements
    const backdrop = document.createElement('div');
    backdrop.className = 'cmd-palette-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'cmd-palette-modal';
    
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'cmd-palette-input-wrapper';
    
    const searchIcon = document.createElement('span');
    searchIcon.className = 'cmd-palette-icon';
    searchIcon.innerHTML = '🔍';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search commands or view options...';
    input.className = 'cmd-palette-input';
    
    const list = document.createElement('div');
    list.className = 'cmd-palette-list';

    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(input);
    modal.appendChild(inputWrapper);
    modal.appendChild(list);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    currentBackdrop = backdrop;

    // Initial render
    renderList(list);

    // Focus input
    setTimeout(() => input.focus(), 50);

    // Event Binds
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeCommandPalette();
    });

    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (q === "") {
        filteredCommands = [...paletteCommands];
      } else {
        filteredCommands = paletteCommands.filter(cmd => 
          cmd.text.toLowerCase().includes(q)
        );
      }
      activeIndex = 0;
      renderList(list);
    });

    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCommandPalette();
        e.stopPropagation();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % filteredCommands.length;
        renderList(list);
        scrollToActive(list);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + filteredCommands.length) % filteredCommands.length;
        renderList(list);
        scrollToActive(list);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[activeIndex]) {
          filteredCommands[activeIndex].action();
        }
        closeCommandPalette();
      }
    });
  }

  function closeCommandPalette() {
    if (currentBackdrop) {
      currentBackdrop.remove();
      currentBackdrop = null;
    }
  }

  function renderList(listContainer) {
    listContainer.innerHTML = "";
    if (filteredCommands.length === 0) {
      listContainer.innerHTML = '<div class="cmd-palette-empty">No matching commands found</div>';
      return;
    }

    filteredCommands.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `cmd-palette-item ${idx === activeIndex ? 'active' : ''}`;
      
      const icon = document.createElement('span');
      icon.className = 'cmd-palette-item-icon';
      icon.innerText = cmd.icon;
      
      const text = document.createElement('span');
      text.className = 'cmd-palette-item-text';
      text.innerText = cmd.text;
      
      item.appendChild(icon);
      item.appendChild(text);

      if (cmd.shortcut) {
        const shortcut = document.createElement('span');
        shortcut.className = 'cmd-palette-shortcut';
        shortcut.innerText = cmd.shortcut;
        item.appendChild(shortcut);
      }

      item.addEventListener('click', () => {
        cmd.action();
        closeCommandPalette();
      });

      listContainer.appendChild(item);
    });
  }

  function scrollToActive(listContainer) {
    const activeEl = listContainer.querySelector('.cmd-palette-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  // Hook global keys
  document.addEventListener('keydown', (e) => {
    // Ctrl + K palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
    
    // Quick triggers for palette shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (window.switchToDashboardView) window.switchToDashboardView();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !e.shiftKey) {
      e.preventDefault();
      if (window.switchToSheetView) window.switchToSheetView();
    }
    if (e.altKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      const btn = document.getElementById('ws-btn-analyze');
      if (btn) btn.click();
    }
  });

  // Export search helper
  window.openCommandPalette = openCommandPalette;
})();
