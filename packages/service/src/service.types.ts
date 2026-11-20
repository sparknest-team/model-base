/** 公共服务类型；仅类型依赖，不在模块加载时创建模型或响应容器。 */
import type { ModelBase } from '@model-base/core'
import type { Wrapper } from './response/Wrapper'

/** 历史名称：实际提取 wrapper 实例的 data 类型，不是构造器签名。 */
export type WrapperConstructor<Sub extends Wrapper> = Sub['data']
/** wrapper 实例取 data，模型类取实例类型，未指定类型时保留 any 兼容。 */
export type WrapperType<U> = U extends Wrapper
  ? WrapperConstructor<U>
  : U extends typeof ModelBase
  ? InstanceType<U>
  : any

/** 单次请求配置；钩子返回的值会替换原值，而非仅用于观察。 */
export interface IServiceParam<T, U> {
  /** 原始请求参数或 ModelBase；模型默认按清理空值的规则序列化。 */
  params?: ModelBase | any
  /** 原样传递给驱动；allowEmptyData 控制模型参数是否保留空字符串及空集合。 */
  options?: any
  /** 包装响应前的第一阶段 DTO 转换，this 为请求描述对象。 */
  beforeParse?: (dto: any) => any
  /** 紧随 beforeParse，仍在响应包装之前执行。 */
  beforeDeserialize?: (data: any) => any
  /** 响应包装后的第一阶段转换，以 call(null, response) 调用。 */
  afterParse?: (serviceResponse: T) => T
  /** 最后阶段转换，其返回值成为请求的结果。 */
  afterDeserialize?: (serviceResponse: T) => T
  /** 模型类或有状态的 Wrapper 实例；复用实例会覆盖其 data。 */
  wrapper?: U
}

/** 通用 request 入口允许显式指定方法，缺省为 get。 */
export interface IServiceParamRequest<T, U> extends IServiceParam<T, U> {
  type?: 'get' | 'post' | 'del' | 'put' | 'patch'
}

/** 保留响应容器其他字段，只替换 data 的静态类型。 */
export type ServiceResponseType<R, U> = Omit<R, 'data'> & { data: WrapperType<U> }
