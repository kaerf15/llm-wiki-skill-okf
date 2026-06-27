# llm-wiki-skill-okf

**仓库**：https://github.com/kaerf15/llm-wiki-skill-okf

面向 Cursor、Trae、Claude Code 等的 LLM Wiki Skill。标准目录：项目根 + 可改名的 `wiki/` 子文件夹；`index.md` 含 OKF 的 `okf_version` / `name` / `description`。

## 目录结构

```text
OKF/                       ← workspace（项目根）
├── raw/ · log/ · audit/
├── AGENTS.md
├── .agents/skills/llm-wiki/
└── wiki/                    ← 默认名；可改成任意名称
    ├── index.md
    ├── concepts/
    ├── entities/
    └── summaries/
```

## 极简部署

1. 新建空文件夹，用 Cursor 打开。
2. 复制下面「部署提示词」发给 Agent。
3. Agent **只问知识库文件夹叫什么**（默认 `wiki`），然后创建。

## 部署提示词

```text
请在当前 workspace 部署 llm-wiki 知识库。

【创建前必问 — 只问一项】
知识库文件夹名（KB_DIR）：
  问：「知识库文件夹叫什么？默认 wiki，用默认请说“默认”。」
  用户已给出 → 用用户的；用户说“默认”或不再回复 → wiki
  ★ 禁止未询问就静默创建

主题标题：用于 index.md、AGENTS.md（用户没说则从 workspace 名推导）

【路径规则】
- WORKSPACE = 当前 workspace（项目根）
- 若 basename(WORKSPACE) == KB_DIR：PROJECT_ROOT = KNOWLEDGE_ROOT = WORKSPACE
- 否则：PROJECT_ROOT = WORKSPACE，KNOWLEDGE_ROOT = WORKSPACE/KB_DIR
- raw/、log/、audit/、.agents/ → PROJECT_ROOT
- index.md、concepts/、entities/、summaries/ → KNOWLEDGE_ROOT（固定）
- 不要问类型、不要 catalog/operations 等变体
- 若 workspace 含 llm-wiki/、web/、audit-shared/（工具项目）→ 停止

【参数】
- REPO_URL=https://github.com/kaerf15/llm-wiki-skill-okf
- APP_ROOT=~/Library/Application Support/llm-wiki（macOS）
- WIKIS_CONFIG=<APP_ROOT>/wikis.json
- PORT=4875，AUTHOR=lym

【执行】
1. 检查 python3、node 20+、npm、git
2. clone REPO_URL 到临时目录
3. python3 <TEMP>/llm-wiki/scripts/scaffold.py "<PROJECT_ROOT>" "<主题>" --kb-dir <KB_DIR>
4. 复制 skill 到 <PROJECT_ROOT>/.agents/skills/llm-wiki
5. node <TEMP>/web/scripts/deploy.mjs --app-root <APP_ROOT> --wiki "<PROJECT_ROOT>" --author lym
6. 启动 Web，验证 http://127.0.0.1:4875 可打开 index.md
7. 删除临时 clone

【完成后】
- 左侧：`<KB_DIR>/`（concepts/ 等）+ 同级 raw/
- Web 地址
```

## 手动快速开始

```bash
python3 llm-wiki/scripts/scaffold.py ~/Documents/OKF "My Topic" --kb-dir wiki
cp -r llm-wiki-skill-okf/llm-wiki ~/Documents/OKF/.agents/skills/llm-wiki
```

## 作者

lym [973007435@qq.com](mailto:973007435@qq.com) · GitHub: [kaerf15](https://github.com/kaerf15)

## License

MIT
