import {
  ArrayWrapper,
  BaseApi,
  CoreService,
  DataStreamWrapper,
  Driver,
  IOC_TYPES,
  RecordArrayWrapper,
  RecordWrapper,
  ServiceResponse,
  Wrapper,
} from '@model-base/service'

function setup(get = jest.fn().mockResolvedValue({ result_code: 'success', data: { id: 1 } })) {
  const api = { get, post: jest.fn(), del: jest.fn(), put: jest.fn(), patch: jest.fn(), jsonp: jest.fn() }
  const driver = new Driver({ api, url: '/api' })
  return { api, driver, service: new CoreService<ServiceResponse, ServiceResponse>(driver, ServiceResponse) }
}

describe('service compatibility contracts', () => {
  it('preserves API identity, method receiver, mutable adapter and IOC symbols', async () => {
    const { api, driver, service } = setup()
    api.get.mockImplementation(function (this: unknown) {
      expect(this).toBe(api)
      return { result_code: 'success' }
    })
    expect(driver.getApi()).toBe(api)
    expect(new BaseApi(driver).driver).toBe(driver)
    driver.adapter.url = '/other'
    expect(driver.getUrl()).toBe('/other')
    expect(IOC_TYPES.CoreApi).toBe(Symbol.for('CoreApi'))
    expect(IOC_TYPES.CoreService).toBe(Symbol.for('CoreService'))
    await service.get('/items')
  })

  it('keeps wrapper receiver and direct-request parameter mutation', async () => {
    class Custom extends Wrapper {
      processParams(params: any) {
        expect(this).toBe(wrapper)
        return { ...params, added: true }
      }
      processData(response: ServiceResponse, dto: any) {
        expect(this).toBe(wrapper)
        response.data = dto.data
      }
    }
    const wrapper = new Custom()
    const { service, api } = setup()
    const params = { params: { id: 1 }, wrapper }
    await service.request('/items', params)
    expect(params.params).toEqual({ id: 1, added: true })
    const convenience = { params: { id: 2 }, wrapper }
    await service.get('/items', convenience)
    expect(convenience.params).toEqual({ id: 2 })
    expect(api.get).toHaveBeenLastCalledWith('/items', { id: 2, added: true }, undefined)
  })

  it('does not convert errors from wrapper parameter preparation into responses', async () => {
    const error = new Error('prepare failed')
    class Broken extends Wrapper {
      processParams() {
        throw error
      }
      processData() {}
    }
    const { service, api } = setup()
    await expect(service.get('/items', { wrapper: new Broken() })).rejects.toBe(error)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('keeps before-hook receiver and permits after-hook response replacement', async () => {
    const { service } = setup()
    const replacement = ServiceResponse.create({ result_code: 'replaced' })
    const params = {
      beforeParse(this: unknown, dto: any) {
        expect(this).toBe(params)
        return dto
      },
      beforeDeserialize(this: unknown, dto: any) {
        expect(this).toBe(params)
        return dto
      },
      afterParse(this: unknown) {
        expect(this).toBeNull()
        return replacement
      },
      afterDeserialize(this: unknown, response: any) {
        expect(this).toBeNull()
        expect(response).toBe(replacement)
        return response
      },
    }
    expect(await service.request('/items', params)).toBe(replacement)
  })

  it.each(['beforeParse', 'beforeDeserialize', 'afterParse', 'afterDeserialize'])(
    'normalizes %s failures',
    async (hook) => {
      const { service } = setup()
      const error = new Error(hook)
      const log = jest.spyOn(console, 'error').mockImplementation(() => {})
      try {
        const response = await service.get('/items', {
          [hook]: () => {
            throw error
          },
        })
        expect(response.resultCode).toBe('service_error')
        expect(response.serviceError).toBe(error)
        expect(log).toHaveBeenCalledWith('service_error', error)
      } finally {
        log.mockRestore()
      }
    },
  )

  it.each([undefined, false, true])(
    'preserves historical record key conversion for camelCaseKey=%s',
    (camelCaseKey) => {
      // No constructor argument is the supported pass-through mode.
      const rawWrapper = new RecordWrapper()
      const dto = { data: { some_key: { id: 1 } } }
      const response = ServiceResponse.create(dto, rawWrapper)
      expect(response.data).toEqual({ someKey: { id: 1 } })
      const factory = { create: jest.fn((value: any) => value) }
      const converted = ServiceResponse.create(dto, new RecordWrapper({ model: factory, camelCaseKey }))
      expect(converted.data).toEqual({ [camelCaseKey ? 'some_key' : 'someKey']: { id: 1 } })
    },
  )

  it('preserves record-array empty entries, omitted nulls and pass-through references', () => {
    const item = { id: 1 }
    const wrapper = new RecordArrayWrapper()
    const response = ServiceResponse.create({ data: { empty: [], missing: null, some_items: [item] } }, wrapper)
    expect(response.data).toEqual({ empty: [], someItems: [item] })
    expect((response.data as any).someItems[0]).toBe(item)
    expect(response.data).toBe(wrapper.data)
  })

  it('preserves array wrapper reuse and sparse-array iteration', () => {
    const factory = { create: jest.fn((value: any) => value) }
    const wrapper = new ArrayWrapper(factory)
    const items = new Array(3)
    items[2] = { id: 1 }
    const first = ServiceResponse.create({ data: items }, wrapper)
    expect(first.data).toEqual([{ id: 1 }])
    const second = ServiceResponse.create({ data: null }, wrapper)
    expect(second.data).toEqual([])
    expect(first.data).toEqual([{ id: 1 }])
    expect(second.data).toBe(wrapper.data)
  })

  it('keeps subclass factories and parseData overrides on new/create', () => {
    const parse = jest.fn()
    class Response extends ServiceResponse {
      parseData(dto: any, wrapper: any) {
        parse(dto, wrapper)
        super.parseData(dto, wrapper)
      }
    }
    const dto = { data: [] }
    const wrapper = new ArrayWrapper()
    expect(new Response(dto, {}, wrapper)).toBeInstanceOf(Response)
    expect(Response.create(dto, wrapper)).toBeInstanceOf(Response)
    expect(parse).toHaveBeenCalledTimes(2)
    expect(parse).toHaveBeenLastCalledWith(dto, wrapper)
  })
})

describe('stream response compatibility', () => {
  it.each(['blob', 'arraybuffer', 'legacy'] as const)('preserves %s object-URL conversion', (mode) => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const createObjectURL = jest.fn((_blob: Blob) => 'blob:test')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { URL: { createObjectURL } } })
    try {
      const wrapper = new DataStreamWrapper(
        mode === 'legacy' ? { dataType: 'objectURL' } : { responseType: mode, responseObj: 'objectURL' },
      )
      const response = ServiceResponse.create({})
      const input = mode === 'blob' ? new Blob(['value']) : new Uint8Array([1, 2]).buffer
      wrapper.processData(response, input)
      expect(response.data).toBe('blob:test')
      expect(response.resultCode).toBe('success')
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
      if (mode === 'blob') expect(createObjectURL.mock.calls[0][0]).toBe(input)
    } finally {
      if (previous) Object.defineProperty(globalThis, 'window', previous)
      else Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('does not parse JSON when explicitly disabled', () => {
    const wrapper = new DataStreamWrapper({ autoParseJson: false })
    const dto = { headers: { 'content-type': 'application/json' }, data: 'invalid json' }
    const response = ServiceResponse.create(dto)
    wrapper.processData(response, dto)
    expect(response.data).toBe('invalid json')
  })
  it('preserves the difference between no options and empty options', () => {
    expect(new DataStreamWrapper().responseType).toBeUndefined()
    expect(new DataStreamWrapper({}).responseType).toBe('blob')
    expect(new DataStreamWrapper({ dataType: 'blob', responseType: 'arraybuffer' }).responseType).toBeUndefined()
  })

  it('mutates request options without replacing explicit responseType', () => {
    const wrapper = new DataStreamWrapper({ responseType: 'arraybuffer' })
    const params = { options: { responseType: 'text' } }
    expect(wrapper.processParams(params)).toBe(params)
    expect(params.options.responseType).toBe('text')
    expect(wrapper.processParams()).toEqual({ options: { responseType: 'arraybuffer' } })
  })

  it('passes streams through and marks empty responses', () => {
    const wrapper = new DataStreamWrapper()
    const response = ServiceResponse.create({ result_code: 'custom' })
    const stream = { bytes: [1, 2] }
    wrapper.processData(response, stream)
    expect(response.data).toBe(stream)
    expect(response.resultCode).toBe('custom')
    wrapper.processData(response, null)
    expect(response.data).toBeNull()
    expect(response.resultCode).toBe('stream_is_empty')
  })

  it('converts arraybuffers to blobs with the supplied MIME type', async () => {
    const wrapper = new DataStreamWrapper({
      responseType: 'arraybuffer',
      responseObj: 'blob',
      responseObjOptions: { type: 'application/octet-stream' },
    })
    const response = ServiceResponse.create({})
    wrapper.processData(response, new Uint8Array([1, 2]).buffer)
    const blob = response.data as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/octet-stream')
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2])
  })

  it.each(['blob', 'arraybuffer'] as const)(
    'decodes JSON for %s and preserves malformed JSON errors',
    (responseType) => {
      const wrapper = new DataStreamWrapper({ responseType })
      const response = ServiceResponse.create({ headers: { 'content-type': 'application/json' } })
      response.data = responseType === 'blob' ? '{"id":1}' : Buffer.from('{"id":1}')
      wrapper.processData(response, { headers: response.headers })
      expect(response.data).toEqual({ id: 1 })
      response.data = responseType === 'blob' ? 'invalid' : Buffer.from('invalid')
      expect(() => wrapper.processData(response, { headers: response.headers })).toThrow(SyntaxError)
    },
  )
})
