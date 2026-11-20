---
permalink: /method/isContainsModel/
---

# isContainsModel：兼容的包含关系比较

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

逐字段判断目标数据是否满足当前模型的旧式比较规则。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#comparison -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

目标字段为 undefined 的分支具有特殊包含语义。不要将其作为通用子集算法、权限判断或结构校验；命名与嵌套对象也存在兼容边界。

## 下一步

[继续阅读 →](/guide/reference/) · [返回按任务检索](/guide/examples/)
