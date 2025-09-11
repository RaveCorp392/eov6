/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://eov6.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  changefreq: 'weekly',
  priority: 0.7,
  autoLastmod: true,
  exclude: ['/admin/*', '/agent/*'],
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/' }],
    additionalSitemaps: ['https://eov6.com/server-sitemap.xml'],
  },
};
