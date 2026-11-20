import { Column, DataModel, ModelBase } from '@model-base/core'
import { types } from 'node:util'
import { nextTick, reactive, watch } from 'vue'
import { hasDeferredSnapshot } from '../../src/_utils/changeTracking/proxyState'

class Scalar extends ModelBase {
  @Column() name!: string
  @Column() count!: number
}

describe('proxy tracking and compatibility snapshots', () => {
  it.each(['new', 'create'])('uses Proxy for %s only when tracking is enabled', (route) => {
    const make = (options?) =>
      route === 'new' ? new Scalar({ name: 'Ada' }, options) : Scalar.create({ name: 'Ada' }, options)
    expect(types.isProxy(make())).toBe(true)
    const untracked = make({ enableDataState: false })
    expect(types.isProxy(untracked)).toBe(false)
    expect(untracked.getOriginalData()).toEqual({})
  })

  it('honors class defaults and per-instance overrides without leaking configuration', () => {
    @DataModel({ enableDataState: false })
    class Disabled extends Scalar {}
    expect(types.isProxy(Disabled.create({}))).toBe(false)
    expect(types.isProxy(Disabled.create({}, { enableDataState: true }))).toBe(true)
    expect(types.isProxy(Disabled.create({}))).toBe(false)
  })

  it('records scalar writes without materializing the whole snapshot', () => {
    const value = Scalar.create({ name: 'Ada', count: 1 })
    expect(hasDeferredSnapshot(value)).toBe(true)
    value.name = 'Ada'
    expect(hasDeferredSnapshot(value)).toBe(true)
    value.name = 'Grace'
    expect(hasDeferredSnapshot(value)).toBe(true)
    expect(value.getOriginalData()).toEqual({ name: 'Ada', count: 1 })
    expect(value.getChangedData()).toEqual({ name: 'Grace' })
    value.name = 'Ada'
    expect(value.isChanged()).toBe(false)
  })

  it('returns the same mutable snapshot object on repeated access', () => {
    const value = Scalar.create({ name: 'Ada' })
    const snapshot = value.getOriginalData()
    expect(hasDeferredSnapshot(value)).toBe(false)
    expect(value.getOriginalData()).toBe(snapshot)
    snapshot.name = 'adjusted'
    value.revertChangedData()
    expect(value.name).toBe('adjusted')
  })

  it('handles delete and defineProperty without losing the baseline', () => {
    const value = Scalar.create({ name: 'Ada', count: 1 })
    delete (value as any).name
    Object.defineProperty(value, 'count', { value: 2, writable: true, configurable: true, enumerable: true })
    expect(value.getOriginalData()).toEqual({ name: 'Ada', count: 1 })
    value.revertChangedData()
    expect(value.getSerializableObject()).toEqual({ name: 'Ada', count: 1 })
  })

  it('keeps naming, grouping and save/update baseline semantics', () => {
    class Grouped extends ModelBase {
      @Column({ group: 'detail' }) displayName!: string
      @Column({ group: 'private' }) secret!: string
    }
    const value = Grouped.create({ display_name: 'Ada', secret: 'hidden' })
    value.saveChangedData({ group: 'detail' })
    expect(hasDeferredSnapshot(value)).toBe(true)
    expect(value.getOriginalData()).toEqual({ display_name: 'Ada' })
    value.update({ display_name: 'Grace' })
    expect(value.getOriginalData()).toEqual({ display_name: 'Grace', secret: 'hidden' })
    const camel = Grouped.create({ display_name: 'Ada' }, { serializeNamingStrategies: 'camelCase' })
    camel.displayName = 'Grace'
    expect(camel.getOriginalData()).toEqual({ displayName: 'Ada' })
  })

  it('preserves nested mutations, array operations, descriptors and rollback lazily', () => {
    class Item extends ModelBase {
      @Column({ primary: true }) id!: number
      @Column() label!: string
    }
    class List extends ModelBase {
      @Column({ model: Item }) items!: Item[]
    }
    const value = List.create({
      items: [
        { id: 1, label: 'old' },
        { id: 2, label: 'same' },
      ],
    })
    expect(hasDeferredSnapshot(value)).toBe(true)
    expect(types.isProxy(value.items[0])).toBe(true)
    value.items[0].label = 'new'
    value.items.splice(1, 1, Item.create({ id: 3, label: 'added' }))
    expect(value.getChangedDescriptor().items.primaryChangeDescriptor).toMatchObject({
      create: [{ id: 3, label: 'added' }],
      delete: [{ id: 2, label: 'same' }],
      update: [{ id: 1, label: 'new' }],
    })
    value.revertChangedData()
    expect(value.getSerializableObject()).toEqual({
      items: [
        { id: 1, label: 'old' },
        { id: 2, label: 'same' },
      ],
    })
  })

  it('can explicitly materialize a baseline before mutating opaque values', () => {
    class Value extends ModelBase {
      @Column() object!: { nested: number }
    }
    const external = { nested: 1 }
    const value = Value.create({ object: external })
    expect(hasDeferredSnapshot(value)).toBe(true)
    expect(value.object).toBe(external)
    value.getOriginalData() // Opaque internal mutations are outside automatic tracking.
    external.nested = 2
    expect(value.getChangedData()).toEqual({ object: { nested: 2 } })
    value.revertChangedData()
    expect(value.object).toEqual({ nested: 1 })
  })

  it('retains serializer execution at save time and observes internal-slot mutations', () => {
    const serialize = jest.fn(({ value }) => value.toISOString())
    class Value extends ModelBase {
      @Column({ deserialize: ({ value }) => new Date(value), serialize }) date!: Date
      @Column({ deserialize: ({ value }) => new Map(value), serialize: ({ value }) => [...value] }) map!: Map<
        string,
        number
      >
    }
    const value = Value.create({ date: '2026-01-01T00:00:00.000Z', map: [['a', 1]] })
    expect(serialize).toHaveBeenCalledTimes(1)
    expect(hasDeferredSnapshot(value)).toBe(false)
    value.date.setUTCFullYear(2027)
    value.map.set('a', 2)
    expect(value.getChangedData()).toEqual({ date: '2027-01-01T00:00:00.000Z', map: [['a', 2]] })
  })

  it('keeps private fields and method receiver identity on constructed proxies', () => {
    class Value extends ModelBase {
      @Column() label!: string
      #count = 1
      increment() {
        this.#count++
        return this
      }
      get count() {
        return this.#count
      }
    }
    const value = Value.create({ label: 'Ada' })
    expect(value.increment()).toBe(value)
    expect(value.count).toBe(2)
    expect(value instanceof Value).toBe(true)
  })

  it('supports Vue reactive writes and rollback without bypassing its watcher', async () => {
    const value = reactive(Scalar.create({ name: 'Ada', count: 1 }))
    const changed = jest.fn()
    const stop = watch(() => value.name, changed)
    try {
      value.name = 'Grace'
      await nextTick()
      expect(changed).toHaveBeenCalledTimes(1)
      expect(value.getChangedData()).toEqual({ name: 'Grace' })
      value.revertChangedData()
      await nextTick()
      expect(value.name).toBe('Ada')
      expect(changed).toHaveBeenCalledTimes(2)
    } finally {
      stop()
    }
  })

  it('does not wrap children or permit explicit snapshots when tracking is disabled', () => {
    class Parent extends ModelBase {
      @Column({ model: Scalar }) child!: Scalar
    }
    const value = Parent.create({ child: { name: 'Ada' } }, { enableDataState: false })
    expect(types.isProxy(value.child)).toBe(false)
    value.saveChangedData({ enableDataState: true })
    expect(types.isProxy(value)).toBe(false)
    value.child.name = 'Grace'
    expect(value.getOriginalData()).toEqual({})
  })

  it('keeps opaque values lazy after replacing a scalar field', () => {
    class Value extends ModelBase {
      @Column() payload!: any
    }
    const value = Value.create({ payload: 'old' })
    value.payload = { count: 1 }
    expect(value.getOriginalData()).toEqual({ payload: 'old' })
    value.saveChangedData()
    expect(hasDeferredSnapshot(value)).toBe(true)
    value.getOriginalData()
    value.payload.count = 2
    expect(value.getChangedData()).toEqual({ payload: { count: 2 } })
  })

  it('preserves baselines before freezing and redefining scalar fields as accessors', () => {
    const value = Scalar.create({ name: 'Ada', count: 1 })
    Object.defineProperty(value, 'name', { get: () => 'Grace', configurable: true })
    expect(value.getOriginalData()).toEqual({ name: 'Ada', count: 1 })
    const frozen = Scalar.create({ name: 'Ada' })
    Object.freeze(frozen)
    expect(frozen.getOriginalData()).toEqual({ name: 'Ada' })
    expect(Reflect.set(frozen, 'name', 'Grace')).toBe(false)
  })

  it('copies exclusion arrays and gives group precedence over excludeGroup', () => {
    class Value extends ModelBase {
      @Column({ group: 'detail' }) name!: string
      @Column({ group: 'private' }) secret!: string
    }
    const value = Value.create({ name: 'Ada', secret: 'hidden' })
    const excluded = ['private']
    value.saveChangedData({ excludeGroup: excluded })
    excluded.length = 0
    expect(value.getOriginalData()).toEqual({ name: 'Ada' })
    value.saveChangedData({ group: 'detail', excludeGroup: 'detail' })
    expect(value.getOriginalData()).toEqual({ name: 'Ada' })
  })
})
