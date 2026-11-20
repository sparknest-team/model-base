import { CLEAN_ENUM, Column, ModelBase } from '@model-base/core'

class TrackedItem extends ModelBase {
  @Column({ primary: true }) id!: number
  @Column() label!: string
}
class TrackedList extends ModelBase {
  @Column({ model: TrackedItem }) lineItems!: TrackedItem[]
}

describe('change tracking refactoring compatibility', () => {
  it('reports create, update and delete with property keys and serialized data keys', () => {
    class Value extends ModelBase {
      @Column() newValue?: string
      @Column() oldValue?: string
      @Column() changedValue?: string
    }
    const value = Value.create({ old_value: 'old', changed_value: 'before' })
    value.newValue = 'new'
    value.oldValue = undefined
    value.changedValue = 'after'
    const descriptor = value.getChangedDescriptor()
    expect(descriptor.newValue).toMatchObject({ action: 'CREATE', dataKey: 'new_value', currentValue: 'new' })
    expect(descriptor.oldValue).toMatchObject({ action: 'DELETE', dataKey: 'old_value', oldValue: 'old' })
    expect(descriptor.changedValue).toMatchObject({ action: 'UPDATE', dataKey: 'changed_value', currentValue: 'after' })
    expect(value.getChangedData()).toEqual({ new_value: 'new', old_value: undefined, changed_value: 'after' })
  })

  it('preserves unchanged array descriptors without reporting changed data', () => {
    const model = TrackedList.create({ line_items: [{ id: 1, label: 'same' }] })
    expect(model.getChangedData()).toEqual({})
    expect(model.getChangedDescriptor().lineItems).toEqual({ primaryChangeDescriptor: {
      create: [], delete: [], update: [], noChange: [{ id: 1, label: 'same' }],
    } })
  })

  it('keeps last-match semantics for duplicate keys in array descriptors', () => {
    const model = TrackedList.create({ line_items: [{ id: 1, label: 'old' }, { id: 2, label: 'removed' }] })
    model.lineItems = [
      TrackedItem.create({ id: 1, label: 'first' }),
      TrackedItem.create({ id: 1, label: 'last' }),
      TrackedItem.create({ id: 3, label: 'added' }),
    ]
    expect(model.getChangedDescriptor().lineItems.primaryChangeDescriptor).toEqual({
      create: [{ id: 3, label: 'added' }],
      delete: [{ id: 2, label: 'removed' }],
      update: [{ id: 1, label: 'last' }],
      noChange: [],
    })
    expect(model.getOriginalData().line_items).toEqual([{ id: 1, label: 'old' }, { id: 2, label: 'removed' }])
  })

  it('retains explicit null with CLEAN_UNDEFINED and restores the saved baseline', () => {
    class Value extends ModelBase { @Column() label?: string | null }
    const model = Value.create({ label: 'saved' })
    model.label = null
    expect(model.getChangedDescriptor({ clean: CLEAN_ENUM.CLEAN_UNDEFINED }).label.action).toBe('UPDATE')
    expect(model.getChangedDescriptor({ clean: CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL }).label.action).toBe('DELETE')
    model.revertChangedData()
    expect(model.label).toBe('saved')
    expect(model.isChanged()).toBe(false)
  })
})
