/** 节点级追踪：代理记录首次旧值，保存点共享子节点关系，查询时才重建旧数据。 */
import { cloneDeep } from 'lodash'
import type { IColumnInner } from '../../decorator/types'
import { CLEAN_ENUM } from '../../decorator/types'
import { __MODEL_PROPS__ } from '../../constant'
import { modelToSnapshot } from '../../tools/modelToSerializableObj'
import { toRaw } from '../toRaw'
import { snapshotColumnsKey } from '../columnRegistry'

type Snapshot = Record<string, any>
type Columns = Record<string, IColumnInner>
/**
 * 被代理节点的职责，不是 JavaScript 的 typeof，也不是模型的类名。
 * - model：ModelBase 实例，按 @Column 元数据选择需要追踪的字段。
 * - array：已声明子模型类型的数组，追踪索引、元素删除和 length。
 * - record：已声明子模型类型的字典，追踪字典键的增删和替换。
 * - recordArray：值为子模型数组的字典，还需要为各个数组安装代理。
 * 未声明 childType/model 的普通对象和数组不会因此自动获得深层代理。
 */
type Kind = 'model' | 'array' | 'record' | 'recordArray'
type State = {
  /** 被代理的模型或集合；代理拦截器收到的 target 即此对象。 */
  raw: any
  /** 对外使用的唯一追踪代理，与 raw 共用本状态。 */
  proxy: any
  /** 决定按列元数据还是按集合键追踪。 */
  kind: Kind
  /** 仅模型节点使用；兼容即时快照路径不保留此处的延迟计划。 */
  columns?: Columns
  /** 当前可继续记录旧值的节点保存点，完整物化后可释放此引用。 */
  frame?: Frame
  /** 当前模型自身的 DTO 读取入口，可与父模型引用的旧 frame 属于不同保存点。 */
  pending?: PendingSnapshot
}

/** 保存点只共享子节点 frame，不预先复制整棵 DTO；修改时在当前节点记账，不向父节点广播。 */
type Frame = {
  /** 提供未修改字段的当前值；已修改字段改从 previous 读取。 */
  state: State
  /** 保存点建立时的列计划，后续注册新列不能改写旧快照的序列化规则。 */
  columns?: Columns
  /** 保存时的子节点关系，即使当前字段已换引用，仍可重建旧子树。 */
  children?: Map<string, Frame>
  /** 首次写入前的属性描述符；Map 中存在且值为 undefined 表示该属性原本不存在。 */
  previous?: Map<PropertyKey, PropertyDescriptor | undefined>
  /** 已重建的内部视图；不是 Object.freeze，也不是业务对象本身。 */
  fixed?: any
}

// 不在构造器元数据中强持有实例；原对象和代理两种入口均以弱键访问状态。
const states = new WeakMap<object, State>()
// 只缓存稳定列元数据的兼容性判定，不缓存实例数据或变更比较结果。
const plans = new WeakMap<object, { eligible: boolean; keys: string[] }>()

/** 每个实例仅保存查询所需数据；读取函数共享，避免逐实例闭包持有整个创建作用域。 */
type PendingSnapshot = {
  frame: Frame
  store: WeakMap<object, Snapshot>
  group?: string
  excludeGroup?: string | string[]
}

/** 在所属存储中物化，显式写入的 DTO 优先；读取后释放延迟状态。 */
function resolveSnapshot(state: State, model: object): void {
  const pending = state.pending
  if (!pending) return
  const saved = modelToSnapshot(freezeFrame(pending.frame), {
    clean: CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL,
    group: pending.group,
    excludeGroup: pending.excludeGroup,
  })
  if (!pending.store.has(model)) pending.store.set(model, saved)
  if (state.pending === pending) state.pending = undefined
}

/** __CLONE__ 中只放 DTO；get 在存储所属模块执行，支持另一份包副本借用公开读取方法。 */
export class SnapshotStore extends WeakMap<object, Snapshot> {
  /** 未物化时按需生成，之后重复读取仍返回同一个可变 DTO，保留历史契约。 */
  get(model: object): Snapshot | undefined {
    const state = states.get(model)
    if (state?.pending) resolveSnapshot(state, model)
    return super.get(model)
  }
}

/**
 * 为模型或集合节点创建/复用追踪状态，共用同一套 Proxy 拦截器。
 * kind 告诉拦截器如何理解当前节点：模型查列定义，集合处理索引或字典键。
 * 此处只安装代理和登记状态，不复制数据，也不创建完整快照。
 */
function track(raw: object, kind: Kind): State {
  // 查找时先解开 Vue 等外层包装；若此前已登记，就复用已有状态和代理。
  // 已有节点的 kind 也随状态复用，不会因为再次调用而重新分类。
  const existing = states.get(toRaw(raw))
  if (existing) return existing
  // 先创建状态，再将新代理回填；所有节点共享 trackingHandler，避免逐实例创建拦截闭包。
  const state: State = { raw, proxy: undefined, kind }
  state.proxy = new Proxy(raw, trackingHandler)
  // Proxy 的 set/delete 等拦截器拿到的是原对象 target，业务入口拿到的通常是代理。
  // 两个键指向同一份 State，使两种入口都能定位同一个保存点，且不会重复套代理。
  // WeakMap 不会仅因这些登记就阻止一个不再被使用的模型及其状态被回收。
  states.set(raw, state)
  states.set(state.proxy, state)
  return state
}

/**
 * ModelBase 构造函数专用入口；只有开启快照的实例才会调用。
 * 传入的一定是模型实例，因此固定使用 'model'：表示按 @Column 元数据追踪，
 * 而不是将它当作数组或字典。数组/字典由 wrapValue 使用对应的 kind 登记。
 * 返回代理而非内部 State，调用方继续将其作为原模型类型 T 使用。
 */
export function trackModel<T extends object>(raw: T): T {
  return track(raw, 'model').proxy
}

/** 只为显式声明的子模型容器确定类别，普通对象不递归代理；模型自身由构造器代理。 */
function containerKind(state: State, key: PropertyKey, value: any): Kind | undefined {
  if (!value || typeof value !== 'object') return
  if (state.kind === 'recordArray') return Array.isArray(value) ? 'array' : undefined
  if (state.kind !== 'model') return
  const column = state.columns?.[key as string]
  if (!column?.childType) return
  if (Array.isArray(value)) return 'array'
  if (column.type === 'record' || column.type === 'recordArray') return column.type
}

/** 为新增/替换的模型集合补充代理；基本类型、普通对象和已有模型实例保持原值。 */
function wrapValue(state: State, key: PropertyKey, value: any): any {
  const kind = containerKind(state, key, value)
  return kind ? track(toRaw(value), kind).proxy : value
}

/** 同一保存点的一个 key 只记录一次，写回原值后也不能提前丢弃日志。 */
function remember(state: State, key: PropertyKey): void {
  const frame = state.frame
  if (!frame || frame.fixed) return
  if (state.kind === 'model' && !Object.prototype.hasOwnProperty.call(state.columns, key)) return
  const previous = frame.previous || (frame.previous = new Map())
  if (!previous.has(key)) previous.set(key, Reflect.getOwnPropertyDescriptor(state.raw, key))
}

/** 数组扩容会隐式改 length，截断会隐式删除元素，必须在 Reflect 执行前补记这些旧值。 */
function rememberWrite(state: State, key: PropertyKey, value: any): void {
  if (Array.isArray(state.raw)) {
    if (key === 'length' && (typeof value !== 'number' || value < state.raw.length)) {
      for (const index of Object.keys(state.raw)) {
        // 不提前执行用户 valueOf：非数字长度保守记录索引，真正的类型转换仍由 Reflect 完成。
        if (isIndex(index) && (typeof value !== 'number' || Number(index) >= value)) remember(state, index)
      }
    } else if (isIndex(key) && Number(key) >= state.raw.length) {
      remember(state, 'length')
    }
  }
  remember(state, key)
}

/** 合法数组索引不包括 2^32 - 1、负数、符号或带前导零的属性名。 */
function isIndex(key: PropertyKey): boolean {
  return typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key) && Number(key) < 4294967295
}

/** 所有节点共用；不设置 get trap，普通读取不承担日志检查。 */
const trackingHandler: ProxyHandler<any> = {
  /** 先记旧值后赋值；Object.is 只用于跳过同值写入，不进行深层等值比较。 */
  set(target, key, value, receiver) {
    const state = states.get(target)!
    value = wrapValue(state, key, value)
    const previous = Reflect.getOwnPropertyDescriptor(target, key)
    if (!previous || !('value' in previous) || !Object.is(previous.value, value)) rememberWrite(state, key, value)
    // 保留 receiver，让 Vue 外层代理的写入链正常完成。
    return Reflect.set(target, key, value, receiver)
  },
  /** 兼容显式定义属性及 Reflect.set 引发的定义路径；remember 会去重同一次写入。 */
  defineProperty(target, key, descriptor) {
    const state = states.get(target)!
    if ('value' in descriptor) descriptor = { ...descriptor, value: wrapValue(state, key, descriptor.value) }
    const previous = Reflect.getOwnPropertyDescriptor(target, key)
    if (!previous || Object.keys(descriptor).some(name => !Object.is(previous[name], descriptor[name]))) {
      rememberWrite(state, key, descriptor.value)
    }
    return Reflect.defineProperty(target, key, descriptor)
  },
  /** 删除前保留属性存在性，使恢复 undefined 与恢复“无此字段”可以区分。 */
  deleteProperty(target, key) {
    if (Object.prototype.hasOwnProperty.call(target, key)) remember(states.get(target)!, key)
    return Reflect.deleteProperty(target, key)
  },
  /** 原型将改变取值/元数据行为，需先固定旧视图；不是普通赋值的热路径。 */
  setPrototypeOf(target, prototype) {
    const frame = states.get(target)!.frame
    if (frame) freezeFrame(frame)
    return Reflect.setPrototypeOf(target, prototype)
  },
  /** 冻结/封闭对象可能限制后续代理操作，在限制生效前保全旧视图。 */
  preventExtensions(target) {
    const frame = states.get(target)!.frame
    if (frame) freezeFrame(frame)
    return Reflect.preventExtensions(target)
  },
}

/** 有执行时机要求的回调继续走即时快照，不能推迟到查询时才执行。 */
function columnPlan(columns: Columns) {
  let plan = plans.get(columns)
  if (!plan) {
    const keys = Object.keys(columns)
    plan = {
      keys,
      eligible: !keys.some(key => columns[key].serialize || columns[key].unformatter ||
        typeof columns[key].emptyValue === 'function'),
    }
    plans.set(columns, plan)
  }
  return plan
}

/**
 * 将日志重建为稳定的内部视图，不会冻结业务对象。
 * 查询、推进保存点或修改对象结构限制时才执行；普通字段赋值不会进入这里。
 * 尚未修改的字段读当前值，已修改字段读首次旧值，子模型沿保存时的 frame 重建。
 */
function freezeFrame(frame: Frame): any {
  if (frame.fixed) return frame.fixed
  const { state } = frame
  const view: any = state.kind === 'model'
    ? Object.create(Object.getPrototypeOf(state.raw))
    : Array.isArray(state.raw) ? [] : {}
  frame.fixed = view
  if (state.kind === 'model') {
    Object.defineProperty(view, snapshotColumnsKey, { value: frame.columns })
    const options = Reflect.getOwnPropertyDescriptor(state.raw, __MODEL_PROPS__)
    if (options) Object.defineProperty(view, __MODEL_PROPS__, options)
  }
  const keys = state.kind === 'model'
    ? columnPlan(frame.columns!).keys
    : [...new Set([...Object.keys(state.raw), ...Array.from(frame.previous?.keys() || [])])]
  for (const key of keys) {
    if (key === 'length') continue
    const descriptor = frame.previous?.has(key)
      ? frame.previous.get(key)
      : Reflect.getOwnPropertyDescriptor(state.raw, key)
    if (!descriptor) continue
    const child = frame.children?.get(key as string)
    const value = child ? freezeFrame(child)
      : descriptor.value !== null && typeof descriptor.value === 'object'
        ? cloneDeep(descriptor.value) : descriptor.value
    Object.defineProperty(view, key, { value, enumerable: true, configurable: true, writable: true })
  }
  if (Array.isArray(view)) view.length = frame.previous?.get('length')?.value ?? state.raw.length
  frame.previous = undefined
  frame.children = undefined
  // 只让仍需该保存点的调用方持有旧视图，避免缓存 DTO 后活跃节点还额外保留一棵旧数据树。
  if (state.frame === frame) state.frame = undefined
  return view
}

/**
 * 捕获当前子节点关系，不复制字段值。未修改节点可与祖先共享 frame。
 * 推进保存点前固定旧 frame，让子模型单独保存不会覆盖父模型仍持有的旧基准。
 * 访问器、未受追踪的子模型及循环模型关系返回 undefined，由调用方走兼容路径。
 */
function capture(state: State, visiting = new Set<State>()): Frame | undefined {
  if (visiting.has(state)) return undefined
  visiting.add(state)
  let children: Map<string, Frame> | undefined
  const keys = state.kind === 'model' ? columnPlan(state.columns!).keys : Object.keys(state.raw)
  for (const key of keys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(state.raw, key)
    if (!descriptor && !Reflect.has(state.raw, key)) continue
    if (!descriptor || !('value' in descriptor)) { visiting.delete(state); return undefined }
    const value = descriptor.value
    const isChild = state.kind !== 'model' || !!state.columns![key].childType
    if (!isChild || !value || typeof value !== 'object') continue
    const wrapped = wrapValue(state, key, value)
    if (wrapped !== value) {
      if (!descriptor.writable && !descriptor.configurable) { visiting.delete(state); return undefined }
      Reflect.defineProperty(state.raw, key, { ...descriptor, value: wrapped })
    }
    const childState = states.get(toRaw(wrapped))
    if (!childState || (childState.kind === 'model' && !childState.columns)) { visiting.delete(state); return undefined }
    const child = capture(childState, visiting)
    if (!child) { visiting.delete(state); return undefined }
    ;(children || (children = new Map())).set(key, child)
  }
  visiting.delete(state)
  const previous = state.frame
  if (previous && !previous.fixed && !previous.previous && children?.size === previous.children?.size &&
    (!children || [...children].every(([key, child]) => previous.children?.get(key) === child))) return previous
  if (previous) freezeFrame(previous)
  return state.frame = { state, columns: state.columns, children }
}

/**
 * 尝试建立延迟保存点；返回 false 表示调用方应即时序列化，不代表关闭快照。
 * 只有本模块可解析的 SnapshotStore 才使用此路径；旧式 WeakMap 仍保留原有行为。
 */
export function deferSnapshot(
  model: object,
  columns: Columns,
  snapshots: WeakMap<object, any>,
  options: { camelCase: boolean; group?: string; excludeGroup?: string | string[] },
): boolean {
  if (!(snapshots instanceof SnapshotStore)) return false
  const state = states.get(model)
  if (!state || !columnPlan(columns).eligible) return false
  // 推进到新结构之前保全旧保存点，不能让旧 frame 借用新列规则。
  if (state.columns !== columns && state.frame) freezeFrame(state.frame)
  state.columns = columns
  const frame = capture(state)
  if (!frame) return false
  state.pending = {
    frame,
    store: snapshots,
    group: options.group,
    excludeGroup: Array.isArray(options.excludeGroup) ? [...options.excludeGroup] : options.excludeGroup,
  }
  snapshots.delete(model)
  return true
}

/** 切回即时快照前固定仍可能被祖先引用的 frame，再取消本节点的延迟登记。 */
export function clearPendingSnapshot(model: object): void {
  const state = states.get(model)
  if (state) {
    if (state.frame) freezeFrame(state.frame)
    state.pending = undefined
    state.columns = undefined
    state.frame = undefined
  }
}

/** 测试诊断：表示 DTO 尚未物化，不表示模型一定没有变化；不从包入口导出。 */
export function hasDeferredSnapshot(model: object): boolean {
  return !!states.get(model)?.pending
}

/** 测试诊断：当前节点尚未物化的首次旧值条数，不包含子节点日志。 */
export function recordedKeyCount(model: object): number {
  return states.get(toRaw(model))?.frame?.previous?.size || 0
}
