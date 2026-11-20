/** 传输客户端契约；允许同步返回或 Promise，CoreService 会 await 请求结果。 */
export interface IApi {
  /** 读取资源；查询参数的编码由客户端决定。 */
  get(url: string, body?: any, options?: any): any

  /** 提交数据；不在接口层规定 JSON、表单或其他编码。 */
  post(url: string, body?: any, options?: any): any

  /** 旧两参数声明保留；CoreService 实际以 url、params、options 三参数分发，适配器需兼容。 */
  del(url: string, options?: any): any

  /** 更新资源。 */
  put(url: string, body?: any, options?: any): any

  /** 部分更新资源。 */
  patch(url: string, body?: any, options?: any): any

  /** 保留驱动层 JSONP 能力；CoreService 未提供对应的便捷方法。 */
  jsonp(url: string, body?: any, options?: any): any
}
