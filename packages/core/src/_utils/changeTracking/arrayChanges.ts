import type { ModelBase } from '../../model/ModelBase'
import { jsonEqual } from '../jsonEqual'

/**
 * 先匹配旧项的主键，再找未匹配的新项；保留重复主键的末项匹配和原有 JSON 比较规则。
 * 当前是双重遍历。建立索引虽可能提速，但不能改变重复键、复合键和自定义主键方法的语义。
 */
export function describeArrayChanges(oldValue: any[], currentValue: any, target: ModelBase, columnName: string) {
  // 序列化用 forEach/push 压缩空洞，这里的实例下标必须与序列化后的数组对应。
  const instances = (target[columnName] as ModelBase[]).filter(() => true)
  const matchedCurValueList = [] as any[]
  const primaryChangeDescriptor = {
    create: [],
    delete: [],
    update: [],
    noChange: [],
  } as {
    create: any[]
    delete: any[]
    update: any[]
    noChange: any[]
  }
  oldValue?.forEach((oldItemValue: any) => {
    let matched = false
    let foundCurrentItemValue: any
    currentValue?.forEach((currentItemValue: any, i: number) => {
      const childIns = instances[i]
      if (childIns.getPrimaryValue().join(',') === childIns.getPrimaryValueFromData(oldItemValue).join(',')) {
        foundCurrentItemValue = currentItemValue
        matched = true
        matchedCurValueList.push(foundCurrentItemValue)
      }
    })
    if (matched) {
      if (!jsonEqual(oldItemValue, foundCurrentItemValue)) {
        primaryChangeDescriptor.update.push(foundCurrentItemValue)
      } else {
        primaryChangeDescriptor.noChange.push(foundCurrentItemValue)
      }
    } else {
      primaryChangeDescriptor.delete.push(oldItemValue)
    }
  })
  currentValue?.forEach((currentItemValue: any) => {
    let matched = false
    matchedCurValueList.forEach((matchedCurValue) => {
      if (jsonEqual(matchedCurValue, currentItemValue)) {
        matched = true
      }
    })
    if (!matched) {
      primaryChangeDescriptor.create.push(currentItemValue)
    }
  })

  return primaryChangeDescriptor
}
