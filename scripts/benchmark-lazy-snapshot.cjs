// Runs current TypeScript sources; no library rebuild required.
// node scripts/benchmark-lazy-snapshot.cjs
const { spawnSync } = require('node:child_process')
const assert = require('node:assert/strict')
const { performance } = require('node:perf_hooks')

if (!process.argv.includes('--child')) {
  const results = []
  for (const shape of ['scalar48', 'nested32', 'nested2']) {
    for (const mode of ['eager', 'lazy', 'off']) {
      const samples = []
      for (let round = 0; round < 3; round++) {
        const run = spawnSync(process.execPath,
          ['--expose-gc', '--require', '@esbuild-kit/cjs-loader', __filename, '--child', shape, mode],
          { cwd: require('node:path').resolve(__dirname, '..'), encoding: 'utf8' })
        if (run.status !== 0) throw new Error(run.stderr || run.stdout)
        samples.push(JSON.parse(run.stdout))
      }
      const median = key => samples.map(sample => sample[key]).sort((a, b) => a - b)[1]
      results.push({ shape, mode, count: samples[0].count,
        createMs: median('createMs'), retainedMiB: median('retainedMiB'),
        afterWritesMiB: median('afterWritesMiB'), afterReadsMiB: median('afterReadsMiB') })
    }
  }
  console.log(JSON.stringify({ node: process.version, rounds: 3,
    note: 'Same-source strategy comparison. Eager uses the legacy WeakMap fallback, not a historical release. Heap numbers are GC-retained deltas, not peak or cumulative allocation. Writes change one scalar per root 100 times. Reads materialize every root baseline.', results }, null, 2))
} else {
  const [shape, mode] = process.argv.slice(-2)
  const { dynamicModelBase } = require('../packages/core/src')
  const { __CLONE__ } = require('../packages/core/src/constant')
  const width = shape === 'nested2' ? 2 : shape === 'scalar48' ? 48 : 32
  const fields = Object.fromEntries(Array.from({ length: width }, (_, i) => [`f${i}`, {}]))
  const Leaf = dynamicModelBase(fields)
  const Root = shape === 'scalar48' ? Leaf : dynamicModelBase({ rows: { model: Leaf } })
  if (mode === 'eager') { Leaf[__CLONE__] = new WeakMap(); Root[__CLONE__] = new WeakMap() }
  const row = Object.fromEntries(Object.keys(fields).map(key => [key, `value-${key}`]))
  const dto = shape === 'scalar48' ? row : { rows: Array.from({ length: 40 }, () => ({ ...row })) }
  const options = { enableSnapshot: mode !== 'off' }
  for (let i = 0; i < 30; i++) Root.create(dto, options)
  global.gc()
  const before = process.memoryUsage().heapUsed
  const count = shape === 'scalar48' ? 5000 : 250
  const start = performance.now()
  const models = Array.from({ length: count }, () => Root.create(dto, options))
  const createMs = +(performance.now() - start).toFixed(2)
  const retained = () => { global.gc(); return +((process.memoryUsage().heapUsed - before) / 1024 ** 2).toFixed(2) }
  const retainedMiB = retained()
  for (const model of models) {
    const leaf = shape === 'scalar48' ? model : model.rows[0]
    for (let i = 0; i < 100; i++) leaf.f0 = `changed-${i}`
  }
  const afterWritesMiB = retained()
  if (mode !== 'off') {
    for (const model of models) assert.deepEqual(model.getOriginalData(), dto)
  }
  const afterReadsMiB = retained()
  assert.equal(models.length, count)
  console.log(JSON.stringify({ count, createMs, retainedMiB, afterWritesMiB, afterReadsMiB }))
}
