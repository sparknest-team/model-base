/** 列定义唯一写入口及静态解析器。注册很少发生，读取热路径只检查一个共享失效标记。 */
import { __COLUMNS__, __COLUMNS_CACHED__ } from '../constant'
import type { IColumnInner } from '../decorator/types'
import merge from 'deepmerge'

type Columns = Record<string, IColumnInner>
const ownColumnsKey = Symbol.for('model-base.columns.own.v1')
const cacheKey = Symbol.for('model-base.columns.cache.v1')
const epochKey = Symbol.for('model-base.columns.epoch.v1')
// 多份包副本共用注册时钟；只存数字，不保存模型、类或用户配置，也不阻止动态类回收。
const scope = globalThis as any
const clock: { value: number } = scope[epochKey] || (scope[epochKey] = { value: 0 })
const hasOwn = (target: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(target, key)
type Cache = { epoch: number; own: Columns | undefined; parent: Columns | undefined; columns: Columns }

/** 为当前类提供独立的元数据容器；继承可读，写入绝不落到父类。 */
export function ownColumnMetadata(constructor: any): any {
  if (!hasOwn(constructor, Symbol.metadata)) {
    constructor[Symbol.metadata] = Object.create(constructor[Symbol.metadata] || null)
  }
  return constructor[Symbol.metadata]
}

/** 列已经归一化。仅替换当前类的声明，不原地修改旧计划；其他类下次读取时检查依赖。 */
export function registerColumn(metadata: any, property: string, column: IColumnInner): void {
  const own = hasOwn(metadata, ownColumnsKey) ? metadata[ownColumnsKey] : {}
  metadata[ownColumnsKey] = { ...own, [property]: column }
  // 保留旧元数据入口供兼容读取；正式继承解析以 ownColumns 和实际构造器继承链为准。
  metadata[__COLUMNS__] = { ...metadata[__COLUMNS__], [property]: column }
  delete metadata[__COLUMNS_CACHED__]
  clock.value++
}

/**
 * 静态模型类级共享结果。没有注册操作时 O(1) 命中；注册后才沿父链确认依赖。
 * 无关类的注册仅刷新 epoch，不重建本类结果。父列在前，子类同名定义完整覆盖。
 */
export function resolveStaticColumns(constructor: any): Columns {
  const metadata = ownColumnMetadata(constructor)
  const cached: Cache | undefined = hasOwn(metadata, cacheKey) ? metadata[cacheKey] : undefined
  if (cached?.epoch === clock.value) return cached.columns
  const parentConstructor = Object.getPrototypeOf(constructor)
  const parent = parentConstructor?.isModelBase ? resolveStaticColumns(parentConstructor) : undefined
  // 旧版本包创建的类可能只有合并元数据，保留兼容读取，不推断其中哪些列属于父类。
  const own: Columns | undefined = hasOwn(metadata, ownColumnsKey) ? metadata[ownColumnsKey]
    : hasOwn(metadata, __COLUMNS__) ? metadata[__COLUMNS__] : undefined
  if (cached && cached.own === own && cached.parent === parent) {
    cached.epoch = clock.value
    return cached.columns
  }
  // 只在重建时复制，保留旧缓存与注册定义隔离的边界；命中时不分配列对象。
  const columns = merge({}, { ...parent, ...own }, { clone: true }) as Columns
  metadata[cacheKey] = { epoch: clock.value, own, parent, columns } satisfies Cache
  metadata[__COLUMNS_CACHED__] = columns
  constructor[__COLUMNS_CACHED__] = columns
  return columns
}

/** 冻结视图仅供内部快照序列化使用，固定保存时的列规则，不暴露为业务字段。 */
export const snapshotColumnsKey = Symbol.for('model-base.snapshot.columns.v1')
