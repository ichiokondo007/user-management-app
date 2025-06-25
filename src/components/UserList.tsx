import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  address: string;
  memo: string;
}

// モックデータ
const mockUsers: User[] = [
  { id: '1', name: 'ユーザ1', address: 'address1', memo: 'メモ1' },
  { id: '2', name: 'ユーザ2', address: 'address2', memo: 'メモ2' },
  { id: '3', name: 'ユーザ3', address: 'address3', memo: 'メモ3' },
];

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 一覧画面に戻った際にlocalStorageのdocumentIDをクリア
    console.log('🧹 Clearing localStorage document IDs');
    Object.keys(localStorage).forEach(key => {
      if ((key.startsWith('user-') || key.startsWith('shared-user-')) && key.endsWith('-docId')) {
        localStorage.removeItem(key);
        console.log('🧹 Removed:', key);
      }
    });
    // モックデータを直接使用
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 500);
  }, []);

  const handleEdit = (userId: string) => {
    console.log(`🔍 Edit clicked - userId: ${userId}, username: ${username}`);
    if (!username.trim()) {
      alert('編集者名を入力してから編集してください');
      return;
    }
    navigate(`/user/${userId}?editor=${encodeURIComponent(username)}`);
  };


  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>ユーザー一覧</h1>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="編集者名を入力"
          style={{
            padding: '8px 12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '300px'
          }}
        />
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>ID</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>名前</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>住所</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{user.id}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{user.name}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{user.address}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                <button 
                  onClick={() => handleEdit(user.id)}
                  style={{
                    padding: '5px 10px',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  編集
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;