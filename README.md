---
permalink: /
home: true
heroText: ModelBase
tagline: 把接口数据转换为模型，让字段映射、嵌套数据和编辑状态有章可循。
actions:
  - text: 从这里开始
    link: /guide/roadmap/
    type: primary
  - text: 查看完整示例
    link: /guide/examples/
    type: secondary
features:
  - title: 明确的数据边界
    details: 声明参与转换的字段，处理名称映射、默认值和嵌套模型。
  - title: 可控的编辑状态
    details: 获取变更、保存基准、取消编辑；不需要快照时可按实例关闭。
  - title: 从基础到进阶
    details: 连续教程配合可执行测试，覆盖静态模型、动态定义、Vue 3 和 Node。
---

## ModelBase 是什么？

`@model-base/core` 是 TypeScript 数据模型库：把接口 DTO 转成模型实例，再按字段规则输出 DTO。
它不是 ORM、数据校验器或 HTTP 客户端，也不会自动把修改保存到服务器。

`@model-base/service` 是可选的请求协调层，需要你提供传输适配器；使用 core 不要求安装 service。

## 选择入口

- 第一次使用：[学习路线](/guide/roadmap/) → [快速上手](/guide/start/)。
- 已经有项目：[按任务查示例](/guide/examples/) → [API 速查](/guide/reference/)。
- 编辑表单：[保存与还原](/guide/editing/)。
- 后端批量转换：[Node 与 Vue 3 集成](/guide/integration/)。
- 从旧版升级：[迁移检查清单](/guide/migrate/)。
- 让 AI 快速了解项目：[简明目录](/llms.txt)；需要一次读取完整上下文时用[完整 AI 指南](/llms-full.txt)。

文档跟随仓库当前源码，未发布改动以[更新日志](/guide/changelog/)为准，不代表 npm 已发布版本具有全部功能。

## 在仓库中验证示例

```sh
npm test -- --runInBand --silent
npm test -- packages/core/tests/demo/learning/journey.spec.ts --runInBand
npm run build:doc
```

面向开发者的示例位于 `packages/core/tests/demo`；生产边界回归位于 `packages/core/tests/unit`。
