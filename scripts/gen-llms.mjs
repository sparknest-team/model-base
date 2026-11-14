// 生成 docs/public/llms-full.txt —— 把站点上的文档拼成一份纯文本给 LLM 直接读
//
// 用法：yarn docs:llms        （build:doc 已自动前置）
// 产物：docs/.vuepress/public/llms-full.txt  → vuepress build 时原样复制到 dist 根目录
//                                         线上地址 https://modelbase.wiki/llms-full.txt
//                                          （VuePress 2 的静态目录固定是 <sourceDir>/.vuepress/public）
//
// 手写的精炼版索引是 docs/.vuepress/public/llms.txt，不由本脚本生成（内容需要人工维护）。
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const SITE = process.env.LLMS_SITE_URL || 'https://modelbase.wiki'
const OUT = path.join(root, 'docs/.vuepress/public/llms-full.txt')

/** 按顺序拼接的文档，url 取 VuePress 实际路由
 *  （根目录 README.md 只有 frontmatter 的首页 hero 配置，无正文，故不列入） */
const PAGES = [
  { file: 'docs/guide/start.md', url: '/guide/start/' },
  { file: 'docs/guide/know.md', url: '/guide/know/' },
  { file: 'docs/guide/why.md', url: '/guide/why/' },
  { file: 'docs/guide/faq.md', url: '/guide/faq/' },
  { file: 'docs/guide/migarate.md', url: '/guide/migrate/' },
  { file: 'docs/guide/changelog.md', url: '/guide/changelog/' },
]

/** 去掉 VuePress 语法，转成 LLM 友好的纯文本 Markdown */
function normalize(md) {
  const lines = md.split('\n')
  const out = []
  let inFrontmatter = false

  for (const raw of lines) {
    const line = raw

    // frontmatter
    if (line.trim() === '---' && out.length === 0 && !inFrontmatter) {
      inFrontmatter = true
      continue
    }
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false
      continue
    }

    // 代码组容器：::: code-tabs#shell / @tab npm
    if (/^:::\s*code-tabs/.test(line)) continue
    if (/^@tab\s+/.test(line)) {
      out.push(`**${line.replace(/^@tab\s+/, '').trim()}**`)
      continue
    }

    // 提示类容器：::: tip 标题 → > 提示：标题
    const container = line.match(/^:::\s*(tip|warning|danger|info|details|note)\s*(.*)$/)
    if (container) {
      const body = container[2].trim()
      out.push(`> ${container[1]}${body ? ` ${body}` : ''}`)
      continue
    }

    // 容器结束符
    if (/^:::\s*$/.test(line)) continue

    // @[code](path) 引入外部代码块（构建期才展开），保留为占位说明
    if (/^@\[code/.test(line.trim())) {
      out.push('（此处为示例源码，见线上文档页）')
      continue
    }

    // VuePress 自定义容器标题 ### 之类保持原样
    out.push(line)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const parts = []
let pageCount = 0

for (const page of PAGES) {
  const abs = path.join(root, page.file)
  if (!fs.existsSync(abs)) {
    console.warn(`[llms] 跳过不存在的文件：${page.file}`)
    continue
  }
  const body = normalize(fs.readFileSync(abs, 'utf-8'))
  if (!body) continue
  parts.push(`<!-- source: ${SITE}${page.url} -->\n${body}`)
  pageCount += 1
}

const header = [
  '# ModelBase 完整文档（llms-full.txt）',
  '',
  `> 本文件由 \`yarn docs:llms\` 从 https://modelbase.wiki 的源码文档自动生成，共 ${pageCount} 个页面。`,
  '> 分节索引与速查表见 https://modelbase.wiki/llms.txt 。',
  '> 包：@model-base/core / @model-base/common / @model-base/service；仓库：https://github.com/loca-spirit/model-base',
  '',
  '---',
  '',
].join('\n')

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, `${header}${parts.join('\n\n---\n\n')}\n`, 'utf-8')

const size = fs.statSync(OUT).size
console.log(`[llms] 已生成 ${path.relative(root, OUT)}（${pageCount} 页，${(size / 1024).toFixed(1)} KB）`)
