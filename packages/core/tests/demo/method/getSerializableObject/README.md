---
permalink: /method/getSerializableObject/
---

# getSerializableObject：输出普通 DTO

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

根据字段映射、转换和过滤规则输出当前数据，不重置保存点。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#create -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

返回普通对象，不保证是任意类型都可 JSON.stringify 的纯 JSON。默认清理 undefined 和 null；camelCase 未传时遵守实例/类命名配置。

## 下一步

[继续阅读 →](/method/getCleanSerializableObject/) · [返回按任务检索](/guide/examples/)
