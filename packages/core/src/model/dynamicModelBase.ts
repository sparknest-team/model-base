/**
 * 动态模型创建器
 *
 * 提供在运行时动态创建模型类的能力，无需预先定义 TypeScript 类。
 * 适用于 API 响应结构不固定或需要根据配置动态生成模型的场景。
 */

import { __MODEL__ } from '../constant'
import { ColumnDefine } from '../decorator/Column'
import type { IColumnDefined, IDataModel, IModelOptions } from '../decorator/types'
import { ModelBase } from './ModelBase'

/**
 * 根据类型字符串生成实际类型
 *
 * 将列定义中的字符串类型转换为 JavaScript 构造函数或特殊标识。
 * 对于嵌套模型（array/object 类型），如果 model 是对象配置则递归创建动态模型。
 * 已归一化的 Number/String/Boolean 保持原样，避免同一配置重复注册时丢失基础类型。
 * 未知字符串不生成类型；这不代表支持任意构造器作为 type。
 *
 * @param typeStr - 类型字符串
 * @param column - 列定义配置
 * @returns 对应的类型构造函数或标识
 */
export function genType(typeStr: string | NumberConstructor | StringConstructor | BooleanConstructor, column: IColumnDefined) {
  if (typeStr === Number || typeStr === String || typeStr === Boolean) return typeStr
  let designType
  switch (typeStr) {
    case 'array':
      // 如果 model 传入的是配置对象，递归创建动态模型
      if (column.model && typeof column.model !== 'function') {
        column.model = dynamicModelBase(column.model)
      }
      designType = 'array'
      break
    case 'object':
      // 如果 model 传入的是配置对象，递归创建动态模型
      if (column.model && typeof column.model !== 'function') {
        column.model = dynamicModelBase(column.model)
      }
      break
    case 'number':
      designType = Number
      break
    case 'string':
      designType = String
      break
    case 'boolean':
      designType = Boolean
      break
    default:
      // 未识别的类型不生成 designType；并非原样返回 typeStr。
      break
  }
  return designType
}

// 历史类型边界：ModelBase 子类型会退化为 ModelBase，普通对象 T 则不会补上模型方法。
// 这里只描述实例类型，不能据此认为运行时未继承 ModelBase 的实例/静态方法。
type Model<T> = T extends ModelBase ? ModelBase : T

/**
 * 创建动态模型类
 *
 * 根据列配置对象动态生成一个继承自 ModelBase 的类，每次调用都会创建新的类身份。
 * 会原地归一化 columnObj 中的 name/type/model，调用方不要把它当作只读配置 API。
 * 返回的类可以像普通模型类一样使用。
 *
 * 配置复用边界：
 * - type 的字符串会被覆盖，嵌套 model 配置会被替换为生成的构造器。
 * - 基础类型构造器支持再次归一化；配置仍会原地修改，推荐工厂返回新定义以明确所有权。
 * - 不支持冻结的列对象；ColumnDefine 注册后的列元数据与后续配置修改相隔离。
 * - 复用归一化后的嵌套配置可能共享子模型类，但创建的子模型实例仍独立。
 * - 父子类各自缓存列定义，父类预热不会屏蔽子类新增的装饰器字段。
 *
 * 类型边界：返回声明目前只包含 new，运行时继承的静态 create 未在返回类型中暴露。
 * 下方示例使用 new，避免将运行时能力误写成当前声明已支持的静态调用。
 *
 * @typeParam T - 模型类型（默认为 ModelBase）
 * @param columnObj - 列配置对象，键为属性名，值为列配置
 * @param params - 当前仅消费 methods 配置，不自动应用全部 IDataModel 选项
 * @returns 动态生成的模型类
 *
 * @example
 * ```typescript
 * // 创建动态模型类
 * const UserModel = dynamicModelBase({
 *   id: { type: 'number', primary: true },
 *   name: { type: 'string' },
 *   profile: {
 *     type: 'object',
 *     model: {
 *       avatar: { type: 'string' },
 *       bio: { type: 'string' }
 *     }
 *   },
 *   tags: {
 *     type: 'array',
 *     model: {
 *       name: { type: 'string' }
 *     }
 *   }
 * })
 *
 * // 使用动态模型类
 * const user = new UserModel({
 *   id: 1,
 *   name: 'John',
 *   profile: { avatar: 'url', bio: 'Hello' },
 *   tags: [{ name: 'developer' }]
 * })
 * ```
 */
export function dynamicModelBase<T = ModelBase>(
  columnObj: {
    [key: string]: IColumnDefined
  },
  params?: IDataModel,
) {
  /** 独立的动态类承载本次列元数据，避免不同定义共享同一构造器缓存。 */
  class CustomDefinedModel extends ModelBase {
    constructor(dto?: any, options?: IModelOptions) {
      super(dto, options)
    }
  }

  // 必须先归一化再注册；ColumnDefine 会复制列定义，但此处对调用方配置的修改已经发生。
  Object.keys(columnObj).forEach((key) => {
    const column = columnObj[key]
    const typeStr = column.type || 'string'
    column.name = column.name || key
    column.type = genType(typeStr, column)
    ColumnDefine(column)(CustomDefinedModel.prototype, key)
  })

  // 仅消费 methods，不把 params 当作完整的 @DataModel 配置。
  // enableSnapshot 等实例选项应传给 new/create 的 options，而不是此处的第二参数。
  if (params?.methods) {
    const model = {
      methods: params?.methods || {},
    } as IDataModel
    ;(CustomDefinedModel.prototype.constructor as any)[__MODEL__] = model
  }

  return CustomDefinedModel as any as new (dto?: any, options?: IModelOptions) => Model<T>
}
