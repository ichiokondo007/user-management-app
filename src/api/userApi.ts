import type { User } from '../types/User';

// ダミーユーザーデータ
const dummyUsers: User[] = [
  { id: '1', name: '山田太郎', email: 'yamada@example.com' },
  { id: '2', name: '佐藤花子', email: 'sato@example.com' },
  { id: '3', name: '鈴木一郎', email: 'suzuki@example.com' }
];

// ユーザー一覧を取得する関数
export const fetchUsers = async (): Promise<User[]> => {
  // 実際のAPIリクエストの代わりにダミーデータを返す
  // 本番環境では実際のAPIエンドポイントにリクエストする
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(dummyUsers);
    }, 500); // 0.5秒の遅延を入れてAPI呼び出しをシミュレート
  });
};

// 単一ユーザーを取得する関数
export const fetchUser = async (id: string): Promise<User | null> => {
  const user = dummyUsers.find(user => user.id === id);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(user || null);
    }, 300);
  });
};

// ユーザーを作成/更新する関数
export const saveUser = async (user: User): Promise<User> => {
  // 既存ユーザーの更新または新規ユーザーの追加をシミュレート
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ...user,
        id: user.id || String(dummyUsers.length + 1) // 新規ユーザーの場合はIDを生成
      });
    }, 300);
  });
};