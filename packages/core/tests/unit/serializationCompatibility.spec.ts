import { CLEAN_ENUM, Column, ModelBase } from '@model-base/core'

describe('serialization compatibility during internal refactoring', () => {
  it('runs emptyValue and legacy serializer before filtering by group', () => {
    const calls: string[] = []
    class Value extends ModelBase {
      @Column({
        group: 'private',
        emptyValue: () => { calls.push('empty'); return 'fallback' },
        unformatter: function ({ value, deserializeData }) {
          expect(this).toBe(deserializeData)
          calls.push('legacy')
          return value.toUpperCase()
        },
        serialize: () => { calls.push('modern'); return 'unused' },
      })
      text!: string
    }
    const model = Value.create({ text: 'hello' }, { enableDataState: false })
    calls.length = 0
    expect(model.getSerializableObject({ group: 'public' })).toEqual({})
    expect(calls).toEqual(['empty', 'legacy'])
  })

  it('cleans the original value, then applies fallback, and trims converted strings', () => {
    class Value extends ModelBase {
      @Column({ trim: true, serialize: () => '  converted  ', emptyValue: ' fallback ' })
      text?: string
    }
    const model = Value.create({}, { enableDataState: false })
    expect(model.getSerializableObject({ trim: true })).toEqual({})
    expect(model.getSerializableObject({ trim: true, enableEmptyValue: true })).toEqual({ text: ' fallback ' })
    model.text = 'source'
    expect(model.getSerializableObject({ trim: true })).toEqual({ text: 'converted' })
    expect(model.getSerializableObject({ trim: false })).toEqual({ text: '  converted  ' })
  })

  it('detaches plain objects but passes the original value to callbacks', () => {
    const callback = jest.fn(({ value }) => value)
    class Value extends ModelBase {
      @Column() plain!: { nested: { count: number } }
      @Column({ serialize: callback }) custom!: object
    }
    const model = Value.create({ plain: { nested: { count: 1 } }, custom: { count: 2 } }, { enableDataState: false })
    const dto = model.getSerializableObject()
    dto.plain.nested.count = 9
    expect(model.plain.nested.count).toBe(1)
    expect(dto.custom).toBe(model.custom)
    expect(callback.mock.calls.at(-1)?.[0].value).toBe(model.custom)
  })

  it('preserves nested record and record-array empty-container behavior', () => {
    class Child extends ModelBase { @Column() name!: string }
    class Parent extends ModelBase {
      @Column({ model: Child, type: 'record' }) records!: Record<string, Child>
      @Column({ model: Child, type: 'recordArray' }) lists!: Record<string, Child[]>
      @Column({ model: Child, emptyValue: 'fallback' }) child?: Child
    }
    const model = Parent.create({}, { enableDataState: false })
    model.records = {}
    model.lists = { empty: [], full: [Child.create({ name: 'Ada' }, { enableDataState: false })] }
    expect(model.getSerializableObject({ enableEmptyValue: true })).toEqual({ lists: { full: [{ name: 'Ada' }] } })
    model.lists = { empty: [] }
    expect(model.getSerializableObject({ clean: CLEAN_ENUM.CLEAN_UNDEFINED })).toEqual({ lists: {} })
  })
})
