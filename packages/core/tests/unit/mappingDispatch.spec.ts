import { Column, ModelBase } from '@model-base/core'
import { extendModelByDTO } from '../../src/_utils/ModelBaseUtil'

describe('mapping operation dispatch', () => {
  it('keeps update and extend semantics distinct for omitted fields', () => {
    class Value extends ModelBase { @Column({ default: 'fallback' }) label!: string }
    const value = Value.create({ label: 'initial' })
    value.update({})
    expect(value.label).toBe('initial')
    extendModelByDTO(value, value.getColumns(), {})
    expect(value.label).toBe('fallback')
    expect(value.getOriginalData()).toEqual({ label: 'initial' })
  })

  it('does not read input getters or execute callbacks for excluded fields', () => {
    const read = jest.fn(() => 'secret')
    const convert = jest.fn(({ value }) => value)
    class Value extends ModelBase {
      @Column({ group: 'private', deserialize: convert }) secret!: string
      @Column() label!: string
    }
    const dto = Object.defineProperty({ label: 'public' }, 'secret', { enumerable: true, get: read })
    const value = Value.create(dto, { excludeGroup: 'private' })
    expect(value.label).toBe('public')
    expect(read).not.toHaveBeenCalled()
    expect(convert).not.toHaveBeenCalled()
  })

  it('reuses the resolved creation value and preserves callback receiver and DTO identity', () => {
    const read = jest.fn(() => 'value')
    const convert = jest.fn(function (this: ModelBase, context) {
      expect(context.deserializeData).toBeUndefined()
      expect(context.serializeData).toBe(dto)
      expect(this).toBeInstanceOf(Value)
      return context.value.toUpperCase()
    })
    class Value extends ModelBase { @Column({ deserialize: convert }) label!: string }
    const dto = Object.defineProperty({}, 'label', { enumerable: true, get: read })
    const value = Value.create(dto, { enableDataState: false })
    expect(value.label).toBe('VALUE')
    expect(read).toHaveBeenCalledTimes(2)
    expect(convert).toHaveBeenCalledTimes(1)
  })

  it('keeps existing fields when extending an instance with noDefault enabled', () => {
    class Value extends ModelBase { @Column({ default: 'fallback' }) label!: string }
    const value = Value.create({ label: 'initial' }, { noDefault: true })
    extendModelByDTO(value, value.getColumns(), {})
    expect(value.label).toBe('initial')
  })
})
