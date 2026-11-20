import { dynamicModelBase, ModelBase } from '@model-base/core'
import { hasDeferredSnapshot } from '../../src/_utils/changeTracking/proxyState'

/** 每次提供新配置：动态工厂会原地归一化列定义。 */
function defineUser() {
  return dynamicModelBase({
    id: { type: 'number', primary: true },
    name: { type: 'string' },
    active: { type: 'boolean' },
    address: { type: 'object', model: { city: { type: 'string' } } },
    items: { type: 'array', model: {
      id: { type: 'number', primary: true }, label: { type: 'string' },
    } },
  }) as typeof ModelBase
}

function dto() {
  return { id: 1, name: 'Ada', active: true, address: { city: '北京' },
    items: [{ id: 1, label: 'first' }, { id: 2, label: 'second' }] }
}

describe('dynamic model storage and change lifecycle', () => {
  it.each(['new', 'create'])('%s isolates declared child data and starts unchanged', route => {
    const User = defineUser()
    const input = dto()
    const user = route === 'new' ? new User(input) : User.create(input)
    input.address.city = 'external'
    input.items[0].label = 'external'
    expect(user.getSerializableObject()).toEqual(dto())
    expect(user.isChanged()).toBe(false)
    expect(user.getChangedData()).toEqual({})
  })

  it('reads and writes columns, distinguishing create, update and delete', () => {
    const User = defineUser()
    const user = User.create({ id: 1, name: 'old' })
    user.setColumnData('active', true)
    user.setColumnData('name', 'new')
    user.setColumnData('id', undefined)
    expect(user.getColumnData('name')).toBe('new')
    expect(user.getChangedData()).toEqual({ id: undefined, name: 'new', active: true })
    const changes = user.getChangedDescriptor()
    expect(changes.id.action).toBe('DELETE')
    expect(changes.name.action).toBe('UPDATE')
    expect(changes.active.action).toBe('CREATE')
  })

  it('keeps a lazy original through nested edits and restores the entire tree', () => {
    const user: any = defineUser().create(dto())
    expect(hasDeferredSnapshot(user)).toBe(true)
    user.address.city = '上海'
    user.items[0].label = 'edited'
    user.items.pop()
    expect(user.isChanged()).toBe(true)
    expect(user.getChangedData()).toEqual({ address: { city: '上海' }, items: [{ id: 1, label: 'edited' }] })
    expect(user.getOriginalData()).toEqual(dto())
    user.revertChangedData()
    expect(user.getSerializableObject()).toEqual(dto())
    expect(user.isChanged()).toBe(false)
  })

  it('advances the baseline repeatedly and preserves DTO read identity', () => {
    const user: any = defineUser().create(dto())
    for (const name of ['Grace', 'Lin', 'Ada']) {
      user.name = name
      user.saveChangedData()
      expect(user.isChanged()).toBe(false)
      const saved = user.getOriginalData()
      expect(saved.name).toBe(name)
      expect(user.getOriginalData()).toBe(saved)
      user.name = 'temporary'
      user.revertChangedData()
      expect(user.name).toBe(name)
    }
  })

  it('keeps parent and dynamic child save points independent', () => {
    const user: any = defineUser().create(dto())
    user.address.city = '上海'
    user.address.saveChangedData()
    user.address.city = '深圳'
    expect(user.address.getOriginalData()).toEqual({ city: '上海' })
    expect(user.getOriginalData().address).toEqual({ city: '北京' })
    user.address.revertChangedData()
    expect(user.address.city).toBe('上海')
    expect(user.isChanged()).toBe(true)
    user.revertChangedData()
    expect(user.address.city).toBe('北京')
  })

  it('classifies dynamic array primary keys after update, removal and insertion', () => {
    const user: any = defineUser().create(dto())
    const Item = user.items[0].constructor
    user.items[0].label = 'edited'
    user.items.splice(1, 1, Item.create({ id: 3, label: 'third' }))
    expect(user.getChangedDescriptor().items.primaryChangeDescriptor).toEqual({
      create: [{ id: 3, label: 'third' }], delete: [{ id: 2, label: 'second' }],
      update: [{ id: 1, label: 'edited' }], noChange: [],
    })
  })

  it('updates matching dynamic array elements and saves the merged baseline', () => {
    const user: any = defineUser().create(dto())
    const first = user.items[0]
    user.update({ items: [{ id: 1, label: 'updated' }, { id: 3, label: 'new' }] })
    expect(user.items[0]).toBe(first)
    expect(user.getSerializableObject().items).toEqual([
      { id: 1, label: 'updated' }, { id: 2, label: 'second' }, { id: 3, label: 'new' },
    ])
    expect(user.isChanged()).toBe(false)
    const saved = user.getSerializableObject()
    user.items[0].label = 'temporary'
    user.items.pop()
    user.revertChangedData()
    expect(user.getSerializableObject()).toEqual(saved)
  })

  it('isolates instances and independently generated class metadata', () => {
    const User = defineUser()
    const first: any = User.create(dto())
    const second: any = User.create(dto())
    const Other = dynamicModelBase({ title: { type: 'string' } }) as typeof ModelBase
    const other = Other.create({ title: 'independent', name: 'ignored' })
    first.address.city = '上海'
    first.saveChangedData()
    second.name = 'changed'
    second.revertChangedData()
    expect(first.getOriginalData().address.city).toBe('上海')
    expect(second.getOriginalData()).toEqual(dto())
    expect(other.getSerializableObject()).toEqual({ title: 'independent' })
    expect(other.isChanged()).toBe(false)
  })

  it.each(['enableSnapshot', 'enableDataState'])('%s=false disables snapshots for dynamic children too', key => {
    const user: any = defineUser().create(dto(), { [key]: false })
    user.name = 'new'
    user.address.city = '上海'
    user.saveChangedData()
    user.revertChangedData()
    expect(user.name).toBe('new')
    expect(user.address.city).toBe('上海')
    expect(user.getOriginalData()).toEqual({})
    expect(user.getChangedData()).toEqual({})
    expect(user.getChangedDescriptor()).toEqual({})
    expect(user.isChanged()).toBe(false)
    expect(user.address.isChanged()).toBe(false)
    expect(hasDeferredSnapshot(user.address)).toBe(false)
  })

  it('round-trips persisted JSON through a fresh dynamic instance', () => {
    const User = defineUser()
    const user: any = User.create(dto())
    user.address.city = '上海'
    const persisted = JSON.stringify(user.getSerializableObject())
    const restored: any = User.create(JSON.parse(persisted))
    expect(restored.getSerializableObject()).toEqual(user.getSerializableObject())
    expect(restored.isChanged()).toBe(false)
    restored.address.city = '深圳'
    restored.revertChangedData()
    expect(restored.address.city).toBe('上海')
    expect(user.address.city).toBe('上海')
  })

  it.each([true, false])('setDataByOriginal honors keepBackUp=%s on dynamic models', keepBackUp => {
    const user = defineUser().create(dto())
    const replacement = { ...dto(), name: 'replacement', address: { city: '上海' } }
    user.setDataByOriginal(replacement, { keepBackUp })
    expect(user.getSerializableObject()).toEqual(replacement)
    expect(user.isChanged()).toBe(keepBackUp)
    expect(user.getOriginalData()).toEqual(keepBackUp ? dto() : replacement)
    user.revertChangedData()
    expect(user.getSerializableObject()).toEqual(keepBackUp ? dto() : replacement)
  })

  it('uses serialized field names for saved DTOs and restores dynamic properties', () => {
    const Value = dynamicModelBase({ displayName: { type: 'string', name: 'user_name' } }) as typeof ModelBase
    const value = Value.create({ user_name: 'Ada' })
    expect(value.getColumnData('displayName')).toBe('Ada')
    value.setColumnData('displayName', 'Grace')
    expect(value.getOriginalData()).toEqual({ user_name: 'Ada' })
    expect(value.getChangedData()).toEqual({ user_name: 'Grace' })
    expect(value.getChangedDescriptor().displayName).toMatchObject({ action: 'UPDATE', dataKey: 'user_name' })
    value.revertChangedData()
    expect(value.getColumnData('displayName')).toBe('Ada')
  })
})
