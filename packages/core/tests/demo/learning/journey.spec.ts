// 文档通过命名 region 引用这些片段；断言验证教程承诺的输出。
// region models
import { CLEAN_ENUM, Column, ColumnDefine, dynamicModelBase, ModelBase } from '@model-base/core'

class Address extends ModelBase {
  @Column() city!: string
}

class Item extends ModelBase {
  @Column({ primary: true }) id!: number
  @Column() label!: string
}

class User extends ModelBase {
  @Column({ primary: true }) id!: number
  @Column() displayName!: string
  @Column({ default: false }) enabled!: boolean
  @Column({ model: Address }) address!: Address
  @Column({ model: Item, default: () => [] }) items!: Item[]
}
// endregion models

describe('documentation learning path', () => {
  it('demonstrates explicit child autowiring', () => {
    // region autowired
    class Container extends ModelBase {
      @Column({ model: Address, autowired: true }) address!: Address
    }
    const container = Container.create({})
    // container.address 是 Address 实例，其 city 尚未赋值。
    // endregion autowired
    expect(container.address).toBeInstanceOf(Address)
    expect(container.address.city).toBeUndefined()
  })

  it('trims only opted-in columns without mutating instance data', () => {
    // region trim
    class Text extends ModelBase {
      @Column({ trim: true }) name!: string
      @Column() code!: string
    }
    const text = Text.create({ name: ' Ada ', code: ' X ' })
    const dto = text.getSerializableObject({ trim: true }) // { name: 'Ada', code: ' X ' }
    // endregion trim
    expect(dto).toEqual({ name: 'Ada', code: ' X ' })
    expect(text.name).toBe(' Ada ')
  })

  it('merges model properties while retaining the baseline', () => {
    // region merge
    const user = User.create({ id: 1, display_name: 'Ada' })
    const patch = User.create({ display_name: 'Grace' }, { noDefault: true })
    user.mergeModel(patch)
    const changes = user.getChangedData() // { display_name: 'Grace' }
    // endregion merge
    expect(user.id).toBe(1)
    expect(changes).toEqual({ display_name: 'Grace' })
  })

  it('invokes an instance method explicitly', () => {
    // region methods
    class Text extends ModelBase {
      @Column() name!: string
      normalize() { this.name = this.name.trim() }
    }
    const text = Text.create({ name: ' Ada ' })
    text.callMethod({ method: 'normalize' })
    // text.name === 'Ada'；不是自动调用 onInit 等生命周期方法。
    // endregion methods
    expect(text.name).toBe('Ada')
    expect(text.isChanged()).toBe(true)
  })

  it('illustrates the simple same-name comparison case', () => {
    // region comparison
    class Value extends ModelBase { @Column() value!: number }
    const first = Value.create({ value: 1 })
    const same = Value.create({ value: 1 })
    const different = Value.create({ value: 2 })
    const equal = first.isModelEqual(same) // true
    const contains = first.isContainsModel(different) // false
    // endregion comparison
    expect(equal).toBe(true)
    expect(contains).toBe(false)
  })
  it('01 creates and serializes declared fields', () => {
    // region create
    const user = User.create({ id: 1, display_name: 'Ada', ignored: 'not a column' })
    const dto = user.getSerializableObject()
    // { id: 1, display_name: 'Ada', enabled: false, items: [] }
    const camel = user.getSerializableObject({ camelCase: true })
    // { id: 1, displayName: 'Ada', enabled: false, items: [] }
    // endregion create
    expect(dto).toEqual({ id: 1, display_name: 'Ada', enabled: false, items: [] })
    expect(camel).toEqual({ id: 1, displayName: 'Ada', enabled: false, items: [] })
    expect(user.isChanged()).toBe(false)
  })

  it('02 applies defaults only when allowed', () => {
    // region defaults
    const first = User.create({})
    const second = User.create({})
    const withoutDefaults = User.create({}, { noDefault: true })
    // first.enabled === false；first.items 与 second.items 是不同数组。
    // withoutDefaults.enabled 和 withoutDefaults.items 均为 undefined。
    // endregion defaults
    expect(first.enabled).toBe(false)
    expect(first.items).not.toBe(second.items)
    expect(withoutDefaults.enabled).toBeUndefined()
    expect(withoutDefaults.items).toBeUndefined()
  })

  it('03 reads aliases and writes canonical field names', () => {
    // region names
    class Profile extends ModelBase {
      @Column({ name: 'display_name', aliasName: 'nickname' }) name!: string
    }
    const profile = Profile.create({ nickname: 'Ada' })
    const dto = profile.getSerializableObject() // { display_name: 'Ada' }
    // endregion names
    expect(profile.name).toBe('Ada')
    expect(dto).toEqual({ display_name: 'Ada' })
  })

  it('04 converts explicitly in both directions', () => {
    // region conversion
    class Price extends ModelBase {
      @Column({
        deserialize: ({ value }) => Number(value),
        serialize: ({ value }) => value.toFixed(2),
      }) amount!: number
    }
    const price = Price.create({ amount: '12.5' })
    const dto = price.getSerializableObject() // { amount: '12.50' }
    // endregion conversion
    expect(price.amount).toBe(12.5)
    expect(dto).toEqual({ amount: '12.50' })
  })

  it('05 selects groups with group taking precedence', () => {
    // region groups
    class View extends ModelBase {
      @Column() id!: number
      @Column({ group: 'detail' }) description!: string
      @Column({ group: 'internal' }) note!: string
    }
    const view = View.create({ id: 1, description: 'public', note: 'private' })
    const detail = view.getSerializableObject({ group: 'detail', excludeGroup: 'detail' })
    // { id: 1, description: 'public' }：未分组字段保留，group 优先。
    // endregion groups
    expect(detail).toEqual({ id: 1, description: 'public' })
  })

  it('06 distinguishes empty-value output policies', () => {
    // region clean
    class Form extends ModelBase {
      @Column() text?: string | null
      @Column() count!: number
      @Column() enabled!: boolean
    }
    const form = Form.create({ text: '', count: 0, enabled: false })
    const normal = form.getSerializableObject() // { text: '', count: 0, enabled: false }
    const clean = form.getCleanSerializableObject() // { count: 0, enabled: false }
    form.text = null
    const keepNull = form.getSerializableObject({ clean: CLEAN_ENUM.CLEAN_UNDEFINED })
    // { text: null, count: 0, enabled: false }
    // endregion clean
    expect(normal).toEqual({ text: '', count: 0, enabled: false })
    expect(clean).toEqual({ count: 0, enabled: false })
    expect(keepNull).toEqual({ text: null, count: 0, enabled: false })
  })

  it('07 saves and reverts the latest baseline', () => {
    // region lifecycle
    const user = User.create({ display_name: 'Ada' })
    user.displayName = 'Grace'
    const changes = user.getChangedData() // { display_name: 'Grace' }
    const changed = user.isChanged() // true
    user.saveChangedData() // 仅保存本地基准，不发送网络请求。
    user.displayName = 'temporary'
    user.revertChangedData()
    // user.displayName === 'Grace'，user.isChanged() === false。
    // endregion lifecycle
    expect(changes).toEqual({ display_name: 'Grace' })
    expect(changed).toBe(true)
    expect(user.displayName).toBe('Grace')
    expect(user.isChanged()).toBe(false)
  })

  it('08 update accepts server data and saves it', () => {
    // region update
    const user = User.create({ id: 1, display_name: 'Ada' })
    user.update({ display_name: 'server value' })
    const changes = user.getChangedData() // {}：update 自动建立新保存点。
    user.displayName = 'local edit'
    user.revertChangedData() // 恢复为 server value，而不是 Ada。
    // endregion update
    expect(changes).toEqual({})
    expect(user.displayName).toBe('server value')
    expect(user.id).toBe(1)
  })

  it('09 refills while keeping the old baseline explicitly', () => {
    // region refill
    const user = User.create({ id: 1, display_name: 'Ada' })
    user.setDataByOriginal({ id: 1, display_name: 'draft' }, { keepBackUp: true })
    const changes = user.getChangedData() // { display_name: 'draft' }
    user.revertChangedData() // displayName 恢复为 Ada。
    // endregion refill
    expect(changes).toEqual({ display_name: 'draft' })
    expect(user.displayName).toBe('Ada')
  })

  it('10 isolates declared children and tracks nested edits', () => {
    // region nested
    const address = { city: '北京' }
    const user = User.create({ address })
    address.city = '外部修改' // 不影响 user.address。
    user.address.city = '上海'
    const changes = user.getChangedData() // { address: { city: '上海' } }
    user.revertChangedData() // user.address.city 恢复为 北京。
    // endregion nested
    expect(changes).toEqual({ address: { city: '上海' } })
    expect(user.address.city).toBe('北京')
  })

  it('11 classifies model array changes by primary key', () => {
    // region arrays
    const user = User.create({ items: [{ id: 1, label: 'old' }, { id: 2, label: 'remove' }] })
    user.items[0].label = 'edited'
    user.items.splice(1, 1, Item.create({ id: 3, label: 'new' }))
    const changes = user.getChangedDescriptor().items.primaryChangeDescriptor
    // { create: [{ id: 3, label: 'new' }], delete: [{ id: 2, label: 'remove' }],
    //   update: [{ id: 1, label: 'edited' }], noChange: [] }
    // endregion arrays
    expect(changes).toEqual({ create: [{ id: 3, label: 'new' }], delete: [{ id: 2, label: 'remove' }],
      update: [{ id: 1, label: 'edited' }], noChange: [] })
  })

  it('12 merges array updates without deleting unmatched rows', () => {
    // region arrayUpdate
    const user = User.create({ items: [{ id: 1, label: 'old' }, { id: 2, label: 'keep' }] })
    user.update({ items: [{ id: 1, label: 'updated' }, { id: 3, label: 'new' }] })
    const ids = user.items.map(item => item.id) // [1, 2, 3]，未匹配旧项保留。
    user.update({ items: [] }) // 显式空数组才清空。
    // endregion arrayUpdate
    expect(ids).toEqual([1, 2, 3])
    expect(user.items).toEqual([])
    expect(user.isChanged()).toBe(false)
  })

  it('13 creates runtime-defined but structurally static classes', () => {
    // region dynamic
    const Product = dynamicModelBase({
      title: { type: 'string' },
      count: { type: 'number' },
      address: { type: 'object', model: { city: { type: 'string' } } },
    })
    // 当前工厂返回类型未声明静态 create；这里使用无需类型断言的 new。
    const product = new Product({ title: 'Book', count: 2, address: { city: '北京' } })
    product.setColumnData('count', 3)
    const changes = product.getChangedData() // { count: 3 }
    product.revertChangedData()
    // endregion dynamic
    expect(changes).toEqual({ count: 3 })
    expect(product.getColumnData('count')).toBe(2)
  })

  it('14 infers fields after creation in columnsInValue mode', () => {
    // region inferred
    class Flexible extends ModelBase {}
    const value = Flexible.create({ count: 1 }, { columnsInValue: true, keepModelName: true })
    value.setColumnData('extra', 'added')
    const dto = value.getSerializableObject() // { count: 1, extra: 'added' }
    value.setColumnData('count', 'text')
    const type = value.getColumns().count.type // String，而不是初始化时的 Number。
    // endregion inferred
    expect(dto).toEqual({ count: 1, extra: 'added' })
    expect(type).toBe(String)
  })

  it('15 registers fields without accepting pending edits', () => {
    // region registration
    const Model = dynamicModelBase({ name: { type: 'string' } })
    const value = new Model({ name: 'saved' })
    value.setColumnData('name', 'edited')
    ColumnDefine({ type: Number })(Model.prototype, 'age')
    value.setColumnData('age', 18)
    const before = value.getOriginalData() // { name: 'saved' }：注册不重置快照。
    const changes = value.getChangedData() // { name: 'edited', age: 18 }
    // endregion registration
    expect(before).toEqual({ name: 'saved' })
    expect(changes).toEqual({ name: 'edited', age: 18 })
  })

  it('16 transforms without snapshots', () => {
    // region node
    const user = User.create({ display_name: 'Ada', address: { city: '北京' } }, { enableSnapshot: false })
    user.displayName = 'Grace'
    user.revertChangedData() // 关闭快照后，不执行还原。
    const changed = user.isChanged() // false，不代表业务值未修改。
    const original = user.getOriginalData() // {}
    const dto = user.getSerializableObject() // 仍可正常输出当前数据。
    // endregion node
    expect(changed).toBe(false)
    expect(original).toEqual({})
    expect(dto.display_name).toBe('Grace')
    expect(user.address.getOriginalData()).toEqual({})
  })

  it('17 handles typed dictionaries', () => {
    // region records
    class Directory extends ModelBase {
      @Column({ type: 'record', model: Address }) offices!: Record<string, Address>
      @Column({ type: 'recordArray', model: Item }) teams!: Record<string, Item[]>
    }
    const directory = Directory.create({ offices: { hq: { city: '北京' } }, teams: { a: [{ id: 1, label: 'A' }] } })
    directory.offices.hq.city = '上海'
    directory.teams.a.push(Item.create({ id: 2, label: 'B' }))
    directory.revertChangedData()
    // offices.hq.city === '北京'；teams.a.length === 1。
    // endregion records
    expect(directory.offices.hq.city).toBe('北京')
    expect(directory.teams.a).toHaveLength(1)
  })

  it('18 reads and writes properties without registering columns', () => {
    // region access
    const user = User.create({ display_name: 'Ada' })
    user.setColumnData('displayName', 'Grace') // 使用实例属性名，不是 display_name。
    const name = user.getColumnData('displayName') // Grace
    user.setColumnData('temporary', 'not registered')
    const dto = user.getSerializableObject() // 不包含 temporary。
    // endregion access
    expect(name).toBe('Grace')
    expect(dto.temporary).toBeUndefined()
  })
})
