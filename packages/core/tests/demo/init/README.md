---
permalink: /init/
---

# 创建模型实例

模型初始化负责把 DTO 字段映射到类属性、创建嵌套模型、应用默认值，并按需保存变更追踪快照。

## 推荐写法

```ts
class User extends ModelBase {
  @Column()
  id?: number

  @Column()
  displayName?: string
}

const user = User.create({
  id: 1,
  display_name: 'Ada',
})
```

默认反序列化策略为 `mix`，因此同时接受 `display_name` 和 `displayName`。

## 创建方式

| 写法 | 适用场景 |
|---|---|
| `User.create(dto, options?)` | 推荐的统一入口 |
| `new User(dto, options?)` | 简单场景或已有构造函数调用 |
| `createModel(User, dto, options?)` | 模型类型由参数传入的通用代码 |
| `deserialize(User, dto, options?)` | 强调 DTO 反序列化语义的工具函数 |

## 初始化选项

```ts
const user = User.create(dto, {
  noDefault: true,
  enableDataState: false,
  deserializeNamingStrategies: 'mix',
  serializeNamingStrategies: 'snakeCase',
  group: 'detail',
})
```

| 选项 | 说明 |
|---|---|
| `noDefault` | 缺少字段时不应用 `default` 或 `autowired` |
| `enableDataState` | 是否生成原始快照并启用变更追踪 |
| `deserializeNamingStrategies` | DTO 输入字段的命名策略 |
| `serializeNamingStrategies` | 后续序列化使用的命名策略 |
| `group` | 只初始化未分组字段和指定分组字段 |
| `excludeGroup` | 排除指定分组；与 `group` 同时存在时后者优先 |

这些选项只影响本次创建的模型树和对应实例，不会修改全局配置或其他实例。

## 可运行示例

```ts :no-line-numbers
<!-- @include: ./init.spec.ts#model -->
```

```ts :no-line-numbers
<!-- @include: ./init.spec.ts#instance -->
```
