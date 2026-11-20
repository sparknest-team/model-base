---
permalink: /guide/changelog/
---

## 更新日志

## 1.2.0（相对 1.1.0）

三个公开包统一使用 1.2.0。使用 `^1.1.0` 的项目在重新解析依赖时可能自动升级。下面列出了会影响业务代码的变化，具体调整步骤见[迁移指南](/guide/migrate/#upgrade-1-2)。

| 范围 | 可能观察到的变化 |
| --- | --- |
| 快照与编辑 | 新增 `enableSnapshot`。关闭它或旧别名 `enableDataState` 会同时关闭保存、变更查询和还原。 |
| 模型与集合 | 启用追踪的实例使用 Proxy。标准模型树延迟建立快照，未显式建模的复杂值不保证追踪内部修改。 |
| TypeScript 调用 | 移除 `IModelUpdateOptions`、`IModelOptions.current` 和部分方法参数。 |
| 字段与 Vue | 修复继承列缓存、稀疏数组的变更描述及响应式写回；序列化支持使用 `excludeGroup` 排除多个组。 |
| service | 成功请求正确传入 wrapper，原先返回普通对象的代码可能收到模型或模型集合。 |

文档新增按任务组织的指南、API 速查及可执行示例。以下日期记录保留开发过程。

## AI 升级校验记录（2026-10-12）

- 提供单文件[升级记录与项目校验任务](/modelbase-upgrade-audit.txt)，区分实际行为变化与保留的既有语义，供 AI 检查业务项目。
- 历史全仓验证记录：2026-09-23 为 103 个测试套件、442 个测试通过、2 个待办；以下 2026-09-22 段落中的数字属于更早的验证记录。

## 文档与示例整理（2026-09-23，未发布）

- 新增从入门到应用集成的七阶段学习路线，统一整理 30 个专题示例页面，保留原有链接。
- 补充连续建模教程、Node / Vue 3 集成、service 接入和 API 速查，明确兼容行为与不支持的边界。
- 新增 26 个带断言的教程测试；正文直接引用测试代码，减少示例与实现不同步的问题。
- 新增 `yarn check:docs`，检查文档路由、导航链接和源代码片段引用。
- 调整导航、上一页/下一页和表格排版。本轮未修改 core 或 service 的运行时代码。

## 开发记录（2026-09-22）

本节记录准备 1.2.0 期间的实现细节。

### ModelBase（@model-base/core）

#### 列缓存修复

- 列注册和静态继承解析收口到内部注册表；普通模型持续复用缓存，注册后按需检查父计划并重建受影响缓存。
- 父类追加列传播到已缓存的子类，子类覆盖保持优先；无关类注册不重建现有计划，多份包副本共用纯数字注册时钟。
- 更新、比较、变更查询及内部主键取值复用列缓存；公开列查询保留副本语义，`columnsInValue` 与自定义查询保持实时。
- 延迟快照固定保存时的列规则，追加列不自动保存业务修改；不提供已有字段重命名后的历史 DTO 自动迁移。

- 父子类分别持有列缓存，修复父类预热后子类新增字段未参与映射和序列化的问题。
- 旧式及动态列注册隔离父类元数据，并使当前类缓存失效；静态列命中后仍复用同一份结果。
- `columnsInValue` 和自定义 `getColumns()` 不使用类级结果缓存；数据驱动列创建时读取 DTO，还原时保留该模式。
- 删除列查询中不可达的原型链遍历分支；`getColumns()` 仍返回独立副本。
- 动态定义重复使用时保留已归一化的 Number/String/Boolean，输入配置原地修改的兼容行为不变。

#### 新增

- 新增 `enableSnapshot` 快照开关，默认 `true`，支持 `@DataModel` 类配置及 `new` / `create` 实例配置。
- 保留 `enableDataState` 作为兼容别名。配置优先级为实例 > 类 > 默认值；同一层配置中新名称优先。
- 开启快照时，模型实例使用 Proxy 拦截修改；关闭时不创建模型追踪 Proxy。Vue 自身的响应式代理不受此开关限制。
- 节点级延迟快照：基本类型及显式声明 `model` / `childType` 的模型树初始化不创建完整快照 DTO，首次写入只记录该节点对应字段的旧值。
- 支持子模型数组、Record、RecordArray 的结构变化，以及父子模型独立保存点；查询和回滚时重建旧数据。
- 增加 Node 性能与常驻内存基准脚本，区分关闭追踪、即时快照和延迟快照的成本。

#### 修复

- 修复普通对象回滚后可能与原快照共享引用、后续修改污染保存点的问题，将隔离复制放在执行回滚时。
- 修复 `update()`、`setDataByOriginal()` 绕过 Vue 响应式代理写入、导致监听器不触发的问题。
- 修复多份模块副本之间读取延迟快照时，可能返回内部包装对象的问题。`__CLONE__` 只保存实际 DTO，延迟状态由所属模块管理。
- 保留显式写入的新快照，避免跨副本保存或模型合并后，被尚未生成的旧快照覆盖。
- 回滚重建子模型时保留开启快照的行为，避免类默认关闭、实例显式开启的配置丢失。
- 修复 Record 字段变更检测误调用模型主键方法，以及稀疏模型数组的主键变更描述下标错位。

#### 内部重构与优化

- 优化初始化及保存快照：复用已隔离的普通对象/数组 DTO，避免字段复制后再次整体深复制；特殊对象和回调返回值保留兼容复制。
- 追踪模型及已声明的模型集合；普通赋值不进行 JSON.stringify、深比较或祖先深复制。同一字段仅记录第一次旧值。
- 按职责拆分 DTO 映射、默认值、子模型创建、字段更新、变更分类和数组差异处理，保留原内部兼容入口。
- 整理序列化流程，保留字段转换回调、空值处理、命名与分组的既有执行规则。
- 为基础类型增加 JSON 语义比较快路径，减少不必要的字符串生成；复杂对象继续使用原比较路径，保留 `toJSON`、属性顺序及异常行为。
- Proxy 拦截函数在实例间复用，实例状态使用弱引用表，不引入进程级共享配置或缓存单例。
- 补充 class-transformer 对比、使用说明和内部模块职责文档；不代表已完全替代 class-transformer 的全部行为。
- 审阅 core/service/common 全部 65 个生产 TypeScript 文件，补齐函数、类、方法及关键分支注释，纠正旧复制工具、类型推断和路径返回值等说明；本轮去注释后的编译输出保持一致。

#### 兼容性与迁移注意事项

关闭快照的行为现已明确统一。这与旧版“仅跳过自动保存、部分快照方法仍继续执行”的行为不同：

| 能力 | `enableSnapshot: true` | `enableSnapshot: false` |
| --- | --- | --- |
| 模型追踪 Proxy | 创建 | 不创建 |
| `saveChangedData()` | 保存当前基准 | 不执行保存，显式参数也不能绕过实例关闭配置 |
| `getOriginalData()` | 返回保存点数据 | 返回 `{}` |
| `getChangedData()` / `getChangedDescriptor()` | 返回变更数据 / 描述 | 返回 `{}` |
| `isChanged()` | 检测变化 | 返回 `false` |
| 实例 / 静态回滚 | 还原到保存点 | 不修改模型 |

- 旧名称 `enableDataState` 遵循相同规则；旧代码无需立即改名。
- 父模型关闭快照时，由其创建的子模型也关闭，包括默认创建和更新时新增的子模型；不会全局修改其他模型类。
- 在已开启的实例上调用 `saveChangedData({ enableSnapshot: false })`，仅跳过本次保存，不切换实例模式。
- DTO 转换、默认值和普通更新仍可使用；`noDefault` 名称保持不变，不新增 `current` 或全局配置入口。
- 开启 Proxy 的模型不能直接用于原生 `structuredClone` 或 worker 消息克隆。应先生成 DTO，并确保 DTO 本身满足结构化克隆要求。
- 未声明 `model` / `childType` 的对象、数组不再保证内部修改的自动检测及还原，由调用方管理；初始化赋值与公开序列化行为保持不变。这是本次明确收窄的追踪边界。
- 访问器、自定义序列化、动态列及旧式存储保留即时快照兼容路径；延迟日志并非所有对象都更省内存，特别是字段极少的小模型。
- 多模块副本测试覆盖两份当前实现及旧式 WeakMap 回退，不保证任意历史版本或跨 realm 混用。应用应通过公开快照方法读取数据，不直接操作 `__CLONE__`。

推荐写法：

```ts
// 仅当前模型实例关闭快照；仍可正常执行 DTO 转换。
const user = User.create(dto, { enableSnapshot: false })

// 旧写法继续有效。
const compatibleUser = User.create(dto, { enableDataState: false })
```

### Service（@model-base/service）

#### 修复

- 修复 `CoreService` 调用 `ServiceResponse.create()` 时 wrapper 参数位置错误，导致成功响应未按配置转换为模型的问题。
- 替换测试中的空 driver，补齐请求参数、响应状态、模型类型及嵌套转换断言，避免请求失败后测试仍显示成功。
- 将成功请求的 wrapper 回归测试从 TODO 改为实际执行，并覆盖同步抛错、异步拒绝与错误日志行为。生产环境真实错误日志继续保留。

#### 内部重构

- `CoreService` 聚焦请求调度与生命周期，参数准备、序列化、前后置钩子和错误响应拆分为内部模块。
- 公共类型集中至 `service.types.ts`，继续从包入口及原 `CoreService` 路径导出。
- 提取 wrapper 标识判断和字典键转换规则，保持跨模块 marker 判断方式。
- 拆分流响应的二进制转换与 JSON 解析，减少 `DataStreamWrapper` 中的嵌套分支。
- 整理类型导入，补充架构与兼容约定文档；不增加运行时依赖、全局配置或新的公开策略接口。

#### 保持兼容

- 保留现有公开导出、构造方式、方法签名、继承关系以及子类覆盖 `request()` 的能力。
- 保留 `ServiceResponse.create(dto, wrapper)` 与 `new ServiceResponse(dto, options, wrapper)` 的不同参数约定。
- 保留前后置钩子的执行顺序、`this`、替换响应的能力，以及各阶段原有异常处理边界。
- 保留 wrapper 参数处理与数据引用行为、字典键转换、空集合和旧 `dataType` 配置语义。
- `DataStreamWrapper` 仍使用原有同步 JSON 解析；objectURL 转换仍依赖浏览器能力。未新增异步流转换、超时、取消或重试机制。

### 测试与验证

- 最近一次全仓回归：**96 个测试套件、358 个测试通过，保留 2 个既有 TODO**；节点级延迟快照新增 28 个用例，创建流程整理新增 5 个用例，注释边界核验新增 10 个用例。
- service 专项：**51 个测试通过**；本轮 service 结构重构新增 26 个兼容用例。
- 重点覆盖快照开关、Proxy 变更与回滚、外部引用、Vue 3 响应式、多份模块副本、请求钩子、响应包装及流转换。
- service 构建及编译产物请求检查通过；core 编译产物跨副本读取检查通过。
- 整库构建曾出现 Gulp 在输出 core 完成后不退出，不能将该次执行记为完整构建成功。
- packages 范围 TypeScript 检查通过；全仓类型检查仍受 docs 中既有 VuePress 虚拟模块及类型错误阻塞。
- 全仓类型检查仍有既有文档诊断；最近一次检查中 `packages` 无类型诊断。

[//]: # 'template'
[//]: # '## 1.1.2'
[//]: # '#### Feature'
[//]: # '#### Fix'
[//]: # '#### Style'
[//]: # '#### Breaking Change'
[//]: # '#### Remove'

## 1.0.12

## @model-base/core
#### fix 增加副作用判断，支持按需加载。


## 1.0.1

## @model-base/core

### change

#### remove `emptyValueScope` 和 `emptyValue`

#### change `revertChangedDataObject` 还原 class 的时候创建新对象不会设置默认值。

#### 新装饰器的自动适配`experimentalDecorators`，大家用起来是无感的。

```ts
// 新版装饰器
{
    "experimentalDecorators": false,
}
// 旧版装饰器
{
    "experimentalDecorators": true,
}
```

#### 对`emitDecoratorMetadata`不再进行依赖

- 变更 1：`ModelBase`的`class`都需要传入`model`。
- 变更 2：`Column`装饰器的`autowired`不再支持数组，仅支持属性是`ModelBase`类型的自动初始化。

```ts
class UserList extends ModelBase {
  @Column({
    model: () => UserModel,
    default: () => [],
  })
  list!: UserModel[]

  @Column({
    model: () => UserModel,
    default: () => new UserModel(),
  })
  userA!: UserModel

  @Column({
    model: () => UserModel,
    autowired: true,
  })
  userB!: UserModel
}
```

#### change and feature `Column`装饰器增加`deserialize` 和 `serialize`

- 对应的是旧版本的 `formatter`和`unformatter`
- 参数全部调整，新的类型为 `IColumnSerialize`和`IColumnDeserialize`

```ts
export type IColumnSerialize = {
  value?: any
  name: string // 调整，对应旧版本的是key
  property: string // 新增，属性名
  deserializeData: T // 调整，对应之前的data，当前class的实例化数据。只读模式
  column: IColumnInner
}
export type IColumnDeserialize = {
  value?: any
  name: string // 调整，对应旧版本的是key
  property: string // 新增，属性名
  serializeData: any// 调整，对应之前的data，服务器的序列化数据。。只读模式
  column: IColumnInner
}
```

#### break change `getColumns` 
- `column` 变更为 `name` 

#### change and feature `name` 和 `aliseName` 支持传入 `camelCase` 风格的名字

- 增加 `strictNameCheck` 和 `strictAliasNameCheck`，设置为 true 后，序列化后强制使用`name` ，初始化强制使用 `aliseName`的名字，和旧的逻辑一致。
- `name` 和 `aliseName` 支持传入 `camelCase` 风格的名字了。支持序列化函数和反序列化函数(new)通过参数`camelCase`指定输入和输出。
- `name` 对应服务端的返回数据属性字段，如果服务端是下划线，则填入下划线数据，如果服务端是驼峰的，本次调整后，会根据默认的命名策略来适配，默认是`mix`模式，同时支持`camelCase` 和 `snakeCase`

- 变更前

```ts
class UserModel extends ModelBase {
  @Column({ name: 'testUserA' })
  testUserA!: number
  @Column({ name: 'test_user_b' })
  testUserA!: number
  @Column({ name: 'total_result' })
  total!: string
}
const user = new UserModel({ testUserA: 'usera', test_user_b: 'userb' })
user.getSerializableObject()
// { testUserA: 'usera', test_user_b: 'userb' }
user.getSerializableObject({ camelCase: true })
// { testUserA: 'usera', test_user_b: 'userb' }
```

- 变更后

```ts
class UserModel extends ModelBase {
  @Column({ name: 'testUserA' })
  testUserA!: number
  @Column({ name: 'testUserB' }) // 支持驼峰了
  testUserA!: number
  @Column({ name: 'totalResult' }) // 支持驼峰了
  total!: string
}
const user = new UserModel({ testUserA: 'usera', test_user_b: 'userb' })
user.getSerializableObject()
// { test_user_a: 'usera', test_user_b: 'userb' }
user.getSerializableObject({ camelCase: true })
// { testUserA: 'usera', testUserB: 'userb' }
```

```ts
class UserModel extends ModelBase {
  @Column({ name: 'testUserA', strictNameCheck: true }) // strictAliasNameCheck也是同样的道理。
  testUserA!: number
  @Column({ name: 'test_user_b', strictNameCheck: true })
  testUserA!: number
  @Column({ name: 'total_result', strictNameCheck: true })
  total!: string
}
const user = new UserModel({ testUserA: 'usera', test_user_b: 'userb' })
user.getSerializableObject()
// { testUserA: 'usera', test_user_b: 'userb' }
user.getSerializableObject({ camelCase: true })
// { testUserA: 'usera', test_user_b: 'userb' }
```

### Feature

##### 标准化 `IModelProps`，以下作用域范围由大到小。

- class: 通过`@DataModel`类装饰器传入，作用域在整个`class`上生效。

- instance: 支持`new`时候传入`IModelProps`，作用域在当前实例上生效。

- instance: 在 `new/create` 时直接传入配置，只影响本次创建的模型树，不影响其他实例或全局行为。

```ts
interface IModelProps {
  noDefault?: boolean // 初始化不设置默认值
  enableDataState?: boolean // 是否启用数据状态
  keepModelName?: boolean // 是否采用dto数据中的模型的key
  columnsInValue?: boolean // 是否根据模型实例中的值来初始化模型的列
  deserializeNamingStrategies?: 'mix' | 'camelCase' | 'snakeCase'
  serializeNamingStrategies?: 'camelCase' | 'snakeCase'
}
```

##### 标准化 `model`和 `default`的传入，推荐函数式传入。

    model的函数式传入可以避免循环依赖

    default的函数式传入可以避免

```ts
class UserList extends ModelBase {
  @Column({
    model: () => UserModel,
    default: () => [],
  })
  list!: UserModel[]
}
```

##### 内部标准化实例化统一用 `Class.create()`，避免 typescript 的`useDefineForClassFields`不同配置对实例化的效果造成影响。

##### 新旧装饰器都不允许通过`ClassField`进行`define`。请使用`default`

```ts
// 不支持
class UserModel extends ModelBase {
  @Column()
  id!: number = 1 // 不支持
  @Column()
  name!: string = 'user1' // 不支持
  @Column()
  list!: string = [] // 不支持
}
// 支持
class UserModel extends ModelBase {
  @Column({ default: 1 })
  id!: number
  @Column({ default: 'user1' })
  name!: string
  @Column({ default: () => [] }) // 引用类型请使用函数。
  list!: string
}
```

##### 支持`lodash`对`ModelBase`实例进行克隆
