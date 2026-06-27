# llm-wiki-skill-okf

**仓库**：https://github.com/kaerf15/llm-wiki-skill-okf

**面向多种 Agent 工具（Cursor、Trae、Claude Code 等）的 LLM Wiki Skill — 符合 [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) 标准。**

它把资料先沉淀成一个长期维护的 OKF Markdown 知识库（Knowledge Bundle），再让 Agent 持续执行 `compile`、`ingest`、`query`、`lint`、`audit`。这不是传统 RAG 每次重新检索原文，而是让 LLM 把原始资料编译成可交叉链接、可审计、可迭代的概念文档集合。

本项目基于 [lewislulu/llm-wiki-skill](https://github.com/lewislulu/llm-wiki-skill) 改造，对齐 Google Cloud [Knowledge Catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog) 的 OKF 规范，同时保留 Karpathy llm-wiki 的五类操作与 audit 反馈闭环。

灵感来自 [Andrej Karpathy 的 llm-wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)。

## 这个项目解决什么

你负责提供资料、选择知识库类型、提出问题、指出 AI 写错的地方。Agent 负责读资料、写 OKF 概念页、维护链接、更新索引、处理反馈。

项目里只有**工具代码**，不含知识库内容：

- `llm-wiki/`：Agent skill 源码，定义 OKF bundle 结构和五类操作。
- `audit-shared/`：审计 schema 与 OKF bundle 常量（web 使用）。
- `web/`：本地预览服务。

**知识库（OKF bundle）是独立文件夹**，由 skill 在用户指定路径创建（默认名 `wiki-okf`），例如 `~/Documents/wiki-okf/`。**不要**放在本仓库里，也**不要**把本仓库根目录当知识库。

```text
llm-wiki-skill-okf/     ← 本项目（仅工具代码）
├── llm-wiki/
├── audit-shared/
└── web/

~/Documents/wiki-okf/   ← 知识库（skill 创建，用户 workspace）
├── index.md
├── concepts/ · raw/ · audit/
└── .agents/skills/llm-wiki/
```

## OKF 与创建规则

知识库由 **skill 在用户指定路径创建**，不在本工具项目仓库内。

**Agent 仅在用户要求创建时才 scaffold。** 创建前先确认：

| 项 | 用户说了 | 用户没说 |
|----|--------|--------|
| **文件夹名称** | **用用户给的名称** | 先问；仍无 → 默认 `wiki-okf` |
| **知识库类型** | 用对应类型建目录结构 | 先问；仍无 → 默认 `research` |

类型与目录：

| 类型 | 适用场景 | 概念目录 |
|------|----------|----------|
| `research`（**默认**） | 论文、文章、通用研究 | `concepts/` · `entities/` · `summaries/` |
| `catalog` | 数据资产、表、指标 | `datasets/` · `tables/` · `metrics/` |
| `operations` | 运维手册、SOP | `playbooks/` · `runbooks/` · `references/` |
| `general` | 最小 starter | `topics/` |

```bash
# 名称 my-ai-wiki，类型默认 research
python3 llm-wiki/scripts/scaffold.py ~/Documents/my-ai-wiki "My AI Wiki" --type research

# 用户指定名称 sales-catalog、类型 catalog
python3 llm-wiki/scripts/scaffold.py ~/Documents/sales-catalog "Sales Catalog" --type catalog
```

详见 skill 内 `references/create-guide.md`。

## 极简部署流程

1. 安装前置依赖：Python 3、Node.js 20+、Git。
2. 创建一个普通文件夹作为 bundle 根目录（推荐 `wiki-okf`）。
3. 用 Cursor / Trae 等 Agent 工具打开该文件夹。
4. 把下面「一键部署提示词」发给 Agent。
5. Agent 会自动下载本项目、初始化 OKF bundle、安装 skill；Web viewer 若本机尚未部署才安装，已部署则只注册当前 bundle。

## 推荐安装位置

工具代码不要放进知识库里。

```text
工具代码:
macOS:   ~/Library/Application Support/llm-wiki/
Windows: %LOCALAPPDATA%\llm-wiki\

知识库 (OKF bundle):
任意目录，例如 ~/Documents/wiki-okf/
```

## 前置依赖

- Python 3：`scaffold.py`、`lint_wiki.py`、`audit_review.py`、`import_source.py`
- Node.js 20+：`web/` 构建与运行
- Git：从 GitHub 下载本项目
- MarkItDown（可选）：导入 PDF、Office、HTML

```bash
python3 --version
node -v
npm -v
git --version
```

## 一键部署提示词

先用 Agent **打开空的知识库文件夹**（或即将创建的 `wiki-okf` 路径）作为 workspace，再复制下面整段提示词。

若当前 workspace 是 `llm-wiki-skill-okf` **工具项目本身**，不要在本仓库内 scaffold — 先问用户知识库要建在哪，再让用户打开那个文件夹重试。

```text
请在当前 workspace 部署 llm-wiki 知识库。

请严格按下面要求执行：
- 仅当用户明确要求创建/部署时才 scaffold；用户没要求不要建。
- 创建前先确认（用户已给的直接用，缺的先问，仍缺则用默认）：
  · 知识库文件夹名称 — 用户指定则用该名称；未指定则问；默认 wiki-okf
  · 知识库类型 research/catalog/operations/general — 用户指定则按类型建目录；未指定则问；默认 research
- 当前 workspace 就是 BUNDLE_ROOT（独立知识库文件夹，不是 llm-wiki-skill-okf 工具项目）。
- 若 workspace 里已有 llm-wiki/、web/、audit-shared/，说明开错目录 — 停止并提示用户。
- 不要把 web/、audit-shared/ 复制到 BUNDLE_ROOT。
- 需要把 llm-wiki skill 安装到：<BUNDLE_ROOT>/.agents/skills/llm-wiki/
- 从 GitHub 下载：https://github.com/kaerf15/llm-wiki-skill-okf
- clone 只作临时安装源，部署完成后必须删除。
- 运行组件在用户级 APP_ROOT（Web 是全局共享，多个 bundle 共用同一个 viewer）。
- Web 端口：4875
- 作者：lym

参数：
- REPO_URL=https://github.com/kaerf15/llm-wiki-skill-okf
- BUNDLE_ROOT=当前 workspace 根目录
- APP_ROOT=用户级应用目录下的 llm-wiki
- WIKIS_CONFIG=<APP_ROOT>/wikis.json
- TEMP_CLONE=系统临时目录下的 llm-wiki-skill-okf clone
- PORT=4875
- AUTHOR=lym
- KB_TYPE=research（或用户指定的类型）

部署原则（重要）：
- Web viewer 是用户级全局服务，多个 bundle 共用；不要每次部署都重装 Web。
- 若检测到 Web 已部署且可用，跳过 Web 迁移/构建/自启动，只做 bundle 侧工作。
- 每个 BUNDLE_ROOT 仍需安装/更新 skill，并把路径注册进 wikis.json。

目标：
1. 检查前置依赖：python3、node 20+、npm、git。缺失则停止并说明。
2. 确认 BUNDLE_ROOT 是真实目录；确定 APP_ROOT 与 WIKIS_CONFIG。
3. clone REPO_URL 到 TEMP_CLONE（不要 clone 到 BUNDLE_ROOT）。
4. 若 BUNDLE_ROOT 尚无 OKF 结构，运行：
   python3 <TEMP_CLONE>/llm-wiki/scripts/scaffold.py "<BUNDLE_ROOT>" "My Knowledge Base" --type <KB_TYPE>
5. 安装/更新 skill（每次部署都要做）：
   - 创建 <BUNDLE_ROOT>/.agents/skills
   - 复制 <TEMP_CLONE>/llm-wiki 到 <BUNDLE_ROOT>/.agents/skills/llm-wiki
   - 若已存在则先删旧版再复制最新版
6. 检测 Web 是否已部署：
   - 若已部署：跳过 Web 安装，仅注册 BUNDLE_ROOT 到 wikis.json
   - 若未部署：完整安装 Web 到 APP_ROOT
7. 构建 audit-shared 与 web（仅 Web 未部署时）
8. 注册当前 bundle 到 wikis.json
9. 安装 MarkItDown（若尚未安装）
10. 验证：
    - http://127.0.0.1:4875 可访问
    - /api/config 的 wikis 列表包含当前 BUNDLE_ROOT
    - <BUNDLE_ROOT>/index.md 存在且含 okf_version: "0.1"
    - <BUNDLE_ROOT>/.agents/skills/llm-wiki/SKILL.md 存在
11. 验证通过后删除 TEMP_CLONE。
12. 汇报：Web 是否跳过重装、Web 地址、BUNDLE_ROOT 绝对路径、KB 类型、skill 路径、是否已注册。
```

## 手动快速开始

```bash
python3 llm-wiki/scripts/scaffold.py ~/wiki-okf "My Research Topic" --type research
cp -r llm-wiki ~/wiki-okf/.agents/skills/llm-wiki
```

导入非 Markdown 资料：

```bash
python3 -m pip install --user 'markitdown[all]'
python3 llm-wiki/scripts/import_source.py my-paper.pdf ~/wiki-okf --kind papers
```

告诉 Agent：

```text
使用 llm-wiki skill，ingest raw/papers/my-paper.md
```

健康检查：

```bash
python3 llm-wiki/scripts/lint_wiki.py ~/wiki-okf
python3 llm-wiki/scripts/audit_review.py ~/wiki-okf --open
```

## OKF 链接格式

概念页使用 OKF 推荐的 bundle 根相对绝对路径：

```markdown
[Transformers](/concepts/Transformers.md)
[品牌侦察赢对手](/summaries/品牌侦察赢对手.md)
[Andrej Karpathy](/entities/Andrej%20Karpathy.md)
```

每个概念页**必须**有 frontmatter `type:`。推荐同时设置 `title`、`description`、`tags`、`timestamp`。

Web viewer 负责阅读体验：只显示链接文字、SPA 内导航、反向链接、知识图谱、死链高亮。兼容旧版 `wiki/...` 路径。

## Web Viewer

默认地址：`http://127.0.0.1:4875`

支持**多个 bundle**：路径写在 `wikis.json`，顶栏下拉框切换。

示例见 `web/wikis.example.json`：

```json
{
  "defaultWikiId": "wiki-okf",
  "wikis": [
    { "id": "wiki-okf", "name": "AI Research", "path": "/Users/you/wikis/wiki-okf" },
    { "id": "sales-catalog", "name": "Sales Catalog", "path": "/Users/you/wikis/sales-catalog" }
  ]
}
```

URL 深链：`http://127.0.0.1:4875/?wiki=wiki-okf&page=index.md`

## 目录结构

**工具项目**（本仓库）：

```text
llm-wiki-skill-okf/
├── llm-wiki/           # Agent skill 源码
├── audit-shared/
└── web/
```

**知识库**（skill 在用户指定路径创建，不在本仓库内）：

```text
<bundle-root>/         # 例如 ~/Documents/wiki-okf
├── index.md           # okf_version: "0.1"
├── log.md
├── AGENTS.md · CLAUDE.md
├── .agents/skills/llm-wiki/
├── concepts/ · entities/ · summaries/
├── raw/ · audit/ · log/ · outputs/
```

## 使用场景

- 研究一个主题，持续吸收论文、文章、网页（OKF research 类型）
- 为数据资产建立可共享的 catalog bundle（OKF catalog 类型）
- 维护运维手册与 SOP（OKF operations 类型）
- 用 audit 长期记录「AI 哪里写错了」
- 导出 OKF bundle 供 Google Cloud Knowledge Catalog 或其他 OKF 消费者 ingest

## 作者

lym [973007435@qq.com](mailto:973007435@qq.com) · GitHub: [kaerf15](https://github.com/kaerf15)

## License

MIT
