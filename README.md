# ボードdeモンスターズ

![ボードdeモンスターズ](https://firebasestorage.googleapis.com/v0/b/board-game-5164b.firebasestorage.app/o/cardImg%2F%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC.png?alt=media&token=16df62e1-4321-4e44-9f9d-9b3ca7a87881)

## 概要

ボードdeモンスターズは、戦略的なターン制ボードゲームです。プレイヤーはマスターとモンスターからなるチームを編成し、3×4のボード上で戦略的なバトルを繰り広げます。

## 🎮 ゲームの特徴

### 基本システム
- **ターン制バトル**: プレイヤーと敵が交互にターンを行う戦略的なゲーム
- **チーム編成**: マスター1体 + モンスター3体でチームを構成（総コスト8以下）
- **クリスタルシステム**: スキル使用に必要なクリスタルを管理
- **進化システム**: 特定の条件でモンスターが進化
- **🆕 リアルタイム対戦**: Firebaseを使用したオンライン対戦機能

### 対戦モード
- **ローカル対戦**: 1台のデバイスで2人対戦
- **🆕 オンライン対戦**: インターネット経由でリアルタイム対戦

### キャラクター種類

#### マスター（7種類）
- **ノーマルマスター**: バランス型の基本マスター
- **レッドマスター**: 攻撃力特化型
- **ブルーマスター**: 防御力特化型
- **グリーンマスター**: 回復スキル持ち
- **イエローマスター**: 行動力特化型
- **ブラックマスター**: 呪いスキル持ち
- **ホワイトマスター**: 進化スキル持ち

#### モンスター（16種類）
- **基本モンスター**: ウルフ、ゴーレム、ベアー、スライム、ホエール
- **進化モンスター**: スターウルフ、アイアンゴーレム、ホワイトベアー、レッドスライム、キングホエール
- **ドラゴン系**: レッド、ブルー、イエロー、グリーン、ホワイト、ブラックドラゴン

### スキルシステム

#### 利用可能なスキル
1. **いかりのいちげき**: 近接攻撃に+1ダメージ（コスト3）
2. **かいふく**: 味方のHP2回復（コスト2）
3. **のろい**: 敵のHPを1減らす（防御無視、コスト3）
4. **しんか**: 味方モンスターを進化させる（コスト3）

## 🌐 オンライン対戦機能

### 🆕 新機能
- **ルーム作成**: 友達を招待してプライベート対戦
- **ルーム参加**: ルームIDで簡単参加
- **リアルタイム同期**: 行動が即座に相手に反映
- **接続状態管理**: 切断・再接続の自動処理
- **待った機能**: 1手戻る機能（ローカル対戦のみ）

### 使用技術
- **Firebase Realtime Database**: リアルタイムデータ同期
- **Firebase Authentication**: 匿名認証
- **React Hooks**: カスタムフック `useFirebaseGame`

## 🎯 ゲームの流れ

### 1. チーム編成フェーズ
- マスター1体とモンスター3体を選択
- 総コスト8以下になるように編成
- プレイヤーチーム（青）と敵チーム（赤）の両方を編成

### 2. 対戦モード選択
- **ローカル対戦**: 同じデバイスで対戦
- **🆕 オンライン対戦**: ネットワーク経由で対戦

### 3. バトルフェーズ
- 3×4のボード上でターン制バトル
- 各キャラクターは移動・攻撃・スキル使用が可能
- ターン開始時にクリスタル+1獲得
- キャラクター撃破時に相手チームがクリスタル獲得

### 4. 勝利条件
- 相手のマスターを倒すか、相手が降参すると勝利

## 🎲 ゲームルール

### 基本ルール
- **移動**: 隣接するマスに移動可能
- **攻撃**: 隣接する敵キャラクターを攻撃
- **ダメージ計算**: 攻撃力 - 防御力 = ダメージ
- **スキル**: クリスタルを消費して特殊効果を発動

### 進化システム
- 敵キャラクターを倒すと進化可能（進化先があるモンスターのみ）
- 進化後はステータスが向上し、新しいスキルを習得する場合がある

### クリスタルシステム
- 最大8個まで保持可能
- ターン開始時に1個獲得
- キャラクター撃破時に撃破されたキャラクターのコスト分獲得

## 🛠️ 技術仕様

### 使用技術
- **フロントエンド**: React 18 + TypeScript
- **スタイリング**: Tailwind CSS
- **アイコン**: Lucide React
- **ビルドツール**: Vite
- **開発環境**: Node.js
- **🆕 バックエンド**: Firebase (Realtime Database + Authentication)

### プロジェクト構成
```
src/
├── components/          # UIコンポーネント
│   ├── GameBoard.tsx   # ゲームボード
│   ├── CharacterCard.tsx # キャラクターカード
│   ├── DeckBuilder.tsx # チーム編成画面
│   ├── NetworkGameLobby.tsx # 🆕 オンライン対戦ロビー
│   └── ...
├── context/            # React Context
│   ├── GameContext.tsx # ゲーム状態管理
│   └── NetworkGameContext.tsx # 🆕 ネットワークゲーム管理
├── hooks/              # 🆕 カスタムフック
│   └── useFirebaseGame.ts # Firebase連携
├── firebase/           # 🆕 Firebase設定
│   └── config.ts
├── data/              # ゲームデータ
│   ├── cardData.ts    # カード情報
│   ├── skillData.ts   # スキル情報
│   └── ...
├── types/             # TypeScript型定義
│   ├── gameTypes.ts
│   └── networkTypes.ts # 🆕 ネットワーク関連型
└── ...
```

## 🚀 セットアップ

### 必要な環境
- Node.js 18以上
- npm または yarn
- 🆕 Firebase プロジェクト（オンライン対戦用）

### インストール手順

1. **リポジトリのクローン**
```bash
git clone [repository-url]
cd board-game
```

2. **依存関係のインストール**
```bash
npm install
```

3. **🆕 Firebase設定**
```bash
# .env.example を .env にコピー
cp .env.example .env

# Firebase設定値を .env に記入
# または src/firebase/config.ts を直接編集
```

4. **開発サーバーの起動**
```bash
npm run dev
```

5. **ブラウザでアクセス**
```
http://localhost:5173
```

### 🆕 Firebase設定

#### 1. Firebaseプロジェクト作成
1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成
2. Realtime Database を有効化
3. Authentication で匿名認証を有効化

#### 2. 設定値の取得
```javascript
// Firebase Console > プロジェクト設定 > 全般 > アプリ
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

#### 3. セキュリティルール
```json
// Realtime Database Rules
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".indexOn": ["createdAt", "status"]
      }
    }
  }
}
```

### ビルド
```bash
npm run build
```

### プレビュー
```bash
npm run preview
```

## 🎮 操作方法

### PC操作
- **キャラクター選択**: クリック
- **移動**: 移動先をクリック、またはドラッグ&ドロップ
- **攻撃**: 攻撃対象をクリック
- **スキル使用**: キャラクターカードのスキルをクリック後、対象を選択

### モバイル操作
- **キャラクター詳細**: キャラクターをダブルタップしてモーダル表示
- **移動・攻撃**: タップで実行

### 🆕 オンライン対戦操作
- **ルーム作成**: 「オンライン対戦」→「ルームを作成」
- **ルーム参加**: 「オンライン対戦」→「ルームに参加」→ルームID入力
- **ルームID共有**: コピーボタンで簡単共有

### ゲーム内UI
- **ターンタイマー**: 30秒制限（一時停止可能）
- **クリスタル表示**: 画面両端に表示
- **キャラクター情報**: 右パネルに詳細表示
- **🆕 待った機能**: 1手戻るボタン（ローカル対戦のみ）

## 🎨 デザイン

### カラーテーマ
- **プレイヤーチーム**: 青系統
- **敵チーム**: 赤系統
- **UI**: 白ベース + 青アクセント
- **🆕 オンライン要素**: 紫系統

### アニメーション
- キャラクター移動・攻撃・ダメージ・回復・進化
- クリスタル獲得・ターン開始
- スムーズなトランジション効果

## 📱 レスポンシブ対応

- **デスクトップ**: フル機能UI
- **タブレット**: 最適化されたレイアウト
- **モバイル**: モーダルベースのUI

## 🔧 カスタマイズ

### 新しいキャラクターの追加
1. `src/data/cardData.ts`にデータ追加
2. `src/types/gameTypes.ts`に型定義追加
3. 必要に応じてスキルを`src/data/skillData.ts`に追加

### 新しいスキルの追加
1. `src/data/skillData.ts`にスキル定義追加
2. `src/context/GameContext.tsx`にスキル処理ロジック追加

### 🆕 ネットワーク機能の拡張
1. `src/types/networkTypes.ts`に新しい型定義追加
2. `src/hooks/useFirebaseGame.ts`に新しい機能追加
3. `src/components/NetworkGameLobby.tsx`にUI追加

## 🔒 セキュリティ

### Firebase セキュリティ
- 匿名認証による基本的なアクセス制御
- Realtime Database ルールによるデータ保護
- 本番環境では環境変数による設定管理

### 推奨事項
- 本番環境では適切なFirebaseセキュリティルールを設定
- API キーは環境変数で管理
- 不正なアクションの検証ロジック追加

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

## 🆕 更新履歴

### v2.0.0 (2025-01-XX)
- 🎉 Firebase を使用したリアルタイム対戦機能を追加
- 🎮 オンライン対戦ロビーシステム実装
- 🔄 ゲーム状態のリアルタイム同期
- 📱 接続状態管理とエラーハンドリング
- ⏪ 待った機能（1手戻る）を追加
- 🎨 UI/UX の改善

### v1.0.0 (2025-01-XX)
- 🎮 基本的なターン制ボードゲーム機能
- 🃏 チーム編成システム
- ⚡ スキルシステム
- 🔄 進化システム
- 💎 クリスタルシステム

---

**ボードdeモンスターズ** &copy; 2025