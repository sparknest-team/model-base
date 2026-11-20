// yarn build:lib && node --expose-gc scripts/benchmark-tracking-memory.cjs
// Each sample uses a fresh process. "eager" disables only the new tracking
// helpers to reproduce the previous snapshot strategy, not a historical build.
const { spawnSync } = require('node:child_process')
const assert = require('node:assert/strict')

if (!process.argv.includes('--child')) {
  const results = []
  for (const shape of ['scalar48', 'nested200']) {
    for (const mode of ['eager', 'proxy-eager', 'proxy', 'off']) {
      const samples = []
      for (let round = 0; round < 3; round++) {
        const run = spawnSync(process.execPath, ['--expose-gc', __filename, '--child', shape, mode], {
          encoding: 'utf8',
        })
        if (run.status !== 0) throw new Error(run.stderr || run.stdout)
        samples.push(JSON.parse(run.stdout))
      }
      const median = (key) => samples.map((sample) => sample[key]).sort((a, b) => a - b)[1]
      results.push({
        shape,
        mode,
        count: samples[0].count,
        retainedMiB: median('retainedMiB'),
        afterOnePercentWritesMiB: median('afterOnePercentWritesMiB'),
        afterBaselineReadsMiB: median('afterBaselineReadsMiB'),
      })
    }
  }
  console.log(
    JSON.stringify(
      {
        node: process.version,
        rounds: 3,
        note: 'Median GC-retained heap delta, not peak memory or total allocation. Eager is a strategy control within the same build.',
        results,
      },
      null,
      2,
    ),
  )
} else {
  if (!global.gc) throw new Error('Run with --expose-gc')
  const [shape, mode] = process.argv.slice(-2)
  const tracking = require('../packages/core/lib/_utils/changeTracking/proxyState')
  if (mode === 'eager') {
    tracking.trackModel = (value) => value
  }
  if (mode === 'eager' || mode === 'proxy-eager') {
    tracking.deferSnapshot = () => false
  }
  const { dynamicModelBase } = require('../packages/core/lib')
  const count = shape === 'scalar48' ? 10000 : 1000
  const fields = Object.fromEntries(Array.from({ length: 48 }, (_, i) => [`f${i}`, {}]))
  const Model = dynamicModelBase(shape === 'scalar48' ? fields : { payload: {} })
  const dto =
    shape === 'scalar48'
      ? Object.fromEntries(Object.keys(fields).map((key) => [key, `value-${key}`]))
      : { payload: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, { value: i }])) }
  const options = { enableDataState: mode !== 'off' }
  for (let i = 0; i < 300; i++) new Model(dto, options)
  global.gc()
  const start = process.memoryUsage().heapUsed
  const models = Array.from({ length: count }, () => new Model(dto, options))
  const retained = () => {
    global.gc()
    return +((process.memoryUsage().heapUsed - start) / 1024 ** 2).toFixed(2)
  }
  const retainedMiB = retained()
  for (let i = 0; i < count; i += 100) {
    if (shape === 'scalar48') models[i].f0 = 'changed'
    else models[i].payload = { replaced: true }
  }
  const afterOnePercentWritesMiB = retained()
  if (mode !== 'off') {
    assert.deepEqual(models[0].getOriginalData(), dto)
    for (const model of models) model.getOriginalData()
  }
  const afterBaselineReadsMiB = retained()
  // Keep all models live across the last GC.
  assert.equal(models.length, count)
  assert.equal(require('node:util').types.isProxy(models[0]), mode.startsWith('proxy'))
  console.log(JSON.stringify({ count, retainedMiB, afterOnePercentWritesMiB, afterBaselineReadsMiB }))
}
