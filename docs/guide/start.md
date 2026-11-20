---
permalink: /guide/start/
---

# 第 1 步：创建你的第一个模型

目标：把接口返回的 `display_name` 映射为实例属性，再输出可提交的 DTO。

## 安装

```sh
npm install @model-base/core
```

本文对应仓库当前源码。使用 npm 版本时，请对照[更新日志](/guide/changelog/)确认功能是否已发布。

## 选择装饰器配置

仓库使用 TypeScript 5 的新版装饰器（`experimentalDecorators: false`），也保留旧式装饰器兼容。
先沿用项目实际使用的编译模式，不要把两套配置混用。旧式配置示例：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

不需要 `reflect-metadata` 或 `emitDecoratorMetadata`。优先用 `Model.create()`；
字段默认值写在 `@Column({ default: ... })`，避免类字段初始化器覆盖 DTO。
不想使用装饰器时，可以直接学习[动态模型工厂](/guide/dynamic/)。

## 定义模型

下面是后续教程共用的完整模型。第一步只关注 User 的 id、displayName、enabled；Address 和 Item 在嵌套章节展开。

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#models -->
```

## 创建实例并输出 DTO

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#create -->
```

观察三个结果：

1. DTO 的 `display_name` 进入实例的 `displayName`。
2. 未声明的 `ignored` 不进入输出；这是默认行为，`columnsInValue` 是显式例外。
3. 缺失值可以应用默认值。输出的是普通对象，不是 JSON 字符串；需要字符串时显式调用 `JSON.stringify(dto)`。

## 完成检查

你应能回答：实例属性名与 DTO 字段名有什么区别？为什么 `ignored` 没有输出？
先不要把类型注解当作运行时校验；需要转换数值时使用显式回调。

[下一步：核心概念 →](/guide/know/) · [查看完整示例目录](/guide/examples/)
