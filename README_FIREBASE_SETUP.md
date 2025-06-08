# Firebase セットアップガイド

## 🚨 PERMISSION_DENIED エラーの解決方法

### 1. Firebase Console でセキュリティルールを設定

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクト「board-game-5164b」を選択
3. 左メニューから「Realtime Database」を選択
4. 「ルール」タブをクリック
5. 以下のルールをコピー&ペーストして「公開」をクリック

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "simple_rooms": {
      ".read": true,
      ".write": true,
      "$roomId": {
        ".read": true,
        ".write": true,
        "host": {
          ".validate": "newData.hasChildren(['name', 'ready'])"
        },
        "guest": {
          ".validate": "newData.hasChildren(['name', 'ready'])"
        },
        "moves": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

### 2. Authentication の設定

1. Firebase Console の左メニューから「Authentication」を選択
2. 「Sign-in method」タブをクリック
3. 「匿名」を有効にする

### 3. Realtime Database の設定確認

1. Firebase Console の「Realtime Database」で
2. データベースURLが正しいことを確認
3. 「テストモード」または上記のルールが適用されていることを確認

## 🔧 トラブルシューティング

### エラー: PERMISSION_DENIED
- セキュリティルールが正しく設定されているか確認
- 匿名認証が有効になっているか確認
- データベースURLが正しいか確認

### エラー: 認証が必要です
- 匿名認証が有効になっているか確認
- ネットワーク接続を確認

### エラー: ルームが見つかりません
- ルームIDが正しいか確認
- データベースにデータが正しく保存されているか確認

## 📝 セキュリティについて

現在のルールは開発・テスト用です。本番環境では以下のような制限を追加することを推奨します：

```json
{
  "rules": {
    "simple_rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "host": {
          ".write": "!data.exists() || data.child('uid').val() == auth.uid"
        },
        "guest": {
          ".write": "!data.exists() || data.child('uid').val() == auth.uid"
        }
      }
    }
  }
}
```