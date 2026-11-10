// index.json 里版本条目的规则：从 npm registry 的单个包文档里取最新发布，
// 并检查 DSH 插件市场格式要求的东西——engines.dsh 必须是 SemVer 区间，
// 其余字段按发布时的真实值填写。读不懂的输入直接报错，不做猜测。
import semver from 'semver'

/** 把 registry 文档变成 index.json 的一条版本记录；不合格时抛错。 */
export function latestMarketVersion(registry) {
  const version = registry?.['dist-tags']?.latest
  if (!version) throw new Error('npm registry 上没有 latest 标签')
  const manifest = registry.versions?.[version]
  if (!manifest) throw new Error(`npm registry 上没有 ${version} 的 package.json`)

  const range = manifest.engines?.dsh
  if (typeof range !== 'string' || range.trim() === '') {
    throw new Error(`${version} 的 package.json 没有 engines.dsh，插件市场要求每个列出的版本都声明它`)
  }
  if (range.startsWith('workspace:') || semver.validRange(range) === null) {
    throw new Error(`${version} 的 engines.dsh 不是 SemVer 区间：${JSON.stringify(range)}`)
  }

  const published = registry.time?.[version]
  const publishTimestamp = published === undefined ? Number.NaN : Math.floor(Date.parse(published) / 1000)
  if (!Number.isInteger(publishTimestamp) || publishTimestamp < 0) {
    throw new Error(`${version} 的发布时间读不出来：${JSON.stringify(published)}`)
  }

  return { version, publishTimestamp, source: { type: 'npm' }, engines: { dsh: range } }
}

/** 让已写的 dist-tags 只指向列出的版本；指空了的标签丢掉并提示。 */
export function reconcileDistTags(plugin, versions, warn = console.warn) {
  const tags = plugin['dist-tags']
  if (tags === undefined) return
  const listed = new Set(versions.map(entry => entry.version))
  const kept = {}
  for (const [tag, target] of Object.entries(tags)) {
    if (listed.has(target)) kept[tag] = target
    else warn(`index.json 的 dist-tags.${tag} 指向未列出的 ${target}，已丢弃`)
  }
  if (Object.keys(kept).length === 0) delete plugin['dist-tags']
  else plugin['dist-tags'] = kept
}
