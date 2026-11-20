---
permalink: /method/extend/
---

# mergeModel：合并模型属性

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

用来源模型中不为 undefined 的已声明属性覆盖当前值，保留当前保存点。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#merge -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

来源实例的默认值也是实际值，可能被一并合并；补丁模型通常应 noDefault: true。extend/extendModel 是旧兼容方法，不推荐新代码使用；mergeModel 不是通用的递归 JSON merge patch。

## 下一步

[继续阅读 →](/guide/dynamic/) · [返回按任务检索](/guide/examples/)
