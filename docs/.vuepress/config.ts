import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import hopeTheme from './theme'
import codeBlockPlugin from './plugin-code-block/src/node'

export default defineUserConfig({
  title: 'ModelBase',
  description: '面向 TypeScript 应用的数据模型、序列化与变更追踪工具',
  // base: (process.env.FX_BASE || '/') as any,
  base: '/' as any,
  port: 23187,
  theme: hopeTheme,
  plugins: [codeBlockPlugin],
  pagePatterns: [
    '**/*.md',
    '!.vuepress',
    '!node_modules',
    '../packages/**/tests/**/*.md',
    '../README.md',
  ],
  locales: {
    '/': {
      lang: 'zh-CN',
    },
  },
  bundler: viteBundler({
    viteOptions: {
      configFile: false,
      plugins: [
        // @ts-ignore
        vueJsx(),
      ],
      css: {
        preprocessorOptions: {
          scss: {
            silenceDeprecations: ['legacy-js-api'],
          },
        },
      },
      resolve: {
        alias: [],
      },
    },
  }),
})
