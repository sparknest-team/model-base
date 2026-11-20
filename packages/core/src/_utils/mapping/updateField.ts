import type { IColumnInner, IModelOptions } from '../../decorator/types'
import type { ModelBase } from '../../model/ModelBase'
import { create } from '../create'
import { getDeserializeDtoValue, getDeserializeValue } from './dtoValue'

/**
 * 按逗号连接的主键值合并数组：更新所有匹配项，无匹配则追加。
 * 空输入数组清空集合；非空输入不会删除未匹配的旧项，不是完整替换语义。
 * 保留重复主键、更新顺序和主键方法调用次数，不直接改成单值 Map 索引。
 */
function updateArrField<T extends ModelBase>(
  field: IColumnInner<T>,
  model: T,
  columnName: keyof T,
  data: any,
  options?: IModelOptions,
) {
  const arrDto = getDeserializeDtoValue(model, data, field)
  if (typeof arrDto === 'undefined') return
  if (!arrDto.length) {
    ;(model as any)[columnName] = []
    return
  }
  arrDto.forEach((dto: any) => {
    let matched = false
    if (model[columnName] && Array.isArray(model[columnName])) {
      // 不用 find：历史行为会更新所有主键相同的项。
      ;(model[columnName] as any[]).forEach((item: any) => {
        if (item.getPrimaryValue().join(',') === item.getPrimaryValueFromData(dto).join(',')) {
          item.update(dto)
          matched = true
        }
      })
    } else {
      ;(model as any)[columnName] = []
    }
    if (!matched) {
      ;(model as any)[columnName].push(create<T>(field.childType)(dto, options))
    }
  })
}

/**
 * foreign 的旧分支，只有主键匹配才更新已有子模型。
 * 入参访问顺序及 columnDto.join 的要求保留；这里不是通用外键验证器，异常不被吞掉。
 */
function updateForeign<T extends ModelBase>(
  field: IColumnInner<T>,
  model: T,
  columnName: keyof T,
  data: any,
  columnDto: any,
  options?: IModelOptions,
) {
  // 保留历史前置检查；不要在未覆盖旧异常契约前改成可选链或自动补建对象。
  if ((model[columnName] as ModelBase).getPrimaryValueFromData(columnDto.join(','))) {
    // 判断之前是否有值，如果没有值则创建
    if (model[columnName]) {
      // 判断之前的值是否和新的值相等，一致则更新
      if (
        (model[columnName] as any).getPrimaryValue().join(',') ===
        (model[columnName] as any).getPrimaryValueFromData(columnDto).join(',')
      ) {
        ;(model[columnName] as any).update(getDeserializeDtoValue(model, data, field))
      }
    } else {
      ;(model[columnName] as any) = create<T>(field.childType)(columnDto, options)
    }
  }
}

/** 更新已有字段：保留子模型身份、主键合并规则及现有转换入口。 */
export function updateField<T extends ModelBase>(
  model: T,
  field: IColumnInner<T>,
  columnName: keyof T,
  data: any,
  columnDto: any,
  options?: IModelOptions,
) {
  if (!field.childType) {
    ;(model as any)[columnName] = getDeserializeValue(model, field, data)
    return
  }
  if (Array.isArray(columnDto)) {
    updateArrField<T>(field, model, columnName, data, options)
  } else if (field.foreign) {
    updateForeign<T>(field, model, columnName, data, columnDto, options)
  } else if (typeof model[columnName] !== 'undefined' && (model[columnName] as any).update) {
    ;(model[columnName] as any).update(columnDto)
  } else {
    ;(model as any)[columnName] = create(field.childType)(columnDto, options)
  }
}
