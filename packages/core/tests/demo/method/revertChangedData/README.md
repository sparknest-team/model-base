---
permalink: /method/revertChangedData/
---

# revertChangedData：还原到最近保存点

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

放弃本地编辑，恢复最近一次保存的数据，而不总是恢复最初接口响应。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#nested -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

子模型可能被重新创建，不能依赖还原后仍持有旧子对象引用。快照关闭时不执行还原。静态 ModelBase.revertChangedData 可处理模型、数组或字典，但不是多步 undo/redo。

## 下一步

[继续阅读 →](/method/update/) · [返回按任务检索](/guide/examples/)
