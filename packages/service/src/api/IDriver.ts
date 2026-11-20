import type { IApi } from './IApi'

/** 服务与具体 HTTP 客户端之间的访问接口，不负责执行网络请求。 */
export interface IDriver {
  /** 获取实际请求客户端。 */
  getApi(): IApi

  /** 获取配置的基础地址。 */
  getUrl(): string
}
