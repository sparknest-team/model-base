import { cloneDeepWith } from 'lodash'

/** 一次 DTO 快照生成期间的所有权标记，避免重复克隆已隔离的数据；不可跨保存点复用。 */
export class SnapshotCopy {
  private readonly owned = new WeakSet<object>()

  /** 先隔离字段；普通图可复用，含访问器、函数或特殊原型的图保留最终兼容复制。 */
  clone(value: object): any {
    let plain = true
    const copy = cloneDeepWith(value, (node: any, key: any, parent: any) => {
      if (!plain) return undefined
      if (parent && key !== undefined) {
        const descriptor = Object.getOwnPropertyDescriptor(parent, key)
        if (descriptor && !('value' in descriptor)) plain = false
      }
      if (typeof node === 'function') plain = false
      if (node !== null && typeof node === 'object') {
        const prototype = Object.getPrototypeOf(node)
        if (prototype !== Object.prototype && prototype !== Array.prototype && prototype !== null) plain = false
        // 自有 constructor 可能影响 lodash 初始化副本的方式，不能直接标记为安全图。
        if (Object.prototype.hasOwnProperty.call(node, 'constructor')) plain = false
      }
      // 返回 undefined 让 lodash 保持共享引用、环、稀疏数组和 Symbol 的既有复制语义。
      return undefined
    })
    if (plain && copy !== null && typeof copy === 'object') this.owned.add(copy)
    return copy
  }

  /** 序列化器新建的容器，只有每个值都已隔离或是不可变基本值时才可整体复用。 */
  container(value: Record<string, any>): void {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== Array.prototype) return
    if (Object.keys(value).every(key => this.isOwned(value[key]))) this.owned.add(value)
  }

  /** 已拥有的子图直接复用，其余部分由 lodash 完成隔离，不改变公开序列化的引用规则。 */
  finish<T>(dto: T): T {
    return cloneDeepWith(dto, value => this.isOwned(value) ? value : undefined)
  }

  /** 函数即使不是 object 也不能当作普通基本值直接判定安全。 */
  private isOwned(value: any): boolean {
    return value === null || (typeof value !== 'object' && typeof value !== 'function') || this.owned.has(value)
  }
}
