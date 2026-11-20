import { Column, ModelBase, dynamicModelBase, getValueByPath, setValueByPath } from '@model-base/core'
import { deepCopy } from '../../src/_utils/deepCopy'
import { isType } from '../../src/_utils/type'

describe('documented legacy boundaries', () => {
  it('legacy deepCopy copies object branches but shares nested arrays', () => {
    const source = { nested: { value: 1 }, list: [{ value: 1 }] }
    const copy = deepCopy(source)
    expect(copy).not.toBe(source)
    expect(copy.nested).not.toBe(source.nested)
    expect(copy.list).toBe(source.list)
  })

  it('path reads distinguish a missing leaf from an unavailable intermediate node', () => {
    expect(getValueByPath({ user: {} }, 'user.name')).toBeUndefined()
    expect(getValueByPath({}, 'user.name')).toBeNull()
    const target = {}
    setValueByPath(target, 'user.name', 'Ada')
    expect(target).toEqual({})
  })

  it('isType checks function identity rather than constructibility', () => {
    const arrow = () => 1
    expect(isType(arrow)).toBe(true)
    expect(() => Reflect.construct(arrow, [])).toThrow(TypeError)
  })

  it('dynamic model definitions are normalized in place and create distinct classes', () => {
    const columns: any = { count: { type: 'number' } }
    const First = dynamicModelBase(columns)
    expect(columns.count.name).toBe('count')
    expect(columns.count.type).toBe(Number)
    const Second = dynamicModelBase({ count: { type: 'number' } })
    expect(First).not.toBe(Second)
  })

  it('default object constants are shared while factories return independent objects', () => {
    const shared = { count: 1 }
    class Value extends ModelBase {
      @Column({ default: shared }) constant!: any
      @Column({ default: () => ({ count: 1 }) }) factory!: any
    }
    const first = Value.create({})
    const second = Value.create({})
    expect(first.constant).toBe(second.constant)
    expect(first.factory).not.toBe(second.factory)
  })

  it('getOriginalData exposes the same mutable baseline on repeated reads', () => {
    class Value extends ModelBase { @Column() name!: string }
    const model = Value.create({ name: 'Ada' })
    const baseline = model.getOriginalData()
    expect(model.getOriginalData()).toBe(baseline)
    baseline.name = 'Grace'
    model.revertChangedData()
    expect(model.name).toBe('Grace')
  })
})
