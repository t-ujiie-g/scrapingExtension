// 機能を有効化チェックボックスの状態を取得して処理を実行
function initializeScrapingTool() {
  chrome.storage.sync.get(['enableScraping'], (result) => {
    if (result.enableScraping) {
      // 既存のポップアップがあれば削除
      const existingPopup = document.getElementById('scraping-tool-popup');
      if (existingPopup) {
        existingPopup.remove();
      }

      // ポップアップのコンテナを作成
      const popupContainer = document.createElement('div');
      popupContainer.id = 'scraping-tool-popup';
      const shadow = popupContainer.attachShadow({ mode: 'open' });

      // Shadow DOM内のスタイルを定義
      const style = document.createElement('style');
      style.textContent = `
        #popupContainer {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 25%;
          padding: 10px;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          background-color: #f0f0f0; /* 明るい背景色 */
          color: #333; /* テキストの色を濃いグレーに */
          z-index: 10000;
          transition: height 0.3s ease; /* スムーズなアニメーション */
        }
        #toggleButton {
          position: absolute;
          top: 0;
          right: 10px;
          margin: 5px;
        }
        #buttonContainer {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          display: flex;
          gap: 10px; /* ボタン間の空間を追加 */
        }
        button {
          background-color: #4a4a4a; /* ボタンの背景色 */
          color: white; /* ボタンのテキスト色 */
          border: none;
          padding: 5px 15px;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        button:disabled {
          background-color: #7a7a7a; /* 非活性ボタンの背景色 */
          cursor: not-allowed;
        }
        button:hover:not(:disabled) {
          background-color: #5a5a5a; /* ホバーボタンの背景色 */
        }
        #tableContainer {
          margin-top: 50px;
          height: calc(100% - 60px);
          overflow-y: auto;
        }
        #selectedElementsTable {
          width: 100%;
          padding-right: 10px;
          border: 1px solid #ccc; /* テーブルの境界色 */
        }
        #selectedElementsTable th, #selectedElementsTable td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ccc; /* テーブルの行境界色 */
        }
        #toast {
          visibility: hidden;
          min-width: 250px;
          margin-left: -125px;
          background-color: #333;
          color: #fff;
          text-align: center;
          border-radius: 2px;
          padding: 16px;
          position: fixed;
          z-index: 10001;
          left: 50%;
          bottom: 30px;
          font-size: 15px;
        }
        #toast.show {
          visibility: visible;
          -webkit-animation: fadein 0.5s, fadeout 0.5s 1.5s;
          animation: fadein 0.5s, fadeout 0.5s 1.5s;
        }
        @-webkit-keyframes fadein {
          from {bottom: 0; opacity: 0;} 
          to {bottom: 30px; opacity: 1;}
        }
        @keyframes fadein {
          from {bottom: 0; opacity: 0;}
          to {bottom: 30px; opacity: 1;}
        }
        @-webkit-keyframes fadeout {
          from {bottom: 30px; opacity: 1;} 
          to {bottom: 0; opacity: 0;}
        }
        @keyframes fadeout {
          from {bottom: 30px; opacity: 1;}
          to {bottom: 0; opacity: 0;}
        }
      `;
      shadow.appendChild(style);

      // ポップアップの内容を追加
      const contentContainer = document.createElement('div');
      contentContainer.id = 'popupContainer';
      contentContainer.innerHTML = `
        <div id="buttonContainer">
          <button id="selectButton">選択モード開始</button>
          <button id="bulkSelectButton" disabled>一括選択</button>
          <button id="scrollUpButton" disabled>↑</button>
          <button id="scrollDownButton" disabled>↓</button>
          <button id="copyButton" disabled>コピー</button>
          <button id="resetButton" disabled>リセット</button>
          <button id="toggleButton">▼</button>
        </div>
        <div id="tableContainer">
          <table id="selectedElementsTable" border="1">
            <thead>
              <tr>
                <th>テキスト</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div id="toast">クリップボードにコピーしました</div>
      `;
      shadow.appendChild(contentContainer);

      // ポップアップをドキュメントに追加
      document.body.appendChild(popupContainer);

      // 展開・非展開の切り替え
      const toggleButton = shadow.querySelector('#toggleButton');
      const popupContainerElement = shadow.querySelector('#popupContainer');
      let isExpanded = true; // 追加: ポップアップの展開状態を管理する変数
      toggleButton.addEventListener('click', () => {
        if (isExpanded) {
          popupContainerElement.style.height = '5%';
          toggleButton.textContent = '▲';
        } else {
          popupContainerElement.style.height = '25%';
          toggleButton.textContent = '▼';
        }
        isExpanded = !isExpanded; // 状態を反転
      });

      // 選択モードの変数
      let selecting = false;
      let selectedElement = null;
      let originalBorder = '';
      const selectedElementsSet = new Set(); // 追加: 選択された要素を追跡するセット
      let scrolling = false; // 追加: スクロール中かどうかを追跡するフラグ
      
      // 選択モードのイベントリスナーを追加
      shadow.querySelector('#selectButton').addEventListener('click', () => {
        selecting = !selecting;
        const selectButton = shadow.querySelector('#selectButton');
        if (selecting) {
          selectButton.textContent = '選択モード解除';
        } else {
          selectButton.textContent = '選択モード開始';
          if (selectedElement) {
            selectedElement.style.border = originalBorder;
            selectedElement = null;
          }
        }
      });
      
      // ホバー時の赤枠表示
      document.addEventListener('mouseover', (event) => {
        if (selecting) {
          if (popupContainer.contains(event.target)) {
            return; // 拡張機能の要素を無視
          }
          if (selectedElement) {
            selectedElement.style.border = originalBorder;
          }
          selectedElement = event.target;
          originalBorder = selectedElement.style.border;
          selectedElement.style.border = '2px solid red';
        }
      });
      
      // クリック時の要素確定
      document.addEventListener('click', (event) => {
        if (selecting) {
          if (popupContainer.contains(event.target)) {
            return; // 拡張機能の要素を無視
          }
          event.preventDefault();
          event.stopPropagation();
          selecting = false;
          shadow.querySelector('#selectButton').textContent = '選択モード開始';
      
          // テーブルに選択された要素を追加
          const tableBody = shadow.querySelector('#selectedElementsTable tbody');
          const newRow = document.createElement('tr');
          const newDataCell = document.createElement('td');
      
          newDataCell.textContent = selectedElement.textContent.trim();
      
          newRow.appendChild(newDataCell);
          tableBody.appendChild(newRow);
      
          // 一括選択ボタンとコピーボタンを有効化
          shadow.querySelector('#bulkSelectButton').disabled = false;
          shadow.querySelector('#copyButton').disabled = false;
      
          // 矢印ボタンを有効化
          shadow.querySelector('#scrollUpButton').disabled = false;
          shadow.querySelector('#scrollDownButton').disabled = false;
      
          // リセットボタンを有効化
          shadow.querySelector('#resetButton').disabled = false;
      
          // 選択された要素をセットに追加
          selectedElementsSet.add(selectedElement);
        }
      }, true);
      
      // 一括選択ボタンのイベントリスナーを追加
      shadow.querySelector('#bulkSelectButton').addEventListener('click', () => {
        if (selectedElementsSet.size === 0) {
          alert('最初に要素を選択してください。');
          return;
        }
      
        const tableBody = shadow.querySelector('#selectedElementsTable tbody');
      
        selectedElementsSet.forEach(selectedElement => {
          const className = selectedElement.className;
          if (!className) {
            alert('選択された要素にはクラス名がありません。');
            return;
          }
      
          const elements = document.getElementsByClassName(className);
      
          for (let element of elements) {
            if (selectedElementsSet.has(element)) {
              continue; // 既に選択されている要素はスキップ
            }
            element.style.border = '2px solid red';
      
            // 新しい行を追加
            const newRow = document.createElement('tr');
            const newDataCell = document.createElement('td');
            newDataCell.textContent = element.textContent.trim();
            newRow.appendChild(newDataCell);
            tableBody.appendChild(newRow);
      
            // 選択された要素をセットに追加
            selectedElementsSet.add(element);
          }
        });
      });
      
      // コピー機能のイベントリスナーを追加
      shadow.querySelector('#copyButton').addEventListener('click', () => {
        const tableBody = shadow.querySelector('#selectedElementsTable tbody');
        const rows = tableBody.querySelectorAll('tr');
        let clipboardText = '';
      
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          const rowText = Array.from(cells).map(cell => cell.textContent).join('\t');
          clipboardText += rowText + '\n';
        });
      
        navigator.clipboard.writeText(clipboardText).then(() => {
          showToast(shadow); // トーストメッセージを表示
        }).catch(err => {
          console.error('クリップボードへのコピーに失敗しました: ', err);
        });
      });
      
      // リセットボタンのイベントリスナーを追加
      shadow.querySelector('#resetButton').addEventListener('click', () => {
        // 赤枠をリセット
        selectedElementsSet.forEach(element => {
          element.style.border = '';
        });
        selectedElementsSet.clear();
      
        // テーブルをリセット
        const tableBody = shadow.querySelector('#selectedElementsTable tbody');
        tableBody.innerHTML = '';
      
        // ボタンの状態をリセット
        shadow.querySelector('#bulkSelectButton').disabled = true;
        shadow.querySelector('#copyButton').disabled = true;
        shadow.querySelector('#scrollUpButton').disabled = true;
        shadow.querySelector('#scrollDownButton').disabled = true;
        shadow.querySelector('#resetButton').disabled = true;
      
        // 選択モードをリセット
        selecting = false;
        shadow.querySelector('#selectButton').textContent = '選択モード開始';
      });
      
      // トーストメッセージを表示する関数
      function showToast(shadow) {
        const toast = shadow.querySelector('#toast');
        toast.className = 'show';
        setTimeout(() => {
          toast.className = toast.className.replace('show', '');
        }, 2000); // 2秒後にトーストメッセージを非表示にする
      }
      
      // スクロールしながら一括選択を行う関数
      function scrollAndBulkSelect(direction) {
        if (scrolling) {
          // スクロールを停止し、ボタンを元の状態に戻す
          scrolling = false;
          shadow.querySelector('#scrollUpButton').disabled = false;
          shadow.querySelector('#scrollDownButton').disabled = false;
          shadow.querySelector('#selectButton').disabled = false;
          shadow.querySelector('#bulkSelectButton').disabled = false;
          shadow.querySelector('#copyButton').disabled = false;
          shadow.querySelector('#resetButton').disabled = false;
          return;
        }
      
        scrolling = true;
        shadow.querySelector('#scrollUpButton').disabled = direction !== 'up';
        shadow.querySelector('#scrollDownButton').disabled = direction !== 'down';
        shadow.querySelector('#selectButton').disabled = true;
        shadow.querySelector('#bulkSelectButton').disabled = true;
        shadow.querySelector('#copyButton').disabled = true;
        shadow.querySelector('#resetButton').disabled = true;
      
        // 事前に該当する要素を取得
        collectElements();
      
        const scrollContainer = findScrollContainer(selectedElement);
      
        function performScroll() {
          if (!scrolling) return;
      
          const scrollAmount = direction === 'up' ? -window.innerHeight / 2 : window.innerHeight / 2;
      
          if (scrollContainer) {
            scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          } else {
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          }
      
          setTimeout(() => {
            collectElements();
            if (scrolling) {
              performScroll();
            } else {
              console.log("Scrolling stopped");
            }
          }, 100); // 0.1秒待ってから次のスクロールを実行
        }
      
        performScroll();
      }
      
      // 要素を収集する関数
      function collectElements() {
        if (!selectedElement) {
          alert('最初に要素を選択してください。');
          return;
        }
      
        const className = selectedElement.className;
        if (!className) {
          alert('選択された要素にはクラス名がありません。');
          return;
        }
      
        const elements = document.getElementsByClassName(className);
        const tableBody = shadow.querySelector('#selectedElementsTable tbody');
      
        for (let element of elements) {
          if (selectedElementsSet.has(element)) {
            continue; // 既に選択されている要素はスキップ
          }
          element.style.border = '2px solid red';
      
          const newRow = document.createElement('tr');
          const newDataCell = document.createElement('td');
          newDataCell.textContent = element.textContent.trim();
          newRow.appendChild(newDataCell);
          tableBody.appendChild(newRow);
      
          // 選択された要素をセットに追加
          selectedElementsSet.add(element);
        }
      }
      
      // スクロールボタンのイベントリスナーを追加
      shadow.querySelector('#scrollUpButton').addEventListener('click', () => {
        scrollAndBulkSelect('up');
      });
      
      shadow.querySelector('#scrollDownButton').addEventListener('click', () => {
        scrollAndBulkSelect('down');
      });
      
      // スクロールコンテナを見つける関数
      function findScrollContainer(element) {
        while (element) {
          if (element.classList && element.classList.contains('c-scrollbar__hider')) {
            return element;
          }
          element = element.parentElement;
        }
        return null;
      }
      } else {
        // ポップアップを非表示にする
        const existingPopup = document.getElementById('scraping-tool-popup');
        if (existingPopup) {
          existingPopup.remove();
        }
      }
      });
      }
      
      // 初期化
      initializeScrapingTool();
      
      // ストレージの変更を監視して即時反映
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes.enableScraping) {
          initializeScrapingTool();
        }
      });
