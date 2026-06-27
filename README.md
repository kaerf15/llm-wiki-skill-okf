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
~/Documents/              ← 可选：父目录 / workspace
└── wiki-okf/               ← ★ 知识库目录（BUNDLE_ROOT）
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

## 第一次创建（必读）

### 知识库目录在哪

**知识库 = 名为 `wiki-okf` 的子文件夹**（名称可自定义，默认 `wiki-okf`）。

你打开 `OKF/` 作 workspace 时，Agent 应在里面创建 **`OKF/wiki-okf/`**，而不是在 `OKF/` 根下直接堆 `concepts/`、`raw/`。

```text
OKF/                       ← workspace（容器，名字随意）
└── wiki-okf/               ← ★ 知识库目录（你要找的就是这个）
    ├── BUNDLE.md
    ├── index.md
    ├── concepts/
    ├── raw/
    └── .agents/skills/llm-wiki/
```

只有当你 **直接打开** 名为 `wiki-okf` 的空文件夹时，知识库才在 workspace 根（没有多一层子目录）。

### 3 步

1. 新建并打开一个空文件夹（如 `~/Documents/OKF`，名字随意）
2. 复制下面「第一次创建提示词」发给 Agent
3. 完成后在左侧点开 **`wiki-okf`** 子文件夹 — 那才是知识库

### 第一次创建提示词

```text
请帮我第一次创建 llm-wiki OKF 知识库。

【BUNDLE_ROOT 规则 — 必须遵守】
- KB_NAME = 我指定的文件夹名；未指定则问；仍无则默认 wiki-okf
- WORKSPACE = 当前 Cursor 打开的文件夹
- 若 basename(WORKSPACE) != KB_NAME：
    BUNDLE_ROOT = WORKSPACE/KB_NAME   （mkdir 后 scaffold 到子文件夹）
    禁止在 WORKSPACE 根直接创建 concepts/、raw/、index.md
- 若 basename(WORKSPACE) == KB_NAME 且为空：
    BUNDLE_ROOT = WORKSPACE

【类型】未指定则问，仍无则 research

【执行】
1. 从 https://github.com/kaerf15/llm-wiki-skill-okf 临时 clone
2. python3 <TEMP>/llm-wiki/scripts/scaffold.py "<BUNDLE_ROOT>" "<主题>" --type <KB_TYPE>
3. 安装 skill 到 <BUNDLE_ROOT>/.agents/skills/llm-wiki/
4. 按需注册 Web（4875）

【完成后必须汇报】
- 知识库目录绝对路径（必须是 …/wiki-okf/ 这类具名子文件夹，除非 workspace 本身就叫 wiki-okf）
- 让我在左侧点开 KB_NAME 文件夹，里面应有 index.md、concepts/、raw/
```

### 建错了怎么办

若在 `OKF/` 根看到 `concepts/`、`index.md`（没有 `wiki-okf/` 子文件夹）→ **建错了**。删除 `OKF/` 下这些内容，重新跑上面提示词，或手动：

```bash
mkdir -p ~/OKF/wiki-okf
python3 …/scaffold.py ~/OKF/wiki-okf "My Topic" --type research
```

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

打开**空的父文件夹**（如 `~/Documents/OKF`）作 workspace，复制下面提示词。**不要**用旧版「workspace 即 BUNDLE_ROOT」逻辑。

```text
请在当前 workspace 部署 llm-wiki 知识库。

【BUNDLE_ROOT — 必须遵守】
- KB_NAME = 用户指定的知识库文件夹名；未指定则问；仍无则 wiki-okf
- WORKSPACE = 当前 workspace 绝对路径
- 若 basename(WORKSPACE) != KB_NAME：
    BUNDLE_ROOT = WORKSPACE/KB_NAME
    禁止在 WORKSPACE 根创建 concepts/、raw/、index.md
- 若 basename(WORKSPACE) == KB_NAME：
    BUNDLE_ROOT = WORKSPACE
- 若 workspace 含 llm-wiki/、web/、audit-shared/（工具项目）→ 停止

- KB_TYPE = 用户指定或问后默认 research
- 不要把 web/、audit-shared/ 复制到 BUNDLE_ROOT
- skill 安装到 <BUNDLE_ROOT>/.agents/skills/llm-wiki/
- REPO_URL=https://github.com/kaerf15/llm-wiki-skill-okf（临时 clone，完成后删除）
- Web 端口 4875，APP_ROOT 用户级 llm-wiki 目录

执行：
1. mkdir -p <BUNDLE_ROOT>
2. python3 <TEMP>/llm-wiki/scripts/scaffold.py "<BUNDLE_ROOT>" "<主题>" --type <KB_TYPE>
3. 安装 skill、注册 Web
4. 汇报：知识库目录 <BUNDLE_ROOT> 绝对路径，请用户在左侧点开 KB_NAME 文件夹
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
