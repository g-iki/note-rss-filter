const Parser = require('rss-parser');
const parser = new Parser();
require('dotenv').config();

module.exports = async (req, res) => {
  // GET メソッドのみを許可
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // 環境変数の取得
  const feedUrl = process.env.RSS_FEED_URL;
  const excludeUsers = process.env.EXCLUDE_USERS
    ? process.env.EXCLUDE_USERS.split(',').map(user => user.trim().toLowerCase())
    : [];

  // 環境変数のバリデーション
  if (!feedUrl) {
    res.status(500).send('Error: RSS_FEED_URL is not defined in .env');
    return;
  }

  try {
    // RSS フィードを取得
    const feed = await parser.parseURL(feedUrl);

    // 除外ユーザの投稿をフィルタリング
    const filteredItems = feed.items.filter(item => {
      if (!item.creator && !item.author) return true; // creator または author がない場合は保持
      const creator = (item.creator || item.author || '').toLowerCase();
      return !excludeUsers.includes(creator);
    });

    // RSS フィードを生成
    res.setHeader('Content-Type', 'application/rss+xml');
    res.status(200).send(generateRSSFeed(filteredItems, feed));
  } catch (error) {
    // エラーハンドリング
    res.status(500).send(`Error fetching RSS: ${error.message}`);
  }
};

function generateRSSFeed(items, feed) {
  // XML エスケープ関数
  const escapeXML = (str) => {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return char;
      }
    });
  };

  // RSS フィードを生成
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXML(feed.title || 'Filtered Note RSS Feed')}</title>
    <link>${escapeXML(feed.link || 'https://note.com')}</link>
    <description>${escapeXML(feed.description || 'RSS feed excluding specified users')}</description>
    <language>ja</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

  items.forEach(item => {
    xml += `
    <item>
      <title>${escapeXML(item.title || '')}</title>
      <link>${escapeXML(item.link || '')}</link>
      <description>${escapeXML(item.contentSnippet || '')}</description>
      <pubDate>${escapeXML(item.pubDate || '')}</pubDate>
      <guid>${escapeXML(item.link || '')}</guid>
      ${item.creator || item.author ? `<author>${escapeXML(item.creator || item.author)}</author>` : ''}
    </item>`;
  });

  xml += `
  </channel>
</rss>`;

  return xml;
}