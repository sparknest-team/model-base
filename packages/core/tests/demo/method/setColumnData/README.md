---
permalink: /method/setColumnData/
---

# 按字段名设置值

`setColumnData(key, value)` 根据运行时字段名更新模型属性，并返回当前模型以支持链式调用。
它不会修改 `@Column` 元数据。

```ts
user.setColumnData('displayName', 'Ada')
// 等价于 user.displayName = 'Ada'
```

静态字段名已知时应优先直接赋值；动态表单或配置驱动的字段更新可以使用本方法。

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
