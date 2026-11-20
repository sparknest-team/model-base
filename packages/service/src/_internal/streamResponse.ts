/** 流响应的二进制转换和同步 JSON 兼容路径，不负责网络读取。 */
import type { DataStreamWrapper } from '../response/DataStreamWrapper'
import type { ServiceResponse } from '../response/ServiceResponse'

/** objectURL 依赖 window.URL；调用方负责适时 revokeObjectURL，此函数不管理其生命周期。 */
export function convertStream(wrapper: DataStreamWrapper, dto: any): any {
  let result = dto
  if (wrapper.responseType) {
    if (wrapper.responseType === 'blob' && wrapper.responseObj === 'objectURL') {
      result = window.URL.createObjectURL(dto)
    } else if (wrapper.responseType === 'arraybuffer' && wrapper.responseObj === 'blob') {
      result = new Blob([dto], { type: wrapper.responseObjOptions.type || '' })
    } else if (wrapper.responseType === 'arraybuffer' && wrapper.responseObj === 'objectURL') {
      result = window.URL.createObjectURL(new Blob([dto], { type: wrapper.responseObjOptions.type || '' }))
    }
  } else {
    // 旧 dataType 仅在未配置 responseType 时生效，保留旧分支的默认行为。
    if (wrapper.dataType === 'blob') result = new Blob([dto])
    if (wrapper.dataType === 'objectURL') result = window.URL.createObjectURL(new Blob([dto]))
  }
  return result
}

/**
 * 保留同步解析及现有 content-type 条件：不在此增加 Blob.text() 异步读取。
 * 真正的 Blob 不保证能被 JSON.parse 直接解析，解析异常由外层请求流程处理。
 * arraybuffer 分支使用 Buffer + TextDecoder，运行环境需提供这些能力。
 */
export function parseStreamJson(wrapper: DataStreamWrapper, response: ServiceResponse): void {
  if (
    wrapper.autoParseJson &&
    response.headers &&
    response.headers['content-type']?.indexOf('application/json') !== -1
  ) {
    if (wrapper.responseType === 'blob') response.data = JSON.parse(response.data as any)
    if (wrapper.responseType === 'arraybuffer') {
      const array = Buffer.from(response.data as any)
      const decoder = new TextDecoder('utf-8')
      response.data = JSON.parse(decoder.decode(array))
    }
  }
}
