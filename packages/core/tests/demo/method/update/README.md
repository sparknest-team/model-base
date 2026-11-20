---
permalink: /method/update/
---

# update：接收增量 DTO 并保存

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

更新 DTO 中已提供且非 undefined 的字段，保留其他字段，完成后自动建立新保存点。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#update -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

不要把 update 用作待提交的用户编辑。数组按子模型主键合并，未出现的旧项保留，显式 [] 清空；见嵌套教程。不能笼统保证 update 比重新创建更快。

## 下一步

[继续阅读 →](/method/setDataByOriginal/) · [返回按任务检索](/guide/examples/)
