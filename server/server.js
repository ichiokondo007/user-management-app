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
  console.log('📁 Storage directory created:', storageDir);
}

console.log(`🚀 Automerge server starting on ws://localhost:${PORT}`);

// WebSocketサーバーを作成
const wss = new WebSocketServer({ port: PORT });

// WebSocket接続ログ
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  
  ws.on('message', (message) => {
    console.log('📥 Received message:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error);
  });
});

// サーバー側のAutomerge Repoを作成
const repo = new Repo({
  network: [new NodeWSServerAdapter(wss)],
  storage: new NodeFSStorageAdapter(storageDir),
  peerId: 'automerge-server',
  sharePolicy: async () => true,
});

// ユーザー別ドキュメント管理
const userDocuments = new Map();

// WebSocket接続時の処理
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('🔍 Parsed JSON message:', data);
      
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
        
        // ドキュメントIDを返送
        ws.send(JSON.stringify({
          type: 'DOCUMENT_ID',
          userId: data.userId,
          documentId: docId
        }));
      }
      
      // Automerge join メッセージ
      if (data.type === 'join' && data.senderId && data.peerMetadata) {
        console.log('🔌 Automerge client connected:', data.senderId);
      }
    } catch (e) {
      // Automergeプロトコルメッセージは無視
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error);
  });
});

// ドキュメント作成時の処理
repo.on("document", ({ handle }) => {
  console.log(`📄 Document loaded or created: ${handle.documentId}`);
  handle.on("change", ({ doc }) => {
    console.log("📝 Document changed:", doc);
  });
});

console.log(`✅ Automerge server running on ws://localhost:${PORT}`);
console.log(`📁 Storage: ${storageDir}`);
