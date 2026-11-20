---
permalink: /guide/service/
---

# 可选进阶：接入 service 请求层

`@model-base/service` 协调参数转换、传输客户端和响应模型，**它不是自带 HTTP 实现的客户端**。
只使用模型转换时，无需接入本包。

## 1. 安装与职责

```sh
npm install @model-base/core @model-base/service
```

`CoreService → Driver.getApi() → 你提供的客户端 → ServiceResponse → 可选 wrapper`

Driver 保存客户端引用与基础地址，但 CoreService 不自动拼接 Driver.url。
适配器必须提供 get/post/put/patch/del 等对应方法；不能把裸 axios 或普通对象直接当成 Driver 传入。

## 2. 最小可运行示例

下面使用模拟客户端，不访问网络。复制到项目后，在 request 中接入你的真实 HTTP 实现和业务返回协议。

```ts
<!-- @include: ../../packages/service/tests/demo/quickstart.spec.ts#setup -->
```

## 3. 发起请求并读取模型

以下代码位于 async 函数内：

```ts
<!-- @include: ../../packages/service/tests/demo/quickstart.spec.ts#request -->
```

`isValid()` 默认判断业务码是否为 `success`，不等价于 HTTP 200。真实接口返回格式不同，应转换响应或提供自己的响应类。

## 4. 根据载荷选择包装器

| 载荷 | 选择 |
|---|---|
| 单个模型 | 请求参数 wrapper: User |
| 模型数组 | ArrayWrapper |
| 按键组织的模型 | RecordWrapper |
| 按键组织的模型数组 | RecordArrayWrapper |
| 流或文件响应 | DataStreamWrapper，先核对传输客户端返回形状 |

Wrapper 是有状态对象。并发请求应使用各自的 wrapper 实例，避免结果互相覆盖。
数组相关泛型存在历史兼容边界，以返回的运行时形状和测试为准，不强行类型断言掩盖问题。

## 5. 错误和钩子

- beforeParse → beforeDeserialize → 创建响应 → afterParse → afterDeserialize。
- 这些是同步转换钩子，返回值交给下一步，不应传入未等待的异步函数。
- 传输与后续转换错误通常记录在 response.serviceError；请求预处理异常仍可能使 Promise 拒绝。
- 因此调用侧既要处理拒绝，也要检查 serviceError 和业务 isValid()。
- serviceError 不是 Column，不会自动进入常规 DTO 输出。
- ModelBase 请求参数默认清理空值；需要明确服务端“清空字段”的协议。

结构和更多回归用例见仓库 `packages/service/ARCHITECTURE.md`、`packages/service/tests/unit`。
这里不增加自动重试、全局客户端或隐式请求行为。

[下一步：API 速查 →](/guide/reference/)
