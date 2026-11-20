/** 仅基础类型走无字符串分配路径，复杂值保留原生序列化行为。 */
export function jsonEqual(left: any, right: any): boolean {
  const leftType = typeof left
  const rightType = typeof right
  if (leftType === rightType && (leftType === 'string' || leftType === 'boolean' || leftType === 'undefined')) {
    return left === right
  }
  const leftPrimitive = left === null || leftType === 'undefined' || leftType === 'string' || leftType === 'number' || leftType === 'boolean'
  const rightPrimitive = right === null || rightType === 'undefined' || rightType === 'string' || rightType === 'number' || rightType === 'boolean'
  if (leftPrimitive && rightPrimitive) {
    // JSON 将 NaN 和 ±Infinity 表示为 null，-0 与 0 的结果相同。
    const normalizedLeft = leftType === 'number' && !Number.isFinite(left) ? null : left
    const normalizedRight = rightType === 'number' && !Number.isFinite(right) ? null : right
    return normalizedLeft === normalizedRight
  }
  // 不能对同一对象直接返回 true，也不能缓存对象字符串：getter/toJSON
  // 可能有副作用，BigInt 和循环引用必须维持原来的异常行为。
  return JSON.stringify(left) === JSON.stringify(right)
}
