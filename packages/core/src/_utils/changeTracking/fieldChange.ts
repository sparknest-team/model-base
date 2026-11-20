import { isPlainObject } from 'lodash'
import { CLEAN_ENUM } from '../../decorator/types'
import { jsonEqual } from '../jsonEqual'

type ChangeKind = 'DELETE' | 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'IGNORED'

/** 变更分类专用规则，不与序列化的空值清理合并。 */
export function classifyFieldChange(
  oldValue: any,
  currentValue: any,
  options: { clean?: CLEAN_ENUM; ignoreEmptyString?: boolean; ignoreEmpty?: boolean },
): { kind: ChangeKind; isEmpty: boolean; isChanged: boolean } {
  const isUndefined = currentValue === undefined
  const isNull = currentValue === null
  const isEmptyString = typeof currentValue === 'string' && /^\s*$/.test(currentValue)
  const isEmptyArray = Array.isArray(currentValue) && currentValue.length === 0
  const isEmptyObject = isPlainObject(currentValue) && Object.keys(currentValue).length === 0
  let isEmpty = isUndefined || isNull || isEmptyString || isEmptyArray || isEmptyObject
  if (options.clean === CLEAN_ENUM.CLEAN_UNDEFINED) {
    isEmpty = isUndefined
  } else if (options.clean === CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL) {
    isEmpty = isUndefined || isNull
  }
  const isChanged = !jsonEqual(oldValue, currentValue)
  let kind: ChangeKind
  if (isEmpty && isChanged) {
    // 删除优先于忽略空值，这是既有行为，不可调整顺序。
    kind = 'DELETE'
  } else if (oldValue === undefined && isChanged) {
    const ignored = (options.ignoreEmptyString && typeof currentValue === 'string' && currentValue === '') ||
      (options.ignoreEmpty && isEmpty)
    kind = ignored ? 'IGNORED' : 'CREATE'
  } else {
    kind = isChanged ? 'UPDATE' : 'UNCHANGED'
  }
  return { kind, isEmpty, isChanged }
}

/** CREATE/DELETE 保留显式 undefined 键；UPDATE 仍由聚合层合并主键描述。 */
export function createValueDescriptor(action: 'CREATE' | 'DELETE', dataKey: string, currentValue: any, oldValue: any) {
  return {
    dataKey,
    currentValue,
    oldValue,
    action,
    changeDescriptor: action === 'DELETE'
      ? { create: undefined, delete: oldValue, update: currentValue }
      : { create: currentValue, delete: undefined, update: undefined },
  }
}
