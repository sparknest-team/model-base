---
permalink: /guide/dynamic/
---

# 第 5 步：动态模型与列缓存

## 先选择需要的“动态”

| 需求 | 选择 | 列是否随数据变化 |
|---|---|---|
| 编写稳定业务类 | ModelBase + Column | 否 |
| 从配置生成类 | dynamicModelBase(config) | 否，生成后按静态结构缓存 |
| 按当前数据接收字段 | columnsInValue: true | 是 |
| 给已有类追加定义 | ColumnDefine | 注册后使相关缓存失效 |

## 从配置创建模型

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#dynamic -->
```

工厂当前会原地归一化配置；推荐通过函数生成新的配置对象，不传冻结对象。
同一配置中的嵌套 model 可能被替换为模型构造器，但每次创建的子实例独立。
工厂第二参数当前仅消费 methods，实例选项请传给 new 的第二参数。

## columnsInValue 不是只推断一次

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#inferred -->
```

它会读取当前 DTO 或实例的可枚举自有字段；新增、删除字段及值类型变化都会影响推断。
显式 Column 配置优先于推断结果。同一类的两个实例可以有不同字段，不能共享实例推断结果。
这会扩大接收与输出的字段范围，处理不可信 DTO 时应先在业务层筛选。

## 动态注册列

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#registration -->
```

使用公开的 ColumnDefine，不直接操作内部元数据。父类注册会影响继承它的列计划，子类同名定义优先。
注册只更新结构，不确认业务编辑、不广播重置实例快照。已有字段重命名或转换规则改变，不提供历史 DTO 自动迁移。

## 查询列定义

- `getColumns()`：独立配置副本，改它不会真正注册字段。
- `getColumnsCached()`：共享读取入口，不应修改返回结果。
- 普通模型命中缓存；注册后按需检查继承并重建受影响结果。
- `columnsInValue` 和自定义 `getColumns()` 保持实时查询。

[下一步：Node 与 Vue 3 集成 →](/guide/integration/)
