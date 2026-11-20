import { type IModelOptions, Column, ModelBase } from '@model-base/core'
import { type Wrapper } from './Wrapper'
import { type WrapperType } from '../service.types'
import { isDataWrapper } from '../_internal/wrapperSupport'

/** 标准响应容器：公共字段由 ModelBase 映射，业务 data 再交由可选 wrapper 处理。 */
export class ServiceResponse<T = unknown> extends ModelBase {
  /** 服务端时间，单位由接口协议定义。 */
  @Column()
  public serverTime!: number

  /** 请求追踪标识。 */
  @Column()
  public requestId!: string

  /** 驱动附带的请求配置。 */
  @Column()
  public config!: any

  /** 响应头，流转换按现有小写 content-type 键读取。 */
  @Column()
  public headers!: any

  /** 驱动附带的原请求信息，不保证适合 JSON.stringify。 */
  @Column()
  public request!: any

  /** 驱动类型描述，由接口或适配器提供。 */
  @Column()
  public driverType!: string

  /** 传输层状态码，与业务 resultCode 分开处理。 */
  @Column()
  public status!: number

  /** 传输层状态说明。 */
  @Column()
  public statusText!: string

  /** 业务结果码，success 被 isValid 视为成功。 */
  @Column()
  public resultCode!: string

  /** 业务结果说明。 */
  @Column()
  public message!: string

  /** 加密类型元数据；本类不根据它自动解密。 */
  @Column()
  public encryptType!: number

  /** 业务载荷，兼容 resultData 别名；后续 wrapper 可以原地替换该字段。 */
  @Column({ name: 'data', aliasName: 'resultData' })
  public data!: WrapperType<T>

  /** 传输/转换异常；未声明 Column，因此不参与常规 DTO 序列化。 */
  public serviceError!: Error

  /** 直接 new 时立即包装 data；静态 create 的内部构造阶段则跳过，避免处理两次。 */
  constructor(dto?: any, options?: IModelOptions, wrapper?: Wrapper | (new (dto: any) => T) | T[]) {
    super(dto, options)
    if (!options?.__isInit) {
      this.parseData(dto, wrapper)
    }
  }

  /** 保留的扩展入口，默认原样返回；CoreService 的预处理调用的是 wrapper 的同名方法。 */
  public processParams(params?: any) {
    return params
  }

  /** 支持 Wrapper 实例或带 isModelBase 标记的模型类；其他值不进行额外转换。 */
  public parseData(dto?: any, wrapper?: Wrapper | (new (dto: any) => T) | T[]) {
    if (wrapper) {
      if (isDataWrapper(wrapper)) {
        wrapper.processData(this, dto)
      } else {
        const classType = wrapper as any
        if (classType && classType.isModelBase) {
          this.data = classType.create(dto && dto.data)
        }
      }
    }
  }

  /** 第二个参数是 wrapper，不是 ModelBase.create 的 options，不能与构造器参数位置混用。 */
  public static create(dto?: any, wrapper?: any, ...rest: any) {
    const t_ = super.create<any>(dto, {}, wrapper)
    t_.parseData(dto, wrapper)
    return t_
  }

  /** 仅按业务码 success 判断，不将 HTTP status 自动等同于业务成功。 */
  public isValid() {
    return this.resultCode === 'success'
  }
}
