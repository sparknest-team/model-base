---
permalink: /guide/examples/
---

# 示例索引

所有示例都与测试代码放在一起，文档中的代码片段直接引用可执行用例，避免示例与实现脱节。

## 创建与建模

| 目标 | 示例 |
|---|---|
| 创建模型并配置初始化行为 | [模型初始化](/init/) |
| 设置基础字段类型 | [字段类型](/column/type/) |
| 映射 API 字段名称 | [字段名称映射](/column/name/) |
| 兼容旧字段名 | [输入别名](/column/aliasName/) |
| 创建对象和数组子模型 | [嵌套模型](/column/model/) |
| 设置默认值 | [字段默认值](/column/default/) |

## 数据输入与输出

| 目标 | 示例 |
|---|---|
| 自定义 DTO 到模型的转换 | [反序列化转换](/column/formatter/) |
| 自定义模型到 DTO 的转换 | [序列化转换](/column/unformatter/) |
| 输出普通 DTO | [序列化模型](/method/getSerializableObject/) |
| 移除空值后输出 | [清理空值后序列化](/method/getCleanSerializableObject/) |
| 按业务场景选择字段 | [字段分组](/column/group/) |

## 状态与更新

| 目标 | 示例 |
|---|---|
| 获取增量变更 | [获取变更数据](/method/getChangedData/) |
| 判断模型是否被修改 | [判断是否变更](/method/isChanged/) |
| 保存或还原快照 | [保存快照](/method/saveChangedData/)、[还原快照](/method/revertChangedData/) |
| 使用 DTO 增量更新模型 | [增量更新](/method/update/) |
| 合并另一个模型 | [合并模型数据](/method/extend/) |

## 阅读建议

第一次使用时，建议依次阅读“模型初始化 → 嵌套模型 → 序列化模型 → 获取变更数据”。
