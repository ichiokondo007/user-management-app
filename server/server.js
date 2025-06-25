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

// 編集者管理（ユーザーID → 編集者のSet）
const activeEditors = new Map();

// WebSocket接続と編集者情報の管理
const connectionInfo = new Map();

// Automerge状況を表示する関数
function displayAutomergeStatus() {
  console.log('\n📊 ===== 現在のAutomerge状況 =====');
  userDocuments.forEach((docId, userId) => {
    const editors = activeEditors.get(userId) || new Set();
    const editorsList = editors.size > 0 ? Array.from(editors).join(', ') : '(なし)';
    console.log(`ユーザ${userId}: 編集者[${editorsList}], docId: ${docId.slice(0, 8)}...`);
  });
  console.log('================================\n');
}

// WebSocket接続時の処理
wss.on('connection', (ws) => {
  let isTemporaryConnection = true; // 一時的な接続かどうかのフラグ
  
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
      
      // 編集者情報を受信（Automerge join メッセージから）
      if (data.type === 'join' && data.senderId && data.peerMetadata) {
        isTemporaryConnection = false; // Automerge接続は永続的
        console.log('🔌 Automerge client connected:', data.senderId);
      }
      
      // 編集者とユーザーIDの関連付け
      if (data.type === 'EDITOR_INFO') {
        console.log('EDITOR_INFO received:', data);
        
        if (data.editorId && data.userId) {
          isTemporaryConnection = false; // 編集者情報を持つ接続は永続的
          
          connectionInfo.set(ws, { 
            editorId: data.editorId, 
            userId: data.userId,
            joinTime: new Date() 
          });
          
          // 編集者をアクティブリストに追加
          if (!activeEditors.has(data.userId)) {
            activeEditors.set(data.userId, new Set());
          }
          activeEditors.get(data.userId).add(data.editorId);
          
          console.log(`\n👤 接続: 編集者ID: ${data.editorId}, ユーザID: ${data.userId} を編集`);
          displayAutomergeStatus();
        } else {
          console.log('❌ EDITOR_INFO missing editorId or userId:', data);
        }
      }
    } catch (e) {
      // Automergeプロトコルメッセージは無視
    }
  });
  
  ws.on('close', () => {
    const info = connectionInfo.get(ws);
    if (info && info.editorId && info.userId) {
      // 編集者をアクティブリストから削除
      const editors = activeEditors.get(info.userId);
      if (editors) {
        editors.delete(info.editorId);
        if (editors.size === 0) {
          activeEditors.delete(info.userId);
        }
      }
      
      console.log(`\n👤 切断: 編集者ID: ${info.editorId}, ユーザID: ${info.userId} disconnect`);
      displayAutomergeStatus();
    } else if (!isTemporaryConnection) {
      console.log('🔌 WebSocket client disconnected');
    }
    // 一時的な接続の場合はログを出さない
    
    connectionInfo.delete(ws);
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
