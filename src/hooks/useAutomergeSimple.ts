import { useState, useEffect } from 'react';
import { Repo } from '@automerge/automerge-repo';
import { BrowserWebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket';
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';

interface UserDocument {
  name?: string;
  address?: string;
  memo?: string;
}

interface UseAutomergeSimpleReturn {
  formData: UserDocument;
  isReady: boolean;
  updateField: (field: keyof UserDocument, value: string) => void;
  documentId: string;
}

export function useAutomergeSimple(
  userId: string, 
  editorName: string,
  sharedDocId?: string
): UseAutomergeSimpleReturn {
  const [formData, setFormData] = useState<UserDocument>({
    name: '',
    address: '',
    memo: '',
  });
  const [isReady, setIsReady] = useState(false);
  const [docHandle, setDocHandle] = useState<any>(null);
  const [documentId, setDocumentId] = useState('');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!editorName || !userId || userId === 'new') {
      return;
    }

    async function initRepo() {
      console.log('🚀 Connecting to server...');
      
      // Automerge Repoを初期化
      const network = new BrowserWebSocketClientAdapter('ws://localhost:3031');
      
      // ネットワーク接続状況を監視
      network.on('ready', () => {
        console.log('🌐 Network ready');
      });
      
      network.on('peer-connected', (peerId) => {
        console.log('🌐 Peer connected:', peerId);
      });
      
      network.on('peer-disconnected', (peerId) => {
        console.log('🌐 Peer disconnected:', peerId);
      });
      
      const repo = new Repo({
        network: [network],
        storage: new IndexedDBStorageAdapter('user-app-db'),
        peerId: editorName,
      });
      
      console.log('🌐 Repo initialized with peerId:', editorName);

      // 一時的なWebSocket経由でサーバーからdocumentIDを取得
      const tempWs = new WebSocket('ws://localhost:3031');
      
      const documentId = await new Promise<string>((resolve) => {
        tempWs.onopen = () => {
          // まずドキュメントIDを要求
          tempWs.send(JSON.stringify({ type: 'GET_DOCUMENT', userId: userId }));
        };
        
        tempWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'DOCUMENT_ID' && data.userId === userId) {
              resolve(data.documentId);
              tempWs.close();
            }
          } catch (e) {}
        };
      });
      
      const handle = await repo.find(documentId);
      
      // 少し待ってから編集者情報を送信（WebSocket接続確立を待つ）
      setTimeout(() => {
        const ws = (network as any).adapter?.socket;
        console.log('📡 Sending EDITOR_INFO - WebSocket state:', ws?.readyState);
        if (ws && ws.readyState === WebSocket.OPEN) {
          const editorInfo = { 
            type: 'EDITOR_INFO', 
            editorId: editorName, 
            userId: userId 
          };
          console.log('📤 Sending EDITOR_INFO:', editorInfo);
          ws.send(JSON.stringify(editorInfo));
        } else {
          console.log('❌ WebSocket not ready for EDITOR_INFO');
        }
      }, 1000); // 1秒待機
      
      setDocHandle(handle);
      setDocumentId(handle.documentId);
      console.log('📄 Final documentId set:', handle.documentId);
      
      // ドキュメントの読取
      const doc = await handle.doc();
      console.log('📄 初期ドキュメント:', doc);
      
      if (doc) {
        setFormData({
          name: doc.name || '',
          address: doc.address || '',
          memo: doc.memo || '',
        });
      }
      
      // 変更と通知
      handle.on('change', ({ doc, patches }) => {
        console.log('📨 変更を受信 - ドキュメント:', doc);
        console.log('📨 変更を受信 - パッチ:', patches);
        
        setFormData({
          name: doc.name || '',
          address: doc.address || '',
          memo: doc.memo || '',
        });
      });
      
      setIsReady(true);
      console.log('✅ Ready to edit');
    }

    initRepo();
  }, [userId, editorName]);

  const updateField = (field: keyof UserDocument, value: string) => {
    if (!docHandle || !isReady) return;
    
    console.log('🔄 Updating field:', field, 'with value:', value);
    console.log('🔄 Current docHandle:', docHandle);
    console.log('🔄 DocumentId:', docHandle.documentId);
    
    docHandle.change((doc: any) => {
      console.log('🔄 Before change - doc:', doc);
      doc[field] = value;
      console.log('🔄 After change - doc:', doc);
    });
    
    console.log('🔄 Change operation completed');
  };

  return { formData, isReady, updateField, documentId };
}