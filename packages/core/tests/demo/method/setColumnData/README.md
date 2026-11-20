---
permalink: /method/setColumnData/
---

# setColumnData：按实例属性名赋值

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

根据字符串属性名赋值，保持当前实例引用并支持链式调用。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#access -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

等价于实例属性赋值，不校验字段、不注册 Column。静态模型里未声明的属性不会因本方法而自动参与输出。columnsInValue 是例外。

## 下一步

[继续阅读 →](/guide/dynamic/) · [返回按任务检索](/guide/examples/)
