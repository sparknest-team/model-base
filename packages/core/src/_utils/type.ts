/**
 * 类型工具定义
 *
 * 提供运行时类型检查和 TypeScript 类型辅助工具。
 */

/** Function 构造函数的引用，用于类型守卫 */
export const Type = Function

/**
 * 旧类型守卫：运行时仅检查 typeof === 'function'，不验证函数能否被 new 调用。
 *
 * @param v - 待检查的值
 * @returns 函数返回 true，包括不可构造的箭头函数
 */
export function isType(v: any): v is Type<any> {
  return typeof v === 'function'
}

/**
 * 表示一个可以通过 new 调用的构造函数类型
 *
 * @typeParam T - 构造函数实例化后的类型
 */
export type Type<T> = new (...args: any[]) => T

/**
 * 将对象的指定键的属性设为可变
 *
 * @typeParam T - 原始对象类型
 * @typeParam K - 要设为可变的键
 */
export type Mutable<T extends { [x: string]: any }, K extends number> = {
  [P in K]: T[P]
}
