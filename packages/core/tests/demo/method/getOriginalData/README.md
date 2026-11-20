---
permalink: /method/getOriginalData/
---

# getOriginalData：读取保存点 DTO

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

取得创建、显式保存或自动回填保存时的数据基准，不是未经转换的原始接口响应。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#registration -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

返回同一份可变 DTO；修改它会影响比较和还原，不要把它当作只读日志仓库或每次新复制的对象。延迟快照在读取时可能物化。关闭快照返回 {}。

## 下一步

[继续阅读 →](/method/saveChangedData/) · [返回按任务检索](/guide/examples/)
