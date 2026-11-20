const toString = Object.prototype.toString

/**
 * 获取 Object.prototype.toString 标签；显式区分 null/undefined。
 * 不屏蔽自定义 Symbol.toStringTag，因此不是不可伪造的类型证明。
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
export function getTag(value: any) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]'
  }
  return toString.call(value)
}
