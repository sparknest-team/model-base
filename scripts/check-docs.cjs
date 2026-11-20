/** 校验仓库文档的稳定链接和示例引用，不依赖 VuePress 构建产物。 */
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const files = [path.join(root, 'README.md')]
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (file.endsWith('.md')) files.push(file)
  }
}
walk(path.join(root, 'docs'))
for (const name of fs.readdirSync(path.join(root, 'packages'))) {
  const tests = path.join(root, 'packages', name, 'tests')
  if (fs.existsSync(tests)) walk(tests)
}
const errors = []
const routes = new Map()
const contents = files.map(file => ({ file, text: fs.readFileSync(file, 'utf8') }))
const aiDocs = ['llms.txt', 'llms-full.txt', 'modelbase-upgrade-audit.txt'].map(name => path.join(root, 'docs/.vuepress/public', name))
for (const { file, text } of contents) {
  const route = text.match(/^permalink:\s*(\S+)\s*$/m)?.[1]
  if (!route) { errors.push(`${file}: missing permalink`); continue }
  if (routes.has(route)) errors.push(`${file}: duplicate ${route}`)
  routes.set(route, file)
}
for (const file of aiDocs) {
  if (!fs.existsSync(file)) { errors.push(`${file}: missing AI documentation`); continue }
  routes.set(`/${path.basename(file)}`, file)
  contents.push({ file, text: fs.readFileSync(file, 'utf8') })
}
let includes = 0
function checkRoute(file, link) {
  const route = link.split('#')[0]
  if (route.startsWith('/') && !route.startsWith('//') && !routes.has(route)) errors.push(`${file}: missing route ${route}`)
}
for (const { file, text } of contents) {
  for (const match of text.matchAll(/\]\((\/[^\s)]+)\)/g)) checkRoute(file, match[1])
  for (const match of text.matchAll(/<!--\s*@include:\s*([^\s]+)\s*-->/g)) {
    includes++
    const [source, region] = match[1].split('#')
    const target = path.resolve(path.dirname(file), source)
    if (!fs.existsSync(target)) { errors.push(`${file}: missing include ${source}`); continue }
    if (region) {
      const code = fs.readFileSync(target, 'utf8')
      const escaped = region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const start = new RegExp(`//\\s*region\\s+${escaped}\\s*$`, 'm')
      const end = new RegExp(`//\\s*endregion\\s+${escaped}\\s*$`, 'm')
      if (!start.test(code) || !end.test(code)) errors.push(`${file}: missing region ${region} in ${source}`)
    }
  }
}
for (const section of ['sidebar', 'navbar']) {
  const file = path.join(root, `docs/.vuepress/configs/${section}/zh.ts`)
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/link:\s*'([^']+)'/g)) checkRoute(file, match[1])
}
if (errors.length) {
  console.error(errors.map(error => error.replaceAll(root + path.sep, '')).join('\n'))
  process.exitCode = 1
} else console.log(`Documentation checks passed: ${routes.size} routes, ${includes} source includes.`)
