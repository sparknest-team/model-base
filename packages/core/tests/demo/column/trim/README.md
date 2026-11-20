---
permalink: /column/trim/
---

# trim：输出时去除首尾空格

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

对启用 trim 的字段，在输出调用开启 trim 时清理字符串。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#trim -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

清理是输出规则，不会把实例原值直接改掉。并非所有字符串都无条件 trim；保留未标记字段原样。

## 下一步

[继续阅读 →](/column/group/) · [返回按任务检索](/guide/examples/)
