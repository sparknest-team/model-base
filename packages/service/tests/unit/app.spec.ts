import { Column, createModel, ModelBase, serialize } from '@model-base/core'
import { ArrayWrapper, CoreService, Driver, RecordArrayWrapper, RecordWrapper, ServiceResponse } from '@model-base/service'
import { AppServiceResponse } from './AppServiceResponse'

class TestChildModel extends ModelBase {
  @Column()
  id!: number
  @Column()
  name!: string
}

class TestModel extends ModelBase {
  @Column()
  id!: number
  @Column()
  name!: string
  @Column({
    model: () => TestModel,
  })
  listModel!: TestModel[]
  @Column({
    model: () => TestChildModel,
  })
  listModelChild!: TestChildModel
}
class Item extends ModelBase {
  @Column()
  id!: number
  @Column()
  name!: string
}
describe('extendModel', () => {
  it('extendModel', () => {
    const model = new TestModel({
      listModelChild: {
        id: 111,
        name: 'test11',
      },
    })
    model.id = 1
    model.name = 'test'
    model.listModel = []
    const model2 = new TestModel()
    const model3 = new TestModel()
    const model4 = new TestModel()
    model3.id = 3
    model3.name = 'test3'
    model2.id = 2
    model2.listModel = []
    model2.listModel.push(model3)
    model4.id = 4
    model4.name = 'test4'
    model2.listModelChild = model4
    model.mergeModel(model2)
    model.listModel[0].name = 'test511'
    const item = createModel(Item, {
      id: 1,
      name: 'test',
    })
    expect(model.listModelChild.getOriginalData()).toEqual({ id: 111, name: 'test11' })
    expect(item.id).toBe(1)
    expect(model.listModel.length).toBe(1)
    expect(model.id).toBe(2)
    expect(model.name).toBe('test')
    expect(model3.name).toBe('test3')
    expect(model.listModel[0].name).toBe('test511')
    expect(model.listModelChild.id).toBe(4)
    expect(model.listModelChild.name).toBe('test4')
  })
  it('response wrapper', async () => {
    const dto = {
      data: [
        {
          id: 1,
          name: 'test',
          list_model: [
            {
              id: 22,
              name: 'test22',
            },
          ],
          list_model_child: {
            id: 111,
            name: 'test11',
          },
        },
      ],
    }
    const model = new AppServiceResponse(
      dto,
      {},
      new ArrayWrapper<TestModel>({
        model: TestModel,
      }),
    )
    expect(serialize(model.data)).toEqual(dto.data)
  })
})

describe.each([ServiceResponse, AppServiceResponse])('%s request wrappers', Response => {
  it.each(['model', 'array', 'record', 'recordArray'] as const)('converts a successful %s response', async kind => {
    const item = { id: 1, name: 'test', list_model: [{ id: 22, name: 'child' }], list_model_child: { id: 111, name: 'nested' } }
    const data = kind === 'model' ? item : kind === 'array' ? [item] : kind === 'record' ? { entries: item } : { entries: [item] }
    const wrapper = kind === 'model' ? TestModel : kind === 'array' ? new ArrayWrapper({ model: TestModel }) :
      kind === 'record' ? new RecordWrapper({ model: TestModel }) : new RecordArrayWrapper({ model: TestModel })
    const api = {
      get: jest.fn().mockResolvedValue({ result_code: Response === ServiceResponse ? 'success' : '0', data }),
      post: jest.fn(), del: jest.fn(), put: jest.fn(), patch: jest.fn(), jsonp: jest.fn(),
    }
    const service = new CoreService(new Driver({ api, url: '/api' }), Response)
    // Observe unexpected errors without suppressing their output.
    const errorSpy = jest.spyOn(console, 'error')
    try {
      const response = await service.get('/items', { wrapper })
      expect(api.get).toHaveBeenCalledTimes(1)
      expect(api.get).toHaveBeenCalledWith('/items', undefined, undefined)
      expect(response).toBeInstanceOf(Response)
      expect(response.isValid()).toBe(true)
      expect(response.serviceError).toBeUndefined()
      expect(errorSpy).not.toHaveBeenCalled()
      const result = response.data as any
      const model = kind === 'model' ? result : kind === 'array' ? result[0] : kind === 'record' ? result.entries : result.entries[0]
      expect(model).toBeInstanceOf(TestModel)
      expect(model.listModel[0]).toBeInstanceOf(TestModel)
      expect(model.listModelChild).toBeInstanceOf(TestChildModel)
      expect(serialize(result)).toEqual(data)
    } finally { errorSpy.mockRestore() }
  })
})
