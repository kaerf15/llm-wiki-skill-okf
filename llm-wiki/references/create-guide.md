# Create Guide — 如何新建 OKF 知识库

Skill **仅在用户明确要求创建知识库时**才执行 scaffold。

## 目录结构（与 legacy llm-wiki 一致，只是 `wiki/` 改名）

**workspace = 项目根**。AI 解析后的内容放在 **`wiki-okf/`** 子文件夹（替代原来的 `wiki/`），内部按 OKF 标准组织。

```text
OKF/                          ← workspace（项目根）
├── raw/ · log/ · audit/      ← 原始资料、日志、反馈（与 legacy 相同）
├── AGENTS.md · CLAUDE.md
├── .agents/skills/llm-wiki/
└── wiki-okf/                 ← ★ AI 解析内容（原 wiki/，默认名，用户可改）
    ├── index.md              ← okf_version: "0.1"
    ├── concepts/ · entities/ · summaries/
    └── log.md
```

**禁止**把 `concepts/`、`index.md` 直接散落在 workspace 根（除非 workspace 文件夹本身就叫 `wiki-okf`，见下）。

## 解析路径（必遵）

```
WORKSPACE = 当前 Cursor 打开的文件夹
KB_DIR    = 知识库文件夹名，默认 wiki-okf（用户可指定，替代 legacy 的 wiki/）

若 basename(WORKSPACE) == KB_DIR:
  PROJECT_ROOT = KNOWLEDGE_ROOT = WORKSPACE   # 专用知识库文件夹，无嵌套
否则:
  PROJECT_ROOT = WORKSPACE
  KNOWLEDGE_ROOT = WORKSPACE / KB_DIR
```

| workspace | KB_DIR | 结果 |
|-----------|--------|------|
| `OKF/` | `wiki-okf` | `OKF/raw/` + `OKF/wiki-okf/index.md` |
| `wiki-okf/` | `wiki-okf` | `wiki-okf/raw/` + `wiki-okf/index.md`（无嵌套） |
| `OKF/` | `my-wiki`（用户指定） | `OKF/my-wiki/index.md` |

## scaffold 命令

```bash
python3 scripts/scaffold.py ~/Documents/OKF "My Topic" --type research
python3 scripts/scaffold.py ~/Documents/OKF "My Topic" --kb-dir my-wiki
cp -R <skill-source>/llm-wiki ~/Documents/OKF/.agents/skills/llm-wiki
```

- `scaffold.py` 第一个参数 = **PROJECT_ROOT（workspace）**
- `--kb-dir` 默认 `wiki-okf`
- `lint_wiki.py`、`audit_review.py`、`import_source.py` 也传 **PROJECT_ROOT**

## Web 注册

`wikis.json` 注册 **PROJECT_ROOT**（如 `~/Documents/OKF`），Web 自动解析 `wiki-okf/` 为 OKF 知识根。

## 创建完成后

告诉用户：**左侧应看到 `wiki-okf/` 文件夹（内有 index.md、concepts/），同级有 raw/、audit/。**

## 常见错误

| 错误 | 正确 |
|------|------|
| 在 OKF/ 根直接建 concepts/ | 建在 OKF/wiki-okf/concepts/ |
| 只有 wiki-okf/ 没有 raw/ 在项目根 | raw/、audit/ 与 wiki-okf/ 同级 |
| 在工具项目仓库 scaffold | 在用户 workspace |
