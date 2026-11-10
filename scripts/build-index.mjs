// 生成 index.json：插件市场索引，地址是
// https://raw.githubusercontent.com/woniuniuniu/dsh-media-desk/main/index.json
//
// 展示文案沿用 index.json 里已经写好的部分，只把列出的版本和发布时间换成 npm 上的最新发布。
// `npm publish` 之后跑一次：
//
//   npm run index
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const indexPath = new URL('index.json', root)
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
const index = JSON.parse(readFileSync(indexPath, 'utf8'))

const plugin = index.plugins?.find(entry => entry.name === manifest.name)
if (!plugin) throw new Error(`index.json 里没有名为 ${manifest.name} 的插件`)

// 要完整文档：分发包的简版元数据里没有发布时间（time）。
const response = await fetch(`https://registry.npmjs.org/${manifest.name}`, {
  headers: { accept: 'application/json' },
})
if (!response.ok) throw new Error(`npm registry 返回 ${response.status}：${manifest.name}`)
const registry = await response.json()

const version = registry['dist-tags']?.latest
if (!version) throw new Error(`npm registry 上没有 latest 标签：${manifest.name}`)
if (!registry.versions?.[version]) throw new Error(`npm registry 上没有版本 ${version}`)
const published = registry.time?.[version]
if (!published) throw new Error(`npm registry 上没有 ${manifest.name}@${version} 的发布时间`)

const dshRange = manifest.engines?.dsh
plugin.versions = [
  {
    version,
    publishTimestamp: Math.floor(Date.parse(published) / 1000),
    source: { type: 'npm' },
    engines: dshRange === undefined ? {} : { dsh: dshRange },
  },
]

writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n')
console.log(`index.json：${manifest.name}@${version}，发布于 ${published}`)
