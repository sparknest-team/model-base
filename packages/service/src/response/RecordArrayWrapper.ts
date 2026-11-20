import { type ServiceResponse } from './ServiceResponse'
import { Wrapper } from './Wrapper'
import { recordKey } from '../_internal/wrapperSupport'

/** 将响应 data 中的各个数组逐项建模，保持字典分组结构。 */
export class RecordArrayWrapper<T> extends Wrapper {
  /** 数组元素的模型工厂。 */
  protected model!: any
  /** true 保留原键，false/未传转驼峰，沿用 RecordWrapper 的历史规则。 */
  protected camelCaseKey?: boolean
  /** 运行时是数组字典；保留现有泛型声明以兼容调用方。 */
  public data?: { [key: string]: T }

  /** 接收元素模型及键命名选项，不在构造阶段执行数据转换。 */
  constructor(data?: { model: any; camelCaseKey?: boolean }) {
    super()
    if (data) {
      this.camelCaseKey = data.camelCaseKey
      if (data.model) {
        this.model = data.model
      } else {
        this.model = data
      }
    }
  }

  /** 每次创建新字典；假值分组被跳过，空数组分组保留为空数组。 */
  public processData(response: ServiceResponse, res: any) {
    const dto = res.data
    this.data = {}
    if (dto) {
      Object.keys(dto).forEach((property) => {
        const key = recordKey(property, this.camelCaseKey)
        const data_ = this.data as { [key: string]: any[] }
        if (dto[property]) {
          data_[key] = []
          dto[property].forEach((itemDto: any) => {
            data_[key].push(this.model ? this.model.create(itemDto) : itemDto)
          })
        }
      })
    }
    response.data = this.data
  }
}
