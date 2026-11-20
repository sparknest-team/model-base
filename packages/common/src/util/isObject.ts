/**
 * 判断非 null 的对象或函数；与 isObjectLike 的区别是函数也返回 true。
 *
 * isObject({})
 * // => true
 *
 * isObject([1, 2, 3])
 * // => true
 *
 * isObject(Function)
 * // => true
 *
 * isObject(null)
 * // => false
 */
export function isObject(value: any) {
  const type = typeof value
  return value != null && (type === 'object' || type === 'function')
}
