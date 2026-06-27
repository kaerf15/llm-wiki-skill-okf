# Create Guide — 如何新建 OKF 知识库

Skill **仅在用户明确要求创建知识库时**才执行 scaffold。

## 创建前必问（两种入口都一样）

无论是 **README 部署提示词** 还是 **直接调用 llm-wiki skill**，在运行 `scaffold.py` **之前**都必须先确认：

| 项 | 用户已给出 | 必须先问 | 问完仍无答复 |
|----|----------|---------|-------------|
| **知识库文件夹名（KB_DIR）** | 严格用用户名称 | 「知识库文件夹叫什么？默认 **wiki-okf**，用默认请说“默认”。」 | `wiki-okf` |
| **知识库类型（--type）** | 用对应类型 | 「什么类型？research / catalog / operations / general」 | `research` |
| **主题标题** | 用用户标题 | 可简短问或从名称推导 | 从 KB_DIR 推导 |

**禁止**未询问就静默用默认 `wiki-okf` 创建（除非用户在本轮消息里已明确说用默认或已给出名称）。

## 目录结构（与 legacy llm-wiki 一致，只是 `wiki/` 改名）

**workspace = 项目根**。AI 解析后的内容放在 **`<KB_DIR>/`** 子文件夹（默认名 `wiki-okf`，用户可改），内部按 OKF 标准组织。

```text
OKF/                          ← workspace（项目根）
├── raw/ · log/ · audit/
├── AGENTS.md · CLAUDE.md
├── .agents/skills/llm-wiki/
└── <KB_DIR>/                 ← ★ AI 解析内容（默认 wiki-okf）
    ├── index.md
    ├── concepts/ · entities/ · summaries/
    └── log.md
```

## 解析路径（必遵）

```
WORKSPACE = 当前 Cursor 打开的文件夹
KB_DIR    = 创建前向用户确认的名称；默认 wiki-okf

若 basename(WORKSPACE) == KB_DIR:
  PROJECT_ROOT = KNOWLEDGE_ROOT = WORKSPACE
否则:
  PROJECT_ROOT = WORKSPACE
  KNOWLEDGE_ROOT = WORKSPACE / KB_DIR
```

## scaffold 命令

```bash
python3 scripts/scaffold.py ~/Documents/OKF "My Topic" --type research --kb-dir wiki-okf
python3 scripts/scaffold.py ~/Documents/OKF "My Topic" --kb-dir my-wiki
```

## 创建完成后

告诉用户：**左侧应看到 `<KB_DIR>/` 文件夹（内有 index.md、concepts/），同级有 raw/、audit/。**

## 常见错误

| 错误 | 正确 |
|------|------|
| 未问文件夹名直接用 wiki-okf | 先问；用户确认默认再用 wiki-okf |
| 在 OKF/ 根直接建 concepts/ | 建在 OKF/<KB_DIR>/concepts/ |
| 在工具项目仓库 scaffold | 在用户 workspace |
