# Create Guide — 如何新建知识库

Skill **仅在用户明确要求创建时**才 scaffold。

## 创建前只问一件事

| 项 | 用户已给出 | 必须先问 | 问完仍无答复 |
|----|----------|---------|-------------|
| **知识库文件夹名（KB_DIR）** | 用用户名称 | 「知识库文件夹叫什么？默认 **wiki**，用默认请说“默认”。」 | **`wiki`** |

**不要**问 research / catalog / operations 等类型。目录结构固定。

主题标题：用户给了就用；否则从 workspace 名推导。

## 目录结构（固定，与原版 wiki 相同）

```text
<workspace>/                 ← 项目根
├── raw/ · log/ · audit/
├── AGENTS.md
├── .agents/skills/llm-wiki/
└── <KB_DIR>/                ← 默认 wiki
    ├── index.md             ← okf_version + name + description
    ├── concepts/
    ├── entities/
    └── summaries/
```

## scaffold

```bash
python3 scripts/scaffold.py ~/Documents/OKF "My Topic" --kb-dir wiki
python3 scripts/scaffold.py ~/Documents/OKF "My Topic" --kb-dir my-wiki
```

## 常见错误

| 错误 | 正确 |
|------|------|
| 问用户选 catalog/research 类型 | 不问了，固定 concepts/entities/summaries |
| concepts/ 建在项目根 | 建在 `<KB_DIR>/concepts/` |
| 未问文件夹名就创建 | 先问 KB_DIR |
