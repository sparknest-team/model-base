/**
 * @DataModel 类装饰器
 *
 * 配置当前模型类的默认行为，如自定义方法、命名策略和状态追踪；不是进程级全局配置。
 */

import { __MODEL__ } from '../constant'
import { IDataModel } from './types'

/** 本地数据模型的 Symbol 键 */
export const LOCA_DATA_MODEL_KEY = Symbol.for('locaDataModelKey')

/**
 * 模型类装饰器
 *
 * 为模型类添加元数据配置，影响整个类的序列化/反序列化行为。
 *
 * @param params - 模型配置参数
 * @returns 类装饰器函数
 *
 * @example
 * ```typescript
 * @DataModel({
 *   enableDataState: true,
 *   methods: {
 *     onInit: ({ data }) => console.log('Initialized:', data)
 *   }
 * })
 * class User extends ModelBase {
 *   @Column()
 *   name: string
 * }
 * ```
 */
export function DataModel(params?: IDataModel) {
  return <TFunction extends Function>(constructor: TFunction) => {
    const model = {
      ...params,
      methods: params?.methods || {},
    } as IDataModel
    ;(constructor as any)[__MODEL__] = model
  }
}
