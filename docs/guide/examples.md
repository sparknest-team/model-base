---
permalink: /guide/examples/
---

# 示例索引：按学习阶段与任务查找

## 连续教程

[01 创建模型](/guide/start/) → [02 字段映射](/guide/mapping/) → [03 编辑与保存](/guide/editing/) → [04 嵌套集合](/guide/nested/) → [05 动态模型](/guide/dynamic/) → [06 环境集成](/guide/integration/)。

教程片段来自 `packages/core/tests/demo/learning/journey.spec.ts`，Vue 示例来自同目录 `vue.spec.ts`，
service 示例来自 `packages/service/tests/demo/quickstart.spec.ts`。输出由断言验证，不依赖手工日志截图。

## 专题示例

| 主题 | 要解决的问题 | 入口 |
|---|---|---|
| 创建模型实例 | 把 DTO 转换为模型属性、应用默认值并创建子模型。推荐使用 `Model.create(dto, options)`。 | [查看](/init/) |
| 按业务场景选择字段 | 让同一个模型支持详情、创建、编辑等不同字段集合。 | [查看](/group/) |
| 字段类型与运行时转换 | 区分 TypeScript 类型声明、列配置和数据转换，避免误以为声明 number 就会自动校验输入。 | [查看](/column/type/) |
| name | 实例属性名与接口字段名不一致时，用 name 指定规范 DTO 名称。 | [查看](/column/name/) |
| aliasName | 同一个业务字段需要接收接口的另一个名称时使用 aliasName。 | [查看](/column/aliasName/) |
| default | DTO 字段缺失或为 undefined 时提供初值，不覆盖显式输入。 | [查看](/column/default/) |
| autowired | 当单个子模型没有输入值时，自动创建子模型实例。 | [查看](/column/autowired/) |
| model | 将对象或数组递归创建为子模型，并让受支持的子字段参与变更追踪。 | [查看](/column/model/) |
| primary | 在子模型字段上声明主键，用于数组增量更新和变更分类。 | [查看](/column/primary/) |
| foreign | foreign 是保留的兼容分支，不是 ORM 外键或关联查询功能。 | [查看](/column/foreign/) |
| deserialize | 在输入字段进入实例前进行明确的数据转换。formatter 是旧兼容名称。 | [查看](/column/formatter/) |
| serialize | 输出接口数据时按业务约定转换字段值。unformatter 是旧兼容名称。 | [查看](/column/unformatter/) |
| trim | 对启用 trim 的字段，在输出调用开启 trim 时清理字符串。 | [查看](/column/trim/) |
| group | 给字段设置一个或多个组，创建、输出和变更查询时选择需要的内容。 | [查看](/column/group/) |
| getSerializableObject | 根据字段映射、转换和过滤规则输出当前数据，不重置保存点。 | [查看](/method/getSerializableObject/) |
| getCleanSerializableObject | 需要移除空字符串、空数组和空对象时使用，0 和 false 保留。 | [查看](/method/getCleanSerializableObject/) |
| getChangedData | 返回发生变化的字段，输出键使用 DTO 名称；读取不会确认保存。 | [查看](/method/getChangedData/) |
| getChangedDescriptor | 描述字段的 CREATE、UPDATE、DELETE，以及有主键模型数组的元素分类。 | [查看](/method/getChangedDescriptor/) |
| isChanged | 需要控制保存按钮或离开页面提示时，查询受支持字段是否不同于保存点。 | [查看](/method/isChanged/) |
| getOriginalData | 取得创建、显式保存或自动回填保存时的数据基准，不是未经转换的原始接口响应。 | [查看](/method/getOriginalData/) |
| saveChangedData | 提交成功后，在业务允许的时机建立新的本地保存点。 | [查看](/method/saveChangedData/) |
| revertChangedData | 放弃本地编辑，恢复最近一次保存的数据，而不总是恢复最初接口响应。 | [查看](/method/revertChangedData/) |
| update | 更新 DTO 中已提供且非 undefined 的字段，保留其他字段，完成后自动建立新保存点。 | [查看](/method/update/) |
| setDataByOriginal | 回填数据时选择是否继续保留旧的变更基准。 | [查看](/method/setDataByOriginal/) |
| mergeModel | 用来源模型中不为 undefined 的已声明属性覆盖当前值，保留当前保存点。 | [查看](/method/extend/) |
| getColumnData | 在配置驱动的界面中，根据字符串属性名读取当前值。 | [查看](/method/getColumnData/) |
| setColumnData | 根据字符串属性名赋值，保持当前实例引用并支持链式调用。 | [查看](/method/setColumnData/) |
| callMethod | 按名称调用模型方法，并递归处理受支持的子模型对象和数组。 | [查看](/method/callMethod/) |
| isModelEqual | 保留现有字段比较行为，适合已经验证命名和数据形状的旧业务。 | [查看](/method/isModelEqual/) |
| isContainsModel | 逐字段判断目标数据是否满足当前模型的旧式比较规则。 | [查看](/method/isContainsModel/) |

## 在仓库运行

```sh
# 连续教程
npm test -- packages/core/tests/demo/learning --runInBand
# 可选请求层
npm test -- packages/service/tests/demo --runInBand
# 全量兼容回归
npm test -- --runInBand --silent
# 文档链接、示例引用检查
node scripts/check-docs.cjs
```

## 源码目录怎么读？

- learning：开发者阅读入口，按目标递进，可运行并有结果断言。
- column / method / init / group：保留旧目录和地址；README 已统一为专题参考。
- unit：复杂兼容边界、性能相关约束和历史回归，不要求新用户逐条阅读。
- 不在 Jest 匹配范围内的旧 .ts 演示不是自动回归保证；以连续教程和 spec.ts 断言为准。

[从学习路线开始](/guide/roadmap/) · [API 速查](/guide/reference/)
