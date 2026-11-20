import type { IColumnDefault, IColumnInner, IModelOptions } from '../../decorator/types'
import type { ModelBase } from '../../model/ModelBase'
import { create } from '../create'
import { getColumnSerializeName } from '../getColumnSerializeName'
import { getModelProps } from '../ModelBaseProps'

/**
 * 生成列的默认值
 *
 * 如果 default 是函数，则调用函数获取默认值；否则直接返回默认值，不自动深复制。
 * 需要独立可变默认对象时，应使用工厂函数返回新值，而非共享对象常量。
 *
 * @param model - 模型实例
 * @param column - 列配置
 * @param modelDTO - 原始 DTO 数据
 * @param key - 属性名
 * @param options - 模型选项
 * @returns 列的默认值
 */
function genColumnDefault<T extends ModelBase>(
  model: T,
  column: IColumnInner<T>,
  modelDTO: any,
  key: string,
  options?: IModelOptions,
) {
  const sns = getModelProps(model, 'serializeNamingStrategies')
  if (typeof column.default === 'function') {
    const paramsDefault: IColumnDefault<T> = {
      name: getColumnSerializeName(column, sns),
      property: key,
      data: modelDTO,
      column,
    }
    return column.default.apply(null, [paramsDefault])
  } else {
    return column.default
  }
}

/**
 * 设置列的默认值
 *
 * 根据列配置的 default 或 autowired 属性，为模型属性设置默认值。
 * 支持的默认值类型：
 * - 函数：调用函数获取动态默认值
 * - true：根据类型自动创建（Array → []，Object → {}，childType → 子模型实例）
 * - 其他值：直接使用
 *
 * @param model - 模型实例
 * @param column - 列配置
 * @param key - 属性名
 * @param modelDTO - 原始 DTO 数据
 * @param options - 模型选项
 */
export function setDefault<T extends ModelBase>(
  model: T,
  column: IColumnInner<T>,
  key: keyof T,
  modelDTO: any,
  options?: IModelOptions,
) {
  if (typeof column.default === 'undefined' && typeof column.autowired === 'undefined') {
    model[key] = undefined as T[keyof T]
    return
  }
  // 显式 Array/Object 类型的空值创建优先于 childType，不能任意调整这些分支的顺序。
  if (column.default === true || column.autowired === true) {
    if (column.type === Array) {
      model[key] = [] as T[keyof T]
      return
    }
    if (column.type === Object) {
      model[key] = {} as T[keyof T]
      return
    }
    if (column.childType) {
      model[key] = create<T>(column.childType)({}, options) as T[keyof T]
      return
    }
  }
  model[key] = genColumnDefault(model, column, modelDTO, key as string, options)
}
