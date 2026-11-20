import { Column, dynamicModelBase, ModelBase } from '@model-base/core'
import { ColumnDefine } from '../../src/decorator/Column'

describe('column cache ownership and invalidation', () => {
  it('isolates legacy decorator registration and invalidates its own warm cache', () => {
    const Base = dynamicModelBase({ name: { type: 'string' } }) as typeof ModelBase
    const base = Base.create({ name: 'base' })
    class Child extends Base {}
    const child = Child.create({})
    const previous = child.getColumnsCached()
    Column()(Child.prototype, 'extra')
    expect(child.getColumnsCached()).not.toBe(previous)
    expect(child.getColumnsCached().extra).toBeDefined()
    expect(base.getColumns().extra).toBeUndefined()
    expect(base.getColumnsCached().extra).toBeUndefined()
  })
  it.each(['parent', 'child', 'sibling'])('isolates three generations with %s initialized first', first => {
    const Base = dynamicModelBase({ name: { type: 'string' } }) as typeof ModelBase
    class Child extends Base { @Column() extra!: string }
    class Grandchild extends Child { @Column() leaf!: string }
    class Sibling extends Base { @Column() other!: string }
    const classes = { parent: Base, child: Grandchild, sibling: Sibling }
    classes[first].create({})
    for (const [Type, keys] of [[Base, ['name']], [Child, ['name', 'extra']],
      [Grandchild, ['name', 'extra', 'leaf']], [Sibling, ['name', 'other']]] as const) {
      const value = Type.create({})
      expect(Object.keys(value.getColumnsCached()).sort()).toEqual([...keys].sort())
      expect(value.getColumnsCached()).toBe(value.getColumnsCached())
      expect(Type.create({}).getColumnsCached()).toBe(value.getColumnsCached())
    }
  })

  it('gives an undecorated subclass its own cache without writing into its parent', () => {
    class Base extends ModelBase { @Column() name!: string }
    const base = Base.create({ name: 'base' })
    class Child extends Base {}
    const child = Child.create({ name: 'child' })
    expect(child.getColumnsCached()).toEqual(base.getColumnsCached())
    expect(child.getColumnsCached()).not.toBe(base.getColumnsCached())
  })

  it('invalidates dynamic registration without polluting parent metadata', () => {
    const Base = dynamicModelBase({ name: { type: 'string' } }) as typeof ModelBase
    class Child extends Base {}
    const child = Child.create({ name: 'old' })
    const old = child.getColumnsCached()
    ColumnDefine()(Child.prototype, 'extra')
    expect(child.getColumnsCached()).not.toBe(old)
    expect(old.extra).toBeUndefined()
    expect(Base.create({}).getColumns().extra).toBeUndefined()
    const fresh = Child.create({ name: 'new', extra: 'saved' })
    expect(fresh.getSerializableObject()).toEqual({ name: 'new', extra: 'saved' })
    fresh.setColumnData('extra', 'edited')
    expect(fresh.getChangedData()).toEqual({ extra: 'edited' })
    fresh.revertChangedData()
    expect(fresh.getColumnData('extra')).toBe('saved')
  })

  it('does not share data-driven columns between DTOs or static instances', () => {
    const Value = dynamicModelBase({ name: { type: 'string' } }) as typeof ModelBase
    const fixed = Value.create({ name: 'fixed' })
    const first = Value.create({ name: 'first', amount: 1 }, { columnsInValue: true })
    const second = Value.create({ name: 'second', enabled: true }, { columnsInValue: true })
    expect(first.getSerializableObject()).toEqual({ name: 'first', amount: 1 })
    expect(second.getSerializableObject()).toEqual({ name: 'second', enabled: true })
    expect(Object.keys(fixed.getColumnsCached())).toEqual(['name'])
    expect(first.getColumnsCached({ dto: { next: 1 } }).next).toBeDefined()
    expect(first.getColumnsCached({ dto: { other: 1 } }).next).toBeUndefined()
  })

  it('supports data-driven models without any decorators', () => {
    class Value extends ModelBase {}
    const value = Value.create({ count: 1 }, { columnsInValue: true })
    expect(value.getSerializableObject()).toEqual({ count: 1 })
    value.setColumnData('count', 2)
    expect(value.getChangedData()).toEqual({ count: 2 })
    value.revertChangedData()
    expect(value.getColumnData('count')).toBe(1)
  })

  it('recomputes an overridden getColumns instead of caching instance-dependent output', () => {
    class Value extends ModelBase {
      getColumns(data?: { dto?: any }): ReturnType<ModelBase['getColumns']> {
        const key = data?.dto?.alternate ? 'alternate' : 'standard'
        return { [key]: { property: key, name: key, camelCaseName: key, type: String } }
      }
    }
    const value = new Value(undefined, { __isInit: true })
    expect(Object.keys(value.getColumnsCached())).toEqual(['standard'])
    expect(Object.keys(value.getColumnsCached({ dto: { alternate: true } }))).toEqual(['alternate'])
  })

  it('returns fresh public copies without recomputing the stable cached result', () => {
    const Value = dynamicModelBase({ name: { type: 'string' } }) as typeof ModelBase
    const value = Value.create({})
    const cached = value.getColumnsCached()
    const copy = value.getColumns()
    copy.name.name = 'changed'
    expect(value.getColumnsCached()).toBe(cached)
    expect(cached.name.name).toBe('name')
    expect(value.getColumns().name.name).toBe('name')
  })
})
