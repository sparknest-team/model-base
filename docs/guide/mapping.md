---
permalink: /guide/mapping/
---

# 第 2 步：字段映射与转换

目标：明确输入和输出边界，而不是给每个接口手写字段拷贝。

## 名称：实例属性、DTO 名称、输入别名

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#names -->
```

`name` 控制规范输入/输出名；`aliasName` 额外兼容输入，不把别名变成输出名。
不要将“名称映射”称为“编码”。详细规则见 [name](/column/name/) 和 [aliasName](/column/aliasName/)。

## 默认值：缺值时提供，而不是强制覆盖

以下片段使用[入门的 User](/guide/start/)：

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#defaults -->
```

使用工厂返回数组和对象，避免多个实例共享可变默认值。显式传入 `null` 与缺失/`undefined` 不同。
`noDefault: true` 跳过默认值和自动初始化。

## 类型转换：把方向写清楚

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#conversion -->
```

`deserialize`：DTO → 实例；`serialize`：实例 → DTO。
旧的 `formatter/unformatter` 保留兼容，新代码不建议同时配置两套回调。
自定义序列化会影响保存点策略，不能假设此时仍完全延迟快照。

## 按场景选字段

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#groups -->
```

不传分组时处理全部字段。未分组字段属于公共字段；`group` 优先于 `excludeGroup`。
分组不是权限校验机制，敏感数据应由服务端控制。

## 空值输出

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#clean -->
```

清理会改变提交含义：删除 null 可能导致服务端无法区分“清空字段”和“不更新字段”。
API 要求保留 null 时显式选择 `CLEAN_UNDEFINED`。0 和 false 不应被当作空值删除。

[下一步：编辑、保存与还原 →](/guide/editing/)
