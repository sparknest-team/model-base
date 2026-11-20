/** 依赖注入的稳定令牌；Symbol.for 允许同一环境中的不同模块副本取得相同令牌。 */
export const IOC_TYPES = {
  CoreApi: Symbol.for('CoreApi'),
  CoreService: Symbol.for('CoreService'),
}
