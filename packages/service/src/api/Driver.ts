import type { IApi } from './IApi'
import type { IDriver } from './IDriver'

/** 保存客户端及基础地址；本类只提供访问，不自动将 url 拼到请求地址上。 */
export class Driver implements IDriver {
  /** api 按引用保存，外部对同一客户端的配置仍然有效。 */
  public adapter: {
    api: IApi
    url: string
  } = {
    api: {} as IApi,
    url: '',
  }

  /** 复制配置字段到驱动自身，保留客户端对象身份。 */
  constructor(adapter: { api: IApi; url: string }) {
    this.adapter.url = adapter.url
    this.adapter.api = adapter.api
  }

  /** 返回实际传输客户端，调用者应保留它作为请求方法的 this。 */
  public getApi() {
    return this.adapter.api
  }

  /** 返回基础地址，是否及如何拼接由业务层决定。 */
  public getUrl() {
    return this.adapter.url
  }
}
