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

## 内容说明

`llms.txt` 是**人工维护**的，覆盖写代码真正要知道的东西：

- 安装与 tsconfig 必配项（`experimentalDecorators` / `emitDecoratorMetadata` / `useDefineForClassFields: false` / `target: es5`）
- Vite 项目的装饰器元数据绕行方案
- `@Column` 全量选项（`primary` / `model` / `childType` / `default` / `emptyValue` / `serialize` / `deserialize` / `group` …）
- `@DataModel` 选项
- 序列化语义：三种 `CLEAN_ENUM` 的差别、`enableEmptyValue` 何时生效、命名策略默认值
- 实例方法 / 静态方法 / 工具函数清单
- 6 条常见坑（含「空字符串会被提交」「嵌套模型不能从 barrel 引入」）

`llms-full.txt` 是**自动生成**的，内容与上面各文档页严格一致，不会出现文档改了而 LLM 版本没跟上的情况。

## 谁来生成

```bash
yarn docs:llms      # 只重新生成 llms-full.txt
yarn build:doc      # 构建文档站（已自动前置 docs:llms）
```

- 手写部分：`docs/.vuepress/public/llms.txt`（改 API 行为时同步改这里）
- 生成脚本：`scripts/gen-llms.mjs`（把 `docs/guide/*.md` 去掉 VuePress 语法后拼接）
- 两份文件都放在 `docs/.vuepress/public/` 下（VuePress 2 的静态资源目录），构建时原样复制到站点根目录，
  所以线上路径就是 `/llms.txt` 和 `/llms-full.txt`
