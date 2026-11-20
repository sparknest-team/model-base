import type { Driver } from './Driver'

/**
 * 业务 API 类的最小基类，只保存驱动引用；请求路由和具体方法由子类实现。
 */
export class BaseApi {
  public driver: Driver
  /** 接收已有驱动，不创建客户端、不读取或修改全局配置。 */
  constructor(adapter: Driver) {
    this.driver = adapter
  }
}
