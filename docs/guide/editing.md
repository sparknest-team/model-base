---
permalink: /guide/editing/
---

# 第 3 步：编辑、保存与还原

目标：实现“接收数据 → 编辑 → 提交成功后确认 → 取消编辑”的完整流程。
本章使用[入门模型](/guide/start/)。

## 本地编辑：直接赋值

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#lifecycle -->
```

`getChangedData()` 不会发送请求，`saveChangedData()` 也不访问服务器。
实际项目应在提交成功后确认保存点；若请求期间允许继续编辑，需要业务处理并发版本，不能盲目确认整个当前实例。

## 服务端回填：update 会自动保存

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#update -->
```

这是与直接赋值最重要的区别。不要用 `update()` 表示“尚未提交的用户编辑”。
缺失或 undefined 字段不更新；模型数组是主键合并，而非整个列表替换。

## 重填数据：决定是否保留基准

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#refill -->
```

`setDataByOriginal()` 按初始化规则重填，可能应用默认值。
默认建立新保存点；`keepBackUp: true` 保留旧保存点。它不是通用的对象完全替换操作。

| 操作 | 用途 | 保存点 |
|---|---|---|
| 属性赋值 / setColumnData | 本地编辑 | 保留 |
| update(dto) | 服务端增量回填 | 自动更新 |
| setDataByOriginal(dto) | 按创建规则重填 | 默认更新 |
| setDataByOriginal(dto, { keepBackUp: true }) | 保留基准的重填 | 保留 |
| saveChangedData() | 确认当前状态 | 更新 |
| revertChangedData() | 放弃编辑 | 使用最近保存点 |

## 读取变化时的边界

- `isChanged()` 比较的是数据结果，不是“是否发生过一次赋值”；写回原值可以重新为 false。
- `getChangedData()` 不是 RFC JSON Patch，也不是自动可用的审计系统。
- 删除字段可能以 `undefined` 表示，JSON.stringify 会省略它。需与后端约定清空协议。
- `getChangedDescriptor()` 提供字段动作和数组主键分类，详见[变更描述](/method/getChangedDescriptor/)。
- 关闭快照时，查询返回空结果/false，还原不执行；这不代表业务值没有变化。

[下一步：嵌套模型与集合 →](/guide/nested/)
