import { isPlainObject } from 'lodash'
import { NAMING_STRATEGIES } from '../../constant'
import { CLEAN_ENUM, type IColumnInner } from '../../decorator/types'
import type { ModelBase } from '../../model/ModelBase'
import { create, getModelType } from '../create'
import { getModelProps } from '../ModelBaseProps'
import { describeArrayChanges } from './arrayChanges'
import { classifyFieldChange, createValueDescriptor } from './fieldChange'

/**
 * 变更描述对象的类型定义
 */
interface ChangeDescriptor {
  /** 变更动作：删除、创建、更新 */
  action: 'DELETE' | 'CREATE' | 'UPDATE'
  /** 数据键名（序列化后的名称） */
  dataKey: any
  /** 当前值 */
  currentValue: any
  /** 原始值 */
  oldValue: any
  /** 基于主键的变更描述（用于数组和嵌套对象） */
  primaryChangeDescriptor?: {
    create: any
    delete: any
    update: any
    noChange?: any
  }
  /** 简单变更描述 */
  changeDescriptor: {
    create?: any
    delete?: any
    update?: any
  }
}

/**
 * 获取模型的变更数据
 *
 * 对比当前模型数据与原始快照，返回变更的属性及其新旧值。
 *
 * @param columns - 列配置映射
 * @param target - 模型实例
 * @param targetData - 当前序列化后的数据
 * @param params - 配置参数
 * @param params.group - 仅包含指定分组的列
 * @param params.excludeGroup - 排除指定分组的列
 * @param params.trim - 是否去除字符串首尾空格后比较
 * @param params.descriptor - 是否返回详细变更描述
 * @param params.clean - 空值清理策略
 * @param params.ignoreEmptyString - 是否忽略空字符串变更
 * @param params.ignoreEmpty - 是否忽略所有空值变更
 * @param params.enableEmptyValue - 是否使用 emptyValue 替代空值
 * @param params.camelCase - 是否使用驼峰命名
 *
 * @returns 变更数据对象，或变更描述对象（当 descriptor=true）
 */
export function getChange(
  columns: { [key: string]: IColumnInner },
  target: ModelBase,
  targetData: any,
  params: {
    group?: string
    excludeGroup?: string | string[]
    trim?: boolean
    descriptor?: boolean
    clean?: CLEAN_ENUM
    ignoreEmptyString?: boolean
    ignoreEmpty?: boolean
    enableEmptyValue?: boolean
    camelCase?: boolean
  },
) {
  const sns =
    (typeof params.camelCase === 'boolean'
      ? params.camelCase
        ? NAMING_STRATEGIES.camelCase
        : NAMING_STRATEGIES.snakeCase
      : null) ?? getModelProps(target, 'serializeNamingStrategies')
  const changedObj = {} as { [key: string]: any }
  const descriptorObj: Record<string, ChangeDescriptor> = {}
  // 每次查询只解析一次保存点；延迟快照可能在这里重建，不能在每个字段重复触发。
  const originalData = target.getOriginalData()
  Object.keys(columns).forEach((columnName) => {
    let serializeName = columns[columnName].name
    const emptyValueRaw = columns[columnName].emptyValue as string | (() => any)
    const emptyValue = typeof emptyValueRaw === 'function' ? emptyValueRaw() : emptyValueRaw
    if (sns === NAMING_STRATEGIES.camelCase) {
      serializeName = columns[columnName].camelCaseName
    }
    let currentValue = targetData[serializeName]
    if (columns[columnName].trim && params.trim && typeof currentValue === 'string') {
      currentValue = (currentValue as string).trim()
    }
    let oldValue = originalData[serializeName]
    if (columns[columnName].trim && params.trim && typeof oldValue === 'string') {
      oldValue = (oldValue as string).trim()
    }
    const { kind, isEmpty, isChanged } = classifyFieldChange(oldValue, currentValue, params)
    let outputValue = currentValue
    // 有变化的时候才去设置 emptyValue
    if (isEmpty && isChanged && typeof emptyValue !== 'undefined' && params?.enableEmptyValue === true) {
      outputValue = emptyValue
    }
    if (kind === 'DELETE' || kind === 'CREATE') {
      changedObj[serializeName] = outputValue
      descriptorObj[columnName] = createValueDescriptor(kind, serializeName, outputValue, oldValue)
    } else if (kind !== 'IGNORED') {
      // 处理变更的数据
      if (isPlainObject(oldValue)) {
        if (isChanged) {
          changedObj[serializeName] = outputValue
        }
        const insObj = target as any
        const insChild = insObj[columnName] as ModelBase
        const childType = columns[columnName].childType
        // 普通对象没有 getPrimaryKey 方法
        if (
          childType &&
          typeof insChild?.getPrimaryKey === 'function' &&
          insChild.getPrimaryKey().length &&
          insChild.getPrimaryValue().join(',') !== insChild.getPrimaryValueFromData(oldValue).join(',')
        ) {
          // primary value changed
          descriptorObj[columnName] = descriptorObj[columnName] || ({} as any)
          descriptorObj[columnName].primaryChangeDescriptor = {
            create: outputValue,
            delete: oldValue,
            update: undefined,
          } as any
        } else {
          if (isChanged) {
            descriptorObj[columnName] = descriptorObj[columnName] || ({} as any)
            descriptorObj[columnName].primaryChangeDescriptor = {
              create: undefined,
              delete: undefined,
              update: outputValue,
            } as any
          }
        }
      } else if (Array.isArray(oldValue)) {
        if (isChanged) {
          changedObj[serializeName] = outputValue
        }
        const childType = getModelType(columns[columnName].childType)

        if (childType && (childType as any)?.prototype?.getPrimaryKey) {
          const hasPrimaryKey = create(childType)().getPrimaryKey().length
          if (hasPrimaryKey) {
            const primaryChangeDescriptor = describeArrayChanges(oldValue, currentValue, target, columnName)

            if (
              primaryChangeDescriptor.noChange.length ||
              primaryChangeDescriptor.delete.length ||
              primaryChangeDescriptor.update.length ||
              primaryChangeDescriptor.create.length
            ) {
              descriptorObj[columnName] = descriptorObj[columnName] || ({} as any)
              descriptorObj[columnName].primaryChangeDescriptor = primaryChangeDescriptor
            }
          }
        }
      }
      if (isChanged) {
        changedObj[serializeName] = outputValue
        descriptorObj[columnName] = descriptorObj[columnName] || ({} as any)
        Object.assign(descriptorObj[columnName], {
          dataKey: serializeName,
          currentValue: outputValue,
          oldValue,
        })
        descriptorObj[columnName].changeDescriptor = {
          update: outputValue,
        }
        descriptorObj[columnName].action = 'UPDATE'
      }
    }
    if (typeof params.group !== 'undefined') {
      // 如果有分组，必须返回分组中的数据。
      // 此处的逻辑是把非当前分组的数据剔除掉。
      if (columns[columnName].group && columns[columnName].group?.indexOf(params.group as string) === -1) {
        if (params && params.descriptor) {
          delete descriptorObj[serializeName]
        } else {
          delete changedObj[serializeName]
        }
      }
    } else if (typeof params.excludeGroup !== 'undefined') {
      // 如果有分组，必须返回分组中的数据。
      // 此处的逻辑是把非当前分组的数据剔除掉。
      const excludedGroups = Array.isArray(params.excludeGroup) ? params.excludeGroup : [params.excludeGroup]
      if (columns[columnName].group && excludedGroups.some((group) => columns[columnName].group?.includes(group))) {
        if (params && params.descriptor) {
          delete descriptorObj[serializeName]
        } else {
          delete changedObj[serializeName]
        }
      }
    }
  })
  if (params && params.descriptor) {
    return descriptorObj
  }
  return changedObj
}
