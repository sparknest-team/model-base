---
permalink: /column/default/
---

# 字段默认值

当 DTO 中不存在对应字段时，`default` 为模型属性提供初始值。DTO 明确传入的值优先于默认值。

```ts
class Task extends ModelBase {
  @Column({ default: false })
  completed?: boolean

  @Column({ default: () => [] })
  tags?: string[]
}
```

对象和数组应使用工厂函数，确保不同实例不会共享同一个可变对象：

```ts
@Column({ default: () => ({}) })
metadata?: Record<string, unknown>
```

传入 `{ noDefault: true }` 可以在本次初始化中跳过所有默认值。

## 可运行示例

::: tabs

@tab 基础类型

```ts :no-line-numbers
<!-- @include: ./primitive.spec.ts#model -->
```

```ts :no-line-numbers
<!-- @include: ./primitive.spec.ts#instance -->
```

@tab 对象与数组

```ts :no-line-numbers
<!-- @include: ./obj.spec.ts#model -->
```

```ts :no-line-numbers
<!-- @include: ./obj.spec.ts#instance -->
```

@tab 动态默认值

```ts :no-line-numbers
<!-- @include: ./fn.spec.ts#model -->
```

```ts :no-line-numbers
<!-- @include: ./fn.spec.ts#instance -->
```

:::
