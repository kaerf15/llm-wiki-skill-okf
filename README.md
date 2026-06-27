# llm-wiki-skill-okf

**仓库**：https://github.com/kaerf15/llm-wiki-skill-okf

**面向多种 Agent 工具（Cursor、Trae、Claude Code 等）的 LLM Wiki Skill — 符合 [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) 标准。**

## 目录结构（重点）

与 legacy llm-wiki 相同：**`raw/`、`log/`、`audit/` 在项目根；AI 解析内容在子文件夹里。**

原来叫 `wiki/`，默认文件夹名 **`wiki-okf/`**（创建前会问用户是否用默认名），内部按 OKF 标准。

```text
OKF/                       ← workspace（项目根）
├── raw/ · log/ · audit/
├── AGENTS.md
├── .agents/skills/llm-wiki/
└── <KB_DIR>/              ← ★ AI 解析后的知识（默认 wiki-okf）
    ├── index.md
    ├── concepts/ · entities/ · summaries/
    └── log.md
```

## 极简部署

1. 新建空文件夹（如 `~/Documents/OKF`），用 Cursor 打开。
2. 复制下面「部署提示词」发给 Agent。
3. Agent **会先问你知识库文件夹名称**（默认 `wiki-okf`），确认后再创建。

## 部署提示词

```text
请在当前 workspace 部署 llm-wiki OKF 知识库。

【创建前必问 — 未 scaffold 前先向用户确认】
用户本轮消息里已明确给出的项直接用；缺的必须先问，问完仍无答复才用默认。

1. KB_DIR（知识库文件夹名）：
   问：「知识库文件夹叫什么？默认 wiki-okf（替代原 wiki/），用默认请说“默认”。」
   用户已给出名称 → 用用户的；用户说“默认”或未指定且不再回复 → wiki-okf
   ★ 禁止未询问就静默用 wiki-okf

2. KB_TYPE：research / catalog / operations / general
   用户未说 → 先问；仍无 → research

3. 主题标题：用于 index.md、AGENTS.md

【路径规则】
- WORKSPACE = 当前 workspace 绝对路径（项目根）
- 若 basename(WORKSPACE) == KB_DIR：PROJECT_ROOT = KNOWLEDGE_ROOT = WORKSPACE
- 否则：PROJECT_ROOT = WORKSPACE，KNOWLEDGE_ROOT = WORKSPACE/KB_DIR
- raw/、log/、audit/、.agents/ → PROJECT_ROOT
- index.md、concepts/ 等 → KNOWLEDGE_ROOT（OKF 格式）
- 若 workspace 含 llm-wiki/、web/、audit-shared/（工具项目）→ 停止

【参数】
- REPO_URL=https://github.com/kaerf15/llm-wiki-skill-okf
- APP_ROOT=用户级 llm-wiki 目录
- WIKIS_CONFIG=<APP_ROOT>/wikis.json
- PORT=4875，AUTHOR=lym
- skill → <PROJECT_ROOT>/.agents/skills/llm-wiki/

【执行 — 仅在用户确认 KB_DIR 等之后】
1. 检查 python3、node 20+、npm、git
2. clone REPO_URL 到临时目录
3. python3 <TEMP>/llm-wiki/scripts/scaffold.py "<PROJECT_ROOT>" "<主题>" --type <KB_TYPE> --kb-dir <KB_DIR>
4. 复制 skill 到 <PROJECT_ROOT>/.agents/skills/llm-wiki
5. Web：注册 PROJECT_ROOT 到 wikis.json
6. 验证 KNOWLEDGE_ROOT 有 index.md（okf_version）、PROJECT_ROOT 有 raw/ 和 <KB_DIR>/
7. 删除临时 clone

【完成后汇报】
- PROJECT_ROOT、KNOWLEDGE_ROOT（<KB_DIR>/）
- 左侧应看到 <KB_DIR>/ 子文件夹 + 同级 raw/
- Web 地址
```

## 手动快速开始

```bash
python3 llm-wiki/scripts/scaffold.py ~/Documents/OKF "My Topic" --type research --kb-dir wiki-okf
cp -r llm-wiki-skill-okf/llm-wiki ~/Documents/OKF/.agents/skills/llm-wiki
```

## 作者

lym [973007435@qq.com](mailto:973007435@qq.com) · GitHub: [kaerf15](https://github.com/kaerf15)

## License

MIT
