# Create Guide — 如何新建 OKF 知识库

Skill **仅在用户明确要求创建知识库时**才执行 scaffold。

## 知识库目录是什么

**知识库 = 用户用 Cursor 打开的那个 workspace 文件夹本身。**

旧版 Karpathy layout 把 AI 解析后的内容放在 `wiki/` 子目录（`wiki/concepts/`、`wiki/index.md`）。  
OKF 对齐后：**不再有 `wiki/` 这一层**，概念页直接在 bundle 根下（`concepts/`、`entities/`、`summaries/`、`index.md`）。

```text
OKF/                      ← 用户 workspace = BUNDLE_ROOT（名字随意）
├── index.md              ← 原 wiki/index.md 的角色
├── concepts/ · raw/ · audit/
└── .agents/skills/llm-wiki/
```

**禁止**再套一层 `wiki-okf/` 或 `wiki/` 子文件夹。  
**禁止**在工具项目仓库（含 `llm-wiki/`、`web/`、`audit-shared/`）里 scaffold。

## 解析 BUNDLE_ROOT（必遵）

```
WORKSPACE = 当前 Cursor 打开的文件夹绝对路径

若 WORKSPACE 含 llm-wiki/ + web/ + audit-shared/（工具项目）:
  停止 — 请用户另建空文件夹作为 workspace

否则:
  BUNDLE_ROOT = WORKSPACE
  scaffold.py 目标 = BUNDLE_ROOT（即 "." 或 WORKSPACE 绝对路径）
```

| 用户操作 | BUNDLE_ROOT |
|----------|-------------|
| 新建空文件夹 `OKF/`，用 Cursor 打开 | `OKF/` |
| 新建空文件夹 `my-research/`，用 Cursor 打开 | `my-research/` |
| 打开 llm-wiki-skill-okf 工具仓库 | ❌ 不是知识库 |

创建完成后告诉用户：**「知识库就在当前 workspace 根目录，左侧应直接看到 index.md、concepts/、raw/。」**

## 从旧 `wiki/` 迁移

若已有 legacy layout（`wiki/concepts/`、`wiki/index.md`）：

1. 在 `compile` / 迁移时把 `wiki/` 下内容提升到 bundle 根（`concepts/` → `concepts/` 等）
2. 链接从 `wiki/concepts/Foo.md` 改为 `/concepts/Foo.md`
3. 根索引改为 bundle 根的 `index.md`（含 `okf_version: "0.1"`）
4. 删除空的 `wiki/` 目录

Web viewer 与 linter 仍兼容 `wiki/...` 链接，但新内容一律用 OKF 根布局。

## 何时创建

| 用户说 | Agent 做 |
|--------|----------|
| 「部署 llm-wiki」「建知识库」「scaffold」 | `BUNDLE_ROOT = WORKSPACE`，在根目录 scaffold |
| 只问 OKF 是什么 | 不创建 |
| 已在 bundle 里 ingest | 不创建 |

## 创建前：类型与主题

| 项 | 用户说了 | 用户没说 |
|----|--------|--------|
| **类型 `--type`** | 用对应类型 | 先问；仍无 → **`research`** |
| **主题标题** | 用用户给的 | 从 workspace 文件夹名推导 |

文件夹名 = workspace 名，**不需要**再单独问「知识库叫什么」。

| `--type` | 概念目录 |
|----------|----------|
| `research`（默认） | `concepts/` · `entities/` · `summaries/` |
| `catalog` | `datasets/` · `tables/` · `metrics/` |
| `operations` | `playbooks/` · `runbooks/` · `references/` |
| `general` | `topics/` |

## 标准命令

```bash
# workspace = ~/OKF → 直接在 ~/OKF 根 scaffold
python3 scripts/scaffold.py ~/OKF "My Topic" --type research
cp -R <skill-source>/llm-wiki ~/OKF/.agents/skills/llm-wiki
```

## 两个目录，不要混

| | 工具项目 | 知识库 |
|--|----------|--------|
| 示例 | llm-wiki-skill-okf 仓库 | 用户打开的 workspace（如 `~/OKF/`） |
| 含 | `web/`、`llm-wiki/` 源码 | `index.md`、`concepts/`、`raw/` |

## 创建完成后

- 空 `concepts/` 正常，ingest 后才有 `.md`
- 确认 workspace 根有 **`index.md`**（含 `okf_version: "0.1"`）和 **`BUNDLE.md`**

## 常见错误

| 错误 | 正确 |
|------|------|
| 在 `OKF/` 下再建 `wiki-okf/` 子文件夹 | 直接在 `OKF/` 根建 `index.md`、`concepts/` |
| 保留 `wiki/concepts/` 新布局 | OKF 用根级 `concepts/` |
| 在 llm-wiki-skill-okf 项目里 scaffold | 在用户 workspace 根目录 |
