module.exports = function (eleventyConfig) {
  // パススルーコピー: ビルドせずにそのままコピー
  eleventyConfig.addPassthroughCopy('src');
  eleventyConfig.addPassthroughCopy('scripts');
  eleventyConfig.addPassthroughCopy('styles.css');
  eleventyConfig.addPassthroughCopy('favicon.png');
  eleventyConfig.addPassthroughCopy('favicon-16x16.png');
  eleventyConfig.addPassthroughCopy('favicon-32x32.png');
  eleventyConfig.addPassthroughCopy('apple-touch-icon.png');

  // 開発サーバー設定
  eleventyConfig.setServerOptions({
    port: 8080,
    showAllHosts: true,
    liveReload: true,
  });

  // ディレクトリ設定
  return {
    dir: {
      input: 'src-templates',       // テンプレートソース
      output: '_site',               // ビルド出力先
      includes: '_includes',         // レイアウト/パーシャル
      data: '_data',                 // グローバルデータ
    },
    templateFormats: ['njk', 'html', 'md'],
    htmlTemplateEngine: 'njk',       // Nunjucks
    markdownTemplateEngine: 'njk',
  };
};
