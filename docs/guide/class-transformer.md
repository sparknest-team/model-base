---
permalink: /guide/class-transformer/
---

# class-transformer 对比、示例与演进规划

本次对照固定参考 class-transformer **v0.5.1** 源码，避免 develop 分支变动造成结论漂移。
ModelBase 以当前工作区实现为准。目标是评估业务能力替代，不要求新增同名装饰器。
以下 class-transformer 片段为官方 API 的示意；ModelBase 的关键边界已有可执行测试，
但尚未运行双库差异测试，因此不能称为完全兼容。

参考：[转换实现](https://github.com/typestack/class-transformer/blob/v0.5.1/src/TransformOperationExecutor.ts)、
[选项定义](https://github.com/typestack/class-transformer/blob/v0.5.1/src/interfaces/class-transformer-options.interface.ts)、
[函数入口](https://github.com/typestack/class-transformer/blob/v0.5.1/src/index.ts)。

## 评价口径

- **直接支持**：现有 API 能表达业务需求。
- **间接支持**：通过 Column 回调、工具函数或调用侧组合实现，列明限制。
- **语义不同**：两边都有能力，但默认值、返回类型或副作用不同。
- **基础设施缺口**：需要库级支持才能稳定覆盖通用场景。

## 能力矩阵

| 能力 | ModelBase 现状 | 结论 |
|---|---|---|
| DTO → 实例 | create/new/deserialize | 直接支持；通常要求继承 ModelBase |
| 实例 → DTO | getSerializableObject/serialize | 直接支持 |
| 字段白名单 | 默认只遍历 Column | 直接支持，不需要再造 Expose |
| 字段黑名单 | 不声明 Column 可双向排除 | 白名单能替代常见 Exclude 需求 |
| 仅输入或仅输出字段 | serialize/deserialize、分组 | 间接支持，尚无字段级跳过标志 |
| 名称映射 | name/aliasName、命名策略 | 直接支持；默认会转换名称 |
| 嵌套对象/数组 | model | 直接支持 |
| getter/方法结果 | serialize 读取实例或调用方法 | 间接支持；有空值门槛，见示例 |
| 自定义双向转换 | deserialize/serialize | 直接支持；未自动传递所有调用选项 |
| Date/Number/Boolean | 显式回调转换 | 间接支持；type 不是通用强制转换器 |
| Set/Map/自定义集合 | 回调创建集合并显式输出 DTO | 间接支持；不是自动递归类型协议 |
| 多态子类型 | deserialize 根据 DTO 选择模型，serialize 转回 DTO | 间接支持；需自行维护类型映射 |
| 字段分组 | Column.group 数组、调用 group 字符串 | 直接支持但默认行为不同 |
| 版本过滤 | 使用约定分组模拟有限版本 | 间接支持有限场景，无 since/until 区间规则 |
| 默认值 | Column.default/autowired/noDefault | 直接支持；与类字段初始化器不等价 |
| null/undefined | CLEAN_ENUM/emptyValue | 有不同策略，但不能保留 undefined 属性键 |
| JSON 字符串 | JSON.parse + create；getSerializableString | 间接/直接支持，serialize 同名但含义不同 |
| 更新已有实例 | update/setDataByOriginal/mergeModel | 可实现相关任务，但快照及数组合并语义不同 |
| 实例深克隆 | DTO 往返或通用 cloneDeep | 有限替代，不等价于任意对象图复制 |
| 循环对象图 | 嵌套递归无统一访问记录 | 基础设施缺口；类型惰性引用不能解决对象环 |
| 非 ModelBase 类 | 当前工具依赖 create 等模型协议 | 基础设施缺口，外部类迁移有成本 |
| 忽略装饰器/前缀过滤 | 调用侧拣选、单独响应模型 | 间接方案，无统一转换选项 |
| 外部类型映射 targetMaps | 动态模型可新建类型，不能直接等价装饰外部类 | 部分相关能力，非等价 |
| 隐式类型转换 | 不依赖 design:type | 无同机制；显式回调能实现业务转换 |
| 方法返回值转换装饰器 | 返回前调用 serialize/deserialize | 调用侧可替代；框架自动集成需适配 |
| 泛型 | TypeScript 类型辅助，运行时仍需 model | 不能仅靠泛型参数推断实际子类型 |
| 变更追踪/回滚/主键差异 | 内置 | ModelBase 的额外能力 |

## 1. Expose / Exclude：决定字段是否参与转换

### 白名单：你的理解是正确的

class-transformer 可用类级 Exclude 配合字段级 Expose：

```ts
@Exclude()
class User {
  @Expose() name!: string
  password!: string
}
const user = plainToInstance(User, { name: 'Ada', password: 'secret' })
instanceToPlain(user) // { name: 'Ada' }
```

ModelBase 默认就是这种声明式白名单：

```ts
class User extends ModelBase {
  @Column() name!: string
  password?: string // 不参与标准 Column 映射
}
const user = User.create({ name: 'Ada', password: 'secret' })
user.password // undefined
user.password = 'local secret'
user.getSerializableObject() // { name: 'Ada' }
```

不声明 Column 不等于禁止 JavaScript 属性访问：手动赋值之后仍可直接读取。
白名单结论针对默认模式；columnsInValue 会动态推断字段，需要单独评估暴露范围。
普通对象内部没有子模型白名单，敏感嵌套字段应定义 model 或显式转换。

### 方向性排除：允许输入密码，但不输出密码

class-transformer：

```ts
@Exclude({ toPlainOnly: true })
password!: string
```

ModelBase 可通过输出分组实现：

```ts
@Column({ group: 'private' })
password!: string

const user = User.create({ password: 'secret' })
user.getSerializableObject({ excludeGroup: 'private' }) // {}
user.password // 'secret'
```

这满足本次输出需求，但其他调用若忘记 excludeGroup，密码仍会输出。
serialize 返回 undefined 也不是彻底排除：对象中可能仍有该属性键，只是 JSON.stringify 会省略它。
因此后续值得增加的是“字段方向控制”，而不是重复实现一套白名单。

## 2. getter / 方法：把计算结果写到输出 DTO

业务目标：由 first 和 last 得到完整姓名，或者调用模型的方法生成标签。

class-transformer：

```ts
@Expose()
get fullName() { return this.first + ' ' + this.last }

@Expose()
label() { return 'User: ' + this.fullName }
```

ModelBase 可以保留普通 getter/method，再通过 Column 输出字段读取结果：

```ts
class User extends ModelBase {
  @Column() first!: string
  @Column() last!: string

  get fullName() { return this.first + ' ' + this.last }
  label() { return 'User: ' + this.fullName }

  @Column({
    default: '',
    serialize: ({ deserializeData }) => deserializeData.fullName,
  })
  fullNameOutput!: string

  @Column({
    default: '',
    serialize: ({ deserializeData }) => deserializeData.label(),
  })
  labelOutput!: string
}

const user = User.create({ first: 'Ada', last: 'Lovelace' })
user.getSerializableObject()
// {
//   first: 'Ada', last: 'Lovelace',
//   full_name_output: 'Ada Lovelace',
//   label_output: 'User: Ada Lovelace'
// }
```

此处 deserializeData 是模型实例，命名虽不直观，但确实能读取其他字段、getter 和方法。
默认值 '' 保证默认序列化时输出字段不是 undefined/null。

当前限制（前两项已有回归测试，其余依据实现检查）：

- 去掉默认值，输出字段为 undefined 时，回调结果会被原值的空值判断丢弃。
- getCleanSerializableObject 会把 '' 占位字段判为空，因此计算结果也会丢失。
- noDefault: true 会跳过占位默认值，同样影响上述示例。
- 声明 model 的字段走专用递归分支，不会走普通字段的 serialize 回调。
- 不建议直接在 getter/method 上套当前 Column：字段装饰器实现及初始化赋值没有完整支持这些成员。
- 保存快照也会调用 serialize；计算函数应无副作用。

结论：业务能力可间接替代；需要完善计算字段的空值规则和输入写入规则，才适合通用推广。

## 3. Type：类型声明、转换和校验是三件事

class-transformer 的显式转换：

```ts
@Type(() => Number)
count!: number
// 输入 '42' → 数字 42
```

ModelBase 现有 type: Number 不会自动把字符串转成数字；应显式写：

```ts
@Column({ deserialize: ({ value }) => Number(value) })
count!: number

@Column({
  deserialize: ({ value }) => new Date(value),
  serialize: ({ value }) => value.toISOString(),
})
createdAt!: Date
```

日期业务可以得到相同 JSON，但直接 DTO 的结果未必相同：
class-transformer 的 instanceToPlain 可以保留 Date 对象，而上述回调输出 ISO 字符串。
比较时要分别检查 DTO 类型和 JSON 文本。

Boolean 转换也需要业务定义：Boolean('false') 是 true；解析字符串开关时应自行判断。
这两个库的转换能力都不能自动代替输入校验。Number('bad') 得到 NaN，不会证明输入合法。

## 4. Set / Map：集合转换

业务目标：把数组转成去重集合，再输出数组。

class-transformer 支持用 Type 描述集合元素类型（以下使用旧式装饰器及 reflect-metadata）：

```ts
class Collections {
  @Type(() => String)
  tags!: Set<string>

  @Type(() => Number)
  scores!: Map<string, number>
}
const value = plainToInstance(Collections, {
  tags: ['a', 'a'], scores: { math: '90' },
})
// value.tags 为 Set；value.scores 为 Map，math 对应数字 90
// instanceToPlain(value) → { tags: ['a'], scores: { math: 90 } }
```

ModelBase 可以显式写：

```ts
@Column({
  deserialize: ({ value }) => new Set(value),
  serialize: ({ value }) => [...value],
})
tags!: Set<string>
// ['a', 'a'] → Set {'a'} → ['a']
```

Map 的同类写法：

```ts
@Column({
  deserialize: ({ value }) => new Map(Object.entries(value)),
  serialize: ({ value }) => Object.fromEntries(value),
})
scores!: Map<string, number>
```

如果元素是模型，回调内还要逐个创建模型并序列化。Record/recordArray 是对象字典，
与原生 Map 的键类型、原型和迭代行为不同，不能只因输出相似就算等价。

## 5. discriminator：根据数据决定创建哪个子类

例如消息输入：

```ts
{ kind: 'text', content: 'hello' }
{ kind: 'image', url: '/photo.png' }
```

class-transformer 的 discriminator 是“识别 kind 并选择 TextMessage/ImageMessage 的映射表”。

```ts
class Envelope {
  @Type(() => Message, {
    discriminator: {
      property: 'kind',
      subTypes: [
        { name: 'text', value: TextMessage },
        { name: 'image', value: ImageMessage },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  message!: TextMessage | ImageMessage
}
// plainToInstance(Envelope, { message: { kind: 'text', content: 'hello' } })
// message 是 TextMessage 实例；kind 因 keepDiscriminatorProperty 被保留
```

此例假设 Message 是基类，两个子类已定义。ModelBase 可以在 Column 回调中完成同样的选择：

```ts
@Column({
  deserialize: ({ value }) => {
    if (value.kind === 'text') return TextMessage.create(value)
    if (value.kind === 'image') return ImageMessage.create(value)
    throw new Error('Unknown message kind')
  },
  serialize: ({ value }) => value.getSerializableObject(),
})
message!: TextMessage | ImageMessage
```

前提：两个子模型均声明 kind 和各自字段。本例不要同时配置 model，否则会再进入固定子模型创建路径。
数组可以在回调中 map。未知类型行为、标识字段是否保留、父配置如何传到子实例都需调用侧负责。
尤其手动 create 不会自动继承父实例 enableDataState 等选项。这是“间接支持”与内置协议的成本差异。

## 6. groups：两边默认行为不同

class-transformer v0.5.1 中，标有 groups 的字段在不传 groups 时会被过滤；
传多个 groups 时可按交集选择。

ModelBase：

```ts
@Column({ group: ['admin', 'detail'] })
email!: string

user.getSerializableObject() // 包含 email
user.getSerializableObject({ group: 'admin' }) // 包含 email
user.getSerializableObject({ group: 'public' }) // 不包含 email
```

ModelBase 保留未分组字段；同时传 group 和 excludeGroup 时 group 优先。
当前包含组是单个字符串，序列化排除组支持数组，创建时排除组仍是单字符串。
不应将对方 groups 原样改名成 group 后就宣称迁移完成。

## 7. version：同一个模型按 API 版本选择字段

class-transformer：

```ts
@Expose({ since: 2, until: 3 })
newName!: string

instanceToPlain(user, { version: 2 }) // 包含
instanceToPlain(user, { version: 3 }) // 不包含
```

含义是“起点包含、终点不包含”的版本区间。ModelBase 可用 group: 'v2' 和 group: 'v3'
表达有限版本，但每个版本都需要显式列举，不能表达任意数字区间。
优先保留已有分组解决简单版本；有真实区间需求再增加 version/since/until。

## 8. 空值和默认值：上一版结论需要修正

ModelBase 默认清理 undefined 和 null；CLEAN_UNDEFINED 可保留 null，但仍移除 undefined。
现有 CLEAN_ENUM 没有“不清理”模式，因此并不能完全替代 exposeUnsetFields: true。

```ts
const dto = user.getSerializableObject()
Object.prototype.hasOwnProperty.call(dto, 'missing')
// false；与 { missing: undefined } 不同，即便 JSON.stringify 的结果相同
```

Column.default 与 class-transformer 的类字段默认值也不是同一机制。
ModelBase 新式 Column 初始化器会读取 this[property]，不能假设普通字段初始化器就等价 default。
默认对象使用工厂函数；默认值回调、自定义转换的顺序必须纳入迁移测试。

## 9. 循环引用：区分类型循环与数据循环

```ts
@Column({ model: () => User })
parent?: User
```

惰性函数解决“定义 User 时类型是否已加载”，不能处理：

```ts
user.parent = user
```

这个对象图有环，递归序列化需要访问记录。class-transformer 的循环检查由
enableCircularCheck 控制，默认不开启；不能照 README 的概括理解成默认永远安全。
ModelBase 嵌套递归没有统一循环处理，需设计跳过/报错及实例复制时的引用语义。

## 10. 函数名字相同，输入输出未必相同

| 操作 | class-transformer | ModelBase |
|---|---|---|
| 转成 JSON 文本 | serialize(instance) | getSerializableString() 或 JSON.stringify(serialize(instance)) |
| 普通 DTO → 实例 | plainToInstance(Type, dto) | Type.create(dto) |
| JSON 文本 → 实例 | deserialize(Type, json) | Type.create(JSON.parse(json)) |
| 更新已有实例 | plainToClassFromExist | update 支持主键数组合并，且会更新快照，不能等价替换 |
| 克隆实例 | instanceToInstance | DTO 往返会执行转换、丢掉未声明字段、重建默认值和快照 |
| 外部普通类 | 可以传普通构造函数 | 当前标准路径要求 ModelBase 协议 |

保持现有 serialize 返回普通对象，不能为了兼容对方而直接改变其返回类型。
若未来需要兼容导出，放在独立入口并明确边界。NestJS 等框架集成还需要真实集成测试，
仅提供同名函数不会让框架自动改用 ModelBase。

## 验证记录

新增 comparisonSemantics.spec.ts，覆盖：

1. 未声明字段不初始化，手动赋值后仍不序列化；
2. getter/方法回调输出，以及原值 undefined、空字符串清理的限制；
3. type: Number 不强制转换，显式 Number/Date/Set 转换；
4. 默认包含分组字段、指定排除组后保留输入但隐藏输出；
5. null 保留与 undefined 属性键省略的区别。

其他片段是规划示例，未计入“双库执行通过”。下一步应增加独立对照工程，
固定 class-transformer 版本与旧式装饰器配置，避免把它直接混进本仓库的新式装饰器测试配置。

## 演进计划

### P0：把现有行为变成可靠契约

- 先补上述回归及双库 fixture，记录输入、实例类型、属性键是否存在、DTO、JSON、原型及输入是否被修改。
- 覆盖 new/create、父子类元数据隔离、共享默认值、无状态追踪、空数组、null、undefined。
- 核查前面性能优化的兼容性：回调输入深拷贝时机、deserializeArray 接收模型实例、
  惰性 model 工厂每项求值、序列化元数据缓存对继承和动态模型的影响。
- 修复已识别的 service wrapper 传参、callMethod 空子模型、动态列缓存问题，替换 todo 为实际断言。
- 对 __proto__/constructor、原型方法名冲突和回调副作用增加定向边界用例。

验收：声明已支持的能力都有明确结果；不以测试套件“绿色”替代缺口用例。

### P1：完善 Column，实现最常用的间接替代

- 为计算字段明确“先转换后清理”的适用规则，并验证 emptyValue、trim、默认值与快照。
- 设计字段输入/输出方向开关；先约定密码输入、只读计算字段、父子模型过滤的行为。
- 给转换回调提供明确的只读操作上下文，使手动多态/集合转换能传播配置。
- 文档提供可复用 Date、Number、Boolean、Set、Map 转换器，优先复用 Column。

验收：计算字段无需占位值；方向过滤无需每个输出调用者记住 excludeGroup。
保留 noDefault；快照选项使用 enableSnapshot，兼容 enableDataState 别名；不引入 current 或进程级可变配置。

### P2：补齐通用对象图能力

- 统一循环检查与最大深度行为。
- 需求驱动支持多态映射、集合递归、多个包含分组、版本区间。
- 明确保留 undefined 属性键的选项。
- 设计独立实例复制入口，约定快照、原型、共享引用和环是否保留。

验收：通过组合测试，包含“多态数组 + 分组 + 回调 + 空值”和嵌套环。

### P3：迁移与生态适配

- 决定是否支持不继承 ModelBase 的外部类；这涉及转换内核与基类方法的解耦。
- 按真实项目需要提供兼容入口、迁移脚本、框架序列化适配器。
- 补充 targetMaps、ignoreDecorators、前缀过滤及方法装饰器等迁移需求；
  没有真实使用场景时先提供明确的手动替代说明。

验收：迁移样例项目可运行，所有行为差异可追溯，无静默丢失字段。

## 性能评估标准

比较 DTO 转换时两边使用相同字段策略、命名规则和输出结果，ModelBase 关闭 enableDataState；
变更追踪另设业务场景。测量平面 DTO、嵌套树、大数组、Date/集合、回调字段的
new/create/输入/输出分别耗时，预热后多轮取中位数并记录内存。
此前单库 Jest 总耗时受编译缓存和机器负载影响，不能证明比 class-transformer 更快。
