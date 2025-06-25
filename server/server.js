import { WebSocketServer } from 'ws';
import { NodeWSServerAdapter } from '@automerge/automerge-repo-network-websocket';
import { Repo } from '@automerge/automerge-repo';
import { NodeFSStorageAdapter } from '@automerge/automerge-repo-storage-nodefs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3031;
// ストレージディレクトリ
const storageDir = path.join(__dirname, 'automerge-storage');
// ストレージディレクトリが存在しない場合は作成
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
  console.log('Storage directory created:', storageDir);
}
console.log(`Automerge server starting on ws://localhost:${PORT}`);

// WebSocketサーバーを作成
const wss = new WebSocketServer({ port: PORT });
// サーバー側のAutomerge Repoを作成
const repo = new Repo({
  network: [new NodeWSServerAdapter(wss)],
  storage: new NodeFSStorageAdapter(storageDir),
  peerId: 'automerge-server',
  sharePolicy: async () => true,
});

// ユーザー別ドキュメント管理
const userDocuments = new Map();
// ドキュメントごとの編集者管理（docId → Set editorNames）
const documentEditors = new Map();

// 編集状況を表示する関数
function displayEditingStatus() {
  console.log('\n ===== 現在の編集状況 =====');
  userDocuments.forEach((docId, userId) => {
    const editors = documentEditors.get(docId) || new Set();
    const editorsList = editors.size > 0 ? Array.from(editors).join(', ') : '(なし)';
    console.log(`ユーザ${userId}: docId[${docId.slice(0, 8)}...], 編集者[${editorsList}]`);
  });
  console.log('================================\n');
}

// WebSocket接続時の処理
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Parsed JSON message:', data);
      // userId用のドキュメント作成または取得
      if (data.type === 'GET_DOCUMENT' && data.userId) {
        let docId = userDocuments.get(data.userId);
        if (!docId) {
          // 新しいドキュメントを作成
          const handle = repo.create({
            name: `ユーザ${data.userId}`,
            address: `address${data.userId}`,
            memo: `memo${data.userId}`,
          });
          docId = handle.documentId;
          userDocuments.set(data.userId, docId);
          console.log(`Created new document for ユーザ${data.userId}: ${docId}`);
        } else {
          console.log(`Using document for ユーザ${data.userId}: ${docId}`);
        }
        // 編集者を追加
        if (data.editorName) {
          if (!documentEditors.has(docId)) {
            documentEditors.set(docId, new Set());
          }
          documentEditors.get(docId).add(data.editorName);
          console.log(`編集者追加: ${data.editorName} がユーザ${data.userId}を編集開始`);
          displayEditingStatus();
        }
        // ドキュメントIDを返送
        ws.send(JSON.stringify({
          type: 'DOCUMENT_ID',
          userId: data.userId,
          documentId: docId
        }));
      }
    } catch (e) {
      // Automergeプロトコルメッセージは無視
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  ws.on('error', (error) => {
    console.log('WebSocket error:', error);
  });
});
// ドキュメント作成時の処理
repo.on("document", ({ handle }) => {
  console.log(`Document loaded or created: ${handle.documentId}`);
  handle.on("change", ({ doc }) => {
    console.log("Document changed:", doc);
  });
});

console.log(`Automerge server running on ws://localhost:${PORT}`);
console.log(`Storage: ${storageDir}`);
