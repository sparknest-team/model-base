import type { IColumnDeserialize, IColumnInner, IModelOptions } from '../../decorator/types'
import type { ModelBase } from '../../model/ModelBase'
import { getColumnSerializeName } from '../getColumnSerializeName'
import { getModelProps } from '../ModelBaseProps'

/** 保留各命名模式的读取规则：mix/camelCase 只读自有属性，snakeCase 允许原型属性。 */
function readDtoName(dto: any, name: string, camelCaseName: string, strategy: IModelOptions['deserializeNamingStrategies']) {
  if (strategy === 'mix') {
    if (Object.prototype.hasOwnProperty.call(dto, name) && typeof dto[name] !== 'undefined') {
      return dto[name]
    }
  }
  if (strategy === 'mix' || strategy === 'camelCase') {
    if (Object.prototype.hasOwnProperty.call(dto, camelCaseName) && typeof dto[camelCaseName] !== 'undefined') {
      return dto[camelCaseName]
    }
    return undefined
  }
  return dto[name]
}

/**
 * 从 DTO 中获取反序列化的属性值
 *
 * 根据配置的命名策略，从 DTO 对象中查找对应的值。
 * 支持主名称和别名，以及蛇形/驼峰命名的自动适配。
 *
 * 查找顺序：
 * 1. 按命名策略查找主名称（name/camelCaseName）
 * 2. 如果未找到且定义了别名，查找别名（aliasName/camelCaseAliasName）
 *
 * @param model - 模型实例
 * @param dto - 原始 DTO 数据
 * @param field - 列配置
 * @param options - 模型选项
 * @returns DTO 中对应的值
 */
export function getDeserializeDtoValue<T extends ModelBase>(
  model: T,
  dto: any,
  field: IColumnInner<T>,
  options?: IModelOptions,
  namingStrategy?: IModelOptions['deserializeNamingStrategies'],
) {
  const dns = namingStrategy ?? getModelProps(model, 'deserializeNamingStrategies')
  let retData: any

  retData = readDtoName(dto, field.name, field.camelCaseName, dns)
  if (typeof retData === 'undefined' && field.aliasName && field.camelCaseAliasName) {
    retData = readDtoName(dto, field.aliasName, field.camelCaseAliasName, dns)
  }
  return retData
}

/**
 * 获取反序列化后的值
 *
 * 如果列配置了 deserialize/formatter 函数，则调用该函数进行转换；
 * 否则直接返回 DTO 中的原始值。
 *
 * @param model - 模型实例
 * @param column - 列配置
 * @param modelDTO - 原始 DTO 数据
 * @param options - 模型选项
 * @returns 反序列化后的值
 */
export function getDeserializeValue<T extends ModelBase>(
  model: T,
  column: IColumnInner<T>,
  modelDTO: any,
  options?: IModelOptions,
  resolvedDtoValue?: { value: any },
) {
  // 新 deserialize 优先；无回调时直接使用解析结果，不偷偷增加对象复制。
  const deserialize = column.deserialize || column.formatter
  // 用包装对象区分“已解析出 undefined”与“尚未解析”，避免重复读取 DTO getter。
  const dtoValue = resolvedDtoValue ? resolvedDtoValue.value : getDeserializeDtoValue(model, modelDTO, column, options)
  if (typeof deserialize === 'function') {
    const sns = getModelProps(model, 'deserializeNamingStrategies')
    const paramsDeserialize: IColumnDeserialize<T> = {
      value: dtoValue,
      name: getColumnSerializeName(column, sns),
      property: column.property,
      serializeData: modelDTO,
      column,
    }
    // 转换回调的 this 是目标模型，不能改成普通函数调用。
    return deserialize.apply(model, [paramsDeserialize])
  } else {
    return dtoValue
  }
}
