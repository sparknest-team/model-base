import { CLEAN_ENUM, Column, ModelBase } from '@model-base/core'
import { ArrayWrapper, CoreService, Driver, ServiceResponse } from '@model-base/service'

class User extends ModelBase {
  @Column()
  public id!: number

  @Column()
  public displayName!: string

  @Column()
  public optionalValue?: string
}

function createApi(overrides: Record<string, jest.Mock> = {}) {
  return {
    get: jest.fn(),
    post: jest.fn(),
    del: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    ...overrides,
  }
}

function createService(api: ReturnType<typeof createApi>) {
  return new CoreService(new Driver({ api: api as any, url: '/api' }), ServiceResponse)
}

describe('CoreService', () => {
  it.each(['get', 'post', 'del', 'put', 'patch'] as const)(
    'dispatches a %s request with the same URL and options',
    async (method) => {
      const options = { headers: { trace: 'test' } }
      const api = createApi({
        [method]: jest.fn().mockResolvedValue({ result_code: 'success', data: null }),
      })
      const service = createService(api)

      await service[method]('/users', { params: { page: 2 }, options })

      expect(api[method]).toHaveBeenCalledTimes(1)
      expect(api[method]).toHaveBeenCalledWith('/users', { page: 2 }, options)
    },
  )

  it('serializes ModelBase parameters and removes dirty empty values by default', async () => {
    const api = createApi({
      post: jest.fn().mockResolvedValue({ result_code: 'success', data: null }),
    })
    const service = createService(api)
    const params = User.create({ id: 1, display_name: ' Ada ', optional_value: null })

    await service.post('/users', { params })

    expect(api.post).toHaveBeenCalledWith(
      '/users',
      { id: 1, display_name: ' Ada ' },
      undefined,
    )
  })

  it('preserves empty model values when allowEmptyData is enabled', async () => {
    const api = createApi({
      post: jest.fn().mockResolvedValue({ result_code: 'success', data: null }),
    })
    const service = createService(api)
    const params = User.create({ id: 1, optional_value: null })

    await service.post('/users', {
      params,
      options: { allowEmptyData: true },
    })

    expect(api.post).toHaveBeenCalledWith(
      '/users',
      params.getSerializableObject({ clean: CLEAN_ENUM.CLEAN_UNDEFINED_AND_NULL }),
      { allowEmptyData: true },
    )
  })

  it('runs response hooks in order and returns their replacement response', async () => {
    const order: string[] = []
    const api = createApi({
      get: jest.fn().mockResolvedValue({ result_code: 'success', message: 'raw' }),
    })
    const service = createService(api)

    const response = await service.get('/users', {
      beforeParse(dto) {
        order.push('beforeParse')
        return { ...dto, message: 'parsed' }
      },
      beforeDeserialize(dto) {
        order.push('beforeDeserialize')
        return { ...dto, message: `${dto.message}-deserialized` }
      },
      afterParse(result) {
        order.push('afterParse')
        result.message += '-afterParse'
        return result
      },
      afterDeserialize(result) {
        order.push('afterDeserialize')
        result.message += '-afterDeserialize'
        return result
      },
    })

    expect(order).toEqual(['beforeParse', 'beforeDeserialize', 'afterParse', 'afterDeserialize'])
    expect(response.message).toBe('parsed-deserialized-afterParse-afterDeserialize')
  })

  it('turns a business rejection into a typed response', async () => {
    const api = createApi({
      get: jest.fn().mockRejectedValue({ result_code: 'forbidden', message: 'denied' }),
    })
    const service = createService(api)

    const response = await service.get('/private')

    expect(response).toBeInstanceOf(ServiceResponse)
    expect(response.resultCode).toBe('forbidden')
    expect(response.message).toBe('denied')
    expect(response.serviceError).toBeUndefined()
  })

  it('turns an unexpected driver error into a service_error response', async () => {
    const error = new Error('network down')
    const api = createApi({ get: jest.fn().mockRejectedValue(error) })
    const service = createService(api)
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const response = await service.get('/users')

      expect(response.resultCode).toBe('service_error')
      expect(response.serviceError).toBe(error)
      expect(errorSpy).toHaveBeenCalledWith('service_error', error)
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('converts response arrays when ServiceResponse is created with a wrapper', () => {
    const response = ServiceResponse.create(
      { data: [{ id: 1, display_name: 'Ada' }] },
      new ArrayWrapper<User>({ model: User }),
    )

    expect(response.data).toHaveLength(1)
    expect(response.data[0]).toBeInstanceOf(User)
    expect(response.data[0].displayName).toBe('Ada')
  })

  // CoreService currently inserts an empty object before p.wrapper when calling
  // ServiceResponse.create, so this regression test should be enabled with the fix.
  it.todo('forwards a response wrapper through the successful request path')
})
