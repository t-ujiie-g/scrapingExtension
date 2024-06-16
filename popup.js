document.addEventListener('DOMContentLoaded', () => {
    // チェックボックスの初期状態を設定
    chrome.storage.sync.get(['enableScraping'], (result) => {
      document.getElementById('enableScraping').checked = result.enableScraping || false;
    });
  
    // チェックボックスの状態が変わったときに保存
    document.getElementById('enableScraping').addEventListener('change', (event) => {
      const isEnabled = event.target.checked;
      chrome.storage.sync.set({ enableScraping: isEnabled });
    });
  });
  