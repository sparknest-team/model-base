import { cloneDeep } from 'lodash'
import { CLEAN_ENUM, Column, ModelBase } from '@model-base/core'
import { modelToSerializableObj, modelToSnapshot } from '../../src/tools/modelToSerializableObj'
import { SnapshotCopy } from '../../src/_utils/changeTracking/snapshotCopy'

const params = { clean: CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL }

describe('single-copy snapshot ownership', () => {
  it.each([
    ['Date', () => new Date('2026-01-01T00:00:00Z')],
    ['Map', () => new Map([['key', { count: 1 }]])],
    ['Set', () => new Set([{ count: 1 }])],
    ['typed array', () => new Uint8Array([1, 2])],
    ['Buffer', () => Buffer.from([1, 2])],
  ] as const)('preserves the legacy snapshot result for %s', (_label, make) => {
    class Value extends ModelBase { @Column() payload!: any }
    const value = Value.create({ payload: make() }, { enableSnapshot: false })
    expect(modelToSnapshot(value, params)).toEqual(cloneDeep(modelToSerializableObj(value, params)))
  })

  it('reuses an isolated plain graph instead of cloning it again', () => {
    const copy = new SnapshotCopy()
    const source = { nested: { value: 1 }, list: [{ value: 2 }] }
    const isolated = copy.clone(source)
    const dto = { payload: isolated }
    copy.container(dto)
    expect(copy.finish(dto)).toBe(dto)
    expect(copy.finish(dto).payload).toBe(isolated)
    expect(isolated).not.toBe(source)
    source.nested.value = 9
    expect(isolated.nested.value).toBe(1)
  })

  it('keeps explicitly materialized opaque snapshots independent from original references', () => {
    class Value extends ModelBase { @Column() payload!: any }
    const source = { nested: { count: 1 }, items: [{ id: 1 }] }
    const value = Value.create({ payload: source })
    expect(value.payload).toBe(source)
    value.getOriginalData()
    source.nested.count = 2
    source.items.push({ id: 2 })
    expect(value.getOriginalData()).toEqual({ payload: { nested: { count: 1 }, items: [{ id: 1 }] } })
    value.revertChangedData()
    expect(value.payload.nested.count).toBe(1)
    value.payload.nested.count = 3
    expect(value.getOriginalData().payload.nested.count).toBe(1)
  })

  it('detaches callback return values and preserves aliases between callbacks', () => {
    const external = { nested: { value: 1 } }
    class Value extends ModelBase {
      @Column({ serialize: () => external }) first!: number
      @Column({ serialize: () => external }) second!: number
    }
    const value = Value.create({ first: 1, second: 2 })
    const snapshot = value.getOriginalData()
    expect(snapshot.first).toBe(snapshot.second)
    expect(snapshot.first).not.toBe(external)
    external.nested.value = 9
    expect(snapshot.first.nested.value).toBe(1)
    expect(value.getSerializableObject().first).toBe(external)
  })

  it('captures earlier fields before a later serialization callback mutates them', () => {
    const original = { value: 1 }
    class Value extends ModelBase {
      @Column() plain!: any
      @Column({ serialize: () => { original.value = 2; return original } }) custom!: number
    }
    const value = Value.create({ plain: original, custom: 1 })
    expect(value.getOriginalData()).toEqual({ plain: { value: 1 }, custom: { value: 2 } })
  })

  it('preserves cycles, shared children, symbols and sparse-array densification', () => {
    const symbol = Symbol('value')
    const child = { id: 1 }
    const source: any = { first: child, second: child, [symbol]: { id: 2 }, array: new Array(2) }
    source.self = source
    class Value extends ModelBase { @Column() payload!: any }
    const value = Value.create({ payload: source })
    const snapshot = value.getOriginalData().payload
    expect(snapshot.self).toBe(snapshot)
    expect(snapshot.first).toBe(snapshot.second)
    expect(snapshot.first).not.toBe(child)
    expect(snapshot[symbol]).toEqual({ id: 2 })
    expect(0 in snapshot.array).toBe(true)
  })

  it('keeps accessor and custom-constructor graphs on the legacy copy path', () => {
    const getter = jest.fn(() => ({ value: 1 }))
    const source = Object.defineProperty({}, 'value', { enumerable: true, get: getter })
    const copy = new SnapshotCopy()
    const isolated = copy.clone(source)
    expect(getter).toHaveBeenCalledTimes(1)
    expect(copy.finish({ payload: isolated }).payload).not.toBe(isolated)
    class Custom { value = 1 }
    const custom = copy.clone(new Custom())
    expect(copy.finish({ payload: custom }).payload).not.toBe(custom)
    expect(copy.finish({ payload: custom }).payload).toBeInstanceOf(Custom)
  })

  it('matches legacy results for nested models, records and record arrays', () => {
    class Child extends ModelBase { @Column() payload!: any }
    class Parent extends ModelBase {
      @Column({ model: Child }) list!: Child[]
      @Column({ model: Child, type: 'record' }) records!: Record<string, Child>
      @Column({ model: Child, type: 'recordArray' }) groups!: Record<string, Child[]>
    }
    const value = Parent.create({ list: [{ payload: { count: 1 } }], records: { a: { payload: { count: 2 } } }, groups: { a: [{ payload: { count: 3 } }] } })
    expect(modelToSnapshot(value, params)).toEqual(cloneDeep(modelToSerializableObj(value, params)))
    // Unmodelled payload internals require an explicitly materialized baseline.
    value.getOriginalData()
    value.list[0].payload.count = 9
    expect(value.getOriginalData().list[0].payload.count).toBe(1)
    expect(value.list[0].getOriginalData().payload.count).toBe(1)
    value.getOriginalData().list[0].payload.count = 7
    expect(value.list[0].getOriginalData().payload.count).toBe(1)
  })

  it('does not stringify during initialization, assignment or snapshot saving', () => {
    class Value extends ModelBase { @Column() payload!: any }
    const stringify = jest.spyOn(JSON, 'stringify')
    try {
      const value = Value.create({ payload: { nested: { count: 1 } } })
      value.payload = { nested: { count: 2 } }
      value.payload.nested.count = 3
      value.saveChangedData()
      expect(stringify).not.toHaveBeenCalled()
      expect(value.getOriginalData()).toEqual({ payload: { nested: { count: 3 } } })
    } finally { stringify.mockRestore() }
  })

  it('keeps save-time getters, grouping and legacy serializer precedence', () => {
    let reads = 0
    const object = Object.defineProperty({}, 'count', { enumerable: true, get: () => ++reads })
    class Value extends ModelBase {
      @Column({ group: 'private', unformatter: ({ value }) => value, serialize: () => 'unused' }) payload!: any
    }
    const value = Value.create({ payload: object }, { enableSnapshot: false })
    const old = cloneDeep(modelToSerializableObj(value, params))
    const oldReads = reads
    reads = 0
    expect(modelToSnapshot(value, params)).toEqual(old)
    expect(reads).toBe(oldReads)
    expect(modelToSnapshot(value, { ...params, group: 'public' })).toEqual({})
  })
})
