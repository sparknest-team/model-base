import { Column, ColumnDefine, dynamicModelBase, ModelBase } from '@model-base/core'

/** 工厂生成的是静态结构类，只有再次注册列才失效。 */
function base() {
  return dynamicModelBase({ id: { type: 'number', primary: true }, name: { type: 'string' } }) as typeof ModelBase
}

describe('registration-driven column plans', () => {
  it.each(['parent-first', 'child-first'])('propagates late parent columns through cached descendants: %s', order => {
    const Base = base()
    class Child extends Base { @Column() extra!: string }
    class Grandchild extends Child { @Column() leaf!: string }
    const parent = Base.create({ id: 1, name: 'parent' })
    const child = Child.create({ id: 2, name: 'child' })
    const grandchild = Grandchild.create({ id: 3, name: 'grandchild' })
    const before = grandchild.getColumnsCached()
    ColumnDefine({ type: Number })(Base.prototype, 'age')
    const readers = order === 'parent-first' ? [parent, child, grandchild] : [grandchild, child, parent]
    readers.forEach(value => expect(value.getColumnsCached().age.type).toBe(Number))
    expect(before.age).toBeUndefined()
    expect(grandchild.getColumnsCached()).not.toBe(before)
    expect(Grandchild.create({ age: 8 }).getSerializableObject()).toEqual({ age: 8 })
    expect(parent.getColumns().extra).toBeUndefined()
  })

  it('preserves child overrides and field order when a parent definition changes', () => {
    const Base = base()
    class Child extends Base { @Column({ name: 'child_name' }) name!: string }
    const child = Child.create({ child_name: 'saved' })
    ColumnDefine({ name: 'parent_name' })(Base.prototype, 'name')
    ColumnDefine()(Base.prototype, 'later')
    expect(Object.keys(child.getColumnsCached())).toEqual(['id', 'name', 'later'])
    expect(child.getColumnsCached().name.name).toBe('child_name')
    expect(Base.create({ parent_name: 'parent' }).getSerializableObject()).toEqual({ parent_name: 'parent' })
    expect(child.getSerializableObject()).toEqual({ child_name: 'saved' })
  })

  it('does not rebuild unrelated or sibling plans after registration', () => {
    const Base = base()
    class Left extends Base {}
    class Right extends Base {}
    const left = Left.create({})
    const right = Right.create({})
    const parent = Base.create({})
    const rightPlan = right.getColumnsCached()
    const parentPlan = parent.getColumnsCached()
    const Other = base()
    Other.create({})
    expect(right.getColumnsCached()).toBe(rightPlan)
    ColumnDefine()(Left.prototype, 'left')
    expect(left.getColumnsCached().left).toBeDefined()
    expect(right.getColumnsCached()).toBe(rightPlan)
    expect(parent.getColumnsCached()).toBe(parentPlan)
  })

  it('rebuilds once after several registrations and shares the result across instances', () => {
    const Value = base()
    const a = Value.create({})
    const b = Value.create({})
    const before = a.getColumnsCached()
    ColumnDefine()(Value.prototype, 'x')
    ColumnDefine()(Value.prototype, 'y')
    const after = b.getColumnsCached()
    expect(after).not.toBe(before)
    expect(a.getColumnsCached()).toBe(after)
    expect(Object.keys(after)).toEqual(['id', 'name', 'x', 'y'])
  })

  it('does not implicitly save business edits when a new column is registered', () => {
    const Value = base()
    const value = Value.create({ id: 1, name: 'saved' })
    value.setColumnData('name', 'edited')
    ColumnDefine()(Value.prototype, 'extra')
    value.setColumnData('extra', 'new')
    expect(value.getOriginalData()).toEqual({ id: 1, name: 'saved' })
    expect(value.getChangedData()).toEqual({ name: 'edited', extra: 'new' })
    value.revertChangedData()
    expect(value.getSerializableObject()).toEqual({ id: 1, name: 'saved' })
    expect(value.isChanged()).toBe(false)
  })

  it('keeps old snapshot names after a column is redefined', () => {
    const Value = base()
    const value = Value.create({ name: 'saved' })
    value.setColumnData('name', 'edited')
    ColumnDefine({ name: 'renamed' })(Value.prototype, 'name')
    expect(value.getOriginalData()).toEqual({ name: 'saved' })
    expect(value.getSerializableObject()).toEqual({ renamed: 'edited' })
    value.saveChangedData()
    value.setColumnData('name', 'later')
    expect(value.getOriginalData()).toEqual({ renamed: 'edited' })
    value.revertChangedData()
    expect(value.getColumnData('name')).toBe('edited')
  })

  it('does not apply a newly registered serializer retroactively to the old snapshot', () => {
    const Value = base()
    const value = Value.create({ name: 'saved' })
    const serialize = jest.fn(({ value }) => `new:${value}`)
    ColumnDefine({ serialize })(Value.prototype, 'name')
    expect(value.getOriginalData()).toEqual({ name: 'saved' })
    expect(serialize).not.toHaveBeenCalled()
    expect(value.getSerializableObject()).toEqual({ name: 'new:saved' })
    expect(serialize).toHaveBeenCalledTimes(1)
  })

  it('retains a declared field after deleting its instance value in columnsInValue mode', () => {
    const Value = base()
    const value: any = Value.create({ name: 'saved', extra: 1 }, { columnsInValue: true })
    delete value.name
    delete value.extra
    expect(value.getColumnsCached().name).toBeDefined()
    expect(value.getColumnsCached().extra).toBeUndefined()
    expect(value.getColumnsCached({ dto: { fresh: true } }).fresh.type).toBe(Boolean)
    expect(value.getColumnsCached().fresh).toBeUndefined()
  })

  it('preserves a parent snapshot when the child advances to newly registered columns', () => {
    const Child = base()
    const Parent = dynamicModelBase({ child: { type: 'object', model: Child } }) as typeof ModelBase
    const parent: any = Parent.create({ child: { name: 'saved' } })
    parent.child.name = 'edited'
    ColumnDefine()(Child.prototype, 'extra')
    parent.child.extra = 'new'
    parent.child.saveChangedData()
    expect(parent.getOriginalData()).toEqual({ child: { name: 'saved' } })
    expect(parent.child.getOriginalData()).toEqual({ name: 'edited', extra: 'new' })
  })

  it.each([true, false])('keeps columnsInValue live when snapshot=%s', enableSnapshot => {
    class Value extends ModelBase {}
    const value: any = Value.create({ count: 1 }, { columnsInValue: true, enableSnapshot })
    expect(value.getColumnsCached().count.type).toBe(Number)
    value.count = 'text'
    value.extra = true
    expect(value.getColumnsCached().count.type).toBe(String)
    expect(value.getColumnsCached().extra.type).toBe(Boolean)
    delete value.extra
    expect(value.getColumnsCached().extra).toBeUndefined()
    value.update({ later: 2 })
    expect(value.getSerializableObject()).toEqual({ count: 'text', later: 2 })
  })

  it('lets explicit columns override inference without sharing inferred fields between instances', () => {
    const Value = base()
    const a = Value.create({ name: 'a', x: 1 }, { columnsInValue: true })
    const b = Value.create({ name: 'b', y: true }, { columnsInValue: true })
    ColumnDefine({ name: 'label' })(Value.prototype, 'name')
    expect(a.getSerializableObject()).toEqual({ label: 'a', x: 1 })
    expect(b.getSerializableObject()).toEqual({ label: 'b', y: true })
  })

  it('isolates public metadata and primary-column copies from internal plans', () => {
    const value = base().create({ id: 1 })
    value.getColumns().id.name = 'changed'
    value.getPrimaryKey()[0].primaryColumn.primary = false
    expect(value.getPrimaryValue()).toEqual([1])
    expect(value.getPrimaryValueFromData({ id: 2 })).toEqual([2])
    expect(value.getSerializableObject()).toEqual({ id: 1 })
  })

  it('retains custom column queries on every call without sharing instance-dependent output', () => {
    const Base = base()
    let calls = 0
    class Value extends Base {
      getColumns(data?: { dto?: any }) {
        calls++
        const columns = super.getColumns(data)
        if (this.getColumnData('hide') || data?.dto?.hide) delete columns.name
        return columns
      }
    }
    const a = Value.create({ name: 'visible' })
    const b = Value.create({ name: 'hidden' })
    b.setColumnData('hide', true)
    calls = 0
    expect(a.getColumnsCached().name).toBeDefined()
    expect(b.getColumnsCached().name).toBeUndefined()
    expect(a.getColumnsCached({ dto: { hide: true } }).name).toBeUndefined()
    expect(calls).toBe(3)
    expect(a.getSerializableObject()).toEqual({ name: 'visible' })
  })

  it('preserves overridden primary methods rather than substituting the static plan', () => {
    const Base = base()
    const read = jest.fn()
    class Value extends Base {
      getPrimaryKey() {
        read()
        return [{ primaryKey: 'name', primaryColumn: this.getColumns().name }]
      }
    }
    const value = Value.create({ id: 1, name: 'custom' })
    read.mockClear()
    expect(value.getPrimaryValue()).toEqual(['custom'])
    expect(value.getPrimaryValueFromData({ id: 2, name: 'dto' })).toEqual(['dto'])
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('picks up newly registered primary columns without leaking them into old public copies', () => {
    const Value = base()
    const value = Value.create({ id: 1, name: 'second' })
    const before = value.getPrimaryKey()
    ColumnDefine({ primary: true })(Value.prototype, 'name')
    expect(value.getPrimaryValue()).toEqual([1, 'second'])
    expect(value.getPrimaryValueFromData({ id: 2, name: 'dto' })).toEqual([2, 'dto'])
    expect(before.map(item => item.primaryKey)).toEqual(['id'])
  })

  it('sees registrations from another package copy without changing the class identity', () => {
    const Value = base()
    class Child extends Value {}
    const child = Child.create({})
    child.getColumnsCached()
    let other!: typeof import('../../src')
    jest.isolateModules(() => { other = require('../../src') })
    other.ColumnDefine({ type: Number })(Value.prototype, 'added')
    expect(child.getColumnsCached().added.type).toBe(Number)
    expect(Child.create({ added: 2 }).getSerializableObject()).toEqual({ added: 2 })
  })
})
