---
permalink: /column/model/
---

# 嵌套模型

`model` 指定字段对应的 `ModelBase` 子类。DTO 中的普通对象或数组会递归转换为模型实例。

```ts
class Address extends ModelBase {
  @Column()
  city?: string
}

class User extends ModelBase {
  @Column({ model: () => Address })
  address?: Address
}
```

推荐使用 `() => ModelClass`，以避免循环依赖和模块初始化顺序问题。

## 对象、数组与普通 JSON

| 字段数据 | 是否配置 `model` | 结果 |
|---|---|---|
| 对象 | 是 | 子模型实例 |
| 数组 | 是 | 子模型实例数组 |
| 对象或数组 | 否 | 保持普通 JavaScript 数据 |

没有配置 `model` 的普通对象不具备 `getChangedData()`、`update()` 等模型能力。

## 可运行示例

::: tabs

@tab 模型数组

```ts :no-line-numbers
<!-- @include: ./arr.spec.ts#model -->
```

```ts :no-line-numbers
<!-- @include: ./arr.spec.ts#instance -->
```

@tab 单个模型

```ts :no-line-numbers
<!-- @include: ./obj.spec.ts#model -->
```

```ts :no-line-numbers
<!-- @include: ./obj.spec.ts#instance -->
```

@tab 未配置 model

```ts :no-line-numbers
<!-- @include: ./diff.spec.ts#model -->
```

```ts :no-line-numbers
<!-- @include: ./diff.spec.ts#instance -->
```

:::
