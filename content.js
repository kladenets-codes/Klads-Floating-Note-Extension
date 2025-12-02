let container = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let clipboardInterval = null;
let currentTab = 'clipboard';
let notes = [];

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
        <button class="fn-close">×</button>
      </div>
      <div class="fn-body">
        <div class="fn-content" data-content="clipboard">
          <div class="fn-clipboard-display"></div>
        </div>
      </div>
      <div class="fn-footer">
        <span class="fn-char-count">Otomatik güncelleniyor</span>
        <div class="fn-footer-buttons">
          <button class="fn-btn fn-delete hidden">Sil</button>
          <button class="fn-btn fn-copy">Kopyala</button>
        </div>
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
  const body = container.querySelector('.fn-body');
  const clipboardDisplay = container.querySelector('.fn-clipboard-display');
  const addTabBtn = container.querySelector('.fn-add-tab');

  // Load saved data
  chrome.storage.local.get(['floatingNotes', 'floatingNotePos'], (data) => {
    if (data.floatingNotePos) {
      container.style.top = data.floatingNotePos.top;
      container.style.right = 'auto';
      container.style.left = data.floatingNotePos.left;
    }
    if (data.floatingNotes && data.floatingNotes.length > 0) {
      data.floatingNotes.forEach(note => {
        createNoteTab(note.id, note.name, note.content);
      });
    }
    updateFooter();
  });

  function getNextNoteNumber() {
    if (notes.length === 0) return 1;
    const maxId = Math.max(...notes.map(n => n.id));
    return maxId + 1;
  }

  function createNoteTab(id, name, content = '') {
    const noteId = id || getNextNoteNumber();
    const noteName = name || `Not ${noteId}`;

    // Create tab
    const tab = document.createElement('button');
    tab.className = 'fn-tab';
    tab.dataset.tab = `note-${noteId}`;
    tab.innerHTML = `<span class="fn-tab-name">${noteName}</span>`;
    tabsContainer.insertBefore(tab, addTabBtn);

    // Create content
    const content_div = document.createElement('div');
    content_div.className = 'fn-content hidden';
    content_div.dataset.content = `note-${noteId}`;
    content_div.innerHTML = `<textarea placeholder="Notunuzu buraya yazın...">${content}</textarea>`;
    body.appendChild(content_div);

    const textarea = content_div.querySelector('textarea');
    textarea.addEventListener('input', () => {
      saveNotes();
      updateFooter();
    });

    // Add to notes array
    notes.push({ id: noteId, name: noteName, content: content });
    saveNotes();

    // Switch to the new tab
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

    // Switch to the last note tab, or clipboard if no notes left
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

  // Tab click handler
  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.fn-tab');
    if (!tab) return;

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
      charCount.textContent = textarea ? textarea.value.length + ' karakter' : '0 karakter';
      deleteBtn.classList.remove('hidden');
    } else {
      charCount.textContent = 'Otomatik güncelleniyor';
      deleteBtn.classList.add('hidden');
    }
  }

  // Delete button
  deleteBtn.addEventListener('click', () => {
    deleteCurrentNote();
  });

  // Copy button
  copyBtn.addEventListener('click', async () => {
    let textToCopy = '';
    if (currentTab === 'clipboard') {
      textToCopy = clipboardDisplay.textContent;
    } else {
      const content_div = body.querySelector(`[data-content="${currentTab}"]`);
      const textarea = content_div?.querySelector('textarea');
      textToCopy = textarea ? textarea.value : '';
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Kopyalandı!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1000);
    } catch (err) {
      console.error('Kopyalama hatası:', err);
    }
  });

  // Close button
  closeBtn.addEventListener('click', () => {
    container.classList.remove('visible');
    stopClipboardWatch();
  });

  // Drag functionality
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.fn-tab') || e.target === closeBtn) return;
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
  async function readClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      clipboardDisplay.textContent = text || '(Clipboard boş)';
    } catch (err) {
      clipboardDisplay.textContent = '(Clipboard erişimi için sayfaya tıklayın)';
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

// Listen for toggle message from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'toggle') {
    toggleFloatingNote();
  }
});
