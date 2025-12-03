let container = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let clipboardInterval = null;
let currentTab = 'clipboard';
let notes = [];
let clipboardSlots = [];

function createFloatingNote() {
  if (container) return container;

  container = document.createElement('div');
  container.id = 'floating-note-container';
  container.innerHTML = `
    <div class="fn-box">
      <div class="fn-header">
        <div class="fn-tabs">
          <button class="fn-tab active" data-tab="clipboard">📋</button>
          <button class="fn-tab fn-add-tab" data-action="add">+</button>
        </div>
        <div class="fn-header-actions">
          <button class="fn-header-btn fn-settings-btn" title="Settings">⚙</button>
          <button class="fn-header-btn fn-close" title="Close">×</button>
        </div>
      </div>
      <div class="fn-body">
        <div class="fn-content" data-content="clipboard">
          <div class="fn-clipboard-toolbar">
            <button class="fn-toolbar-btn fn-add-slot" title="Add Slot">+</button>
            <button class="fn-toolbar-btn fn-remove-slot" title="Remove Slot">−</button>
          </div>
          <div class="fn-clipboard-slots"></div>
        </div>
      </div>
      <div class="fn-footer">
        <span class="fn-char-count">Auto-updating</span>
        <div class="fn-footer-buttons">
          <button class="fn-btn fn-delete hidden">Delete</button>
          <button class="fn-btn fn-copy">Copy</button>
        </div>
      </div>
    </div>
    <div class="fn-settings-panel hidden">
      <div class="fn-settings-header">
        <span>Settings</span>
        <button class="fn-settings-close">×</button>
      </div>
      <div class="fn-settings-body">
        <label class="fn-setting-item">
          <span>Update interval (ms)</span>
          <input type="number" class="fn-setting-input" id="fn-interval" value="1000" min="500" max="5000">
        </label>
        <label class="fn-setting-item">
          <span>Default slots</span>
          <input type="number" class="fn-setting-input" id="fn-default-slots" value="1" min="1" max="10">
        </label>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const header = container.querySelector('.fn-header');
  const tabsContainer = container.querySelector('.fn-tabs');
  const closeBtn = container.querySelector('.fn-close');
  const charCount = container.querySelector('.fn-char-count');
  const deleteBtn = container.querySelector('.fn-delete');
  const copyBtn = container.querySelector('.fn-copy');
  const addSlotBtn = container.querySelector('.fn-add-slot');
  const removeSlotBtn = container.querySelector('.fn-remove-slot');
  const slotsContainer = container.querySelector('.fn-clipboard-slots');
  const body = container.querySelector('.fn-body');
  const addTabBtn = container.querySelector('.fn-add-tab');
  const settingsBtn = container.querySelector('.fn-settings-btn');
  const settingsPanel = container.querySelector('.fn-settings-panel');
  const settingsClose = container.querySelector('.fn-settings-close');

  // Initialize clipboard slots
  function initSlots(count = 1) {
    slotsContainer.innerHTML = '';
    clipboardSlots = [];
    for (let i = 0; i < count; i++) {
      addSlot();
    }
  }

  function addSlot() {
    const slotId = clipboardSlots.length + 1;
    const slot = document.createElement('div');
    slot.className = 'fn-clipboard-slot';
    slot.dataset.slot = slotId;
    slot.innerHTML = `
      <div class="fn-slot-header">
        <span class="fn-slot-label">SLOT ${slotId}</span>
        <div class="fn-slot-actions">
          <button class="fn-slot-expand" title="Expand/Collapse">▼</button>
          <button class="fn-slot-lock" title="Lock/Unlock">🔓</button>
          <button class="fn-slot-copy" title="Copy">📋</button>
        </div>
      </div>
      <pre class="fn-slot-content">(Empty)</pre>
    `;
    slotsContainer.appendChild(slot);
    clipboardSlots.push({ id: slotId, content: '', locked: false, expanded: false });

    // Expand button for individual slot
    slot.querySelector('.fn-slot-expand').addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(slot.dataset.slot) - 1;
      clipboardSlots[index].expanded = !clipboardSlots[index].expanded;
      const btn = slot.querySelector('.fn-slot-expand');
      btn.textContent = clipboardSlots[index].expanded ? '▲' : '▼';
      slot.classList.toggle('expanded', clipboardSlots[index].expanded);
    });

    // Lock button
    slot.querySelector('.fn-slot-lock').addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(slot.dataset.slot) - 1;
      clipboardSlots[index].locked = !clipboardSlots[index].locked;
      const btn = slot.querySelector('.fn-slot-lock');
      btn.textContent = clipboardSlots[index].locked ? '🔒' : '🔓';
      slot.classList.toggle('locked', clipboardSlots[index].locked);
    });

    // Copy button for individual slot
    slot.querySelector('.fn-slot-copy').addEventListener('click', async (e) => {
      e.stopPropagation();
      const content = slot.querySelector('.fn-slot-content').textContent;
      if (content && content !== '(Empty)') {
        await navigator.clipboard.writeText(content);
        const btn = slot.querySelector('.fn-slot-copy');
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = '📋', 1000);
      }
    });
  }

  function removeSlot() {
    if (clipboardSlots.length > 1) {
      clipboardSlots.pop();
      slotsContainer.lastElementChild?.remove();
    }
  }

  // Load saved data
  chrome.storage.local.get(['floatingNotes', 'floatingNotePos', 'floatingNoteSlots'], (data) => {
    if (data.floatingNotePos) {
      container.style.top = data.floatingNotePos.top;
      container.style.right = 'auto';
      container.style.left = data.floatingNotePos.left;
    }
    initSlots(data.floatingNoteSlots || 1);
    if (data.floatingNotes && data.floatingNotes.length > 0) {
      data.floatingNotes.forEach(note => {
        createNoteTab(note.id, note.name, note.content);
      });
    }
    updateFooter();
  });

  // Add/Remove slot buttons
  addSlotBtn.addEventListener('click', () => {
    addSlot();
    chrome.storage.local.set({ floatingNoteSlots: clipboardSlots.length });
  });

  removeSlotBtn.addEventListener('click', () => {
    removeSlot();
    chrome.storage.local.set({ floatingNoteSlots: clipboardSlots.length });
  });

  // Settings
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  settingsClose.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });

  function getNextNoteNumber() {
    if (notes.length === 0) return 1;
    const maxId = Math.max(...notes.map(n => n.id));
    return maxId + 1;
  }

  function createNoteTab(id, name, content = '') {
    const noteId = id || getNextNoteNumber();
    const noteName = name || `Note ${noteId}`;

    const tab = document.createElement('button');
    tab.className = 'fn-tab';
    tab.dataset.tab = `note-${noteId}`;
    tab.innerHTML = `<span class="fn-tab-name">${noteName}</span>`;
    tabsContainer.insertBefore(tab, addTabBtn);

    const content_div = document.createElement('div');
    content_div.className = 'fn-content hidden';
    content_div.dataset.content = `note-${noteId}`;
    content_div.innerHTML = `<textarea placeholder="Write your note here...">${content}</textarea>`;
    body.appendChild(content_div);

    const textarea = content_div.querySelector('textarea');
    textarea.addEventListener('input', () => {
      saveNotes();
      updateFooter();
    });

    notes.push({ id: noteId, name: noteName, content: content });
    saveNotes();
    switchTab(`note-${noteId}`);

    return noteId;
  }

  function saveNotes() {
    const updatedNotes = notes.map(note => {
      const content_div = body.querySelector(`[data-content="note-${note.id}"]`);
      const textarea = content_div?.querySelector('textarea');
      return {
        id: note.id,
        name: note.name,
        content: textarea ? textarea.value : note.content
      };
    });
    notes = updatedNotes;
    chrome.storage.local.set({ floatingNotes: notes });
  }

  function deleteCurrentNote() {
    if (!currentTab.startsWith('note-')) return;

    const noteId = parseInt(currentTab.replace('note-', ''));
    const tab = tabsContainer.querySelector(`[data-tab="${currentTab}"]`);
    const content_div = body.querySelector(`[data-content="${currentTab}"]`);

    if (tab) tab.remove();
    if (content_div) content_div.remove();

    notes = notes.filter(n => n.id !== noteId);
    saveNotes();

    if (notes.length > 0) {
      const lastNote = notes[notes.length - 1];
      switchTab(`note-${lastNote.id}`);
    } else {
      switchTab('clipboard');
    }
  }

  function switchTab(tabName) {
    currentTab = tabName;

    tabsContainer.querySelectorAll('.fn-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });

    body.querySelectorAll('.fn-content').forEach(c => {
      c.classList.toggle('hidden', c.dataset.content !== tabName);
    });

    updateFooter();

    if (tabName.startsWith('note-')) {
      const content_div = body.querySelector(`[data-content="${tabName}"]`);
      const textarea = content_div?.querySelector('textarea');
      if (textarea) textarea.focus();
    }
  }

  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.fn-tab');
    if (!tab) return;

    e.stopPropagation();

    if (tab.dataset.action === 'add') {
      createNoteTab();
    } else if (tab.dataset.tab) {
      switchTab(tab.dataset.tab);
    }
  });

  function updateFooter() {
    if (currentTab.startsWith('note-')) {
      const content_div = body.querySelector(`[data-content="${currentTab}"]`);
      const textarea = content_div?.querySelector('textarea');
      charCount.textContent = textarea ? textarea.value.length + ' characters' : '0 characters';
      deleteBtn.classList.remove('hidden');
    } else {
      charCount.textContent = 'Auto-updating';
      deleteBtn.classList.add('hidden');
    }
  }

  deleteBtn.addEventListener('click', () => {
    deleteCurrentNote();
  });

  copyBtn.addEventListener('click', async () => {
    let textToCopy = '';
    if (currentTab === 'clipboard') {
      const firstSlot = slotsContainer.querySelector('.fn-slot-content');
      textToCopy = firstSlot ? firstSlot.textContent : '';
    } else {
      const content_div = body.querySelector(`[data-content="${currentTab}"]`);
      const textarea = content_div?.querySelector('textarea');
      textToCopy = textarea ? textarea.value : '';
    }

    if (textToCopy && textToCopy !== '(Empty)') {
      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 1000);
      } catch (err) {
        console.error('Copy error:', err);
      }
    }
  });

  closeBtn.addEventListener('click', () => {
    container.classList.remove('visible');
    stopClipboardWatch();
  });

  // Drag functionality
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.fn-tab') || e.target.closest('.fn-header-btn')) return;
    isDragging = true;
    const rect = container.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    container.style.left = x + 'px';
    container.style.top = y + 'px';
    container.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      chrome.storage.local.set({
        floatingNotePos: {
          top: container.style.top,
          left: container.style.left
        }
      });
    }
  });

  // Clipboard watching
  let lastClipboard = '';

  async function readClipboard() {
    try {
      const text = await navigator.clipboard.readText();

      // If clipboard changed, update first unlocked slot
      if (text && text !== lastClipboard) {
        lastClipboard = text;

        // Find first unlocked slot and update it
        const slots = slotsContainer.querySelectorAll('.fn-clipboard-slot');
        for (let i = 0; i < slots.length; i++) {
          if (!clipboardSlots[i]?.locked) {
            const content = slots[i].querySelector('.fn-slot-content');
            content.textContent = text;
            clipboardSlots[i].content = text;
            break;
          }
        }
      }

    } catch (err) {
      const firstSlot = slotsContainer.querySelector('.fn-slot-content');
      if (firstSlot && !clipboardSlots[0]?.locked) {
        firstSlot.textContent = '(Click page to access clipboard)';
      }
    }
  }

  function startClipboardWatch() {
    readClipboard();
    clipboardInterval = setInterval(readClipboard, 1000);
  }

  function stopClipboardWatch() {
    if (clipboardInterval) {
      clearInterval(clipboardInterval);
      clipboardInterval = null;
    }
  }

  startClipboardWatch();

  return container;
}

function toggleFloatingNote() {
  const note = createFloatingNote();
  note.classList.toggle('visible');
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'toggle') {
    toggleFloatingNote();
  }
});
