---
permalink: /guide/nested/
---

# 第 4 步：嵌套模型与集合

目标：让子对象参与模型转换和变更追踪。本章使用[入门模型](/guide/start/)。

## 声明子模型，隔离输入 DTO

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#nested -->
```

`model: Address` 和惰性类型引用 `model: () => Address` 都可声明子模型。
惰性引用有助于模块加载顺序，但不意味着支持带循环引用的业务对象图。

## 数组变化：主键标记在元素上

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#arrays -->
```

`primary` 声明在 Item.id，不是在 User.items 上。它用于元素匹配，不执行唯一性校验。
尽量提供稳定且唯一的主键；复合主键沿用逗号连接规则，不能假设不存在字符串碰撞。

## update 数组不是列表替换

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#arrayUpdate -->
```

重复主键可能匹配多个元素。服务端返回的完整列表若要替换，应明确采用创建/赋值流程，
不要把 update 当作删除未出现元素的同步操作。

## 字典与字典数组

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#records -->
```

## 未声明子模型类型的对象

`@Column() extra: object` 是不透明值，不承诺其内部变化的自动追踪与还原。
普通对象初始化可能保留外部引用，普通数组沿用既有复制规则；不要把所有字段都理解为深克隆。
Date、Map、Set 的内部修改也不在通用深层追踪保证内。

[下一步：动态模型与列缓存 →](/guide/dynamic/)
