import { Column, dynamicModelBase, ModelBase } from '@model-base/core'

/** 固定当前兼容边界，不表示配置原地修改是未来推荐的设计。 */
describe('dynamic model definition boundaries', () => {
  it.each([['number', Number], ['string', String], ['boolean', Boolean]])('preserves reused %s configuration', (type, Constructor) => {
    const columns: any = { count: { type } }
    const First = dynamicModelBase(columns)
    expect(columns.count.type).toBe(Constructor)
    const Second = dynamicModelBase(columns)
    expect(columns.count.type).toBe(Constructor)
    expect(new First().getColumns().count.type).toBe(Constructor)
    expect(new Second().getColumns().count.type).toBe(Constructor)
    expect(First).not.toBe(Second)
  })

  it('isolates registered column metadata from subsequent configuration edits', () => {
    const columns: any = { name: { type: 'string', name: 'old_name' } }
    const First = dynamicModelBase(columns)
    columns.name.name = 'new_name'
    columns.name.type = 'string'
    const Second = dynamicModelBase(columns)
    expect(new First({ old_name: 'first' }).getSerializableObject()).toEqual({ old_name: 'first' })
    expect(new Second({ new_name: 'second' }).getSerializableObject()).toEqual({ new_name: 'second' })
  })

  it.each(['object', 'array'])('reuses the normalized nested %s constructor but not its instances', type => {
    const childColumns: any = { name: { type: 'string' } }
    const columns: any = { child: { type, model: childColumns } }
    const First = dynamicModelBase(columns)
    const Child = columns.child.model
    expect(typeof Child).toBe('function')
    expect(childColumns.name.type).toBe(String)
    const Second = dynamicModelBase(columns)
    expect(columns.child.model).toBe(Child)
    const input = { child: type === 'array' ? [{ name: 'saved' }] : { name: 'saved' } }
    const first: any = new First(input)
    const second: any = new Second(input)
    const firstChild = type === 'array' ? first.child[0] : first.child
    const secondChild = type === 'array' ? second.child[0] : second.child
    expect(firstChild).toBeInstanceOf(Child)
    expect(secondChild).toBeInstanceOf(Child)
    expect(firstChild).not.toBe(secondChild)
    firstChild.name = 'edited'
    expect(secondChild.name).toBe('saved')
    first.revertChangedData()
    expect(first.getSerializableObject()).toEqual(input)
  })

  it('preserves explicitly supplied model constructors', () => {
    class Child extends ModelBase { @Column() name!: string }
    const columns: any = { child: { type: 'object', model: Child } }
    const Parent = dynamicModelBase(columns)
    const parent: any = new Parent({ child: { name: 'saved' } })
    expect(columns.child.model).toBe(Child)
    expect(parent.child).toBeInstanceOf(Child)
    parent.child.name = 'edited'
    expect(parent.getChangedData()).toEqual({ child: { name: 'edited' } })
  })

  it('does not support frozen column objects because normalization writes into them', () => {
    expect(() => dynamicModelBase({ name: Object.freeze({ type: 'string' }) })).toThrow(TypeError)
  })

  it('keeps decorated subclass columns separate from a warmed dynamic base', () => {
    const Base = dynamicModelBase({ name: { type: 'string' } }) as typeof ModelBase
    const base = Base.create({ name: 'base' })
    base.getColumnsCached()
    class Child extends Base { @Column() extra!: string }
    const child = Child.create({ name: 'child', extra: 'saved' })
    expect(child.getSerializableObject()).toEqual({ name: 'child', extra: 'saved' })
    expect(base.getSerializableObject()).toEqual({ name: 'base' })
    expect(base.getColumns().extra).toBeUndefined()
    child.extra = 'edited'
    expect(child.getChangedData()).toEqual({ extra: 'edited' })
    child.revertChangedData()
    expect(child.extra).toBe('saved')
  })

  it('does not apply class snapshot options passed through the methods parameter', () => {
    const Value = dynamicModelBase({ name: { type: 'string' } }, { enableSnapshot: false })
    const value = new Value({ name: 'saved' })
    value.setColumnData('name', 'edited')
    expect(value.isChanged()).toBe(true)
    const disabled = new Value({ name: 'saved' }, { enableSnapshot: false })
    disabled.setColumnData('name', 'edited')
    expect(disabled.isChanged()).toBe(false)
  })

  it('inherits static creation at runtime despite its constructor-only return type', () => {
    const Value = dynamicModelBase({ name: { type: 'string' } })
    expect((Value as typeof ModelBase).create).toBe(ModelBase.create)
    expect((Value as typeof ModelBase).create({ name: 'saved' })).toBeInstanceOf(Value)
  })
})

/** 仅由 TypeScript 检查，不执行；类型完善时应主动更新这些历史边界断言。 */
function assertCurrentTypeSurface() {
  const Value = dynamicModelBase({ name: { type: 'string' } })
  const instance: ModelBase = new Value()
  instance.isChanged()
  // @ts-expect-error 当前返回类型只声明 new，未暴露实际继承的静态 create。
  Value.create({ name: 'saved' })
  const Typed = dynamicModelBase<{ name: string }>({ name: { type: 'string' } })
  const name: string = new Typed().name
  // @ts-expect-error 普通对象泛型当前未与 ModelBase 实例方法做交叉。
  new Typed().isChanged()
  return name
}
void assertCurrentTypeSurface
