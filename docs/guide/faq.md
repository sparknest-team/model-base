---
permalink: /guide/faq/
---

# 常见问题

## 应该使用 `new` 还是 `Model.create()`？

两种方式都支持。项目配置复杂、需要兼容不同装饰器编译模式时，建议统一使用
`Model.create(dto, options)`，便于保持一致的初始化行为。

## 为什么字段没有出现在模型或序列化结果中？

默认只有使用 `@Column()` 声明的字段参与初始化和序列化；显式开启 `columnsInValue` 时会从当前数据推断字段。还应检查：

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

## update 后为什么没有变化？

`update(dto)` 自动保存更新后的基准，适合服务端回填。待提交的用户编辑使用属性赋值或
`setColumnData`。需要重填但保留旧基准时，使用 `setDataByOriginal(dto, { keepBackUp: true })`。
参见[编辑流程](/guide/editing/)。

## 动态工厂生成的模型会每次重算列吗？

不会。`dynamicModelBase` 生成的类仍按固定结构缓存；`columnsInValue` 才会随当前数据推断字段。
通过 `ColumnDefine` 注册会使受影响的继承计划按需更新，但不自动保存已有实例的数据修改。
`getColumns()` 返回副本，`getColumnsCached()` 返回共享结果，不要通过修改它们来注册列。

## 文档示例是否经过测试？

连续教程引用 `packages/core/tests/demo/learning` 与 `packages/service/tests/demo` 中的命名片段，
输出由同一文件的断言验证。专题页保留原地址；旧目录中的历史 `.ts` 演示不等于完整回归保证。
运行方式见[示例索引](/guide/examples/)。

## 如何关闭变更追踪？

如果某个模型只负责 DTO 转换，可以在类上关闭：

```ts
@DataModel({ enableSnapshot: false })
class ApiResult extends ModelBase {}
```

也可以只对本次创建的模型树关闭：

```ts
const result = ApiResult.create(dto, { enableSnapshot: false })
```

`enableDataState` 仍作为兼容别名使用。配置优先级为实例 > 类 > 默认值（true），
同一层同时提供两个名称时 `enableSnapshot` 优先。

关闭后不启用模型 Proxy、不保存快照：`getOriginalData()`、`getChangedData()`、
`getChangedDescriptor()` 返回 `{}`，`isChanged()` 返回 `false`，
`saveChangedData()` 和 `revertChangedData()` 不执行保存或回滚，显式保存参数也不能绕过关闭配置。
DTO 转换和普通更新正常工作；父模型关闭时，由它创建的子模型也关闭快照。

开启时，基本类型字段及显式声明 `model` / `childType` 的子模型支持变更检测和还原。
普通模型初始化只创建实例数据和追踪元数据，不额外递归复制完整快照。
字段首次修改时，仅在所属节点记录旧值；重复修改同一字段不会覆盖最初的旧值，也不会通知祖先深复制。
读取原始数据、计算变更或还原时，才按需重建保存点的数据。

## 嵌套变化的追踪边界是什么？

```ts
class Address extends ModelBase {
  @Column() city!: string
}

class User extends ModelBase {
  @Column({ model: Address }) address!: Address
  @Column({ model: Address }) addresses!: Address[]
  @Column() extra!: Record<string, unknown>
}

const dto = { address: { city: '北京' } }
const user = User.create(dto)
user.address.city = '上海'
user.getChangedData() // { address: { city: '上海' } }
user.revertChangedData()
user.address.city // '北京'
```

- `new User(dto)` 与 `User.create(dto)` 都会递归创建声明了子模型类型的字段，不复用输入中的子模型 DTO 对象。
- 子模型数组支持增删、排序、索引替换和 `length` 修改；`record` / `recordArray` 支持键及内部集合的修改。
- 子模型先修改、再整体替换引用，仍能还原到保存点的原值。
- 父子模型可以分别调用 `saveChangedData()`，各自保存点互不覆盖。
- **没有声明 `model` / `childType` 的对象或数组是不透明值，不保证其内部修改能被检测或还原。**
  初始化时普通对象保持原引用，普通数组保持既有复制行为；不增加深层代理。开发者应自行管理这些值，
  或将需要追踪的结构定义为子模型。Date、Map、Set 等内部状态同样不属于自动深层追踪范围。
- 如需自行管理不透明值，可在修改前显式读取 `getOriginalData()`，使当前保存点生成独立 DTO；
  这会产生复制成本。不要依赖一次偶然的变更查询已经为这些值生成了快照。
- 自定义 `serialize` / `unformatter`、访问器、动态列及旧式快照存储保留即时快照兼容路径，
  以保持保存时的回调和取值行为；包含这些子节点的父模型也可能走兼容路径。

延迟快照不是零内存：代理、保存点关系和修改日志仍有成本。尤其是字段很少的小模型，
元数据可能比原来的快照更大；批量执行完整快照查询也会重新分配保存点数据。
Node 测量方式及结果见仓库 `packages/core/PERFORMANCE.md`。

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
