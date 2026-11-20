import { Column, ModelBase } from '@model-base/core'

describe('initialization refactoring compatibility', () => {
  class Named extends ModelBase {
    @Column({ aliasName: 'old_name' }) displayName!: string
  }

  it.each([
    ['mix', { display_name: 'snake', displayName: 'camel', old_name: 'alias' }, 'snake'],
    ['mix', { display_name: undefined, displayName: 'camel', old_name: 'alias' }, 'camel'],
    ['mix', { display_name: null, old_name: 'alias' }, null],
    ['mix', { oldName: 'alias' }, 'alias'],
    ['camelCase', { display_name: 'snake', oldName: 'alias' }, 'alias'],
    ['snakeCase', { displayName: 'camel', old_name: 'alias' }, 'alias'],
  ])('keeps %s name and alias precedence for %j', (strategy, dto, expected) => {
    expect(Named.create(dto, { deserializeNamingStrategies: strategy as any }).displayName).toBe(expected)
  })

  it('creates independent automatic defaults and honors noDefault', () => {
    class Child extends ModelBase { @Column({ default: 'child' }) label!: string }
    class Defaults extends ModelBase {
      @Column({ type: Array, default: true }) items!: string[]
      @Column({ type: Object, autowired: true }) object!: object
      @Column({ model: Child, autowired: true }) child!: Child
      @Column({ default: ({ data }) => data.seed }) seeded!: string
    }
    const first = Defaults.create({ seed: 'first' })
    const second = Defaults.create({ seed: 'second' })
    expect(first.items).toEqual([])
    expect(first.items).not.toBe(second.items)
    expect(first.object).not.toBe(second.object)
    expect(first.child).toBeInstanceOf(Child)
    expect(first.child).not.toBe(second.child)
    expect(first.seeded).toBe('first')
    const skipped = Defaults.create({}, { noDefault: true })
    expect(skipped.items).toBeUndefined()
    expect(skipped.child).toBeUndefined()
  })

  it('prefers deserialize to formatter and clones array conversion results', () => {
    const output = [{ value: 1 }]
    const legacy = jest.fn()
    const modern = jest.fn(() => output)
    class Values extends ModelBase {
      @Column({ deserialize: modern, formatter: legacy }) values!: { value: number }[]
    }
    const dto = { values: [1] }
    const model = Values.create(dto)
    expect(legacy).not.toHaveBeenCalled()
    expect(modern.mock.calls).toHaveLength(1)
    expect(model.values).toEqual(output)
    expect(model.values).not.toBe(output)
    model.values[0].value = 2
    expect(output[0].value).toBe(1)
    expect(dto).toEqual({ values: [1] })
  })
})
