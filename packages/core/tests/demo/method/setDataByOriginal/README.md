---
permalink: /method/setDataByOriginal/
---

# setDataByOriginal：按创建规则重填

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

回填数据时选择是否继续保留旧的变更基准。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#refill -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

keepBackUp 默认为 false，重填后保存；true 保留旧保存点。会应用初始化/default 规则，但不是删除对象上所有未提供字段的通用 replace。不要误写为 keepStatus。

## 下一步

[继续阅读 →](/method/extend/) · [返回按任务检索](/guide/examples/)
