import { Column, DataModel, ModelBase } from '@model-base/core'

class Address extends ModelBase {
  @Column()
  public city!: string
}

class Profile extends ModelBase {
  @Column()
  public firstName!: string

  @Column({ aliasName: 'legacy_name' })
  public nickname!: string

  @Column({ model: () => Address })
  public address?: Address
}

describe('ModelBase edge cases', () => {
  it('accepts snake case and camel case input in the default mixed naming mode', () => {
    const snakeCase = Profile.create({ first_name: 'Ada' })
    const camelCase = Profile.create({ firstName: 'Grace' })

    expect(snakeCase.firstName).toBe('Ada')
    expect(camelCase.firstName).toBe('Grace')
  })

  it('prefers the primary field name over its alias', () => {
    const profile = Profile.create({
      nickname: 'primary',
      legacy_name: 'legacy',
    })

    expect(profile.nickname).toBe('primary')
  })

  it('creates and serializes a nested child model', () => {
    const profile = Profile.create({
      first_name: 'Ada',
      address: { city: 'London' },
    })

    expect(profile.address).toBeInstanceOf(Address)
    expect(profile.getSerializableObject()).toEqual({
      first_name: 'Ada',
      address: { city: 'London' },
    })
  })

  it('tracks a nested model change and restores the original snapshot', () => {
    const profile = Profile.create({ address: { city: 'London' } })

    profile.address!.city = 'Paris'
    expect(profile.getChangedData()).toEqual({ address: { city: 'Paris' } })

    profile.revertChangedData()
    expect(profile.address!.city).toBe('London')
    expect(profile.isChanged()).toBe(false)
  })

  it('isolates original snapshots between instances of the same class', () => {
    const first = Profile.create({ first_name: 'Ada' })
    const second = Profile.create({ first_name: 'Grace' })

    first.firstName = 'Changed'

    expect(first.getOriginalData()).toEqual({ first_name: 'Ada' })
    expect(second.getOriginalData()).toEqual({ first_name: 'Grace' })
    expect(second.isChanged()).toBe(false)
  })

  it('supports camel-case serialization without changing the model fields', () => {
    const profile = Profile.create({ first_name: 'Ada' })

    expect(profile.getSerializableObject({ camelCase: true })).toEqual({ firstName: 'Ada' })
    expect(profile.firstName).toBe('Ada')
  })

  // callMethod currently recurses into an undefined child model.
  it.todo('skips absent nested models when recursively calling a method')

  // Constructor-level column caching currently freezes columns inferred from
  // the first instance and pure columnsInValue classes have no column metadata.
  it.todo('infers independent columns for columnsInValue instances')

  it('executes configured model methods on the instance', () => {
    const calls: ModelBase[] = []
    class MethodModel extends ModelBase {
      @Column()
      public value!: string
    }
    DataModel({
      methods: {
        validate: ({ data }: { data: ModelBase }) => calls.push(data),
      },
    })(MethodModel)
    const model = MethodModel.create({ value: 'ok' })

    model.callMethod({ method: 'validate' })

    expect(calls).toEqual([model])
  })

  it('does not mutate options passed to create', () => {
    const options = { enableDataState: false, noDefault: true }

    Profile.create({ first_name: 'Ada' }, options)

    expect(options).toEqual({ enableDataState: false, noDefault: true })
  })

  it('propagates flat create options to nested models for this creation only', () => {
    const untracked = Profile.create(
      { first_name: 'Ada', address: { city: 'London' } },
      { enableDataState: false },
    )
    const tracked = Profile.create({ first_name: 'Grace', address: { city: 'Paris' } })

    expect(untracked.getOriginalData()).toEqual({})
    expect(untracked.address!.getOriginalData()).toEqual({})
    expect(tracked.getOriginalData()).toEqual({ first_name: 'Grace', address: { city: 'Paris' } })
    expect(tracked.address!.getOriginalData()).toEqual({ city: 'Paris' })
  })

  it('honors excludeGroup during initialization', () => {
    class GroupedModel extends ModelBase {
      @Column({ group: 'private' })
      public secret!: string

      @Column({ group: 'public' })
      public title!: string

      @Column()
      public common!: string
    }

    const model = GroupedModel.create(
      { secret: 'hidden', title: 'visible', common: 'shared' },
      { excludeGroup: 'private' },
    )

    expect(model.secret).toBeUndefined()
    expect(model.title).toBe('visible')
    expect(model.common).toBe('shared')
  })

  it('gives group priority over excludeGroup during initialization', () => {
    class GroupedModel extends ModelBase {
      @Column({ group: 'detail' })
      public detail!: string

      @Column({ group: 'summary' })
      public summary!: string

      @Column()
      public common!: string
    }

    const model = GroupedModel.create(
      { detail: 'detail', summary: 'summary', common: 'common' },
      { group: 'detail', excludeGroup: 'detail' },
    )

    expect(model.detail).toBe('detail')
    expect(model.summary).toBeUndefined()
    expect(model.common).toBe('common')
  })

  it('honors every public DataModel option instead of silently dropping naming options', () => {
    class ConfiguredModel extends ModelBase {
      @Column({ default: 'fallback' })
      public displayName!: string
    }
    DataModel({
      noDefault: true,
      deserializeNamingStrategies: 'camelCase',
      serializeNamingStrategies: 'camelCase',
    })(ConfiguredModel)

    const model = ConfiguredModel.create({ display_name: 'ignored', displayName: 'Ada' })

    expect(model.displayName).toBe('Ada')
    expect(model.getSerializableObject()).toEqual({ displayName: 'Ada' })
    expect(ConfiguredModel.create({}).displayName).toBeUndefined()
  })
})
