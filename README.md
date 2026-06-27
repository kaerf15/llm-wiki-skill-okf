# llm-wiki-skill-okf

**仓库**：https://github.com/kaerf15/llm-wiki-skill-okf

**面向多种 Agent 工具（Cursor、Trae、Claude Code 等）的 LLM Wiki Skill — 符合 [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) 标准。**

## 目录结构（重点）

与 legacy llm-wiki 相同：**`raw/`、`log/`、`audit/` 在项目根；AI 解析内容在子文件夹里。**

原来叫 `wiki/`，现在默认改名为 **`wiki-okf/`**，内部按 OKF 标准（`index.md` 含 `okf_version`，`concepts/` 等）。

```text
OKF/                       ← workspace（项目根）
├── raw/ · log/ · audit/
├── AGENTS.md
├── .agents/skills/llm-wiki/
└── wiki-okf/              ← ★ AI 解析后的知识（原 wiki/）
    ├── index.md
    ├── concepts/ · entities/ · summaries/
    └── log.md
```

## 极简部署

1. 新建空文件夹（如 `~/Documents/OKF`），用 Cursor 打开。
2. 复制下面「部署提示词」发给 Agent。
3. 完成后左侧应看到 **`wiki-okf/`** 子文件夹（内有 index.md、concepts/），以及同级的 **raw/**。

## 部署提示词

```text
请在当前 workspace 部署 llm-wiki OKF 知识库。

【路径规则 — 必须遵守】
- WORKSPACE = 当前 workspace 绝对路径（项目根）
- KB_DIR = 知识库文件夹名，默认 wiki-okf（替代 legacy 的 wiki/）
- 若 basename(WORKSPACE) == KB_DIR：PROJECT_ROOT = KNOWLEDGE_ROOT = WORKSPACE
- 否则：PROJECT_ROOT = WORKSPACE，KNOWLEDGE_ROOT = WORKSPACE/KB_DIR
- raw/、log/、audit/、.agents/ 建在 PROJECT_ROOT
- index.md、concepts/、entities/、summaries/ 建在 KNOWLEDGE_ROOT（OKF 格式）
- 禁止把 concepts/、index.md 直接散落在 PROJECT_ROOT（除非 workspace 本身就叫 KB_DIR）
- 若 workspace 含 llm-wiki/、web/、audit-shared/（工具项目）→ 停止

【创建前确认】
- KB_DIR：默认 wiki-okf，用户指定则用用户的
- KB_TYPE：research / catalog / operations / general，默认 research
- 主题标题：用于 index.md、AGENTS.md

【参数】
- REPO_URL=https://github.com/kaerf15/llm-wiki-skill-okf
- APP_ROOT=用户级 llm-wiki 目录
- WIKIS_CONFIG=<APP_ROOT>/wikis.json
- PORT=4875，AUTHOR=lym
- skill 安装到 <PROJECT_ROOT>/.agents/skills/llm-wiki/

【执行】
1. 检查 python3、node 20+、npm、git
2. clone REPO_URL 到临时目录
3. python3 <TEMP>/llm-wiki/scripts/scaffold.py "<PROJECT_ROOT>" "<主题>" --type <KB_TYPE> --kb-dir <KB_DIR>
4. 复制 skill 到 <PROJECT_ROOT>/.agents/skills/llm-wiki
5. Web：注册 PROJECT_ROOT 到 wikis.json（Web 自动识别 KB_DIR 子文件夹）
6. 验证 KNOWLEDGE_ROOT 有 index.md（okf_version）、PROJECT_ROOT 有 raw/ 和 wiki-okf/
7. 删除临时 clone

【完成后汇报】
- 项目根 PROJECT_ROOT
- 知识文件夹 KNOWLEDGE_ROOT（默认 wiki-okf/）
- 左侧应看到 wiki-okf/ 子文件夹 + 同级 raw/
- Web 地址
```

## 手动快速开始

```bash
python3 llm-wiki/scripts/scaffold.py ~/Documents/OKF "My Topic" --type research
cp -r llm-wiki-skill-okf/llm-wiki ~/Documents/OKF/.agents/skills/llm-wiki
python3 llm-wiki/scripts/lint_wiki.py ~/Documents/OKF
```

## 作者

lym [973007435@qq.com](mailto:973007435@qq.com) · GitHub: [kaerf15](https://github.com/kaerf15)

## License

MIT
