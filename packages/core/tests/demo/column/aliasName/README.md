---
permalink: /column/aliasName/
---

# aliasName：兼容额外输入名

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

同一个业务字段需要接收接口的另一个名称时使用 aliasName。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#names -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

不要把 aliasName 理解成输出重命名。严格别名使用 strictAliasNameCheck；多个名称同时出现时，应通过业务测试确认选择顺序，不依赖模糊输入。

## 下一步

[继续阅读 →](/column/default/) · [返回按任务检索](/guide/examples/)
