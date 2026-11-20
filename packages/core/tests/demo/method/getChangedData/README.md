---
permalink: /method/getChangedData/
---

# getChangedData：读取相对保存点的变化

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

返回发生变化的字段，输出键使用 DTO 名称；读取不会确认保存。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#lifecycle -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

不是 JSON Patch 协议。删除字段可能表示为 undefined，JSON.stringify 会省略它，需要业务转换成后端认可的清空表示。关闭快照时返回 {}。

## 下一步

[继续阅读 →](/method/getChangedDescriptor/) · [返回按任务检索](/guide/examples/)
