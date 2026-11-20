/** Wrapper 识别和字典键命名的共享兼容规则。 */
import type { Wrapper } from '../response/Wrapper'

/** 使用类标记而非 instanceof，允许 Wrapper 来自另一份包副本；入参仍需符合 wrapper 形状。 */
export function isDataWrapper(value: any): value is Wrapper {
  return !!value && !!value.constructor.prototype.constructor.isDataWrapper
}

/** 历史 camelCaseKey 语义：true 保留原键，false/未传才转驼峰，不能按名字直接反转逻辑。 */
export function recordKey(property: string, preserveKey?: boolean): string {
  const camelCase = property.replace(/_(\w)/g, (_match, letter: string) => letter.toUpperCase())
  return preserveKey ? property : camelCase
}
