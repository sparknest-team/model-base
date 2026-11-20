---
permalink: /column/type/
---

# 字段类型与运行时转换

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

区分 TypeScript 类型声明、列配置和数据转换，避免误以为声明 number 就会自动校验输入。

## 示例与结果

片段来自自动化测试。使用 User、Address、Item 的片段，请先使用[快速上手中的模型定义](/guide/start/)；其他类在片段内定义。所需 core API 从 `@model-base/core` 导入。

```ts
<!-- @include: ../../learning/journey.spec.ts#conversion -->
```

输出注释由 `learning/journey.spec.ts` 中对应断言验证。各片段独立运行，不依赖上一页的修改状态。

## 使用边界

不读取 reflect-metadata。Number/String/Boolean 不是通用强制转换器；需要转换时使用 deserialize。嵌套类型必须显式设置 model。动态工厂的 type 使用字符串定义，详见动态模型章节。

## 下一步

[继续阅读 →](/column/name/) · [返回按任务检索](/guide/examples/)
