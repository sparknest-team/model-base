---
permalink: /guide/integration/
---

# 第 6 步：Node 与 Vue 3 集成

## Node：只转换时关闭快照

如果每次请求只是读取 DTO、转换、输出，不需要编辑还原，可按实例关闭：

```ts
<!-- @include: ../../packages/core/tests/demo/learning/journey.spec.ts#node -->
```

User 定义见[快速上手](/guide/start/)。`enableSnapshot: false` 不影响转换，但变更查询和还原失效。
子模型随创建路径继承关闭行为。不要设置影响整个进程的可变全局开关。

## 开启快照时怎样控制内存？

标准模型树初始化不额外构建完整 DTO 快照，但仍会分配模型、Proxy 和保存点元数据。
自定义序列化、访问器和数据驱动列可能采用即时快照。小模型不保证比即时复制更省内存。

- 不在批量初始化后无条件读取全部 `getOriginalData()`，这会物化保存点。
- 不把模型实例或快照长期保存到无界集合。
- 用真实字段数、嵌套深度、修改比例和查询频率测试，不只测试创建速度。
- 仓库运行 `node scripts/benchmark-lazy-snapshot.cjs`，结果解释见 `packages/core/PERFORMANCE.md`；保留堆不等于峰值内存。

## Vue 3：通过 reactive 返回的对象读写

```ts
<!-- @include: ../../packages/core/tests/demo/learning/vue.spec.ts#model -->
```

```ts
<!-- @include: ../../packages/core/tests/demo/learning/vue.spec.ts#editing -->
```

Vue 负责界面响应式，ModelBase 负责业务快照，两者不是同一套状态。
不要通过保留的未包装模型引用赋值来期待 Vue watcher 收到通知。
也不要直接解构响应式对象中的基本值后当作响应式变量；可使用 `toRef/toRefs` 或继续通过对象读写。
组件外创建的 watcher 应主动清理。

## 关闭快照不等于关闭 Vue 响应式

```ts
<!-- @include: ../../packages/core/tests/demo/learning/vue.spec.ts#disabled -->
```

这里只承诺测试覆盖的 Vue 3 路径，不声称兼容所有框架版本、编译组合或任意代理包装。

[继续：可选的 service 请求层 →](/guide/service/) · [API 速查](/guide/reference/)
