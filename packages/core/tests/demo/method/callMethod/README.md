---
permalink: /method/callMethod/
---

# callMethod：显式调用模型方法

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

按名称调用模型方法，并递归处理受支持的子模型对象和数组。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#methods -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

不是自动生命周期钩子；不要假定 methods.onInit 会在构造时自动运行。旧式字符串表达式配置只能来自可信代码，不能接受未校验的外部输入。字典递归能力不要与对象/数组等同。

## 下一步

[继续阅读 →](/guide/reference/) · [返回按任务检索](/guide/examples/)
