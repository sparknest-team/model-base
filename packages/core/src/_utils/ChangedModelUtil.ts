/**
 * 模型变更检测兼容入口，保留原有导入路径。
 * 变更聚合与主键数组比较的实现位于 changeTracking/。
 */
export { getChange } from './changeTracking/getChange'
