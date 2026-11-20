import { Column, ModelBase } from '@model-base/core'

class MergeChild extends ModelBase { @Column() label!: string }
class MergeParent extends ModelBase {
  @Column() title!: string | null
  @Column({ model: MergeChild }) child!: MergeChild
  @Column() values!: { count: number }[]
}

describe('merge refactoring compatibility', () => {
  it('copies only defined columns, accepts null and returns the receiver', () => {
    const target = MergeParent.create({ title: 'old', values: [{ count: 1 }] })
    expect(target.mergeModel({ title: undefined, extra: 'ignored' } as any)).toBe(target)
    expect(target.title).toBe('old')
    expect((target as any).extra).toBeUndefined()
    target.mergeModel({ title: null })
    expect(target.title).toBeNull()
    expect(target.getOriginalData().title).toBe('old')
  })

  it('deep-copies input collections without changing their source', () => {
    const source = { values: [{ count: 2 }] }
    const target = MergeParent.create({ values: [{ count: 1 }] })
    target.mergeModel(source)
    target.values[0].count = 3
    expect(source.values[0].count).toBe(2)
    expect(target.getOriginalData().values).toEqual([{ count: 1 }])
  })

  it('retains the old child snapshot when merging another instance of the same model', () => {
    const target = MergeParent.create({ child: { label: 'baseline' } })
    const source = MergeParent.create({ child: { label: 'incoming' } })
    const previous = target.child
    target.mergeModel(source)
    expect(target.child).toBeInstanceOf(MergeChild)
    expect(target.child).not.toBe(previous)
    expect(target.child).not.toBe(source.child)
    expect(target.child.label).toBe('incoming')
    expect(target.child.getOriginalData()).toEqual({ label: 'baseline' })
    expect(source.child.getOriginalData()).toEqual({ label: 'incoming' })
    target.child.revertChangedData()
    expect(target.child.label).toBe('baseline')
  })

  it('does not automatically convert a plain nested value into a model', () => {
    const target = MergeParent.create({ child: { label: 'baseline' } })
    target.mergeModel({ child: { label: 'plain' } })
    expect(target.child).toEqual({ label: 'plain' })
    expect(target.child).not.toBeInstanceOf(MergeChild)
  })
})
