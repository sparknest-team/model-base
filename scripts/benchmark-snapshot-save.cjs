// Build core first. Fresh-process strategy comparison, not historical releases.
// node scripts/benchmark-snapshot-save.cjs
const { spawnSync } = require('node:child_process')
const assert = require('node:assert/strict')
const { performance } = require('node:perf_hooks')

if (!process.argv.includes('--child')) {
  const results = []
  for (const operation of ['create', 'save', 'assign']) {
    for (const mode of ['legacy', 'single-copy']) {
      const rounds = []
      for (let round = 0; round < 3; round++) {
        const result = spawnSync(process.execPath, ['--expose-gc', __filename, '--child', operation, mode], { encoding: 'utf8' })
        if (result.status !== 0) throw new Error(result.stderr || result.stdout)
        rounds.push(JSON.parse(result.stdout))
      }
      const median = key => rounds.map(r => r[key]).sort((a, b) => a - b)[1]
      results.push({ operation, mode, count: rounds[0].count, medianMs: median('ms'), sampledHeapGrowthMiB: median('heapMiB'), sampledAllocationMiB: median('allocationMiB') })
    }
  }
  console.log(JSON.stringify({ node: process.version, rounds: 3,
    note: 'Same-build snapshot strategy comparison. Heap growth is not true peak. Allocation is a separate inspector sampling estimate including garbage-collected objects, not retained memory. Proxy implementation is identical in both modes.', results }, null, 2))
} else {
  const [operation, mode] = process.argv.slice(-2)
  // This benchmark isolates the eager compatibility serializer, not lazy journals.
  require('../packages/core/lib/_utils/changeTracking/proxyState').deferSnapshot = () => false
  const serializer = require('../packages/core/lib/tools/modelToSerializableObj')
  if (mode === 'legacy') serializer.modelToSnapshot = (model, params) => require('lodash').cloneDeep(serializer.modelToSerializableObj(model, params))
  const { dynamicModelBase } = require('../packages/core/lib')
  const Value = dynamicModelBase({ payload: {} })
  const dto = { payload: Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`k${i}`, { value: i, label: `value-${i}`, list: [i, i + 1] }])) }
  const value = new Value(dto)
  const replacement = { nested: { value: 1 } }
  const run = operation === 'create' ? () => new Value(dto) : operation === 'save' ? () => value.saveChangedData() : () => { value.payload = value.payload === dto.payload ? replacement : dto.payload; return value }
  const count = operation === 'assign' ? 100000 : 500
  for (let i = 0; i < 30; i++) run()
  global.gc()
  const startHeap = process.memoryUsage().heapUsed
  let peak = startHeap
  let last
  const start = performance.now()
  for (let i = 0; i < count; i++) {
    last = run()
    if (i % 16 === 0) peak = Math.max(peak, process.memoryUsage().heapUsed)
  }
  const ms = performance.now() - start
  peak = Math.max(peak, process.memoryUsage().heapUsed)
  assert.deepEqual(last.getOriginalData(), dto)
  const inspector = require('node:inspector')
  const session = new inspector.Session()
  session.connect()
  session.post('HeapProfiler.startSampling', {
    samplingInterval: 8192,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  }, error => {
    if (error) throw error
    for (let i = 0; i < count; i++) last = run()
    session.post('HeapProfiler.stopSampling', (error, result) => {
      if (error) throw error
      const pending = [result.profile.head]
      let allocation = 0
      while (pending.length) {
        const node = pending.pop()
        allocation += node.selfSize
        pending.push(...node.children)
      }
      session.disconnect()
      assert.deepEqual(last.getOriginalData(), dto)
      console.log(JSON.stringify({ count, ms: +ms.toFixed(2), heapMiB: +((peak - startHeap) / 1024 ** 2).toFixed(2), allocationMiB: +(allocation / 1024 ** 2).toFixed(2) }))
    })
  })
}
