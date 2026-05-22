Reference for `docs/.vitepress/config.mts`. Use as a starting point; drop sidebar/nav entries for folders the project doesn't have.

```typescript
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '{Project Name} Docs',
  description: '{One-line description}',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Development', link: '/development/setup' },
      { text: 'Reference', link: '/PRD' },
    ],
    sidebar: {
      '/guide/': [{ text: 'Guide', items: [/* ... */] }],
      '/architecture/': [{ text: 'Architecture', items: [/* ... */] }],
      '/development/': [{ text: 'Development', items: [/* ... */] }],
      '/': [
        {
          text: 'Reference',
          items: [
            { text: 'Product spec (PRD)', link: '/PRD' },
            { text: 'Roadmap', link: '/roadmap' },
            { text: 'File map', link: '/file-map' },
            // { text: 'API surface', link: '/api' },  // if exists
          ],
        },
      ],
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: '{repo URL or omit}' }],
    editLink: {
      pattern: '{repo URL}/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
  vite: {
    server: { host: '0.0.0.0', port: 5193 },
  },
})
```
