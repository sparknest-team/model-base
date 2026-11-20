---
permalink: /init/
---

# 创建模型实例

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

把 DTO 转换为模型属性、应用默认值并创建子模型。推荐使用 `Model.create(dto, options)`。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../learning/journey.spec.ts#create -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

`new` 也支持，但类字段初始化顺序取决于编译方式。默认值写在 Column.default；`noDefault`、`enableSnapshot` 等选项只作用于本次创建，不修改全局。

## 下一步

[继续阅读 →](/guide/mapping/) · [返回按任务检索](/guide/examples/)
