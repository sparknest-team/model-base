import { type ServiceResponse } from './ServiceResponse'
import { Wrapper } from './Wrapper'
import { recordKey } from '../_internal/wrapperSupport'

/** 将响应 data 字典的各个值转换为模型；字典本身不转换成 ModelBase。 */
export class RecordWrapper<T> extends Wrapper {
  /** 转换每个字典值的模型工厂。 */
  protected model!: any
  /** 历史命名与语义相反：true 保留原键，false/未传转驼峰。 */
  protected camelCaseKey?: boolean
  /** 最近一次请求的结果字典，与 response.data 共享引用。 */
  public data?: { [key: string]: T }

  /** 兼容配置对象及运行时直接传入模型工厂的旧用法。 */
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

  /** 只遍历自有可枚举键；未提供有效模型工厂时按现有分支保留 DTO 值。 */
  public processData(response: ServiceResponse, res: any) {
    const dto = res.data
    this.data = {}
    if (dto) {
      Object.keys(dto).forEach((property) => {
        const key = recordKey(property, this.camelCaseKey)

        const data_ = this.data as { [key: string]: T }
        data_[key] = this.model ? this.model.create(dto[property]) : dto[property]
      })
    }
    response.data = this.data
  }
}
