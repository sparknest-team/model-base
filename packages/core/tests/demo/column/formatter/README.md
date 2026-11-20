---
permalink: /column/formatter/
---

# deserialize：DTO 到模型的转换

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

在输入字段进入实例前进行明确的数据转换。formatter 是旧兼容名称。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#conversion -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

新代码使用 deserialize。旧 formatter 与新回调参数结构不同，不只是改名；同时配置时存在旧回调优先的兼容规则。不要把转换当作完整校验。

## 下一步

[继续阅读 →](/column/unformatter/) · [返回按任务检索](/guide/examples/)
