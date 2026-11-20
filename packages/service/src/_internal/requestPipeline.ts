/** 请求各阶段的兼容规则；执行顺序和异常边界由 CoreService 决定。 */
import type { IServiceParamRequest } from '../service.types'
import { isDataWrapper } from './wrapperSupport'

type RequestOptions = IServiceParamRequest<any, any>
type ResponseFactory = { create(dto: any, wrapper?: any): any }

/** 原地替换请求参数；有意在 CoreService 的错误转换边界之外执行。 */
export function prepareRequest(request: RequestOptions): void {
  const wrapper = request.wrapper
  if (isDataWrapper(wrapper)) request.params = wrapper.processParams?.(request.params)
}

/** 普通参数原样传递；模型参数默认清理空值，allowEmptyData 为真时保留空集合等。 */
export function serializeRequestParams(params: any, options: any): any {
  if (params && params.getSerializableObject) {
    return options && options.allowEmptyData ? params.getSerializableObject() : params.getCleanSerializableObject()
  }
  return params
}

/** 包装前依次执行两个同步钩子；包括 undefined 在内的返回值都会替换 DTO。 */
export function transformPayload(dto: any, request: RequestOptions): any {
  // 属性调用保留 request 作为 this，不能与后置钩子的调用方式合并。
  if (request.beforeParse) dto = request.beforeParse(dto)
  if (request.beforeDeserialize) dto = request.beforeDeserialize(dto)
  return dto
}

/** 包装后按历史约定以 null 为 receiver 调用钩子，异常交给请求层转换。 */
export function transformResponse(response: any, request: RequestOptions): any {
  if (request.afterParse) response = request.afterParse.call(null, response)
  if (request.afterDeserialize) response = request.afterDeserialize.call(null, response)
  return response
}

/** 业务错误直接建模；其他错误保留原始对象并记录日志，不静默吞掉服务故障。 */
export function errorResponse(factory: ResponseFactory, error: any): any {
  // 保留 result_code 真值判定及直接属性访问语义；此处尚不归一化 null 等任意抛出值。
  if (error.result_code) return factory.create(error)
  const response = factory.create({ result_code: 'service_error' })
  response.serviceError = error
  console.error('service_error', error)
  return response
}
