import * as service from '@model-base/service'
import type { IServiceParam, IServiceParamRequest, ServiceResponseType, WrapperType } from '../../src/CoreService'
import { CoreService } from '../../src/CoreService'
import { Driver } from '../../src/api/Driver'
import { ServiceResponse } from '../../src/response/ServiceResponse'

describe('service public surface', () => {
  it('keeps existing runtime exports without exposing implementation helpers', () => {
    expect(Object.keys(service).sort()).toEqual(
      [
        'ArrayWrapper',
        'BaseApi',
        'CoreService',
        'DataStreamWrapper',
        'Driver',
        'IOC_TYPES',
        'RecordArrayWrapper',
        'RecordWrapper',
        'ServiceResponse',
        'Wrapper',
      ].sort(),
    )
    expect(service.CoreService).toBe(CoreService)
    expect(service.Driver).toBe(Driver)
    expect(service.ServiceResponse).toBe(ServiceResponse)
  })

  it('keeps the original direct type import path and overridable request dispatch', async () => {
    const api = { get: jest.fn(), post: jest.fn(), del: jest.fn(), put: jest.fn(), patch: jest.fn(), jsonp: jest.fn() }
    const expected = ServiceResponse.create({ result_code: 'success' })
    const calls: unknown[] = []
    class CustomService extends CoreService<ServiceResponse, ServiceResponse> {
      async request<T, U>(url: string, param?: IServiceParamRequest<T, U>) {
        calls.push([url, param])
        return expected
      }
    }
    const instance = new CustomService(new Driver({ api, url: '' }), ServiceResponse)
    const options: IServiceParam<ServiceResponse, undefined> = { params: { id: 1 } }
    const result: ServiceResponseType<ServiceResponse, undefined> = await instance.get('/items', options)
    const data: WrapperType<undefined> = result.data
    expect(data).toBeUndefined()
    expect(result).toBe(expected)
    expect(calls).toEqual([['/items', { params: { id: 1 }, type: 'get' }]])
    expect(options).toEqual({ params: { id: 1 } })
    expect(api.get).not.toHaveBeenCalled()
  })
})
