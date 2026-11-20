# Service 内部结构与兼容约定

本轮只调整职责边界，不增加依赖、全局配置或公开策略接口。

## 职责

- `CoreService.ts`：公开请求方法、可替换 driver/响应类型、请求流程和异常边界。
- `service.types.ts`：请求参数与响应推导类型；通过原 `CoreService.ts` 和包入口重新导出。
- `_internal/requestPipeline.ts`：wrapper 参数准备、模型参数序列化、前后钩子、错误响应。
- `response/ServiceResponse.ts`：响应模型字段、静态工厂和可覆盖的 parseData。
- `response/*Wrapper.ts`：单一形状的响应转换；wrapper.data 的身份和更新方式保持原样。
- `_internal/wrapperSupport.ts`：跨副本 marker 判断及历史字典键转换规则。
- `_internal/streamResponse.ts`：二进制转换和同步 JSON 解析。
- `api/`：传输接口与适配器引用；不负责网络实现或自动拼接 URL。

内部辅助函数不从包入口导出。原来的直接文件导入路径继续有效。
没有引入额外继承层或通用策略注册表；小型 wrapper 保持独立，避免改变继承关系。

## 不可随结构重构改变的行为

1. get/post/del/put/patch 复制参数并调用可覆盖的 request；直接 request 会写回 wrapper 处理后的 params。
2. wrapper.processParams 在请求 try/catch 之外执行；其错误拒绝 Promise，而非生成 service_error。
3. beforeParse → beforeDeserialize → 响应工厂 → afterParse → afterDeserialize。
   前置钩子的 this 是请求选项，后置钩子以 null 为 this 调用；钩子保持同步语义。
4. transport 方法保留 API 对象作为 this；响应工厂保留响应类作为 this。
5. truthy result_code 错误生成业务响应；其余错误附到 serviceError 并记录日志。
   不在本轮改变 null/undefined 抛出值的旧处理边界。
6. ServiceResponse.create(dto, wrapper) 与 new ServiceResponse(dto, options, wrapper) 签名不同。
7. camelCaseKey=true 历史上保留原键，false/省略才转驼峰。本轮不纠正名称含义。
8. DataStreamWrapper() 和 DataStreamWrapper({}) 的默认值不同，旧 dataType 分支继续保留。
   objectURL 仍依赖浏览器 window.URL；JSON 仍同步解析，不增加异步 Blob.text()。
9. 数据流 JSON 判断使用原有大小写敏感 header 规则，未顺手更改异常或缺失 header 的行为。

## 验证

`serviceCompatibility.spec.ts` 固定流程、this、引用、继承、空值和流转换行为；
`publicSurface.spec.ts` 验证导出集合、直接类型导入及 request 覆盖能力；
原有 service 测试覆盖五种请求方法、四种响应包装、正常与异常请求。

运行：`yarn test packages/service/tests --runInBand`，再运行全仓回归。
兼容测试覆盖约定内行为，并不代表任意外部自定义实现都已验证。

本轮新增 26 个用例：service 51 个测试、全仓 91 个套件/301 个测试通过，
保留 2 个既有 TODO。service 构建与编译产物请求/数组包装检查通过。
全仓类型检查仍有既有文档诊断，packages 无诊断。
