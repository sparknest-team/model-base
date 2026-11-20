import { dynamicModelBase, ModelBase } from '@model-base/core'
import { __CLONE__ } from '../../src/constant'
import { SnapshotStore, hasDeferredSnapshot } from '../../src/_utils/changeTracking/proxyState'

declare class NamedModel extends ModelBase { name: string }

function loadCopy(): typeof import('../../src') {
  let copy!: typeof import('../../src')
  jest.isolateModules(() => { copy = require('../../src') })
  return copy
}

describe('DTO-only snapshot storage across module copies', () => {
  it('keeps deferred baselines independent across many instances sharing column plans', () => {
    const Value = dynamicModelBase({ name: {} }) as typeof NamedModel
    const values = Array.from({ length: 100 }, (_, index) => Value.create({ name: String(index) }))
    values.forEach(value => { value.name += '-edited' })
    values.forEach((value, index) => {
      expect(hasDeferredSnapshot(value)).toBe(true)
      expect(value.getOriginalData()).toEqual({ name: String(index) })
      expect(hasDeferredSnapshot(value)).toBe(false)
      value.revertChangedData()
      expect(value.name).toBe(String(index))
    })
  })

  it('does not transfer a deferred snapshot into an unrelated store', () => {
    const Value = dynamicModelBase({ name: {} }) as typeof NamedModel
    const value = Value.create({ name: 'old' })
    const other = new SnapshotStore()
    value.name = 'new'
    expect(other.get(value)).toBeUndefined()
    expect(other.has(value)).toBe(false)
    expect(value.getOriginalData()).toEqual({ name: 'old' })
  })

  it('copies excluded groups at save time instead of retaining caller-owned arrays', () => {
    const Value = dynamicModelBase({ name: {}, secret: { group: 'private' } }) as typeof NamedModel
    const value = Value.create({ name: 'old', secret: 'hidden' })
    const excludeGroup = ['private']
    value.saveChangedData({ excludeGroup })
    excludeGroup.length = 0
    value.name = 'new'
    expect(value.getOriginalData()).toEqual({ name: 'old' })
  })

  it('returns the same mutable DTO after resolving a shared reader once', () => {
    const Value = dynamicModelBase({ name: {} }) as typeof NamedModel
    const value = Value.create({ name: 'old' })
    const original = value.getOriginalData()
    original.name = 'adjusted'
    value.name = 'new'
    expect(value.getOriginalData()).toBe(original)
    value.revertChangedData()
    expect(value.name).toBe('adjusted')
  })

  it('stores no pending wrapper and materializes a real DTO through get', () => {
    const Value = dynamicModelBase({ name: {} }) as typeof NamedModel
    const value = Value.create({ name: 'old' })
    const store = (Value as any)[__CLONE__]
    expect(store).toBeInstanceOf(WeakMap)
    expect(WeakMap.prototype.has.call(store, value)).toBe(false)
    expect(WeakMap.prototype.get.call(store, value)).toBeUndefined()
    const dto = store.get(value)
    expect(dto).toEqual({ name: 'old' })
    expect(WeakMap.prototype.get.call(store, value)).toBe(dto)
    expect(value.getOriginalData()).toBe(dto)
  })

  it('supports borrowed reads, changes and rollback between isolated copies', () => {
    const a = loadCopy()
    const b = loadCopy()
    expect(a.ModelBase).not.toBe(b.ModelBase)
    const Value = a.dynamicModelBase({ name: {} }) as typeof NamedModel
    const value = Value.create({ name: 'old' })
    expect(b.ModelBase.prototype.getOriginalData.call(value)).toEqual({ name: 'old' })
    value.name = 'new'
    expect(b.ModelBase.prototype.getChangedData.call(value)).toEqual({ name: 'new' })
    b.ModelBase.revertChangedData(value)
    expect(value.name).toBe('old')
    expect(value.isChanged()).toBe(false)
  })

  it('does not overwrite a foreign save with a stale deferred baseline', () => {
    const a = loadCopy()
    const b = loadCopy()
    const Value = a.dynamicModelBase({ name: { group: 'detail' }, secret: { group: 'private' } }) as typeof NamedModel
    const value = Value.create({ name: 'old', secret: 'hidden' })
    b.ModelBase.prototype.saveChangedData.call(value, { group: 'detail' })
    value.name = 'new'
    expect(value.getOriginalData()).toEqual({ name: 'old' })
    value.saveChangedData()
    expect(b.ModelBase.prototype.getOriginalData.call(value)).toEqual({ name: 'new', secret: 'hidden' })
  })

  it('falls back to eager DTO snapshots in a legacy WeakMap', () => {
    const Value = dynamicModelBase({ name: {} }) as typeof NamedModel
    ;(Value as any)[__CLONE__] = new WeakMap()
    const value = Value.create({ name: 'old' })
    expect((Value as any)[__CLONE__].get(value)).toEqual({ name: 'old' })
    value.name = 'new'
    value.revertChangedData()
    expect(value.name).toBe('old')
  })

  it('keeps explicit DTO replacement and repeated deferred saves intact', () => {
    const Value = dynamicModelBase({ name: {} }) as typeof NamedModel
    const value = Value.create({ name: 'old' })
    const store = (Value as any)[__CLONE__]
    const replacement = { name: 'replacement' }
    store.set(value, replacement)
    expect(value.getOriginalData()).toBe(replacement)
    value.saveChangedData()
    value.saveChangedData()
    value.name = 'new'
    expect(value.getOriginalData()).toEqual({ name: 'old' })
  })
})
