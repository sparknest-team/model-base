---
permalink: /method/getColumnData/
---

# getColumnData：按实例属性名读取

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

在配置驱动的界面中，根据字符串属性名读取当前值。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#access -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

不使用 DTO 字段名，不执行反序列化、不注册字段。字段名已知时直接访问 user.displayName 更清楚。

## 下一步

[继续阅读 →](/method/setColumnData/) · [返回按任务检索](/guide/examples/)
