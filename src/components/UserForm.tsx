import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAutomergeSimple } from '../hooks/useAutomergeSimple';

const UserForm: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [username, setUsername] = useState('');
  const [editorSet, setEditorSet] = useState(false);
  
  // URLパラメータから編集者名を取得
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editor = urlParams.get('editor');
    
    if (editor) {
      setUsername(editor);
      setEditorSet(true);
    }
  }, []);
  
  const { formData, isReady, updateField, documentId } = useAutomergeSimple(userId || '', username);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'name' || name === 'address' || name === 'memo') {
      updateField(name, value);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!username || !editorSet) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>編集者名を入力してください</h2>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="編集者名を入力"
          style={{ padding: '8px', marginRight: '10px' }}
        />
        <button 
          onClick={() => setEditorSet(true)}
          disabled={!username.trim()}
          style={{ 
            padding: '8px 16px', 
            marginRight: '10px',
            backgroundColor: username.trim() ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          確定
        </button>
        <button onClick={() => navigate('/')}>一覧へ戻る</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>ユーザ{userId}の情報編集</h1>
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '4px', color: '#333' }}>
        <strong>編集者:</strong> {username}<br/>
        <strong>状態:</strong> {isReady ? '✅ 同期中' : '⏳ 接続中...'}<br/>
        <strong style={{ color: '#000' }}>ドキュメントID:</strong> <span style={{ color: '#0066cc', fontFamily: 'monospace' }}>{documentId ? documentId.slice(0, 8) + '...' : '生成中...'}</span>
        {documentId && (
          <div style={{ marginTop: '10px' }}>
            <small style={{ color: '#666' }}>
              同じユーザーIDで複数のブラウザ/タブから同時編集可能です
            </small>
          </div>
        )}
      </div>
      
      <form style={{ maxWidth: '500px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            ユーザID:
            <input
              type="text"
              value={userId}
              disabled={true}
              style={{ width: '100%', padding: '5px', backgroundColor: '#f5f5f5' }}
            />
          </label>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            ユーザ名:
            <input
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              disabled={!isReady}
              style={{ width: '100%', padding: '5px' }}
            />
          </label>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            住所:
            <input
              type="text"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              disabled={!isReady}
              style={{ width: '100%', padding: '5px' }}
            />
          </label>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            メモ:
            <textarea
              name="memo"
              value={formData.memo || ''}
              onChange={handleChange}
              disabled={!isReady}
              style={{ width: '100%', padding: '5px', minHeight: '100px' }}
            />
          </label>
        </div>
        
        <button type="button" onClick={handleBack}>
          一覧へ戻る
        </button>
      </form>
    </div>
  );
};

export default UserForm;