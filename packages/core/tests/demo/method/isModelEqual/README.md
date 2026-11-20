---
permalink: /method/isModelEqual/
---

# isModelEqual：兼容的字段比较方法

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

保留现有字段比较行为，适合已经验证命名和数据形状的旧业务。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#comparison -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

内部按列的序列化名称访问值，不等于任意两个模型的深相等，也不是 isChanged 的替代品。涉及驼峰、name、嵌套对象时，先统一 DTO 并明确业务比较规则。

## 下一步

[继续阅读 →](/method/isContainsModel/) · [返回按任务检索](/guide/examples/)
