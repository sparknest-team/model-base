import { CLEAN_ENUM, Column, ModelBase } from '@model-base/core'
import { getChange } from '../../src/_utils/ChangedModelUtil'

describe('field change classification compatibility', () => {
  class Value extends ModelBase { @Column() value?: any }
  it.each([
    ['delete undefined', 'old', undefined, CLEAN_ENUM.CLEAN_UNDEFINED, {}, 'DELETE'],
    ['keep null', 'old', null, CLEAN_ENUM.CLEAN_UNDEFINED, {}, 'UPDATE'],
    ['delete null', 'old', null, CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL, {}, 'DELETE'],
    ['ignore new empty string', undefined, '', CLEAN_ENUM.CLEAN_UNDEFINED, { ignoreEmptyString: true }, undefined],
    ['deletion precedes ignoreEmpty', undefined, '', CLEAN_ENUM.CLEAN_DIRTY, { ignoreEmpty: true }, 'DELETE'],
    ['create zero', undefined, 0, CLEAN_ENUM.CLEAN_DIRTY, {}, 'CREATE'],
  ])('%s', (_name, previous, current, clean, options, action) => {
    const value = Value.create({ value: previous })
    const result = getChange(value.getColumns(), value, { value: current }, {
      clean: clean as CLEAN_ENUM, ...(options as object), descriptor: true,
    })
    if (action === undefined) expect(result).toEqual({})
    else expect(result.value.action).toBe(action)
  })

  it('preserves explicit undefined descriptor keys for create/delete but not update', () => {
    const value = Value.create({})
    value.value = 'new'
    expect(Object.keys(value.getChangedDescriptor().value.changeDescriptor)).toEqual(['create', 'delete', 'update'])
    value.saveChangedData()
    value.value = 'updated'
    expect(Object.keys(value.getChangedDescriptor().value.changeDescriptor)).toEqual(['update'])
    value.value = undefined
    expect(Object.keys(value.getChangedDescriptor().value.changeDescriptor)).toEqual(['create', 'delete', 'update'])
  })

  it('evaluates emptyValue even for unchanged fields without reporting a change', () => {
    const fallback = jest.fn(() => 'fallback')
    class WithFallback extends ModelBase { @Column({ emptyValue: fallback }) label?: string }
    const value = WithFallback.create({ label: 'same' })
    fallback.mockClear()
    const result = getChange(value.getColumns(), value, { label: 'same' }, { enableEmptyValue: true })
    expect(fallback).toHaveBeenCalledTimes(1)
    expect(result).toEqual({})
  })
})
