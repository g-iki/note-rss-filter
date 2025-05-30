const Parser = require('rss-parser');
const express = require('express');
const dotenv = require('dotenv');

// .envファイルから環境変数を読み込む
dotenv.config();

const app = express();
const parser = new Parser({
  customFields: {
    item: [['dc:creator', 'creator']] // noteのRSSでdc:creatorを正しく取得
  }
});

app.get('/rss', async (req, res) => {
  try {
    // 環境変数からRSSフィードURLと除外ユーザーIDを取得
    const feedUrl = process.env.RSS_FEED_URL;
    const excludedUsers = process.env.EXCLUDED_USERS
      ? process.env.EXCLUDED_USERS.split(',').map(user => user.trim())
      : [];

    if (!feedUrl) {
      return res.status(400).send('Error: RSS_FEED_URL is not set');
    }

    // RSSフィードを取得
    const feed = await parser.parseURL(feedUrl);

    // 複数ユーザーを除外
    const filteredItems = feed.items.filter(
      item =>
        !excludedUsers.some(user =>
          (item.creator && item.creator.includes(user)) ||
          (item.link && item.link.includes(user))
        )
    );

    // RSS XMLを生成
    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${feed.title || 'Filtered Note RSS'}</title>
    <link>${feed.link || feedUrl}</link>
    <description>${feed.description || 'Filtered RSS feed from note'}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>ja</language>`;

    filteredItems.forEach(item => {
      rss += `
    <item>
      <title><![CDATA[${item.title || ''}]]></title>
      <link>${item.link || ''}</link>
      <guid isPermaLink="true">${item.link || ''}</guid>
      <pubDate>${item.pubDate || new Date().toUTCString()}</pubDate>
      <dc:creator><![CDATA[${item.creator || 'Unknown'}]]></dc:creator>
      <description><![CDATA[${item.description || ''}]]></description>
    </item>`;
    });

    rss += `
  </channel>
</rss>`;

    // RSS形式でレスポンスを返す
    res.setHeader('Content-Type', 'application/rss+xml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(rss);
  } catch (error) {
    res.status(500).send(`Error fetching RSS feed: ${error.message}`);
  }
});

module.exports = app;