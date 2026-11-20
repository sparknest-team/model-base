// region setup
import { Column, ModelBase } from '@model-base/core'
import { CoreService, Driver, ServiceResponse } from '@model-base/service'

class User extends ModelBase {
  @Column() displayName!: string
}

// 教学用传输适配器：不发送网络请求。实际项目在此适配 fetch/axios 等客户端。
const request = async (_url: string, _params?: unknown, _options?: unknown) => ({
  result_code: 'success',
  data: { display_name: 'Ada' },
})
const api = { get: request, post: request, put: request, patch: request, del: request, jsonp: request }
const service = new CoreService<ServiceResponse, ServiceResponse>(
  new Driver({ api, url: '/api' }), ServiceResponse,
)
// endregion setup

describe('service documentation example', () => {
  it('wraps a successful payload in a model', async () => {
    // region request
    // Driver.url 不会自动拼接；这里明确传入完整业务路径。
    const response = await service.get('/api/users/1', { wrapper: User })
    const valid = response.isValid() // true：result_code === 'success'。
    const name = response.data.displayName // Ada
    // endregion request
    expect(valid).toBe(true)
    expect(name).toBe('Ada')
    expect(response.data).toBeInstanceOf(User)
  })
})
