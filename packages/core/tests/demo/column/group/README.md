---
permalink: /column/group/
---

# group：按场景筛选字段

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

给字段设置一个或多个组，创建、输出和变更查询时选择需要的内容。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#groups -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

未指定过滤时处理全部字段；指定 group 时保留该组和未分组字段。group 优先于 excludeGroup。新代码应避免用分组保存替代独立的业务保存点。

## 下一步

[继续阅读 →](/method/getSerializableObject/) · [返回按任务检索](/guide/examples/)
