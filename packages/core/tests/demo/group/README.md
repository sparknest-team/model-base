---
permalink: /group/
---

# 按业务场景选择字段

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

让同一个模型支持详情、创建、编辑等不同字段集合。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../learning/journey.spec.ts#groups -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

分组会筛选字段，不进行权限校验。未分组字段保留；同时传入 group 和 excludeGroup 时 group 优先。

## 下一步

[继续阅读 →](/column/group/) · [返回按任务检索](/guide/examples/)
