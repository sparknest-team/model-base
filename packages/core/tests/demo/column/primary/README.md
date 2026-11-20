---
permalink: /column/primary/
---

# primary：模型数组的匹配标识

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

在子模型字段上声明主键，用于数组增量更新和变更分类。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#arrays -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

主键不是自动生成器，也不是数据库唯一约束。重复主键会影响匹配结果；复合主键沿用逗号连接语义。不要把 primary 声明在父模型的数组字段上。

## 下一步

[继续阅读 →](/method/getChangedDescriptor/) · [返回按任务检索](/guide/examples/)
