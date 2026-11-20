import { type ServiceResponse } from './ServiceResponse'
import { Wrapper } from './Wrapper'
import { convertStream, parseStreamJson } from '../_internal/streamResponse'

/** 流响应转换器；保留同步处理契约，objectURL 路径仅适用于具备浏览器 API 的环境。 */
export class DataStreamWrapper extends Wrapper {
  /** 旧转换模式；配置它时不应用新版 responseType 默认值。 */
  public dataType?: 'blob' | 'stream' | 'objectURL'
  /** 期望客户端返回的传输格式。 */
  public responseType?: 'blob' | 'arraybuffer' | 'json' | 'document' | 'text'
  /** 包装后期望的数据表示。 */
  public responseObj?: 'blob' | 'objectURL' | 'arraybuffer'
  /** 按历史 content-type 条件尝试同步解析 JSON。 */
  public autoParseJson?: boolean
  /** 创建 Blob 时使用的选项，当前读取 type。 */
  public responseObjOptions?: any

  /** 无参数与传入 {} 的默认行为不同，保留此区别供旧调用方兼容。 */
  constructor(data?: {
    /**
     * @deprecated 已经舍弃，建议用 responseType 和 responseObj 进行组合。
     */
    dataType?: 'blob' | 'stream' | 'objectURL'
    /**
     * 不能和 dataType 同时使用。
     * 默认值是 blob。
     * 搭配方式：
     * responseType: 'blob', responseObj: 'blob'， responseObj不用传。
     * responseType: 'blob', responseObj: 'objectURL'
     * responseType: 'arraybuffer', blob: ''
     * responseType: 'arraybuffer', objectURL: ''
     */
    responseType?: 'blob' | 'arraybuffer'
    /**
     * 不能和 dataType 同时使用。
     * 默认值是 blob。
     * responseType: 'blob', responseObj: 'blob'， responseObj不用传。
     * responseType: 'blob', responseObj: 'objectURL'
     * responseType: 'arraybuffer', blob: ''
     * responseType: 'arraybuffer', objectURL: ''
     */
    responseObj?: 'blob' | 'arraybuffer' | 'objectURL'
    /**
     * 待拓展项目，目前设置参数包括 type。
     * 比如 responseObj 为 blob 的时候，可以设置，如：
     * {
     *  responseObjOptions: {
     *    type: 'application/octet-stream',
     *  }
     * }
     * 最终结果：
     * new Blob([dto], {
     *  type: this.responseObjOptions.type || '',
     *  })
     *
     */
    responseObjOptions?: { type: string }
    /**
     * 不能和 dataType 同时使用。
     * 默认值是 true。后端的 content-type 里面包含 'application/json' 的时候生效。
     */
    autoParseJson?: boolean
  }) {
    super()
    // 只有提供配置对象且未选择旧 dataType 模式时，才应用新版默认值。
    if (data && !data.dataType) {
      this.responseType = data.responseType ?? 'blob'
      this.responseObj = data.responseObj ?? 'blob'
      this.responseObjOptions = data?.responseObjOptions ?? {}
      this.autoParseJson = data?.autoParseJson ?? true
    }
    if (data) {
      this.dataType = data.dataType || 'stream'
    }
    this.dataType = this.dataType || 'stream'
  }

  /** 原地补充 params.options.responseType，已有真值配置优先。 */
  public processParams(params?: any) {
    params = params || {}
    params.options = params.options || {}
    params.options.responseType = params.options.responseType || this.responseType
    return params
  }

  /** 区分流载荷和 JSON 响应；本方法修改 response，不返回新的响应容器。 */
  public processData(response: ServiceResponse, res: any) {
    // 非 JSON 类型时整个传输返回值都是载荷，不仅读取 res.data。
    if (!res?.headers?.['content-type'] || res?.headers?.['content-type']?.indexOf('application/json') === -1) {
      let data = res
      if (res) {
        data = convertStream(this, res)
        response.resultCode = response.resultCode || 'success'
      } else {
        response.resultCode = 'stream_is_empty'
      }
      response.data = data
    }
    parseStreamJson(this, response)
  }
}
