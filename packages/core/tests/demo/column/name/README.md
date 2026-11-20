---
permalink: /column/name/
---

# name：输入与输出字段映射

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

实例属性名与接口字段名不一致时，用 name 指定规范 DTO 名称。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#names -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

默认会处理蛇形/驼峰命名。必须原样保留外部字段名时使用 strictNameCheck。aliasName 只提供额外输入名，不替代规范输出名。

## 下一步

[继续阅读 →](/column/aliasName/) · [返回按任务检索](/guide/examples/)
