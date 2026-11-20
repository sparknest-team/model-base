---
permalink: /column/autowired/
---

# autowired：创建空子模型

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

当单个子模型没有输入值时，自动创建子模型实例。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#autowired -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

必须声明 model。不根据 TypeScript 的数组注解推断结构；数组使用 default: () => []，不要用 autowired 表示创建空数组。noDefault 会跳过自动初始化。

## 下一步

[继续阅读 →](/column/model/) · [返回按任务检索](/guide/examples/)
