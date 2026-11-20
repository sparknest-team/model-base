// Run after yarn build:lib: node --expose-gc scripts/benchmark-node.cjs
const { performance } = require('node:perf_hooks')
const assert = require('node:assert/strict')
const { dynamicModelBase } = require('../packages/core/lib')

if (!global.gc) throw new Error('Run with node --expose-gc')
const Flat = dynamicModelBase(Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`f${i}`, {}])))
const flatDto = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`f${i}`, `value-${i}`]))
const flat = new Flat(flatDto)
const Text = dynamicModelBase({ body: {} })
const text = new Text({ body: 'x'.repeat(64 * 1024) })
const Payload = dynamicModelBase({ payload: {} })
const payload = new Payload({ payload: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, { value: 'x'.repeat(128) }])) })
const Item = dynamicModelBase({ id: { primary: true }, label: {} })
const List = dynamicModelBase({ items: { model: Item } })
const list = new List({ items: Array.from({ length: 100 }, (_, i) => ({ id: i, label: `item-${i}` })) })
const cases = [
  ['create.tracked.24fields', 10000, () => new Flat(flatDto), value => assert.equal(value.f0, 'value-0')],
  ['create.untracked.24fields', 10000, () => new Flat(flatDto, { enableDataState: false }), value => assert.deepEqual(value.getOriginalData(), {})],
  ['changed.24fields', 10000, () => flat.getChangedData(), value => assert.deepEqual(value, {})],
  ['changed.text64KiB', 1000, () => text.getChangedData(), value => assert.deepEqual(value, {})],
  ['changed.nested200keys', 300, () => payload.getChangedData(), value => assert.deepEqual(value, {})],
  ['changed.100items', 10, () => list.getChangedData(), value => assert.deepEqual(value, {})],
  ['descriptor.100items', 10, () => list.getChangedDescriptor(), value => assert.equal(value.items.primaryChangeDescriptor.noChange.length, 100)],
]
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const comparison = require('../packages/core/lib/_utils/jsonEqual')
const optimized = comparison.jsonEqual
const modes = process.argv.includes('--compare')
  ? [['native-comparison', (left, right) => JSON.stringify(left) === JSON.stringify(right)], ['optimized', optimized]]
  : [['optimized', optimized]]
const output = []
try {
  for (const [name, iterations, run, verify] of cases) {
    const metrics = new Map()
    for (const [mode, compare] of modes) {
      comparison.jsonEqual = compare
      verify(run())
      for (let i = 0; i < Math.min(iterations, 300); i++) run()
      let calls = 0, characters = 0
      const stringify = JSON.stringify
      try {
        JSON.stringify = function (...args) {
          const result = stringify.apply(this, args)
          calls++
          characters += result?.length || 0
          return result
        }
        run()
      } finally { JSON.stringify = stringify }
      metrics.set(mode, { times: [], peaks: [], calls, characters })
    }
    for (let round = 0; round < 5; round++) {
      // Alternate order to reduce drift; only the comparison implementation changes.
      for (const [mode, compare] of round % 2 ? [...modes].reverse() : modes) {
        comparison.jsonEqual = compare
        global.gc()
        const startHeap = process.memoryUsage().heapUsed
        let peak = startHeap
        const start = performance.now()
        for (let i = 0; i < iterations; i++) {
          run()
          if (i % 32 === 0) peak = Math.max(peak, process.memoryUsage().heapUsed)
        }
        const data = metrics.get(mode)
        data.times.push(performance.now() - start)
        peak = Math.max(peak, process.memoryUsage().heapUsed)
        data.peaks.push((peak - startHeap) / 1024 / 1024)
      }
    }
    for (const [mode, data] of metrics) {
      output.push({ name, mode, iterations, medianMs: +median(data.times).toFixed(2), sampledHeapDeltaMiB: +median(data.peaks).toFixed(2), stringifyCallsPerOperation: data.calls, stringifyCharactersPerOperation: data.characters })
    }
  }
} finally { comparison.jsonEqual = optimized }
console.log(JSON.stringify({ node: process.version, rounds: 5, note: 'Sampled heap growth is not allocated bytes or true peak memory. --compare isolates JSON comparison, not the complete old build.', cases: output }, null, 2))
