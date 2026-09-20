---
permalink: /method/extend/
---

# 合并模型数据

`extend()` 和 `extendModel()` 是早期提供的覆盖方法，目前均已废弃。新代码应使用
`mergeModel()`；它只覆盖来源模型中值不为 `undefined` 的已声明字段。

```ts
const current = User.create({ id: 1, user_name: 'Ada' })
const patch = User.create({ user_name: 'Grace' })

current.mergeModel(patch)
```

| 方法 | 状态 | 说明 |
|---|---|---|
| `mergeModel(model)` | 推荐 | 合并已声明且值不为 `undefined` 的字段 |
| `extendModel(model)` | 已废弃 | 旧版模型合并方法 |
| `extend(data)` | 已废弃 | 仅支持第一层字段覆盖 |

## 可运行示例

```ts :no-line-numbers
<!-- @include: ./init.spec.ts#model -->
```

```ts :no-line-numbers
<!-- @include: ./init.spec.ts#instance -->
```
