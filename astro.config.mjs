import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://baksuls.com',
  output: 'static',
  integrations: [sitemap({
    i18n: {
      defaultLocale: 'ko',
      locales: {
        ko: 'ko',
        en: 'en',
      },
    },
  })],
  build: {
    format: 'directory'
  }
});
