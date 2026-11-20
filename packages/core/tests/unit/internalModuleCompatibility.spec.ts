import { Column, ModelBase } from '@model-base/core'
import * as mapping from '../../src/_utils/ModelBaseUtil'
import * as tracking from '../../src/_utils/ChangedModelUtil'

describe('internal module boundary compatibility', () => {
  it('does not expose implementation helpers through the package entry', () => {
    const core = require('../../src')
    for (const name of ['getDeserializeDtoValue', 'getDeserializeValue', 'setDefault', 'updateField', 'describeArrayChanges', 'classifyFieldChange', 'createValueDescriptor']) {
      expect(core).not.toHaveProperty(name)
    }
  })

  it('keeps legacy entry points as aliases of the split implementations', () => {
    const applyDto = require('../../src/_utils/mapping/applyDto')
    expect(mapping.createModelByDTO).toBe(applyDto.createModelByDTO)
    expect(mapping.extendModelByDTO).toBe(applyDto.extendModelByDTO)
    expect(mapping.updateModelByDTO).toBe(applyDto.updateModelByDTO)
    expect(mapping.createChildField).toBe(require('../../src/_utils/mapping/childField').createChildField)
    expect(mapping.deepCopy).toBe(require('../../src/_utils/deepCopy').deepCopy)
    expect(tracking.getChange).toBe(require('../../src/_utils/changeTracking/getChange').getChange)
  })

  it('preserves the original utility exports', () => {
    expect(Object.keys(mapping).sort()).toEqual([
      'createChildField', 'createModelByDTO', 'deepCopy', 'extendModelByDTO', 'updateModelByDTO',
    ])
    expect(Object.keys(tracking)).toEqual(['getChange'])
  })

  it.each(['ModelBaseUtil', 'ChangedModelUtil'])('can load %s before the package entry', (moduleName) => {
    jest.isolateModules(() => {
      require(`../../src/_utils/${moduleName}`)
      const core = require('../../src')
      const Column = core.Column
      class Value extends core.ModelBase {
        @Column() label!: string
      }
      const value = Value.create({ label: 'initial' })
      value.label = 'edited'
      expect(value.getChangedData()).toEqual({ label: 'edited' })
      value.revertChangedData()
      expect(value.label).toBe('initial')
    })
  })

  it('preserves direct create, extend and update entry points and their snapshots', () => {
    class Value extends ModelBase { @Column() label!: string }
    const value = Value.create({ label: 'initial' })
    const columns = value.getColumns()
    mapping.extendModelByDTO(value, columns, { label: 'extended' })
    expect(value.label).toBe('extended')
    expect(value.getOriginalData()).toEqual({ label: 'initial' })
    mapping.updateModelByDTO(value, columns, { label: 'updated' })
    expect(value.getOriginalData()).toEqual({ label: 'updated' })
    mapping.createModelByDTO(value, columns, { label: 'created' })
    expect(value.getOriginalData()).toEqual({ label: 'created' })
  })

  it('keeps legacy deepCopy semantics instead of silently replacing it with cloneDeep', () => {
    const input = { nested: { count: 1 }, list: [{ count: 2 }] }
    const copied = mapping.deepCopy(input)
    expect(copied).toEqual(input)
    expect(copied).not.toBe(input)
    expect(copied.nested).not.toBe(input.nested)
    expect(copied.list).toBe(input.list)
  })
})
