import { defineConfig } from '@rsbuild/core'
import { pluginVue } from '@rsbuild/plugin-vue'

export default defineConfig({
  plugins: [pluginVue()],
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
})
