import { Column, ModelBase } from '@model-base/core'

class UpdateChild extends ModelBase {
  @Column({ primary: true }) id!: number
  @Column() label!: string
}
class UpdateParent extends ModelBase {
  @Column({ model: UpdateChild }) children!: UpdateChild[]
  @Column({ model: UpdateChild }) child!: UpdateChild
  @Column({ default: 'default' }) title!: string
}

describe('update refactoring compatibility', () => {
  it('updates every matching primary key, retains identity and appends new keys', () => {
    const model = UpdateParent.create({ children: [
      { id: 1, label: 'first' }, { id: 1, label: 'duplicate' }, { id: 2, label: 'retained' },
    ] })
    const original = [...model.children]
    model.update({ children: [{ id: 1, label: 'updated' }, { id: 3, label: 'new' }] })
    expect(model.children.map((item) => item.label)).toEqual(['updated', 'updated', 'retained', 'new'])
    original.forEach((item, index) => expect(model.children[index]).toBe(item))
    expect(model.children[3]).toBeInstanceOf(UpdateChild)
    expect(model.isChanged()).toBe(false)
    model.children[0].label = 'edited'
    model.revertChangedData()
    expect(model.children[0].label).toBe('updated')
  })

  it('distinguishes missing arrays from explicit empty arrays', () => {
    const model = UpdateParent.create({ children: [{ id: 1 }] })
    const children = model.children
    model.update({ children: undefined, title: undefined })
    expect(model.children).toBe(children)
    expect(model.title).toBe('default')
    model.update({ children: [] })
    expect(model.children).toEqual([])
    expect(model.children).not.toBe(children)
  })

  it('creates absent children and updates existing child instances in place', () => {
    const model = UpdateParent.create({})
    model.update({ child: { id: 1, label: 'created' }, children: [{ id: 2 }] })
    const child = model.child
    expect(child).toBeInstanceOf(UpdateChild)
    expect(model.children[0]).toBeInstanceOf(UpdateChild)
    model.update({ child: { label: 'updated' } })
    expect(model.child).toBe(child)
    expect(child.id).toBe(1)
    expect(child.label).toBe('updated')
  })

  it('does not run defaults or converters for missing update fields', () => {
    const defaultValue = jest.fn(() => 'default')
    const convert = jest.fn(({ value }) => value.toUpperCase())
    class Value extends ModelBase {
      @Column({ default: defaultValue, deserialize: convert }) label!: string
    }
    const model = Value.create({})
    model.update({})
    expect(defaultValue).toHaveBeenCalledTimes(1)
    expect(convert).not.toHaveBeenCalled()
    model.update({ label: 'hello' })
    expect(convert).toHaveBeenCalledTimes(1)
    expect(model.label).toBe('HELLO')
    expect(model.getOriginalData()).toEqual({ label: 'HELLO' })
  })
})
