import { debounce, throttle, isObject, isObjectLike, isPlainObject } from '../../src'

describe('documented common utility contracts', () => {
  beforeEach(() => {
    // Node 的 performance 可能是只读全局属性；本测试只需模拟 Date 和 timeout。
    jest.useFakeTimers({ doNotFake: ['performance'] })
  })
  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('distinguishes functions, object-like values and plain objects', () => {
    expect(isObject(() => 1)).toBe(true)
    expect(isObjectLike(() => 1)).toBe(false)
    expect(isObjectLike([])).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(Object.create(null))).toBe(true)
    expect(isObject(null)).toBe(false)
  })

  it('debounce keeps the latest arguments and receiver until the trailing edge', () => {
    const calls: unknown[] = []
    const task = debounce(function (this: { id: number }, value: number) {
      calls.push([this.id, value])
      return value
    }, 20)
    task.call({ id: 1 }, 1)
    task.call({ id: 2 }, 2)
    expect(task.pending()).toBe(true)
    expect(calls).toEqual([])
    jest.advanceTimersByTime(20)
    expect(calls).toEqual([[2, 2]])
    expect(task.pending()).toBe(false)
    expect(task.flush()).toBe(2)
  })

  it('cancel drops pending work and flush consumes the latest pending arguments', () => {
    const callback = jest.fn(value => value)
    const task = debounce(callback, 20)
    task('cancelled')
    task.cancel()
    jest.advanceTimersByTime(20)
    expect(callback).not.toHaveBeenCalled()
    task('latest')
    expect(task.flush()).toBe('latest')
    expect(task.pending()).toBe(false)
    jest.advanceTimersByTime(20)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('throttle defaults to a leading call and a trailing call for subsequent activity', () => {
    const callback = jest.fn()
    const task = throttle(callback, 20, {})
    task(1)
    task(2)
    expect(callback.mock.calls).toEqual([[1]])
    jest.advanceTimersByTime(20)
    expect(callback.mock.calls).toEqual([[1], [2]])
  })
})
