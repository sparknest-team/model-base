---
permalink: /method/isChanged/
---

# isChanged：判断相对保存点是否变化

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

需要控制保存按钮或离开页面提示时，查询受支持字段是否不同于保存点。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#lifecycle -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

它不是只读一个 dirty 布尔值；可能序列化和比较。写回原值可以重新为 false。关闭快照时始终 false，不能据此认为业务数据没改。

## 下一步

[继续阅读 →](/method/getOriginalData/) · [返回按任务检索](/guide/examples/)
