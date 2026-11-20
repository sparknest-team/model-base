import { Column, ModelBase } from '@model-base/core'
import { createModelByDTO } from '../../src/_utils/ModelBaseUtil'

describe('creation flow contracts', () => {
  it.each(['new', 'create'])('%s maps each supplied field exactly once', route => {
    const deserialize = jest.fn(({ value }) => value.toUpperCase())
    class Value extends ModelBase { @Column({ deserialize }) name!: string }
    const options = Object.freeze({ enableSnapshot: true })
    const value = route === 'new' ? new Value({ name: 'ada' }, options) : Value.create({ name: 'ada' }, options)
    expect(deserialize).toHaveBeenCalledTimes(1)
    expect(value.name).toBe('ADA')
    expect(value.getOriginalData()).toEqual({ name: 'ADA' })
    expect(options).toEqual({ enableSnapshot: true })
  })

  it('maps after the subclass constructor and retains the extra-argument array convention', () => {
    const events: string[] = []
    let received: any
    class Value extends ModelBase {
      @Column({ deserialize: ({ value }) => { events.push('map'); return value } }) name!: string
      constructor(dto?, options?, extra?) {
        super(dto, options)
        received = extra
        events.push('construct')
      }
    }
    Value.create({ name: 'Ada' }, {}, 'a', 'b')
    expect(events).toEqual(['construct', 'map'])
    expect(received).toEqual(['a', 'b'])
  })

  it('retains the legacy constructor-bound createModel behavior, including conversion', () => {
    const deserialize = jest.fn(({ value }) => value.toUpperCase())
    class Value extends ModelBase {
      @Column({ deserialize }) name!: string
      @Column({ default: 'default' }) missing!: string
    }
    const options = Object.freeze({ noDefault: false })
    const value = ModelBase.prototype.createModel.call(Value, { name: 'ada' }, options) as Value
    expect(value).toBeInstanceOf(Value)
    expect(value.name).toBe('ADA')
    expect(value.missing).toBeUndefined()
    expect(deserialize).toHaveBeenCalledTimes(1)
    expect(options.noDefault).toBe(false)
  })

  it('filters before reading input and establishes the baseline only after mapping', () => {
    class Value extends ModelBase {
      @Column({ group: 'detail' }) name!: string
      @Column({ group: 'private' }) secret!: string
    }
    const value = Value.create({ name: 'before', secret: 'kept' })
    const readSecret = jest.fn(() => { throw new Error('excluded field read') })
    const dto = Object.defineProperty({ name: 'after' }, 'secret', { get: readSecret })
    const columns = Object.assign(Object.create(null), value.getColumnsCached())
    createModelByDTO(value, columns, dto, { group: 'detail', excludeGroup: 'detail' })
    expect(readSecret).not.toHaveBeenCalled()
    expect(value.secret).toBe('kept')
    expect(value.getOriginalData()).toEqual({ name: 'after' })
    expect(value.getChangedData({ group: 'detail' })).toEqual({})
  })
})
