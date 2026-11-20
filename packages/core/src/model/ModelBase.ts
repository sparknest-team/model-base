/**
 * ModelBase - 模型基础类
 *
 * 所有数据模型的基类，提供以下核心功能：
 *
 * 1. **序列化/反序列化**：DTO ↔ 模型实例的双向转换
 * 2. **变更追踪**：追踪模型数据变化，支持还原和获取变更
 * 3. **嵌套模型**：支持复杂的嵌套对象和数组结构
 * 4. **命名策略**：自动处理驼峰/蛇形命名转换
 * 5. **分组过滤**：支持按分组选择性序列化
 *
 * @example
 * ```typescript
 * class User extends ModelBase {
 *   @Column({ primary: true })
 *   id: number
 *
 *   @Column()
 *   userName: string
 *
 *   @Column({ model: Address })
 *   address: Address
 * }
 *
 * // 从 API 响应创建模型
 * const user = User.create({ id: 1, user_name: 'John' })
 *
 * // 修改并获取变更
 * user.userName = 'Jane'
 * const changes = user.getChangedData() // { user_name: 'Jane' }
 *
 * // 序列化回 API 格式
 * const dto = user.getSerializableObject()
 * ```
 */

import merge from 'deepmerge'
import { cloneDeep } from 'lodash'
import { jsonEqual } from '../_utils/jsonEqual'
import { getChange } from '../_utils/ChangedModelUtil'
import { trackModel, deferSnapshot, clearPendingSnapshot, SnapshotStore } from '../_utils/changeTracking/proxyState'
import { getModelProps, initModelOptions } from '../_utils/ModelBaseProps'
import { createModelByDTO, deepCopy, extendModelByDTO, updateModelByDTO } from '../_utils/ModelBaseUtil'
import { toRaw } from '../_utils/toRaw'
import { __CLONE__, __MODEL__, NAMING_STRATEGIES } from '../constant'
import { resolveStaticColumns } from '../_utils/columnRegistry'
import { generateColumnsFromData } from '../decorator/Column'
import { CLEAN_ENUM, IColumnInner, IDataModel, IModelOptions, ModelType } from '../decorator/types'
import { modelToSerializableObj, modelToSnapshot } from '../tools/modelToSerializableObj'

/**
 * 基于原始数据设置的选项
 */
export interface IDataByOriginalOption extends IModelOptions {
  /** 是否保留原有的变更追踪基准点 */
  keepBackUp?: boolean
}

/** 内部读取主键不需要公开 API 的元数据副本；自定义主键方法仍按原调用次数执行。 */
function primaryColumns(model: ModelBase) {
  if (model.getPrimaryKey !== ModelBase.prototype.getPrimaryKey) return model.getPrimaryKey()
  const columns = model.getColumnsCached()
  return Object.keys(columns).filter(key => columns[key].primary)
    .map(key => ({ primaryKey: key, primaryColumn: columns[key] }))
}

/**
 * 先递归调用已声明子模型，再调用当前实例方法和类配置方法。
 * 字符串表达式沿用 new Function 执行，仅可使用可信配置，不能接收外部未校验文本。
 */
function callMethod(
  this_: any,
  param: { method: string },
) {
  const target = toRaw(this_)
  const columns = target.getColumnsCached() as { [key: string]: IColumnInner }
  const modelOptions: IDataModel = (target.constructor as any)[__MODEL__] || {}
  modelOptions.methods = modelOptions.methods || {}
  for (const key in columns) {
    if (columns.hasOwnProperty(key)) {
      if (columns[key].childType) {
        if (target[key] && Array.isArray(target[key])) {
          target[key].forEach((m: any) => {
            callMethod(m, param)
          })
        } else {
          callMethod(target[key], param)
        }
      }
    }
  }

  if ((this_ as any)[param.method]) {
    ;(this_ as any)[param.method]({ data: this_ })
  }
  if (modelOptions?.methods[param.method] && typeof modelOptions?.methods[param.method] === 'string') {
    try {
      const str = modelOptions.methods[param.method]
      const reg = /^\{\{(.*)\}\}$/
      const res = str.match(reg)
      if (res.length > 1) {
        return new Function('$model', 'with($model) { return ('.concat(res[1], '); }'))(this_)
      }
    } catch (err) {
      // 保留旧表达式分支的错误处理，不在注释整理中扩大或收窄异常边界。
    }
  }
  if (modelOptions.methods[param.method]) {
    modelOptions.methods[param.method]({ data: this_ })
  }
}

/** 模型的公共操作入口；映射、序列化、快照与差异计算委托给各自内部模块。 */
export class ModelBase {
  // 做标记用，判断当前class是不是继承ModelBase
  public static isModelBase = true
  /** 创建实例并安装可选的追踪代理；工厂入口可推迟 DTO 映射至子类构造完成后。 */
  constructor(dto?: any, options?: IModelOptions, ...rest: any) {
    const rawInstance = toRaw(this)
    initModelOptions(rawInstance, options)
    const instance = getModelProps(rawInstance, 'enableSnapshot') ? trackModel(rawInstance) : rawInstance
    // __isInit 是历史内部标记：true 表示由工厂稍后映射，不是“已经完成初始化”。
    if (!options?.__isInit) {
      createModelByDTO(instance, instance.getColumnsCached(
        getModelProps(instance, 'columnsInValue') ? { dto } : undefined,
      ), dto, options)
    }
    // 返回代理后，子类初始化和后续业务赋值均作用于同一个实例入口。
    return instance
  }

  /**
   * 旧式创建入口：调用时 this 必须绑定模型构造器，而非模型实例。
   * 跳过默认值，待子类构造完成后映射输入并建立保存点。
   * 保留 __noDeserialize 标记用于兼容，但当前映射链路不读取它，转换回调仍可能执行。
   * 保留实例方法的位置及调用约定；它不同于包级 createModel 工具函数。
   */
  public createModel<T extends ModelBase>(
    this: new (dto: any, options?: IModelOptions) => T,
    source: ModelType<typeof this>,
    options?: IModelOptions,
  ) {
    const ModelConstructor = toRaw(this)
    const creationOptions = { ...options, __isInit: true, __noDeserialize: true, noDefault: true }
    const instance = new ModelConstructor(source, creationOptions)
    createModelByDTO(instance, instance.getColumnsCached(
      getModelProps(instance, 'columnsInValue') ? { dto: source } : undefined,
    ), source, creationOptions)
    return instance
  }

  /** 先完成整个构造链，再统一映射 DTO，避免在基类构造阶段重复赋值。 */
  public static create<T extends ModelBase>(
    this: new (dto: any, options?: IModelOptions, ...res: any) => T,
    dto?: any,
    options?: IModelOptions,
    ...rest: any
  ) {
    const ModelConstructor = toRaw(this)
    // 只修改本次创建的配置副本，不向调用方 options 写入内部标记。
    const creationOptions = { ...options, __isInit: true }
    // 保留历史约定：额外参数作为一个数组传给构造器，不在此展开。
    const instance = new ModelConstructor(dto, creationOptions, rest)
    createModelByDTO(instance, instance.getColumnsCached(
      getModelProps(instance, 'columnsInValue') ? { dto } : undefined,
    ), dto, creationOptions)
    return instance
  }

  /**
   * @description 还原数据到上一个保存点之前，初始化保存点为创建对象的时候。
   */
  public static revertChangedData(target: ModelBase | ModelBase[] | { [key: string]: ModelBase }) {
    if (target instanceof Array) {
      target.forEach((item) => {
        ModelBase.revertChangedDataObject(item)
      })
    } else if (((target as any).constructor as typeof ModelBase).isModelBase) {
      ModelBase.revertChangedDataObject(target as ModelBase)
    } else {
      Object.keys(target).forEach((key) => {
        ModelBase.revertChangedDataObject(target[key])
      })
    }
    return this
  }

  /** 将单个模型或集合重新按空 DTO 映射默认值，并建立新的保存点；不是撤销修改。 */
  public static resetDefault(target: ModelBase | ModelBase[] | { [key: string]: ModelBase }) {
    target = toRaw(target)
    if (target instanceof Array) {
      target.forEach((item) => {
        ModelBase.resetDefaultObject(item)
      })
    } else if (((target as any).constructor as typeof ModelBase).isModelBase) {
      ModelBase.resetDefaultObject(target as ModelBase)
    } else {
      Object.keys(target).forEach((key) => {
        ModelBase.resetDefaultObject((target as any)[key])
      })
    }
    return this
  }

  /** 原地重置单个模型；仍遵守实例已有的 noDefault 等配置。 */
  public static resetDefaultObject<T extends ModelBase>(target: T, options?: IModelOptions) {
    const target_ = toRaw(target)
    createModelByDTO<T>(target_, (target_ as ModelBase).getColumnsCached(), {}, options)
    return target_
  }

  /** 从保存点重建字段；通过调用方传入的对象写回，保留其外层响应式代理。 */
  public static revertChangedDataObject(target: ModelBase) {
    if (!getModelProps(target, 'enableSnapshot')) return this
    const orgTarget = target as any
    target = toRaw(target)
    const C = Object.getPrototypeOf(target).constructor as typeof ModelBase
    // 回滚才复制保存点，避免恢复后的可变字段反向污染保存点；日常赋值不承担此复制。
    // 数据驱动列必须在临时恢复实例中继续启用，否则未装饰字段会在映射时丢失。
    const dynamicOptions = getModelProps(target, 'columnsInValue')
      ? { columnsInValue: true, keepModelName: getModelProps(target, 'keepModelName') } : {}
    const org = C.create(cloneDeep(target.getOriginalData()), { ...dynamicOptions, noDefault: true, enableSnapshot: true })
    const columns = (target as ModelBase).getColumnsCached()
    for (const key in columns) {
      orgTarget[key] = org[key]
      // 不再对解包后的 target 重复赋值，否则可能绕过外层响应式通知。
    }
    return this
  }

  /** 分发单个模型或模型数组的命名方法调用，不处理 Record 容器。 */
  public static callMethod(
    data: ModelBase | ModelBase[],
    params: { method: string },
  ) {
    data = toRaw(data)
    if (Array.isArray(data)) {
      data.forEach((d) => {
        if (((d as any).constructor as typeof ModelBase).isModelBase) {
          d.callMethod(params)
        }
      })
    } else {
      if (((data as any).constructor as typeof ModelBase).isModelBase) {
        data.callMethod(params)
      }
    }
  }

  /** 从本模型开始递归调用命名方法；调用顺序与类配置表达式规则见内部 callMethod。 */
  public callMethod(params: { method: string }) {
    callMethod(toRaw(this), params)
  }

  /**
   * 增量更新 DTO 中已提供的字段，并将更新后的状态保存为新基准。
   * 已声明子模型尽量复用实例；数组按主键合并，普通对象字段直接替换，不能保证所有引用不变。
   */
  public update(dto: any) {
    const t_ = toRaw(this)
    updateModelByDTO<typeof this>(this, (t_ as ModelBase).getColumnsCached({ dto }), dto)
    return this
  }

  /**
   * 按创建规则重填字段（包括缺失字段的默认值），不同于 update 的增量合并。
   * keepBackUp=true 保留旧保存点，否则建立新保存点；此处不转发其他 options 字段。
   */
  public setDataByOriginal(dto: any, options?: IDataByOriginalOption) {
    type T = typeof this
    const t_ = toRaw(this)
    if (options?.keepBackUp) {
      extendModelByDTO<T>(this, (t_ as ModelBase).getColumnsCached({ dto }), dto)
    } else {
      createModelByDTO<T>(this, (t_ as ModelBase).getColumnsCached({ dto }), dto)
    }
    return this
  }

  /**
   * 供子类覆盖的旧相等性入口；基类只返回 true，不实际比较字段。
   */
  public equal() {
    return true
  }

  /**
   * 按列对应的序列化名称直接读取两边的值并比较，不先调用完整序列化流程。
   * 这是历史比较规则，不应直接当作任意两个模型实例的通用深比较。
   * ignoreEmptyString undefined 与 '' 比较视为相等
   */
  public isModelEqual(targetData: ModelBase, params?: { ignoreEmptyString?: boolean }) {
    targetData = toRaw(targetData)
    const t_ = toRaw(this)
    const sns = getModelProps(t_, 'serializeNamingStrategies')
    const columns = (t_ as ModelBase).getColumnsCached()
    const target = t_ as ModelBase
    let flag = true
    Object.keys(columns).forEach((columnName) => {
      let orgColumn = columns[columnName].name
      if (sns === NAMING_STRATEGIES.camelCase) {
        orgColumn = columns[columnName].camelCaseName
      }
      const targetValue = (targetData as any)[orgColumn]
      const currentValue = (target as any)[orgColumn]
      if (!flag) {
        // 如果发现不相等的值，则停止
        return
      }
      if (typeof targetValue === 'undefined' && typeof currentValue !== 'undefined') {
        flag = !!(params?.ignoreEmptyString && typeof currentValue === 'string' && currentValue === '')
      } else if (typeof currentValue === 'undefined' && typeof targetValue !== 'undefined') {
        flag = !!(params?.ignoreEmptyString && typeof targetValue === 'string' && targetValue === '')
      } else {
        if (!jsonEqual(targetValue, currentValue)) {
          flag = false
        }
      }
    })
    return flag
  }

  /**
   * 部分匹配：忽略 targetData 中值为 undefined 的列，其余列沿用 JSON 语义比较。
   * 与 isModelEqual 一样按序列化名称读取，不执行字段转换回调。
   * ignoreEmptyString undefined 与 '' 比较视为相等
   */
  public isContainsModel(targetData: ModelBase, params?: { ignoreEmptyString?: boolean }) {
    targetData = toRaw(targetData)
    const t_ = toRaw(this)
    const sns = getModelProps(t_, 'serializeNamingStrategies')
    const columns = (t_ as ModelBase).getColumnsCached()
    const target = t_ as ModelBase
    let flag = true
    Object.keys(columns).forEach((columnName) => {
      let orgColumn = columns[columnName].name
      if (sns === NAMING_STRATEGIES.camelCase) {
        orgColumn = columns[columnName].camelCaseName
      }
      const targetValue = (targetData as any)[orgColumn]
      const currentValue = (target as any)[orgColumn]
      if (!flag) {
        // 如果发现不相等的值，则停止
        return
      }
      if (typeof targetValue === 'undefined') {
        // 目标值为空，不比较
        flag = true
      } else if (typeof currentValue === 'undefined' && typeof targetValue !== 'undefined') {
        flag = !!(params?.ignoreEmptyString && typeof targetValue === 'string' && targetValue === '')
      } else {
        if (!jsonEqual(targetValue, currentValue)) {
          flag = false
        }
      }
    })
    return flag
  }

  /**
   * @description 还原数据到上一个保存点之前，初始化保存点为创建对象的时候。
   */
  public revertChangedData() {
    ModelBase.revertChangedData(this)
    return this
  }

  /**
   * @description 当前对象相对于保存点是否有变化。
   * ignoreEmptyString undefined 变为 '' 视为没有变化
   */
  public isChanged(params?: {
    group?: string
    excludeGroup?: string | string[]
    trim?: boolean
    ignoreEmptyString?: boolean
  }) {
    const t_ = toRaw(this)
    return Object.keys(t_.getChangedData(params)).length !== 0
  }

  /**
   * @description 变更保存点，将当前的数据作为最新的保存点。实例关闭快照时不执行；参数只能跳过本次保存。
   */
  public saveChangedData(param?: { group?: string; excludeGroup?: string | string[]; enableSnapshot?: boolean; enableDataState?: boolean }) {
    const t_ = toRaw(this)
    const enableDs = getModelProps(t_, 'enableSnapshot') && (param?.enableSnapshot ?? param?.enableDataState ?? true)
    if (enableDs) {
      // 构造器只持有弱键存储；具体实例作为 key，避免类元数据强引用全部实例。
      const clone = (t_.constructor as any)[__CLONE__] || new SnapshotStore()
      ;(t_.constructor as any)[__CLONE__] = clone
      // 自定义列查询和动态列可能依赖当前值，不使用静态列的延迟计划。
      const standardColumns = t_.getColumns === ModelBase.prototype.getColumns &&
        t_.getColumnsCached === ModelBase.prototype.getColumnsCached && !getModelProps(t_, 'columnsInValue')
      if (standardColumns && deferSnapshot(t_, t_.getColumnsCached() as Record<string, IColumnInner>, clone, {
        camelCase: getModelProps(t_, 'serializeNamingStrategies') === NAMING_STRATEGIES.camelCase,
        group: param?.group,
        excludeGroup: param?.excludeGroup,
      })) return this
      // 不能安全延迟时保留即时序列化，尤其保证 getter 和转换回调仍在保存时执行。
      clearPendingSnapshot(t_)
      const dto_ = modelToSnapshot(t_, {
        group: param?.group,
        excludeGroup: param?.excludeGroup,
        clean: CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL,
      })
      clone.set(t_, dto_)
      ;(t_.constructor as any)[__CLONE__] = clone
    }
    return this
  }

  /**
   * 返回保存点 DTO；延迟保存点在此物化，关闭快照时返回空对象。
   * 返回值不是每次新建的副本：直接修改它会改变后续比较和回滚的基准。
   */
  public getOriginalData() {
    const t_ = toRaw(this)
    if (!getModelProps(t_, 'enableSnapshot')) return {}
    return (t_.constructor as any)[__CLONE__]?.get(t_) || {}
  }

  /**
   * @description 获得可被序列化的 object 对象，这个对象去除了 空字符 空对象 空数组。
   */
  public getCleanSerializableObject(params?: {
    group?: string
    excludeGroup?: string | string[]
    camelCase?: boolean
    trim?: boolean
  }) {
    const t_ = toRaw(this)
    return modelToSerializableObj(t_, {
      clean: CLEAN_ENUM.CLEAN_DIRTY,
      group: params && params.group,
      excludeGroup: params?.excludeGroup,
      camelCase: params && params.camelCase,
      trim: params && params.trim,
    })
  }

  /**
   * 返回 DTO，默认只清理 undefined/null，保留空字符串、空对象和空数组。
   * @param params
   * clean 默认 CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL 兼容老的数据
   */
  public getSerializableObject(params?: {
    trim?: boolean
    group?: string
    excludeGroup?: string | string[]
    clean?: CLEAN_ENUM
    camelCase?: boolean
    enableEmptyValue?: boolean
  }) {
    const t_ = toRaw(this)
    return modelToSerializableObj(t_, {
      clean: params?.clean ?? CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL,
      group: params?.group,
      excludeGroup: params?.excludeGroup,
      camelCase: params?.camelCase,
      trim: params && params.trim,
      enableEmptyValue: params?.enableEmptyValue,
    })
  }

  /**
   *
   * @description 获得可被序列化的 string 字符串，这个字符串去除了 空字符 空对象 空数组。
   */
  public getCleanSerializableString(param?: {
    group?: string
    excludeGroup?: string | string[]
    trim?: boolean
    camelCase?: boolean
  }) {
    const t_ = toRaw(this)
    return JSON.stringify(t_.getCleanSerializableObject(param))
  }

  /**
   * 将默认序列化 DTO 转成 JSON 文本，保留空字符串和空集合；JSON 不支持的值仍可能抛错。
   */
  public getSerializableString(param?: {
    group?: string
    excludeGroup?: string | string[]
    trim?: boolean
    camelCase?: boolean
  }) {
    const t_ = toRaw(this)
    return JSON.stringify(t_.getSerializableObject(param))
  }

  /**
   * @description 获取在上一个保存点之后的变更数据，这个数据只会包含变化的 column 的键值对。
   * @param params
   * clean 默认 CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL 兼容老的数据
   */
  public getChangedData(params?: {
    group?: string
    excludeGroup?: string | string[]
    trim?: boolean
    clean?: CLEAN_ENUM
    descriptor?: boolean
    ignoreEmptyString?: boolean
    enableEmptyValue?: boolean
  }) {
    const t_ = toRaw(this)
    if (!getModelProps(t_, 'enableSnapshot')) return {}

    const columns = (t_ as ModelBase).getColumnsCached()
    const target = t_ as ModelBase
    const targetData = t_.getSerializableObject({ ...params, enableEmptyValue: false })
    return getChange(columns, target, targetData, {
      ...params,
      clean: params?.clean ?? CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL,
    })
  }

  /**
   * 返回字段 CREATE/DELETE/UPDATE 描述；带主键的模型数组还提供按主键分类的变化。
   * 数组未变更项也可能出现在 noChange 中，不能简单等同于 getChangedData 的键集合。
   */
  public getChangedDescriptor(params?: {
    group?: string
    excludeGroup?: string | string[]
    trim?: boolean
    clean?: CLEAN_ENUM
    ignoreEmptyString?: boolean
  }) {
    const t_ = toRaw(this) as any
    if (!getModelProps(t_, 'enableSnapshot')) return {}
    const columns = (t_ as ModelBase).getColumnsCached()
    const target = t_ as ModelBase
    const targetData = t_.getSerializableObject(params)
    return getChange(columns, target, targetData, {
      ...params,
      descriptor: true,
      ignoreEmptyString: params?.ignoreEmptyString,
      clean: params?.clean ?? CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL,
    })
  }

  /**
   * @deprecated 请使用extendModel
   * 深复制输入后，按已声明属性名做顶层替换；对象/数组整体替换，不执行递归模型合并。
   * @param model
   */
  public extend(model: any) {
    model = toRaw(model)
    const data: { [index: string]: any } = cloneDeep(model)
    const t_ = toRaw(this)
    const props = (t_ as ModelBase).getColumnsCached()
    for (const key in props) {
      if (data.hasOwnProperty(key)) {
        // 此处应该用this，不能用toRaw后的对象，会引起vue对象丢失响应的问题。
        ;(this as any)[key] = data[key]
      }
    }
    return this
  }

  /**
   *
   * @deprecated 请使用mergeModel
   * 使用旧 deepCopy 后覆盖非 undefined 的字段，不重置根保存点。
   * 旧复制规则保留嵌套数组引用，不保证完整的深层隔离。
   */
  public extendModel(model: ModelBase) {
    model = toRaw(model)
    const newModel = deepCopy(model)
    const t_ = toRaw(this)
    const props = (t_ as ModelBase).getColumnsCached()
    for (const key in props) {
      if (typeof (newModel as any)[key] !== 'undefined') {
        // 此处应该用this，不能用toRaw后的对象，会引起vue对象丢失响应的问题。
        ;(this as any)[key] = (newModel as any)[key]
      }
    }
    return this
  }

  /**
   *
   * 深复制输入后，用其中非 undefined 的已声明字段覆盖当前字段，不重置根模型保存点。
   * 同类型模型合并时，按现有条件保留被替换子模型的原保存点。
   */
  public mergeModel(model: ModelType<typeof this>) {
    model = toRaw(model)
    const newModel = cloneDeep(model)
    const t_ = toRaw(this)
    const props = (t_ as ModelBase).getColumnsCached()
    for (const key in props) {
      if (typeof (newModel as any)[key] === 'undefined') continue
      let origin = null
      if (getModelProps(t_, 'enableSnapshot') && (t_ as any)[key]?.getOriginalData &&
        getModelProps(t_[key], 'enableSnapshot') && t_.constructor === newModel.constructor) {
        if ((t_ as any)[key]?.getOriginalData) {
          origin = (t_ as any)[key].getOriginalData()
        }
      }
      // 通过原实例赋值以保留响应式代理；同类型合并沿用旧子模型快照。
      ;(this as any)[key] = (newModel as any)[key]
      if (origin !== null && getModelProps(t_[key], 'enableSnapshot')) {
        ;(t_[key].constructor as any)[__CLONE__].set(t_[key], origin)
      }
    }
    return this
  }

  /**
   * @description 获得 model 的主键集合。
   */
  public getPrimaryKey() {
    const t_ = toRaw(this)
    const primary: { primaryKey: string; primaryColumn: IColumnInner }[] = []
    const columns = (t_ as ModelBase).getColumns()
    for (const columnName in columns) {
      if (columns.hasOwnProperty(columnName)) {
        const column = columns[columnName]
        if (column.primary) {
          primary.push({
            primaryKey: columnName,
            primaryColumn: column,
          })
        }
      }
    }
    if (primary.length === 0) {
      // console.log(this.constructor.name + '没有设置 primary key');
    }
    return primary
  }

  /**
   * @description 在当前对象中获得主键对应的值集合。
   */
  public getPrimaryValue() {
    const t_ = toRaw(this)
    const target = t_ as any
    const valList: any[] = []
    primaryColumns(this).forEach((item: any) => {
      valList.push(target[item.primaryKey])
    })
    return valList
  }

  /**
   * @description 从传入对象中获得主键对应的值集合。
   * @param model
   */
  public getPrimaryValueFromData(model: any) {
    const t_ = toRaw(this)
    const sns = getModelProps(t_, 'serializeNamingStrategies')
    const valList: any[] = []
    primaryColumns(this).forEach((item) => {
      let column = item.primaryColumn.name
      if (sns === NAMING_STRATEGIES.camelCase) {
        column = item.primaryColumn.camelCaseName
      }
      valList.push(model[column])
    })
    return valList
  }

  /**
   * 静态列统一由列注册表解析；通常直接命中，仅注册后检查继承依赖。
   * 数据驱动列或自定义 getColumns 可能依赖实例/DTO，必须实时计算。
   * 命中后直接返回共享结果；业务代码需要可修改副本时使用 getColumns。
   */
  public getColumnsCached(data?: { dto?: any }): Record<string, IColumnInner> {
    const t_ = toRaw(this)
    if (getModelProps(t_, 'columnsInValue') || this.getColumns !== ModelBase.prototype.getColumns) {
      return this.getColumns(data)
    }
    return resolveStaticColumns(t_.constructor)
  }

  /** 计算列定义副本；columnsInValue 可从输入/实例值补充列，装饰器列按既有顺序合并。 */
  public getColumns(data?: { dto?: any }): { [key: string]: IColumnInner } {
    const t_ = toRaw(this)
    let columns_ = {} as { [key: string]: IColumnInner }
    const isColInVal = getModelProps(t_, 'columnsInValue')
    if (isColInVal) {
      if (data?.dto) {
        columns_ = generateColumnsFromData(t_, data?.dto)
      } else {
        columns_ = generateColumnsFromData(t_, t_)
      }
    }

    const columns__ = resolveStaticColumns(t_.constructor)
    // 公共 API 保留独立副本语义；实例推断字段由显式声明覆盖。
    return merge(columns_, columns__, { clone: true })
  }

  /** 直接按实例属性名赋值，不解析 DTO 名称或校验是否声明 Column；保留当前 this 代理。 */
  public setColumnData(key: string, value: any) {
    const target = this as any
    target[key] = value
    return this
  }

  /** 直接按实例属性名读取，不执行序列化或分组过滤。 */
  public getColumnData(key: string) {
    const target = this as any
    return target[key]
  }
}
