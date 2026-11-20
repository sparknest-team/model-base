---
permalink: /column/foreign/
---

# foreign：旧式关联更新配置

[学习路线](/guide/roadmap/) · [示例索引](/guide/examples/) · [API 速查](/guide/reference/)

## 解决什么问题

foreign 是保留的兼容分支，不是 ORM 外键或关联查询功能。

## 新代码建议

优先阅读[嵌套模型](/guide/nested/)和[主键数组更新](/method/update/)。此页明确标记旧能力，避免把基础初始化示例误当作外键功能演示。

## 使用边界

当前旧分支有特定的参数形状和主键比较约束，不建议新项目把它作为通用关联机制。单个子模型使用 model；数组增量合并使用元素 primary。原目录中的基础初始化测试不构成 foreign 行为保证。

## 下一步

[继续阅读 →](/method/update/) · [返回按任务检索](/guide/examples/)
