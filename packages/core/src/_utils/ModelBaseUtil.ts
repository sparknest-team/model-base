/**
 * 模型数据操作兼容入口。
 * 实现按 DTO 读取、默认值、嵌套创建和更新职责拆分到 mapping/。
 * 保留既有导入路径和导出集合，不通过包入口暴露内部辅助函数。
 */
export { deepCopy } from './deepCopy'
export { createChildField } from './mapping/childField'
export { createModelByDTO, extendModelByDTO, updateModelByDTO } from './mapping/applyDto'
