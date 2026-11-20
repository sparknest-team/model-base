/** 服务入口：按顺序协调参数处理、传输、DTO 转换和响应包装，不绑定具体 HTTP 客户端。 */
import {
  errorResponse,
  prepareRequest,
  serializeRequestParams,
  transformPayload,
  transformResponse,
} from './_internal/requestPipeline'
import type { Driver } from './api/Driver'
import type { IServiceParam, IServiceParamRequest, ServiceResponseType } from './service.types'

// 保留从包入口或 CoreService 文件直接导入类型的两种历史用法。
export type {
  IServiceParam,
  IServiceParamRequest,
  ServiceResponseType,
  WrapperConstructor,
  WrapperType,
} from './service.types'

/** T 表示响应钩子的类型，R 表示响应容器类型；data 的具体类型由每次请求的 wrapper 推断。 */
export class CoreService<T, R> {
  /** 传输适配器；必须提供 getApi()，不是直接传入 HTTP 客户端本身。 */
  public driver: Driver
  /** 响应类在运行时还需提供静态 create(dto, wrapper) 工厂。 */
  public serviceResponseType: new (...args: any[]) => R

  /** 注入传输驱动和响应类；不在服务内创建全局共享的客户端。 */
  constructor(adapter: Driver, serviceResponseType: new (...args: any[]) => R) {
    this.driver = adapter
    this.serviceResponseType = serviceResponseType
  }

  /** GET 入口；通过 this.request 分发，保留子类覆盖请求流程的能力。 */
  public get<U>(url: string, data?: IServiceParam<T, U>) {
    return this.request(url, { ...(data || {}), type: 'get' }) as Promise<ServiceResponseType<R, U>>
  }

  /** POST 入口；浅复制请求描述，不覆盖调用方的 type 配置。 */
  public post<U>(url: string, data?: IServiceParam<T, U>) {
    return this.request(url, { ...(data || {}), type: 'post' }) as Promise<ServiceResponseType<R, U>>
  }

  /** DELETE 的历史方法名为 del，必须与适配器的方法名一致。 */
  public del<U>(url: string, data?: IServiceParam<T, U>) {
    return this.request(url, { ...(data || {}), type: 'del' }) as Promise<ServiceResponseType<R, U>>
  }

  /** PUT 入口；转换规则与其他请求方法共享。 */
  public put<U>(url: string, data?: IServiceParam<T, U>) {
    return this.request(url, { ...(data || {}), type: 'put' }) as Promise<ServiceResponseType<R, U>>
  }

  /** PATCH 入口；部分更新的服务端语义由适配器和接口决定。 */
  public patch<U>(url: string, data?: IServiceParam<T, U>) {
    return this.request(url, { ...(data || {}), type: 'patch' }) as Promise<ServiceResponseType<R, U>>
  }

  /**
   * 请求生命周期。直接调用时 prepareRequest 可能替换 param_.params。
   * 参数预处理位于 try 之外：它的异常继续使请求 Promise 拒绝；传输及后续转换错误转为响应。
   * 钩子是同步转换函数，返回值替换下一阶段的输入，不自动等待异步钩子。
   */
  public async request<T, U>(url: string, param_?: IServiceParamRequest<T, U>) {
    const request = param_ || {}
    prepareRequest(request)
    try {
      const dto = await this.req(url, {
        type: request.type || 'get',
        params: request.params,
        options: request.options,
      })
      const payload = transformPayload(dto, request)
      const response = (this.serviceResponseType as any).create(payload, request.wrapper)
      return transformResponse(response, request)
    } catch (error) {
      return errorResponse(this.serviceResponseType as any, error)
    }
  }

  /** 只负责模型参数序列化与适配器调用，不拼接 URL、不增加重试或异常吞噬。 */
  private req(url: string, data: { type: 'get' | 'post' | 'del' | 'put' | 'patch'; params?: any; options?: any }) {
    const params = serializeRequestParams(data.params, data.options)
    // 保留 api 作为方法的 this；提取函数再调用可能破坏适配器内部状态访问。
    return this.driver.getApi()[data.type](url, params, data.options)
  }
}
