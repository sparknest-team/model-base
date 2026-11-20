---
permalink: /column/default/
---

# default：缺失字段的默认值

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

DTO 字段缺失或为 undefined 时提供初值，不覆盖显式输入。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#defaults -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

对象和数组使用工厂函数。null 不等于缺失；noDefault: true 跳过默认值。普通对象默认值不自动获得深层追踪能力。

## 下一步

[继续阅读 →](/column/autowired/) · [返回按任务检索](/guide/examples/)
