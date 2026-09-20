---
permalink: /method/getColumnData/
---

# 按字段名读取值

`getColumnData(key)` 根据运行时字段名读取模型属性。它读取的是字段值，不是 `@Column`
元数据。静态字段名已知时应优先直接访问属性。

```ts
user.getColumnData('displayName')
// 等价于 user.displayName
```

该方法主要用于动态表单、表格列配置和其他无法在编译期确定字段名的场景。

## 可运行示例

```ts :no-line-numbers
<!-- @include: ./init.spec.ts#model -->
```

```ts :no-line-numbers
<!-- @include: ./init.spec.ts#instance -->
```

```ts :no-line-numbers
<!-- @include: ./init.spec.ts#log -->
```
