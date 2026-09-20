---
permalink: /column/aliasName/
---

# aliasName 入参别名

## 说明

设置`入参`数据的属性别名。

## 案例

::: tabs

@tab 案例一

### 模型

```ts :no-line-numbers
<!-- @include: ./Consumer.ts#model -->
```

### 实例初始化

```ts :no-line-numbers
<!-- @include: ./init.spec.ts#consumer -->
```

### 打印日志

```ts :no-line-numbers
<!-- @include: ./init.spec.ts#log -->
```

:::

## 注意事项

- 需要把后端给的字段名作为 `aliasName` 的属性值，而不是把自定义字段名作为属性值
- `aliasName` 只用于兼容输入字段；需要同时控制输入和输出字段名时，请使用 [`name`](/column/name/)。
