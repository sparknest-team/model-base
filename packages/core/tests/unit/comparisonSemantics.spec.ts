import { CLEAN_ENUM, Column, ModelBase } from '@model-base/core'

describe('documented transformation alternatives', () => {
  it('uses declared columns as a whitelist', () => {
    class User extends ModelBase {
      @Column() name!: string
      password?: string
    }
    const user = User.create({ name: 'Ada', password: 'secret', extra: 1 })
    expect(user.password).toBeUndefined()
    user.password = 'local secret'
    expect(user.getSerializableObject()).toEqual({ name: 'Ada' })
  })

  it('exposes a getter and a method through serialize callbacks', () => {
    class User extends ModelBase {
      @Column() first!: string
      @Column() last!: string
      get fullName() { return `${this.first} ${this.last}` }
      label() { return `User: ${this.fullName}` }
      @Column({ default: '', serialize: ({ deserializeData }) => deserializeData.fullName })
      fullNameOutput!: string
      @Column({ default: '', serialize: ({ deserializeData }) => deserializeData.label() })
      labelOutput!: string
    }
    const user = User.create({ first: 'Ada', last: 'Lovelace' })
    expect(user.getSerializableObject()).toEqual({ first: 'Ada', last: 'Lovelace', full_name_output: 'Ada Lovelace', label_output: 'User: Ada Lovelace' })
    user.first = 'Grace'
    expect(user.getSerializableObject().full_name_output).toBe('Grace Lovelace')
    // Emptiness is currently tested before the serializer executes.
    expect(user.getCleanSerializableObject()).toEqual({ first: 'Grace', last: 'Lovelace' })
    user.fullNameOutput = undefined as any
    expect(user.getSerializableObject()).not.toHaveProperty('full_name_output')
  })

  it('supports explicit conversion but type metadata alone does not coerce', () => {
    class Values extends ModelBase {
      @Column({ type: Number }) raw!: number
      @Column({ deserialize: ({ value }) => Number(value) }) count!: number
      @Column({ deserialize: ({ value }) => new Date(value), serialize: ({ value }) => value.toISOString() }) date!: Date
      @Column({ deserialize: ({ value }) => new Set(value), serialize: ({ value }) => [...value] }) tags!: Set<string>
    }
    const model = Values.create({ raw: '42', count: '42', date: '2026-01-01T00:00:00.000Z', tags: ['a', 'a'] })
    expect(model.raw).toBe('42')
    expect(model.count).toBe(42)
    expect(model.date).toBeInstanceOf(Date)
    expect(model.tags).toBeInstanceOf(Set)
    expect(model.getSerializableObject().tags).toEqual(['a'])
  })

  it('keeps grouped fields by default and filters explicitly on output', () => {
    class User extends ModelBase {
      @Column() name!: string
      @Column({ group: 'private' }) password!: string
    }
    const user = User.create({ name: 'Ada', password: 'secret' })
    expect(user.getSerializableObject()).toEqual({ name: 'Ada', password: 'secret' })
    expect(user.getSerializableObject({ excludeGroup: 'private' })).toEqual({ name: 'Ada' })
    expect(user.password).toBe('secret')
  })

  it('distinguishes null from omitted undefined fields', () => {
    class Value extends ModelBase {
      @Column() nil?: string | null
      @Column() missing?: string
    }
    const model = Value.create({ nil: null })
    expect(model.getSerializableObject()).toEqual({})
    expect(model.getSerializableObject({ clean: CLEAN_ENUM.CLEAN_UNDEFINED })).toEqual({ nil: null })
    expect(model.getSerializableObject({ clean: CLEAN_ENUM.CLEAN_UNDEFINED })).not.toHaveProperty('missing')
  })
})
