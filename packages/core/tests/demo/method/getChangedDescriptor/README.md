---
permalink: /method/getChangedDescriptor/
---

# getChangedDescriptor：字段与数组变化说明

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

描述字段的 CREATE、UPDATE、DELETE，以及有主键模型数组的元素分类。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#arrays -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

字段结果使用实例属性名作 key，dataKey 是 DTO 名称。primaryChangeDescriptor 包含 create/delete/update/noChange；未变化的数组也可能有 noChange，不能只凭结果非空判断模型变更。

## 下一步

[继续阅读 →](/method/isChanged/) · [返回按任务检索](/guide/examples/)
