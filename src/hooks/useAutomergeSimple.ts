import { useState, useEffect } from 'react';
import { DocHandle, Repo, type DocumentId, type PeerId } from '@automerge/automerge-repo';
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
  disconnect: () => void;
}
export function useAutomergeSimple(
  userId: string,
  editorName: string
): UseAutomergeSimpleReturn {
  const [formData, setFormData] = useState<UserDocument>({
    name: '',
    address: '',
    memo: '',
  });
  const [isReady, setIsReady] = useState(false);
  const [docHandle, setDocHandle] = useState<DocHandle<UserDocument> | null>(null);
  const [documentId, setDocumentId] = useState('');
  const [network, setNetwork] = useState<BrowserWebSocketClientAdapter | null>(null);

  useEffect(() => {
    if (!editorName || !userId) {
      return;
    }
    let isActive = true;
    async function initRepo() {
      const networkAdapter = new BrowserWebSocketClientAdapter('ws://localhost:3031');
      if (!isActive) return;
      setNetwork(networkAdapter);
      networkAdapter.on('peer-disconnected', (peerId) => {
        if (isActive) console.log('Peer disconnected:', peerId);
      });
      const repoInstance = new Repo({
        network: [networkAdapter],
        storage: new IndexedDBStorageAdapter('user-app-db'),
        peerId: editorName as PeerId,
      });
      if (!isActive) return;
      //WebSocket経由でサーバーからdocumentIDを取得 type: GET_DOCUMENT
      const tempWs = new WebSocket('ws://localhost:3031');
      const documentId = await new Promise<string>((resolve) => {
        tempWs.onopen = () => {
          const getMessage = {
            type: 'GET_DOCUMENT',
            userId: userId,
            editorName: editorName
          };
          tempWs.send(JSON.stringify(getMessage));
        };
        tempWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'DOCUMENT_ID' && data.userId === userId) {
              resolve(data.documentId);
              tempWs.close();
            }
          } catch {
            // parse error
          }
        };
      });
      const handle  = await repoInstance.find<UserDocument>(documentId as DocumentId);
      setDocHandle(handle);
      setDocumentId(handle.documentId);
      const doc = await handle.doc() as UserDocument;
      if (doc) {
        setFormData({
          name: doc.name || '',
          address: doc.address || '',
          memo: doc.memo || '',
        });
      }
      handle.on('change', ({ doc }) => {
        const typedDoc = doc as UserDocument;
        setFormData({
          name: typedDoc.name || '',
          address: typedDoc.address || '',
          memo: typedDoc.memo || '',
        });
      });
      setIsReady(true);
    }

    initRepo();
    return () => {
      isActive = false;
      if (network && 'disconnect' in network && typeof network.disconnect === 'function') {
        network.disconnect();
      }
      setIsReady(false);
      setDocHandle(null);
      setDocumentId('');
      setNetwork(null);
    };
  }, [userId, editorName]);

  const updateField = (field: keyof UserDocument, value: string) => {
    if (!docHandle || !isReady) return;
    docHandle.change((doc: UserDocument) => {
      doc[field] = value;
    });
  };

  const disconnect = () => {
    if (network && 'disconnect' in network && typeof network.disconnect === 'function') {
      network.disconnect();
    }
  };

  return { formData, isReady, updateField, documentId, disconnect };
}



  // tempWs.close()：
  // - 用途: GET_DOCUMENT用の一時的なWebSocket接続のクローズ
  // - 対象: 単純なWebSocketコネクション
  // - 処理: TCP/WebSocketレベルでの接続切断
  // - タイミング: documentIDを受信したら即座に実行
  // - 影響範囲: この1つの接続のみ

  // network.disconnect()：
  // - 用途: Automergeの同期処理システム全体の停止
  // - 対象: BrowserWebSocketClientAdapter（Automergeネットワークアダプター）
  // - 処理:
  //   - Automergeプロトコルレベルでの切断
  //   - ピア同期の停止
  //   - 内部的なイベントハンドラのクリーンアップ
  //   - Automergeの再接続機構の停止
  // - タイミング: コンポーネントアンマウント時やリダイレクト時
  // - 影響範囲: Automergeの同期システム全体