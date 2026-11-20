---
permalink: /method/saveChangedData/
---

# saveChangedData：确认当前数据为基准

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

提交成功后，在业务允许的时机建立新的本地保存点。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#lifecycle -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

不发送网络请求，也不维护多级撤销栈。update 和默认 setDataByOriginal 已自动保存。保存时的 group/excludeGroup 是筛选基准，不是多个互不干扰的分组快照。关闭快照时调用无效。

## 下一步

[继续阅读 →](/method/revertChangedData/) · [返回按任务检索](/guide/examples/)
