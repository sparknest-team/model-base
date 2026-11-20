---
permalink: /method/getCleanSerializableObject/
---

# getCleanSerializableObject：清理空值后输出

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

需要移除空字符串、空数组和空对象时使用，0 和 false 保留。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#clean -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

清理会影响服务端对“清空”与“未提交”的解释。需要保留 null 时用 getSerializableObject({ clean: CLEAN_ENUM.CLEAN_UNDEFINED })。

## 下一步

[继续阅读 →](/guide/editing/) · [返回按任务检索](/guide/examples/)
