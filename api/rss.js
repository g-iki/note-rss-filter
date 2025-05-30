const Parser = require('rss-parser');
const express = require('express');
const dotenv = require('dotenv');

// .envファイルから環境変数を読み込む
dotenv.config();

const app = express();
const parser = new Parser();

app.get('/rss', async (req, res) => {
  try {
    // 環境変数からRSSフィードURLと除外ユーザーIDを取得
    const feedUrl = process.env.RSS_FEED_URL;
    const excludedUsers = process.env.EXCLUDED_USERS
      ? process.env.EXCLUDED_USERS.split(',').map(user => user.trim())
      : [];

    if (!feedUrl) {
      return res.status(400).json({ error: 'RSS_FEED_URLが設定されていません' });
    }

    // RSSフィードを取得
    const feed = await parser.parseURL(feedUrl);

    // 複数ユーザーを除外
    const filteredItems = feed.items.filter(
      item =>
        !excludedUsers.some(user => 
          item.creator?.includes(user) || 
          item.link.includes(user)
        )
    );

    // CORSヘッダーを設定
    res.setHeader('Access-Control-Allow-Origin', '*');

    // フィルタリング済みのフィードをJSONで返す
    res.json({
      title: feed.title,
      description: feed.description || '',
      link: feed.link,
      items: filteredItems.map(item => ({
        title: item.title,
        link: item.link,
        author: item.creator || 'Unknown',
        pubDate: item.pubDate,
        description: item.description || ''
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'RSSフィードの取得に失敗しました', details: error.message });
  }
});

module.exports = app;