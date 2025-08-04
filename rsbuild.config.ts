import { readFileSync } from 'node:fs'
import { defineConfig, type RsbuildPlugin } from '@rsbuild/core'
import { pluginVue } from '@rsbuild/plugin-vue'

export default defineConfig({
  html: {
    title: 'FontQ',
    inject: 'body',
  },
  output: {
    cleanDistPath: process.env.NODE_ENV === 'production',
    legalComments: 'none',
    inlineScripts: true,
    inlineStyles: true,
  },
  plugins: [
    pluginVue(),
    {
      name: 'plugin-inline-favicon',
      setup(api) {
        api.modifyHTMLTags(({ headTags, bodyTags }) => {
          const favicon = readFileSync('./src/icon.svg', { encoding: 'utf8' })
          headTags.unshift({
            tag: 'link',
            attrs: {
              rel: 'icon',
              href: `data:image/svg+xml,${encodeURIComponent(favicon)}`,
              type: 'image/svg+xml',
            },
          })
          return { headTags, bodyTags }
        })
      },
    } satisfies RsbuildPlugin,
  ],
})
