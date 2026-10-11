import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// index.html uses Vite's built-in %VITE_SITE_URL% substitution for the absolute og:image URL.
// When the env var isn't set (local dev, or a deploy that hasn't configured it yet), Vite leaves
// the literal placeholder in place — this plugin fills in the live site (on Render) instead.
const SITE_URL_FALLBACK = 'https://family-vault-3edo.onrender.com';
// Give Vite the fallback up front too: without it, Vite warns "%VITE_SITE_URL% is not defined"
// on every page load in local dev before the plugin below gets to replace it.
if (!process.env.VITE_SITE_URL) process.env.VITE_SITE_URL = SITE_URL_FALLBACK;
function siteUrlFallbackPlugin() {
  return {
    name: 'site-url-fallback',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/%VITE_SITE_URL%/g, process.env.VITE_SITE_URL || SITE_URL_FALLBACK);
      },
    },
  };
}

const siteUrl = () => (process.env.VITE_SITE_URL || SITE_URL_FALLBACK).replace(/\/+$/, '');

// Structured data for search engines about the landing page: what the app is, and its common
// questions — read from the English landing text so it always matches what the page shows.
function structuredDataPlugin() {
  return {
    name: 'landing-structured-data',
    transformIndexHtml(html) {
      const text = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/i18n/locales/en/landing.json'), 'utf8'));
      const faqKeys = ['free', 'safe', 'parents', 'hindi', 'devices', 'family', 'delete']; // Landing.jsx FAQ_KEYS
      const data = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Family Vault',
          url: `${siteUrl()}/`,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any (web browser on phone or computer)',
          inLanguage: ['en', 'hi'],
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
          description: text.hero.text,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqKeys.map((k) => ({
            '@type': 'Question',
            name: text.faq[`${k}Q`],
            acceptedAnswer: { '@type': 'Answer', text: text.faq[`${k}A`] },
          })),
        },
      ];
      // `<` written as a unicode escape so the JSON can never close the <script> early.
      const json = JSON.stringify(data).replace(/</g, String.fromCharCode(92) + 'u003c');
      return html.replace('<!--structured-data-->', `<script type="application/ld+json">${json}</script>`);
    },
  };
}

// robots.txt and sitemap.xml for the live address. Share links (/s/…) are never crawled; the
// app's other pages say "noindex" themselves (index.html start-up script).
function crawlerFilesPlugin() {
  return {
    name: 'crawler-files',
    apply: 'build',
    generateBundle() {
      const site = siteUrl();
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /s/\n\nSitemap: ${site}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          `  <url><loc>${site}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>`,
          '</urlset>',
          '',
        ].join('\n'),
      });
    },
  };
}

// After the build: render the landing page (English) to plain HTML and put it inside index.html,
// so search engines and slow phones see the whole page before any JavaScript runs. index.html's
// start-up script only shows it at "/" to people who aren't signed in.
function prerenderLandingPlugin() {
  let outDir;
  return {
    name: 'prerender-landing',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const { createServer } = await import('vite');
      const server = await createServer({
        configFile: false,
        root: __dirname,
        logLevel: 'error',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, ws: false },
        optimizeDeps: { noDiscovery: true, include: [] },
        plugins: [react()],
        resolve: { alias: { '@': path.resolve(__dirname, './src') } },
        // Load packages' ES module builds (the router's CommonJS build has no named exports).
        ssr: { resolve: { externalConditions: ['module-sync', 'module'] } },
      });
      try {
        const { renderLanding } = await server.ssrLoadModule('/src/pages/landing/prerender.jsx');
        const markup = await renderLanding();
        const file = path.join(outDir, 'index.html');
        const page = fs.readFileSync(file, 'utf8');
        if (!page.includes('<!--landing-->')) throw new Error('index.html has no <!--landing--> placeholder');
        fs.writeFileSync(file, page.replace('<!--landing-->', `<div id="landing-static">${markup}</div>`));
      } finally {
        await server.close();
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrlFallbackPlugin(), structuredDataPlugin(), crawlerFilesPlugin(), prerenderLandingPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
