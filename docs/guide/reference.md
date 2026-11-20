---
permalink: /guide/reference/
---

# API 速查：按任务选择方法

先读[学习路线](/guide/roadmap/)，本页用于查阅，不代替连续教程。

## 创建与结构

| 入口 | 用途 | 注意 |
|---|---|---|
| Model.create(dto, options?) | 推荐创建入口 | 构造链结束后统一映射 |
| new Model(dto, options?) | 构造模型 | 注意类字段初始化顺序 |
| createModel(Model, dto, options?) | 通用工厂 | 第一个参数是模型类或类型工厂 |
| dynamicModelBase(columns) | 根据配置生成类 | 当前返回声明只描述 new |
| createDynamicModel(columns, dto, options?, params?) | 配置直接创建实例 | 与上一个返回值不同 |
| ColumnDefine(config)(Model.prototype, key) | 注册/覆盖字段 | 更新列缓存，不自动保存业务修改 |
| getColumns() | 查看独立的列定义副本 | 修改结果不注册列 |
| getColumnsCached() | 读取共享结果 | 不要修改返回值 |

## 数据读写与输出

| 方法 | 返回/效果 | 详情 |
|---|---|---|
| getSerializableObject(options?) | 当前 DTO | [输出](/method/getSerializableObject/) |
| getSerializableString(options?) | 当前数据的 JSON 字符串 | 仍需考虑无法 JSON 化的业务值 |
| getCleanSerializableObject(options?) | 去掉脏空值的 DTO | [清理](/method/getCleanSerializableObject/) |
| getColumnData(key) / setColumnData(key, value) | 读取/设置实例属性 | [存取](/method/setColumnData/) |
| update(dto) | 增量回填并保存 | [更新](/method/update/) |
| setDataByOriginal(dto, { keepBackUp? }) | 按初始化规则重填 | [重填](/method/setDataByOriginal/) |
| mergeModel(model) | 覆盖非 undefined 的已声明值 | [合并](/method/extend/) |

## 快照与变化

| 方法 | 返回/效果 |
|---|---|
| getOriginalData() | 保存点 DTO，同一份可变引用 |
| getChangedData(options?) | 相对保存点的变化 |
| getChangedDescriptor(options?) | 字段动作/主键数组分类 |
| isChanged(options?) | 是否存在数据差异 |
| saveChangedData(options?) | 当前状态成为新基准 |
| revertChangedData() | 还原到最近基准 |
| ModelBase.revertChangedData(target) | 批量还原对象/数组/字典 |
| ModelBase.resetDefault(target) | 按默认值重置并保存，不是撤销 |

## 常用创建选项

| 选项 | 默认/优先级 | 作用 |
|---|---|---|
| enableSnapshot | 默认 true | 快照、变更检测和还原 |
| enableDataState | 兼容名称 | 同一层 enableSnapshot 优先 |
| noDefault | 默认 false | true 跳过默认值和自动初始化 |
| columnsInValue | 默认 false | 按 DTO/当前实例实时推断字段 |
| keepModelName | 默认 false | 数据驱动字段保留原键名 |
| deserializeNamingStrategies | 默认 mix | 输入命名策略 |
| serializeNamingStrategies | 默认 snakeCase | 输出命名策略 |
| group / excludeGroup | group 优先 | 创建字段选择；不是全局开关 |

实例选项优先于类配置。不要把创建选项套用到所有方法；例如 setDataByOriginal 当前只特别消费 keepBackUp。

## 序列化与变更查询选项

- `group`：一个分组名；未分组字段仍保留。
- `excludeGroup`：排除分组，部分输出接口接受数组；不要据此假定所有创建选项都支持数组。
- `camelCase`：输出时覆盖命名策略；未传时遵守实例/类配置。
- `clean`：CLEAN_UNDEFINED、CLEAN_UNDEFINED_AND_NULL、CLEAN_DIRTY。
- `trim`：配合列的 trim 配置处理输出。
- `ignoreEmptyString`：变更比较的特定兼容规则，不是跳过所有空字符串修改。
- `enableEmptyValue`：允许列配置提供输出替代值，注意回调执行。

## 工具函数与兼容方法

`deserialize`、`deserializeArray`、`deserializeRecord`、`deserializeRecordArray` 用于不同输入集合。
`serialize` 与 `getSerializableObject` 的默认选项不应盲目视为相同，调用时明确清理策略。

`getPrimaryKey/getPrimaryValue/getPrimaryValueFromData` 用于主键配置和值。
`callMethod` 是显式递归调用，不是自动生命周期。
`isModelEqual/isContainsModel` 是旧式字段比较，先阅读对应边界；`extend/extendModel` 不推荐新代码使用。

[返回示例索引](/guide/examples/) · [常见问题](/guide/faq/)
