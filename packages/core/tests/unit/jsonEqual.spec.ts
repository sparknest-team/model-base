import { Column, ModelBase } from '@model-base/core'
import { jsonEqual } from '../../src/_utils/jsonEqual'
import { classifyFieldChange } from '../../src/_utils/changeTracking/fieldChange'
import { CLEAN_ENUM } from '@model-base/core'

describe('JSON comparison compatibility', () => {
  it('does not stringify primitive fields during change detection', () => {
    class Value extends ModelBase {
      @Column() text!: string
      @Column() count!: number
    }
    const value = Value.create({ text: 'x'.repeat(65536), count: 1 })
    const spy = jest.spyOn(JSON, 'stringify')
    let calls: number
    let result: any
    try {
      result = value.getChangedData()
      calls = spy.mock.calls.length
    } finally { spy.mockRestore() }
    expect(result).toEqual({})
    expect(calls!).toBe(0)
  })

  it('keeps whitespace classification identical without creating replacement strings', () => {
    for (const value of ['', ' ', '\t\r\n', '\u00a0', '\u2028\u2029', '\ufeff', '\u200b', ' a ', 'x'.repeat(65536)]) {
      expect(classifyFieldChange(undefined, value, { clean: CLEAN_ENUM.CLEAN_DIRTY }).isEmpty)
        .toBe(value.replace(/\s/g, '') === '')
    }
  })

  it('matches native JSON comparisons across primitive and object combinations', () => {
    const values = [undefined, null, true, false, 0, -0, 1, NaN, Infinity, -Infinity,
      '', 'null', '0', 'a\n"\\', '\ud800', Symbol('value'), () => 1,
      {}, { omitted: undefined }, [], [undefined], [null], new Array(1),
      { a: 1, b: 2 }, { b: 2, a: 1 }, new Date('2026-01-01'), new Number(1), new Map(), new Set()]
    for (const left of values) for (const right of values) {
      expect(jsonEqual(left, right)).toBe(JSON.stringify(left) === JSON.stringify(right))
    }
  })

  it('does not short-circuit identical objects with stateful getters', () => {
    let reads = 0
    const value = { get value() { return ++reads } }
    expect(jsonEqual(value, value)).toBe(false)
    expect(reads).toBe(2)
  })

  it('preserves toJSON order, receiver and root key', () => {
    const calls: string[] = []
    const left = { toJSON(key) { expect(this).toBe(left); calls.push(`left:${key}`); return 1 } }
    const right = { toJSON(key) { expect(this).toBe(right); calls.push(`right:${key}`); return 1 } }
    expect(jsonEqual(left, right)).toBe(true)
    expect(calls).toEqual(['left:', 'right:'])
  })

  it('still throws for a circular reference even when both operands are identical', () => {
    const value: any = {}; value.self = value
    expect(() => jsonEqual(value, value)).toThrow(TypeError)
  })

  it('still throws for BigInt', () => {
    expect(() => jsonEqual(BigInt(1), BigInt(1))).toThrow(TypeError)
  })

  it('honors a custom BigInt toJSON implementation', () => {
    const prototype = BigInt.prototype as any
    const previous = Object.getOwnPropertyDescriptor(prototype, 'toJSON')
    try {
      Object.defineProperty(prototype, 'toJSON', { configurable: true, value() { return this.toString() } })
      expect(jsonEqual(BigInt(1), '1')).toBe(true)
    } finally {
      if (previous) Object.defineProperty(prototype, 'toJSON', previous)
      else delete prototype.toJSON
    }
  })

  it('does not evaluate the right object after the left throws', () => {
    const right = { toJSON: jest.fn(() => 1) }
    expect(() => jsonEqual(BigInt(1), right)).toThrow(TypeError)
    expect(right.toJSON).not.toHaveBeenCalled()
  })

  it('keeps non-finite number equivalence in model comparison and change tracking', () => {
    class Value extends ModelBase { @Column() value!: number }
    const model = Value.create({ value: NaN })
    model.value = Infinity
    expect(model.getChangedData()).toEqual({})
    expect(model.isModelEqual(Value.create({ value: -Infinity }))).toBe(true)
    expect(model.isContainsModel(Value.create({ value: NaN }))).toBe(true)
  })
})
