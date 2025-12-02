# Floating Note

A Chrome extension that provides a floating notepad with real-time clipboard monitoring. Keep notes and track your clipboard content on any webpage.

## Features

### Clipboard Monitoring
- **Real-time clipboard tracking**: Automatically monitors and displays your clipboard content, updating every second
- **Live preview**: See what's currently in your clipboard without needing to paste anywhere
- **Auto-refresh indicator**: Shows "Otomatik güncelleniyor" (Auto-updating) when viewing clipboard

### Multiple Notes Support
- **Tabbed interface**: Create and manage multiple notes with a clean tab system
- **Add new notes**: Click the "+" button to create a new note tab instantly
- **Auto-naming**: Notes are automatically named "Not 1", "Not 2", etc.
- **Switch between notes**: Click any tab to switch between your clipboard view and notes

### Persistent Storage
- **Notes are saved automatically**: All your notes persist across browser sessions using Chrome's local storage
- **Position memory**: The floating window remembers its position on the screen
- **Content preservation**: Note content is saved as you type

### Draggable Window
- **Freely movable**: Drag the header to reposition the floating note anywhere on the screen
- **Position persistence**: Your preferred position is saved and restored

### Copy & Delete Functions
- **One-click copy**: Copy the current tab's content (clipboard or note) to clipboard with visual feedback
- **Delete notes**: Remove unwanted notes with the delete button (only visible for note tabs)
- **Copy confirmation**: Shows "Kopyalandı!" (Copied!) feedback after successful copy

### Character Counter
- **Real-time character count**: Displays character count for note tabs
- **Status indicator**: Shows different status for clipboard vs note views

### Modern UI Design
- **Dark glassmorphism theme**: Semi-transparent dark background with blur effect
- **Smooth animations**: Hover effects and transitions for a polished feel
- **High z-index**: Always stays on top of page content
- **Responsive tabs**: Tab names are truncated with ellipsis if too long
- **Monospace font**: Uses Consolas/Monaco for better text readability

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your toolbar

## Usage

1. **Toggle the floating note**: Click the extension icon in the Chrome toolbar
2. **View clipboard**: The default tab (📋) shows your current clipboard content
3. **Create a note**: Click the "+" button to add a new note tab
4. **Write notes**: Click on a note tab and start typing
5. **Move the window**: Drag the header bar to reposition
6. **Copy content**: Click "Kopyala" to copy the current view's content
7. **Delete a note**: Switch to a note tab and click "Sil" to remove it
8. **Close**: Click the "×" button to hide the floating note

## Permissions

- **storage**: To save notes and window position
- **clipboardRead**: To monitor clipboard content

## File Structure

```
├── manifest.json      # Extension configuration (Manifest V3)
├── background.js      # Service worker for handling toolbar clicks
├── content.js         # Main logic for the floating note UI
├── styles.css         # Styling for the floating note interface
└── README.md          # This file
```

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Clipboard polling**: Updates every 1000ms (1 second)
- **Storage API**: Uses `chrome.storage.local` for persistence
- **Content Script**: Injects into all URLs (`<all_urls>`)

## Language

The interface is in Turkish:
- "Kopyala" = Copy
- "Kopyalandı!" = Copied!
- "Sil" = Delete
- "karakter" = characters
- "Otomatik güncelleniyor" = Auto-updating
- "Notunuzu buraya yazın..." = Write your note here...
- "Clipboard boş" = Clipboard empty

## License

MIT License
