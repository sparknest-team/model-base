import type { NavbarOptions } from 'vuepress-theme-hope'

export const zhNavBar: NavbarOptions = [
  {
    text: '开发指南',
    children: [
      {
        text: '快速上手',
        link: '/guide/start/',
      },
      {
        text: 'LLM 文档',
        link: '/guide/llm/',
      },
    ],
  },
]
