---
permalink: /guide/faq/
---

# 常见问题

## 应该使用 `new` 还是 `Model.create()`？

两种方式都支持。项目配置复杂、需要兼容不同装饰器编译模式时，建议统一使用
`Model.create(dto, options)`，便于保持一致的初始化行为。

## 为什么字段没有出现在模型或序列化结果中？

只有使用 `@Column()` 声明的字段才参与初始化和序列化。还应检查：

- 是否传入了 `group` 或 `excludeGroup`；
- DTO 字段名是否符合当前反序列化命名策略；
- 字段是否被 `clean` 空值策略移除；
- TypeScript 的装饰器配置是否与项目构建工具一致。

## 嵌套对象为什么仍是普通对象？

嵌套字段必须显式声明 `model`：

```ts
class User extends ModelBase {
  @Column({ model: () => Address })
  address?: Address
}
```

推荐使用函数形式 `() => Address`，可以减少循环依赖和模块加载顺序问题。

## 如何关闭变更追踪？

如果某个模型只负责 DTO 转换，可以在类上关闭：

```ts
@DataModel({ enableDataState: false })
class ApiResult extends ModelBase {}
```

也可以只对本次创建的模型树关闭：

```ts
const result = ApiResult.create(dto, { enableDataState: false })
```

关闭后不会生成原始快照，`getChangedData()`、`revertChangedData()` 等能力不再具有完整语义。

## `group` 和 `excludeGroup` 同时传入时如何处理？

`group` 优先，`excludeGroup` 被忽略。为保持调用意图清晰，通常只传其中一个。

## 是否依赖 `reflect-metadata`？

当前版本不依赖 `emitDecoratorMetadata`。字段类型和嵌套模型关系应通过 `@Column`
选项显式声明。

## `useDefineForClassFields` 有什么影响？

不同 TypeScript 和构建工具组合对类字段初始化顺序的处理不同。建议优先使用
`Model.create()`，并按项目实际编译模式运行测试。若使用旧版装饰器配置，可设置：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

## Vite 项目需要特殊配置吗？

ModelBase 不要求 `emitDecoratorMetadata`，通常可以直接由 Vite 编译。若项目仍使用旧版
TypeScript 装饰器语法，请确保应用源码和依赖的装饰器编译配置一致。
