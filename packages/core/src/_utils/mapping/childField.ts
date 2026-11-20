import type { IColumnInner, IModelOptions } from '../../decorator/types'
import type { ModelBase } from '../../model/ModelBase'
import { deserializeRecord, deserializeRecordArray } from '../../tools/methods'
import { getModelType } from '../create'
import { getDeserializeValue } from './dtoValue'

/**
 * 创建嵌套子模型
 *
 * 根据列的 childType 配置，将 DTO 数据转换为子模型实例。
 * 支持以下类型：
 * - 数组：转换为子模型实例数组
 * - record：转换为 { [key: string]: ChildModel } 结构
 * - recordArray：转换为 { [key: string]: ChildModel[] } 结构
 * - 单个对象：转换为单个子模型实例
 *
 * @param model - 父模型实例
 * @param field - 列配置
 * @param key - 属性名
 * @param modelDTO - 原始 DTO 数据
 * @param options - 模型选项
 * @returns 子模型实例或实例集合
 */
export function createChildField<T extends ModelBase>(
  model: T,
  field: IColumnInner<T>,
  key: keyof T,
  modelDTO: any,
  options?: IModelOptions,
  resolvedDtoValue?: { value: any },
) {
  const deserializeValue = getDeserializeValue(model, field, modelDTO, options, resolvedDtoValue)
  // 同一字段只解析一次惰性类型函数，避免数组每项都重复解析。
  const childType = getModelType(field.childType)
  if (Array.isArray(deserializeValue)) {
    const arr: any[] = []
    // forEach 跳过稀疏数组空洞，push 生成连续结果；保持与公开序列化的集合规则一致。
    deserializeValue.forEach((itemDTO: any) => {
      arr.push(childType.create(itemDTO, options) as T)
    })
    return arr
  } else {
    if (field.type === 'record') {
      return deserializeRecord(childType as any, deserializeValue, options)
    } else if (field.type === 'recordArray') {
      return deserializeRecordArray(childType as any, deserializeValue, options)
    }
    return childType.create(deserializeValue, options) as T
  }
}
