/**
 * 旧式递归复制工具，并非完整深拷贝
 *
 * 创建顶层对象/数组，for...in 遍历可枚举属性（包括继承属性）。
 * 仅对标签为 [object Object] 的子值递归；嵌套数组及 Date 等值保留引用。
 * 不检测循环引用。此行为用于旧 extendModel 兼容，不能直接等同于 cloneDeep。
 *
 * @param aObject - 要拷贝的对象
 * @returns 按上述旧规则复制的对象；假值输入原样返回
 *
 * @deprecated 建议使用 lodash.cloneDeep 以获得更完整的深拷贝支持
 */
export function deepCopy(aObject: any) {
  if (!aObject) {
    return aObject
  }

  let v
  const bObject = Array.isArray(aObject) ? [] : ({} as any)
  for (const k in aObject) {
    v = aObject[k]
    bObject[k] = Object.prototype.toString.call(v) === '[object Object]' ? deepCopy(v) : v
  }

  return bObject
}
