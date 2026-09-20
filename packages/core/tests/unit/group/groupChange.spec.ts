import { GroupData } from '../model/group/GroupData'

describe('Group getChangedData', () => {
  describe('Group getChangedData', () => {
    it('group1 getChangedData', () => {
      const c = new GroupData({
        data1: 'data1',
        data2: 'data2',
        data3: 'data3',
      })
      c.data1 = '1'
      c.data2 = '1'
      c.data3 = '1'
      c.data4 = '1'
      c.emptyGroup = '1'
      expect(c.getChangedData({ group: 'group1' })).toEqual({
        data1: '1',
        data2: '1',
        data3: '1',
        empty_group: '1',
      })
    })
    it('group2 getChangedData', () => {
      const c = new GroupData({
        data1: 'data1',
        data2: 'data2',
        data3: 'data3',
      })
      c.data1 = '1'
      c.data2 = '1'
      c.data3 = '1'
      c.data4 = '1'
      c.emptyGroup = '1'
      expect(c.getChangedData({ group: 'group2' })).toEqual({
        data3: '1',
        data4: '1',
        empty_group: '1',
      })
    })
    it('no group getChangedData', () => {
      const c = new GroupData({
        data1: 'data1',
        data2: 'data2',
        data3: 'data3',
      })
      c.data1 = '1'
      c.data2 = '1'
      c.data3 = '1'
      c.emptyGroup = '1'
      expect(c.getChangedData()).toEqual({
        data1: '1',
        data2: '1',
        data3: '1',
        empty_group: '1',
      })
    })
    it('group takes priority over excludeGroup', () => {
      const c = new GroupData({ data1: 'old1', data3: 'old3', data4: 'old4' })
      c.data1 = 'new1'
      c.data3 = 'new3'
      c.data4 = 'new4'

      expect(c.getChangedData({ group: 'group1', excludeGroup: 'group1' })).toEqual({
        data1: 'new1',
        data3: 'new3',
      })
    })
  })
})
