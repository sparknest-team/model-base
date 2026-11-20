import { type ServiceResponse } from './ServiceResponse'

/**
 * 有状态的响应数据转换器：processData 通常同时更新自身 data 和响应 data。
 * 如需并发请求结果互不覆盖，应为每次请求创建独立 wrapper 实例。
 */
export abstract class Wrapper<T = unknown> {
  /** 跨包副本识别标记，替代 instanceof 检查。 */
  public static isDataWrapper = true

  /** 最近一次转换结果；不是独立的请求结果缓存。 */
  public data?: T

  /** 请求发送前转换参数，默认原样返回；返回值会替换请求参数。 */
  public processParams?(params?: any): any {
    return params
  }

  /** 原地填充响应；调用方不使用返回值，因此实现需修改 response。 */
  public abstract processData(response: ServiceResponse, dto: any): unknown
}
