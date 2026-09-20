---
permalink: /group/
---

# 按场景选择字段

字段分组适合让同一个模型服务于不同的数据提交场景，例如“创建”“编辑”和“详情”。
通过 `@Column({ group })` 声明字段所属分组，再在初始化、序列化或变更检测时传入 `group`。

```ts
class User extends ModelBase {
  @Column()
  id?: number

  @Column({ group: ['create', 'edit'] })
  displayName?: string

  @Column({ group: 'create' })
  initialPassword?: string
}
```

## 选择规则

- 未指定 `group` 时处理全部字段。
- 指定 `group` 时保留未分组字段，以及属于该分组的字段。
- `excludeGroup` 用于排除一个或多个分组。
- 同时传入 `group` 和 `excludeGroup` 时，`group` 优先。

完整配置和可运行示例请参阅[字段分组](/column/group/)。
