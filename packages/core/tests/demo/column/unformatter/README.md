---
permalink: /column/unformatter/
---

# serialize：模型到 DTO 的转换

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

输出接口数据时按业务约定转换字段值。unformatter 是旧兼容名称。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#conversion -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

新代码使用 serialize；回调应考虑空值和重复调用。自定义序列化会参与快照生成，使用即时兼容路径，不应假定回调只在显式提交时执行。

## 下一步

[继续阅读 →](/column/trim/) · [返回按任务检索](/guide/examples/)
