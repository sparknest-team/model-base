import { types } from 'node:util'
import { computed, nextTick, reactive, ref, toRaw, toRefs, watch } from 'vue'
import { Column, DataModel, ModelBase } from '@model-base/core'

class Item extends ModelBase {
  @Column({ primary: true }) id!: number
  @Column() name!: string
}
class List extends ModelBase {
  @Column({ model: Item }) items!: Item[]
}

describe('snapshot options and Proxy contracts', () => {
  it.each(['enableSnapshot', 'enableDataState'])('%s disables all snapshot APIs', key => {
    const value = Item.create({ id: 1, name: 'old' }, { [key]: false })
    value.name = 'new'
    expect(types.isProxy(value)).toBe(false)
    value.saveChangedData({ enableSnapshot: true, enableDataState: true })
    expect(value.getOriginalData()).toEqual({})
    expect(value.getChangedData()).toEqual({})
    expect(value.getChangedDescriptor()).toEqual({})
    expect(value.isChanged()).toBe(false)
    value.revertChangedData()
    ModelBase.revertChangedData([value])
    ModelBase.revertChangedData({ value })
    expect(value.name).toBe('new')
    expect(value.getSerializableObject()).toEqual({ id: 1, name: 'new' })
    value.update({ name: 'updated' })
    value.setDataByOriginal({ name: 'reset' })
    expect(value.getOriginalData()).toEqual({})
  })

  it('resolves aliases within each configuration layer before applying precedence', () => {
    @DataModel({ enableSnapshot: false, enableDataState: true })
    class Disabled extends Item {}
    @DataModel({ enableSnapshot: true, enableDataState: false })
    class Enabled extends Item {}
    expect(types.isProxy(Disabled.create({}))).toBe(false)
    expect(types.isProxy(Disabled.create({}, { enableDataState: true }))).toBe(true)
    expect(types.isProxy(Enabled.create({}))).toBe(true)
    expect(types.isProxy(Enabled.create({}, { enableDataState: false }))).toBe(false)
    expect(types.isProxy(Item.create({}, { enableSnapshot: false, enableDataState: true }))).toBe(false)
    expect(types.isProxy(Item.create({}, { enableSnapshot: true, enableDataState: false }))).toBe(true)
    expect(types.isProxy(Disabled.create({}))).toBe(false)
  })

  it.each(['enableSnapshot', 'enableDataState'])('%s enables complete snapshot lifecycle', key => {
    const value = Item.create({ id: 1, name: 'old' }, { [key]: true })
    expect(types.isProxy(value)).toBe(true)
    value.name = 'new'
    expect(value.getChangedData()).toEqual({ name: 'new' })
    expect(value.getChangedDescriptor().name).toBeDefined()
    expect(value.isChanged()).toBe(true)
    value.revertChangedData()
    expect(value.name).toBe('old')
    expect(value.isChanged()).toBe(false)
    value.name = 'saved'
    value.saveChangedData()
    value.name = 'changed again'
    value.revertChangedData()
    expect(value.name).toBe('saved')
    value.update({ name: 'updated' })
    expect(value.isChanged()).toBe(false)
    value.setDataByOriginal({ name: 'temporary' }, { keepBackUp: true })
    value.revertChangedData()
    expect(value.name).toBe('updated')
  })

  it('propagates class-level disabling to initialized and appended children', () => {
    @DataModel({ enableSnapshot: false })
    class DisabledList extends List {}
    const value = DisabledList.create({ items: [{ id: 1, name: 'one' }] })
    value.update({ items: [{ id: 2, name: 'two' }] })
    for (const child of value.items) {
      expect(types.isProxy(child)).toBe(false)
      expect(child.getOriginalData()).toEqual({})
    }
  })

  it.each([true, false])('preserves Vue ref/toRefs/watch with snapshots=%s', enableSnapshot => {
    const value = ref(Item.create({ id: 1, name: 'old' }, { enableSnapshot }))
    const { name } = toRefs(value.value)
    const label = computed(() => value.value.name)
    const notify = jest.fn()
    const stop = watch(() => value.value.name, notify, { flush: 'sync' })
    try {
      name.value = 'new'
      expect(label.value).toBe('new')
      expect(notify).toHaveBeenCalledTimes(1)
      expect(types.isProxy(toRaw(value.value))).toBe(enableSnapshot)
      value.value.revertChangedData()
      expect(label.value).toBe(enableSnapshot ? 'old' : 'new')
      expect(notify).toHaveBeenCalledTimes(enableSnapshot ? 2 : 1)
    } finally { stop() }
  })

  it('preserves Vue nested array notifications during edits and rollback', async () => {
    const value = reactive(List.create({ items: [{ id: 1, name: 'old' }] }, { enableSnapshot: true }))
    const notify = jest.fn()
    const stop = watch(() => value.items.map(item => item.name).join(','), notify)
    try {
      value.items[0].name = 'edited'
      value.items.push(Item.create({ id: 2, name: 'added' }))
      await nextTick()
      expect(value.isChanged()).toBe(true)
      expect(notify).toHaveBeenCalledTimes(1)
      value.revertChangedData()
      await nextTick()
      expect(value.items.map(item => item.name)).toEqual(['old'])
      expect(value.isChanged()).toBe(false)
      expect(notify).toHaveBeenCalledTimes(2)
    } finally { stop() }
  })

  it.each([true, false])('notifies Vue watchers for update/setDataByOriginal with snapshots=%s', enableSnapshot => {
    const value = reactive(Item.create({ id: 1, name: 'old' }, { enableSnapshot }))
    const notify = jest.fn()
    const stop = watch(() => value.name, notify, { flush: 'sync' })
    try {
      value.update({ name: 'updated' })
      expect(notify).toHaveBeenCalledTimes(1)
      value.setDataByOriginal({ name: 'replaced' })
      expect(notify).toHaveBeenCalledTimes(2)
      expect(value.getOriginalData()).toEqual(enableSnapshot ? { name: 'replaced' } : {})
    } finally { stop() }
  })

  it('skips serialization callbacks for all disabled snapshot operations', () => {
    const serialize = jest.fn(({ value }) => value)
    class Value extends ModelBase { @Column({ serialize }) name!: string }
    const value = Value.create({ name: 'old' }, { enableSnapshot: false })
    value.saveChangedData({ enableSnapshot: true })
    value.getOriginalData()
    value.getChangedData()
    value.getChangedDescriptor()
    value.isChanged()
    value.revertChangedData()
    expect(serialize).not.toHaveBeenCalled()
  })

  it('keeps instance-level enabling on children reconstructed during rollback', () => {
    @DataModel({ enableSnapshot: false })
    class DisabledList extends List {}
    const value = DisabledList.create({ items: [{ id: 1, name: 'old' }] }, { enableDataState: true })
    value.items[0].name = 'new'
    value.revertChangedData()
    expect(types.isProxy(value.items[0])).toBe(true)
    expect(value.items[0].getOriginalData()).toEqual({ id: 1, name: 'old' })
    value.items[0].name = 'again'
    value.items[0].revertChangedData()
    expect(value.items[0].name).toBe('old')
  })

  it('disables default children and creates no snapshot storage', () => {
    @DataModel({ enableDataState: false })
    class Parent extends ModelBase {
      @Column({ model: Item, default: true }) child!: Item
    }
    const value = new Parent()
    expect(types.isProxy(value.child)).toBe(false)
    expect(value.getOriginalData()).toEqual({})
    expect(Object.prototype.hasOwnProperty.call(Parent, '__CLONE__')).toBe(false)
  })

  it('treats per-save disabling as skipping that save, with new-name precedence', () => {
    const value = Item.create({ name: 'old' })
    value.name = 'new'
    value.saveChangedData({ enableSnapshot: false, enableDataState: true })
    expect(value.getOriginalData()).toEqual({ name: 'old' })
    value.saveChangedData({ enableSnapshot: true, enableDataState: false })
    expect(value.getOriginalData()).toEqual({ name: 'new' })
    expect(types.isProxy(value)).toBe(true)
  })
})
