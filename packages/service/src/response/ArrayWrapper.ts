import { type ServiceResponse } from './ServiceResponse'
import { Wrapper } from './Wrapper'

/** 将响应 data 数组逐项交给模型 create；非数组数据得到空数组。 */
export class ArrayWrapper<T> extends Wrapper {
  /** 元素模型工厂，兼容直接传入模型类或 { model }。 */
  protected model?: T

  /** 历史泛型声明保留；运行时保存转换后的数组。 */
  public data?: T

  /** 未提供模型时不主动验证；真正转换非空数组时才会使用 create。 */
  constructor(data?: { model: T } | any) {
    super()
    this.model = data?.model || data
  }

  /** 每次重建结果数组；response.data 与 wrapper.data 指向同一数组。 */
  public processData(response: ServiceResponse, res: any) {
    const dto = res.data
    const data_ = (this.data = [] as any)
    if (Array.isArray(dto)) {
      dto.forEach((data: any) => {
        data_.push((this.model as any).create(data) as T)
      })
    }
    response.data = this.data
  }
}
