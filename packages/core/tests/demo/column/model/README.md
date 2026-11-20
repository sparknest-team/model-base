---
permalink: /column/model/
---

# model：声明嵌套模型

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

将对象或数组递归创建为子模型，并让受支持的子字段参与变更追踪。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#nested -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

可传类或 () => 类。惰性类型引用不是循环对象图支持。未声明 model/childType 的对象是普通数据，不保证其内部变更能自动检测与还原。

## 下一步

[继续阅读 →](/guide/nested/) · [返回按任务检索](/guide/examples/)
