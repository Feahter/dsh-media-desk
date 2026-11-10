import assert from 'node:assert/strict'
import { test } from 'node:test'
import { latestMarketVersion, reconcileDistTags } from '../scripts/index-entry.mjs'

const doc = (overrides = {}) => ({
  'dist-tags': { latest: '2.6.2' },
  time: { '2.6.2': '2026-11-08T04:13:33.815Z' },
  versions: {
    '2.6.2': { name: 'dsh-media-desk', version: '2.6.2', engines: { dsh: '>=0.2.1-rc.5 <0.3.0' } },
  },
  ...overrides,
})

test('latestMarketVersion：取最新发布，发布时间转成 Unix 秒，engines 用发布时的声明', () => {
  assert.deepEqual(latestMarketVersion(doc()), {
    version: '2.6.2',
    publishTimestamp: 1794111213,
    source: { type: 'npm' },
    engines: { dsh: '>=0.2.1-rc.5 <0.3.0' },
  })
})

test('latestMarketVersion：没有 latest 标签就报错', () => {
  assert.throws(() => latestMarketVersion(doc({ 'dist-tags': {} })), /latest/)
})

test('latestMarketVersion：最新版不在 versions 里就报错', () => {
  assert.throws(() => latestMarketVersion(doc({ 'dist-tags': { latest: '9.9.9' } })), /9\.9\.9/)
})

test('latestMarketVersion：发布版没有 engines.dsh 就报错', () => {
  const broken = doc({ versions: { '2.6.2': { name: 'dsh-media-desk', version: '2.6.2' } } })
  assert.throws(() => latestMarketVersion(broken), /engines\.dsh/)
})

test('latestMarketVersion：engines.dsh 不是 SemVer 区间就报错', () => {
  const broken = doc({ versions: { '2.6.2': { engines: { dsh: 'not a range at all' } } } })
  assert.throws(() => latestMarketVersion(broken), /SemVer/)
})

test('latestMarketVersion：workspace 区间不算数', () => {
  const broken = doc({ versions: { '2.6.2': { engines: { dsh: 'workspace:*' } } } })
  assert.throws(() => latestMarketVersion(broken), /SemVer/)
})

test('latestMarketVersion：发布时间缺失或读不出就报错', () => {
  assert.throws(() => latestMarketVersion(doc({ time: {} })), /发布时间/)
  assert.throws(() => latestMarketVersion(doc({ time: { '2.6.2': 'soon' } })), /发布时间/)
})

test('reconcileDistTags：保留指向已列出版本的标签，丢掉指空的', () => {
  const warned = []
  const plugin = { 'dist-tags': { latest: '2.6.2', next: '2.7.0-rc.1' } }
  reconcileDistTags(plugin, [{ version: '2.6.2' }], message => warned.push(message))
  assert.deepEqual(plugin['dist-tags'], { latest: '2.6.2' })
  assert.equal(warned.length, 1)
  assert.match(warned[0], /2\.7\.0-rc\.1/)
})

test('reconcileDistTags：全都不指向列出的版本时删掉整个字段', () => {
  const plugin = { 'dist-tags': { next: '2.7.0-rc.1' } }
  reconcileDistTags(plugin, [{ version: '2.6.2' }], () => {})
  assert.equal('dist-tags' in plugin, false)
})

test('reconcileDistTags：没有 dist-tags 时什么都不做', () => {
  const plugin = {}
  reconcileDistTags(plugin, [{ version: '2.6.2' }], () => {})
  assert.deepEqual(plugin, {})
})
