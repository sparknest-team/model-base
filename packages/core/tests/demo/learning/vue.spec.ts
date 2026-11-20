// region model
import { nextTick, reactive, watch } from 'vue'
import { Column, ModelBase } from '@model-base/core'

class Form extends ModelBase {
  @Column() name!: string
}
// endregion model

describe('Vue documentation example', () => {
  it('observes edits and rollback through the Vue proxy', async () => {
    // region editing
    const form = reactive(Form.create({ name: 'Ada' }))
    const values: string[] = []
    const stop = watch(() => form.name, name => values.push(name))
    form.name = 'Grace' // 使用 Vue 包装后的对象赋值。
    await nextTick()
    form.revertChangedData()
    await nextTick()
    stop() // 组件外创建的 watcher 在不再使用时主动清理。
    // values 为 ['Grace', 'Ada']。
    // endregion editing
    expect(values).toEqual(['Grace', 'Ada'])
  })

  it('keeps Vue reactivity independent from ModelBase snapshot tracking', async () => {
    // region disabled
    const form = reactive(Form.create({ name: 'Ada' }, { enableSnapshot: false }))
    let observed = ''
    const stop = watch(() => form.name, name => { observed = name })
    form.name = 'Grace'
    await nextTick()
    stop()
    // observed === 'Grace'，但 form.isChanged() === false（快照已关闭）。
    // endregion disabled
    expect(observed).toBe('Grace')
    expect(form.isChanged()).toBe(false)
  })
})
