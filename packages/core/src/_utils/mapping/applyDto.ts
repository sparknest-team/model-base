import { cloneDeep } from 'lodash'
import type { IColumnInner, IModelOptions } from '../../decorator/types'
import type { ModelBase } from '../../model/ModelBase'
import { getModelProps } from '../ModelBaseProps'
import { createChildField } from './childField'
import { setDefault } from './defaults'
import { getDeserializeDtoValue, getDeserializeValue } from './dtoValue'
import { updateField } from './updateField'

/** 创建与更新共享调用契约，但分别处理默认值、克隆和已有实例。 */
type FieldWriter = typeof updateField
type ColumnMap<T extends ModelBase> = Record<string, IColumnInner<T>>

/** group 优先；未声明分组的字段始终参与映射。 */
function includesColumn(column: IColumnInner, options?: IModelOptions): boolean {
  if (typeof options?.group !== 'undefined') return !column.group || column.group.includes(options.group)
  if (typeof options?.excludeGroup !== 'undefined') return !column.group?.includes(options.excludeGroup)
  return true
}

/** 缺值用默认值；子模型递归创建；其他字段转换后按原数组复制规则赋值。 */
function initializeField<T extends ModelBase>(
  model: T,
  field: IColumnInner<T>,
  columnName: keyof T,
  sourceDto: any,
  sourceValue: any,
  options?: IModelOptions,
) {
  if (typeof sourceValue === 'undefined') {
    if (!getModelProps(model, 'noDefault')) {
      setDefault(model, field, columnName, sourceDto, options)
    }
    return
  }
  if (field.childType) {
    ;(model as any)[columnName] = createChildField(model, field, columnName, sourceDto, options, { value: sourceValue })
    return
  }
  const value = getDeserializeValue(model, field, sourceDto, options, { value: sourceValue })
  // 是否拷贝取决于原 DTO 字段，而不是转换结果的类型。
  ;(model as any)[columnName] = Array.isArray(sourceValue) ? cloneDeep(value) : value
}

/** 更新时未提供的字段保持原值，不触发默认值或转换回调。 */
const updatePresentField: FieldWriter = (model, field, columnName, sourceDto, sourceValue, options) => {
  if (typeof sourceValue !== 'undefined') {
    updateField(model, field, columnName, sourceDto, sourceValue, options)
  }
}

/** 仅负责选列和读取输入；具体字段行为由操作函数决定。 */
function applyDto<T extends ModelBase>(
  writeField: FieldWriter,
  model: T,
  columns: ColumnMap<T>,
  sourceDto: any,
  options?: IModelOptions,
) {
  const namingStrategy = getModelProps(model, 'deserializeNamingStrategies')
  // 父实例关闭追踪时，新建子模型（包括默认值）也关闭；不修改调用方配置。
  const mappingOptions = getModelProps(model, 'enableSnapshot')
    ? options : { ...options, enableSnapshot: false }
  for (const key in columns) {
    if (!Object.prototype.hasOwnProperty.call(columns, key)) continue
    const column = columns[key]
    // 过滤先于 DTO 属性读取，避免触发被排除字段的 getter。
    if (!includesColumn(column, mappingOptions)) continue
    const sourceValue = getDeserializeDtoValue(model, sourceDto, column, mappingOptions, namingStrategy)
    writeField(model, column, key as keyof T, sourceDto, sourceValue, mappingOptions)
  }
}

/**
 * 初始化已有实例的数据，而不是分配新实例。
 * 先按列映射输入（默认值、转换、子模型创建），全部完成后再建立保存点。
 * 保存点通常是延迟日志；这里不意味着立即深复制完整 DTO。
 * 保留历史规则：映射使用 group/excludeGroup，保存点只显式传递 group。
 */
export function createModelByDTO<T extends ModelBase>(model: T, columns: ColumnMap<T>, dto: any, options?: IModelOptions) {
  // 使用 || 保留旧行为：所有假值输入都按空 DTO 处理。
  const sourceDto = dto || {}
  applyDto(initializeField, model, columns, sourceDto, options)
  model.saveChangedData({
    group: options?.group,
    enableSnapshot: getModelProps(model, 'enableSnapshot'),
  })
}

/**
 * 扩展模型数据（不重置变更追踪状态）
 *
 * 类似 createModelByDTO，但不会重置变更追踪的基准点。
 * 用于在保留原有变更历史的情况下扩展模型数据。
 *
 * @param model - 模型实例
 * @param props - 列配置映射
 * @param dto - 原始 DTO 数据
 * @param options - 模型选项
 */
export function extendModelByDTO<T extends ModelBase>(model: T, columns: ColumnMap<T>, dto: any, options?: IModelOptions) {
  const sourceDto = dto || {}
  applyDto(initializeField, model, columns, sourceDto, options)
}

/**
 * 更新模型数据
 *
 * 对已存在的模型实例进行增量更新，仅更新 DTO 中存在的属性。
 * 支持嵌套模型的递归更新，通过主键匹配数组项进行智能合并。
 *
 * @param model - 模型实例
 * @param columns - 列配置映射
 * @param dto - 更新的 DTO 数据
 */
export function updateModelByDTO<T extends ModelBase>(model: T, columns: ColumnMap<T>, dto: any) {
  const sourceDto = dto || {}
  applyDto(updatePresentField, model, columns, sourceDto)
  model.saveChangedData({ enableSnapshot: getModelProps(model, 'enableSnapshot') })
}
