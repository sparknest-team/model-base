/**
 * 模型序列化工具
 *
 * 将模型实例转换为可序列化的普通对象（DTO）。
 */

import { cloneDeep, isPlainObject } from 'lodash'
import { SnapshotCopy } from '../_utils/changeTracking/snapshotCopy'
import { snapshotColumnsKey } from '../_utils/columnRegistry'
import { getColumnSerializeName } from '../_utils/getColumnSerializeName'
import { getModelProps } from '../_utils/ModelBaseProps'
import { NAMING_STRATEGIES } from '../constant'
import { CLEAN_ENUM, IColumnSerialize, type IColumnInner, type TSerializableParam } from '../decorator/types'
import { type ModelBase } from '../model/ModelBase'

/** 空值判断针对转换前的值；未指定策略时保留历史 CLEAN_DIRTY 行为。 */
function isEmptyValue(value: any, clean: TSerializableParam['clean']): boolean {
  if (clean === CLEAN_ENUM.CLEAN_UNDEFINED) return value === undefined
  if (clean === CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL) return value === undefined || value === null

  const isEmptyString = typeof value === 'string' && value.trim() === ''
  const isEmptyArray = Array.isArray(value) && value.length === 0
  const isEmptyObject = isPlainObject(value) && Object.keys(value).length === 0
  return value === undefined || value === null || isEmptyString || isEmptyArray || isEmptyObject
}

/** group 优先于 excludeGroup；未分组字段始终保留。 */
function isExcludedByGroup(column: IColumnInner, params: TSerializableParam): boolean {
  if (typeof params.group !== 'undefined') {
    return column.group?.indexOf(params.group) === -1
  }
  if (typeof params.excludeGroup === 'string') {
    return !!column.group && column.group.indexOf?.(params.excludeGroup) !== -1
  }
  if (Array.isArray(params.excludeGroup)) {
    return params.excludeGroup.some((group) => !!column.group && column.group.indexOf?.(group) !== -1)
  }
  return false
}

/** 普通字段转换。旧 unformatter 优先级、回调 this 和原值引用均保持不变。 */
function serializeColumnValue<T extends ModelBase>(
  target: T,
  key: string,
  column: IColumnInner,
  serializeName: string,
  params: TSerializableParam,
  snapshot?: SnapshotCopy,
): any {
  let value = target[key]
  if (typeof value === 'object' && value !== null) {
    value = snapshot ? snapshot.clone(value) : cloneDeep(value)
  }
  const serialize = column.unformatter || column.serialize
  if (typeof serialize === 'function') {
    const context: IColumnSerialize<T> = {
      value: target[key],
      name: serializeName,
      property: key,
      deserializeData: target,
      column,
    }
    value = serialize.apply(target, [context])
  }
  if (column.trim && params.trim && typeof value === 'string') {
    value = value.trim()
  }
  return value
}

/**
 * 将模型实例转换为可序列化的对象
 *
 * 核心序列化函数，处理：
 * - 属性名转换（驼峰 ↔ 蛇形）
 * - 空值清理（根据 clean 策略）
 * - 嵌套模型递归序列化
 * - 自定义序列化函数（serialize/unformatter）
 * - 分组过滤
 * - 字符串 trim 处理
 *
 * @typeParam T - 模型类型
 * @param this_ - 模型实例
 * @param params - 序列化参数
 * @param params.clean - 空值清理策略
 * @param params.group - 仅包含指定分组
 * @param params.excludeGroup - 排除指定分组
 * @param params.camelCase - 是否使用驼峰命名
 * @param params.trim - 是否去除字符串首尾空格
 * @param params.enableEmptyValue - 是否使用 emptyValue 替代空值
 * @returns 序列化后的普通对象
 *
 * @example
 * const dto = modelToSerializableObj(user, {
 *   clean: CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL,
 *   camelCase: false
 * })
 */
export function modelToSerializableObj<T extends ModelBase>(
  this_: T,
  params: TSerializableParam,
): { [index: string]: any } {
  return serializeModel(this_, params)
}

/** 内部快照生成入口：隔离返回数据并复用安全子图，不改变公开 DTO 转换的回调返回引用。 */
export function modelToSnapshot<T extends ModelBase>(model: T, params: TSerializableParam): Record<string, any> {
  const snapshot = new SnapshotCopy()
  return snapshot.finish(serializeModel(model, params, snapshot))
}

/** 共享递归遍历；snapshot 仅影响复制策略，不改变清理、回调和分组的执行顺序。 */
function serializeModel<T extends ModelBase>(
  this_: T,
  params: TSerializableParam,
  snapshot?: SnapshotCopy,
): { [index: string]: any } {
  const sns =
    (typeof params.camelCase === 'boolean'
      ? params.camelCase
        ? NAMING_STRATEGIES.camelCase
        : NAMING_STRATEGIES.snakeCase
      : null) ?? getModelProps(this_, 'serializeNamingStrategies')
  const dto: { [index: string]: any } = {}
  // 冻结视图使用保存时的计划；其他对象统一走兼容入口，内部处理静态/动态分流。
  const columns =
    ((this_ as any)[snapshotColumnsKey] || (this_ as ModelBase).getColumnsCached?.() || {}) as Record<string, IColumnInner>
  const target = this_ as T
  for (const key in columns) {
    if (columns.hasOwnProperty(key)) {
      const value = target[key] as any
      const isEmpty = isEmptyValue(value, params.clean)
      const serializeName = getColumnSerializeName(columns[key], sns)
      const emptyValueRaw = columns[key].emptyValue as string | (() => any)
      const emptyValue = typeof emptyValueRaw === 'function' ? emptyValueRaw() : emptyValueRaw
      if (columns[key].childType) {
        // 子模型字段为假值时不输出；集合分支的空值清理仍在递归转换后执行。
        if (value) {
          if (Array.isArray(value)) {
            dto[serializeName] = []
            value.forEach((m: any) => {
              dto[serializeName].push(serializeModel(m, params, snapshot))
            })
          } else if (columns[key].type === 'record') {
            Object.keys(value || {}).forEach((k) => {
              dto[serializeName] = dto[serializeName] || {}
              dto[serializeName][k] = serializeModel(target[key][k], params, snapshot)
            })
          } else if (columns[key].type === 'recordArray') {
            Object.keys(value || {}).forEach((k) => {
              dto[serializeName] = dto[serializeName] || {}
              value[k]?.forEach((m: any) => {
                dto[serializeName][k] = dto[serializeName][k] || []
                dto[serializeName][k].push(serializeModel(m, params, snapshot))
              })
            })
          } else {
            dto[serializeName] = serializeModel(value, params, snapshot)
          }
          if (snapshot && dto[serializeName] && typeof dto[serializeName] === 'object') {
            if (columns[key].type === 'recordArray') {
              Object.values(dto[serializeName]).forEach(list => snapshot.container(list as any))
            }
            snapshot.container(dto[serializeName])
          }
          if (isEmpty) {
            delete dto[serializeName]
            if (typeof emptyValue !== 'undefined' && params?.enableEmptyValue === true) {
              dto[serializeName] = emptyValue
            }
          }
        }
      } else {
        const serializedValue = serializeColumnValue(target, key, columns[key], serializeName, params, snapshot)
        if (isEmpty) {
          if (typeof emptyValue !== 'undefined' && params?.enableEmptyValue === true) {
            dto[serializeName] = emptyValue
          }
        } else {
          dto[serializeName] = serializedValue
        }
      }
      // 保持后置过滤：即使字段被排除，既有转换回调仍然执行。
      if (isExcludedByGroup(columns[key], params)) {
        delete dto[serializeName]
      }
    }
  }
  snapshot?.container(dto)
  return dto
}
