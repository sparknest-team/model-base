---
permalink: /guide/llm/
title: LLM 文档
---

# LLM 文档（llms.txt）

本站提供两份给大模型（LLM / AI 编码助手）直接读的纯文本文档，遵循 [llmstxt.org](https://llmstxt.org) 约定：

| 文件 | 地址 | 内容 | 适合 |
|---|---|---|---|
| `llms.txt` | [https://modelbase.wiki/llms.txt](https://modelbase.wiki/llms.txt) | 精炼版：一句话简介 + 文档索引 + 安装/必配项 + 装饰器选项表 + 方法表 + 常见坑 | 放进上下文预算有限时首选 |
| `llms-full.txt` | [https://modelbase.wiki/llms-full.txt](https://modelbase.wiki/llms-full.txt) | 本站全部文档页的纯文本合并版 | 需要完整细节 / 让 AI 通读全部文档 |

## 怎么用

**① 让 AI 自己去读**（推荐，支持联网的助手）：

```text
请先读 https://modelbase.wiki/llms.txt ，再按它的约定帮我写代码。
需求：把 UserForm 里的布尔字段 isActive 改成和后端一致的 0/1 提交。
```

**② 贴给不联网的 AI**：

```bash
curl -s https://modelbase.wiki/llms.txt            # 约 10 KB
curl -s https://modelbase.wiki/llms-full.txt       # 全量文档
```

**③ Cursor / Copilot / Claude Code 这类工具**：把上述 URL 写进项目规则文件（`.cursor/rules`、
`CLAUDE.md`、`AGENTS.md`），例如：

```markdown
## ModelBase
使用 @model-base/core 前先读 https://modelbase.wiki/llms.txt
```

## 内容与生成方式

精简版列出主题入口。完整版合并 AI 开发指南、各指南页及其引用的示例代码，包含版本变更和迁移说明。

运行 `yarn docs:llms` 可重新生成完整版。`yarn build:doc` 在构建站点前执行相同的生成步骤。
