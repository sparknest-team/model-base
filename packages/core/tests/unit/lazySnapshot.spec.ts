import { Column, ModelBase } from '@model-base/core'
import { nextTick, reactive, watch } from 'vue'
import { types } from 'node:util'
import lodash from 'lodash'
import { __CLONE__ } from '../../src/constant'
import { hasDeferredSnapshot, recordedKeyCount } from '../../src/_utils/changeTracking/proxyState'

class Address extends ModelBase {
  @Column({ primary: true }) id!: number
  @Column() city!: string
}
class User extends ModelBase {
  @Column() name!: string
  @Column({ model: Address }) address!: Address
  @Column({ model: Address }) addresses!: Address[]
  @Column({ model: Address, type: 'record' }) records!: Record<string, Address>
  @Column({ model: Address, type: 'recordArray' }) groups!: Record<string, Address[]>
}
const make = () => User.create({
  name: 'Ada', address: { id: 1, city: '北京' },
  addresses: [{ id: 1, city: '北京' }, { id: 2, city: '杭州' }],
  records: { home: { id: 1, city: '北京' } },
  groups: { work: [{ id: 2, city: '杭州' }] },
})

describe('node-local copy-on-write save points', () => {
  it('does not clone or stringify model data during initialization and ordinary writes', () => {
    make() // Warm immutable decorator metadata, outside the measured operation.
    const copy = jest.spyOn(lodash, 'cloneDeep')
    const customCopy = jest.spyOn(lodash, 'cloneDeepWith')
    const stringify = jest.spyOn(JSON, 'stringify')
    try {
      const user = make()
      user.address.city = '上海'
      user.address.city = '深圳'
      user.addresses.reverse()
      user.groups.work.pop()
      user.address = Address.create({ id: 4, city: '成都' })
      expect(copy).not.toHaveBeenCalled()
      expect(customCopy).not.toHaveBeenCalled()
      expect(stringify).not.toHaveBeenCalled()
    } finally { copy.mockRestore(); customCopy.mockRestore(); stringify.mockRestore() }
  })
  it.each(['new', 'create'])('%s builds independent child models without a snapshot DTO', route => {
    const address = { id: 1, city: '北京' }
    const user = route === 'new' ? new User({ address }) : User.create({ address })
    expect(user.address).not.toBe(address)
    address.city = '外部修改'
    expect(user.address.city).toBe('北京')
    expect(hasDeferredSnapshot(user)).toBe(true)
    expect(hasDeferredSnapshot(user.address)).toBe(true)
    expect(WeakMap.prototype.get.call((User as any)[__CLONE__], user)).toBeUndefined()
    expect(recordedKeyCount(user)).toBe(0)
    expect(recordedKeyCount(user.address)).toBe(0)
  })

  it('records each key once, without notifying or copying the parent', () => {
    const user = make()
    user.address.city = '上海'
    user.address.city = '深圳'
    expect(recordedKeyCount(user.address)).toBe(1)
    expect(recordedKeyCount(user)).toBe(0)
    expect(WeakMap.prototype.get.call((Address as any)[__CLONE__], user.address)).toBeUndefined()
    expect(user.getChangedData()).toEqual({ address: { id: 1, city: '深圳' } })
    expect(user.getOriginalData().address).toEqual({ id: 1, city: '北京' })
    user.address.city = '北京'
    expect(user.isChanged()).toBe(false)
  })

  it('restores the original child after deep edits followed by reference replacement', () => {
    const user = make()
    const previous = user.address
    previous.city = '上海'
    user.address = Address.create({ id: 3, city: '深圳' })
    previous.city = '成都'
    expect(recordedKeyCount(user)).toBe(1)
    expect(user.getOriginalData().address).toEqual({ id: 1, city: '北京' })
    user.revertChangedData()
    expect(user.address.city).toBe('北京')
    expect(user.isChanged()).toBe(false)
    user.address.city = '南京'
    user.revertChangedData()
    expect(user.address.city).toBe('北京')
  })

  it('keeps parent and child save points independent in both directions', () => {
    const user = make()
    const child = user.address
    child.city = '上海'
    child.saveChangedData()
    child.city = '深圳'
    expect(user.getOriginalData().address.city).toBe('北京')
    expect(child.getOriginalData().city).toBe('上海')
    user.saveChangedData()
    child.city = '成都'
    expect(user.getOriginalData().address.city).toBe('深圳')
    expect(child.getOriginalData().city).toBe('上海')
    child.revertChangedData()
    expect(child.city).toBe('上海')
    expect(user.isChanged()).toBe(true)
    user.revertChangedData()
    expect(user.address.city).toBe('深圳')
  })

  it.each([
    ['push', (list: Address[]) => list.push(Address.create({ id: 3, city: '上海' }))],
    ['pop', (list: Address[]) => list.pop()],
    ['shift', (list: Address[]) => list.shift()],
    ['unshift', (list: Address[]) => list.unshift(Address.create({ id: 3, city: '上海' }))],
    ['splice', (list: Address[]) => list.splice(0, 1, Address.create({ id: 3, city: '上海' }))],
    ['reverse', (list: Address[]) => list.reverse()],
    ['sort', (list: Address[]) => list.sort((a, b) => b.id - a.id)],
    ['index', (list: Address[]) => { list[0] = Address.create({ id: 3, city: '上海' }) }],
    ['length', (list: Address[]) => { list.length = 0 }],
    ['coerced length', (list: Address[]) => { Reflect.set(list, 'length', '0') }],
    ['delete', (list: Address[]) => { delete list[0] }],
    ['defineProperty', (list: Address[]) => Object.defineProperty(list, 'length', { value: 0 })],
  ] as const)('tracks array %s and restores the original sequence', (_name, mutate) => {
    const user = make()
    user.addresses[0].city = '修改过'
    mutate(user.addresses)
    expect(recordedKeyCount(user)).toBe(0)
    expect(user.isChanged()).toBe(true)
    expect(user.getOriginalData().addresses).toEqual([{ id: 1, city: '北京' }, { id: 2, city: '杭州' }])
    user.revertChangedData()
    expect(user.addresses.map(x => x.city)).toEqual(['北京', '杭州'])
    expect(user.isChanged()).toBe(false)
  })

  it('tracks record keys and nested record-array structure', () => {
    const user = make()
    user.records.home.city = '上海'
    delete user.records.home
    user.records.work = Address.create({ id: 3, city: '深圳' })
    user.groups.work[0].city = '南京'
    user.groups.work.length = 0
    user.groups.other = [Address.create({ id: 4, city: '成都' })]
    expect(user.getOriginalData().records).toEqual({ home: { id: 1, city: '北京' } })
    expect(user.getOriginalData().groups).toEqual({ work: [{ id: 2, city: '杭州' }] })
    user.revertChangedData()
    expect(user.isChanged()).toBe(false)
  })

  it('ignores failed writes and restores holes and grown array lengths', () => {
    const user = make()
    expect(Reflect.set(Object.freeze(user.address), 'city', '失败')).toBe(false)
    expect(user.getOriginalData().address.city).toBe('北京')
    user.saveChangedData()
    user.addresses[5] = Address.create({ id: 6, city: '上海' })
    user.addresses.length = 10
    expect(user.getOriginalData().addresses).toHaveLength(2)
    user.revertChangedData()
    expect(user.addresses).toHaveLength(2)
  })

  it('handles several generations without overwriting an older ancestor', () => {
    class Root extends ModelBase { @Column({ model: User }) user!: User }
    const root = Root.create({ user: { address: { id: 1, city: '北京' } } })
    root.user.address.city = '上海'
    root.user.saveChangedData()
    root.user.address.city = '深圳'
    root.user.address.saveChangedData()
    root.user.address.city = '成都'
    expect(root.getOriginalData().user.address.city).toBe('北京')
    expect(root.user.getOriginalData().address.city).toBe('上海')
    expect(root.user.address.getOriginalData().city).toBe('深圳')
  })

  it('recognizes equal replacement values and absent fields', () => {
    const user = User.create({ address: { id: 1, city: '北京' } }, { noDefault: true })
    expect(hasDeferredSnapshot(user)).toBe(true)
    user.address = Address.create({ id: 1, city: '北京' })
    expect(user.isChanged()).toBe(false)
    user.name = 'new'
    expect(user.getChangedData()).toEqual({ name: 'new' })
  })

  it('preserves function values and undefined/null filtering in lazy snapshots', () => {
    class Values extends ModelBase {
      @Column() fn!: any
      @Column() absent!: any
      @Column() empty!: any
    }
    const fn = () => 1
    const value = Values.create({ fn, empty: null })
    value.fn = () => 2
    expect(value.getOriginalData()).toEqual({ fn })
    expect(value.getOriginalData().fn).toBe(fn)
  })

  it('preserves save-time serialization hooks in nested compatibility graphs', () => {
    const serialize = jest.fn(({ value }) => `${value}!`)
    class Custom extends ModelBase { @Column({ serialize }) value!: string }
    class Parent extends ModelBase { @Column({ model: Custom }) child!: Custom }
    const parent = Parent.create({ child: { value: 'old' } })
    expect(serialize).toHaveBeenCalledTimes(2) // Child and parent each save their DTO.
    expect(hasDeferredSnapshot(parent)).toBe(false)
    parent.child.value = 'new'
    expect(parent.getOriginalData()).toEqual({ child: { value: 'old!' } })
  })

  it('does not wrap opaque objects or arrays without a model declaration', () => {
    class Opaque extends ModelBase { @Column() payload!: any; @Column() list!: any[] }
    const payload = { nested: { count: 1 } }
    const value = Opaque.create({ payload, list: [{ count: 1 }] })
    expect(value.payload).toBe(payload)
    expect(types.isProxy(value.payload)).toBe(false)
    expect(types.isProxy(value.list)).toBe(false)
    value.payload.nested.count = 2
    value.list[0].count = 2
    expect(recordedKeyCount(value)).toBe(0)
  })

  it('disables the entire model/container tracking graph', () => {
    const user = User.create({ addresses: [{ id: 1, city: '北京' }] }, { enableSnapshot: false })
    expect(types.isProxy(user)).toBe(false)
    expect(types.isProxy(user.addresses)).toBe(false)
    expect(types.isProxy(user.addresses[0])).toBe(false)
    user.addresses[0].city = '上海'
    user.saveChangedData({ enableSnapshot: true })
    user.revertChangedData()
    expect(user.addresses[0].city).toBe('上海')
    expect(user.getChangedData()).toEqual({})
  })

  it('supports Vue nested edits, container edits and reactive rollback', async () => {
    const user = reactive(make())
    const changed = jest.fn()
    const stop = watch(() => [user.address.city, user.addresses.length, user.groups.work.length], changed)
    try {
      user.address.city = '上海'
      user.addresses.pop()
      user.groups.work.push(Address.create({ id: 3, city: '深圳' }))
      await nextTick()
      expect(changed).toHaveBeenCalledTimes(1)
      expect(user.isChanged()).toBe(true)
      user.revertChangedData()
      await nextTick()
      expect(changed).toHaveBeenCalledTimes(2)
      expect(user.address.city).toBe('北京')
      expect(user.addresses).toHaveLength(2)
      expect(user.groups.work).toHaveLength(1)
      expect(user.isChanged()).toBe(false)
    } finally { stop() }
  })

  it('matches an eager reference across deterministic mixed mutations and saves', () => {
    const user = make()
    let expected = user.getSerializableObject()
    let seed = 17
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed }
    for (let step = 0; step < 150; step++) {
      switch (random() % 9) {
        case 0: user.address.city = `city-${step}`; break
        case 1: user.address.saveChangedData(); break
        case 2: user.addresses.push(Address.create({ id: step + 10, city: `city-${step}` })); break
        case 3: user.addresses.reverse(); break
        case 4: user.addresses.splice(0, 1); break
        case 5: user.address = Address.create({ id: step + 10, city: `city-${step}` }); break
        case 6: user.records.home.city = `city-${step}`; break
        case 7:
          expected = user.getSerializableObject()
          user.saveChangedData()
          break
        case 8:
          user.revertChangedData()
          expect(user.getSerializableObject()).toEqual(expected)
          break
      }
      if (step % 13 === 0) expect(user.getOriginalData()).toEqual(expected)
    }
    expect(user.getOriginalData()).toEqual(expected)
  })
})
