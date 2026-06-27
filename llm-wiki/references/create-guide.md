# Create Guide — 如何新建 OKF 知识库

Skill **仅在用户明确要求创建知识库时**才执行 scaffold。

## 知识库目录是什么

**知识库 = 一个名为 `<KB_NAME>` 的文件夹**（默认 `wiki-okf`），里面有 `index.md`、`concepts/`、`raw/` 等。

```text
OKF/                      ← 用户 workspace（容器，可以叫任意名）
└── wiki-okf/              ← ★ 这才是知识库目录（BUNDLE_ROOT）
    ├── BUNDLE.md
    ├── index.md
    ├── concepts/
    ├── raw/
    └── .agents/skills/llm-wiki/
```

**禁止**在 workspace 根（如 `OKF/`）直接生成 `concepts/`、`raw/`、`index.md` — 除非 workspace 文件夹**本身就叫** `wiki-okf`（或用户指定的 KB_NAME）。

## 解析 BUNDLE_ROOT（必遵）

```
KB_NAME = 用户指定的名称；未指定则问；仍无则 wiki-okf
WORKSPACE = 当前 Cursor 打开的文件夹绝对路径

若 basename(WORKSPACE) == KB_NAME 且（为空或已是 bundle）:
  BUNDLE_ROOT = WORKSPACE
否则:
  BUNDLE_ROOT = WORKSPACE / KB_NAME    ← 必须 mkdir 后 scaffold 到这里
```

| workspace 文件夹名 | KB_NAME | BUNDLE_ROOT |
|--------------------|---------|-------------|
| `OKF` | `wiki-okf`（默认） | `OKF/wiki-okf/` |
| `Documents` | `wiki-okf` | `Documents/wiki-okf/` |
| `wiki-okf` | `wiki-okf` | `wiki-okf/`（当前目录） |
| `OKF` | `my-research`（用户指定） | `OKF/my-research/` |

创建完成后告诉用户：**「知识库目录是 `<BUNDLE_ROOT>`，请在左侧点开 `<KB_NAME>` 文件夹。」**

## 何时创建

| 用户说 | Agent 做 |
|--------|----------|
| 「部署 llm-wiki」「建知识库」「scaffold」 | 按上表解析 BUNDLE_ROOT 后创建 |
| 只问 OKF 是什么 | 不创建 |
| 已在 bundle 里 ingest | 不创建 |

## 创建前：名称与类型

| 项 | 用户说了 | 用户没说 |
|----|--------|--------|
| **KB_NAME（文件夹名）** | 用用户给的 | 先问；仍无 → **`wiki-okf`** |
| **类型 `--type`** | 用对应类型 | 先问；仍无 → **`research`** |

| `--type` | 概念目录 |
|----------|----------|
| `research`（默认） | `concepts/` · `entities/` · `summaries/` |
| `catalog` | `datasets/` · `tables/` · `metrics/` |
| `operations` | `playbooks/` · `runbooks/` · `references/` |
| `general` | `topics/` |

## 标准命令

```bash
# workspace=~/OKF, KB_NAME=wiki-okf → BUNDLE_ROOT=~/OKF/wiki-okf
mkdir -p ~/OKF/wiki-okf
python3 scripts/scaffold.py ~/OKF/wiki-okf "My Topic" --type research
cp -R <skill-source>/llm-wiki ~/OKF/wiki-okf/.agents/skills/llm-wiki
```

## 两个目录，不要混

| | 工具项目 | 知识库 |
|--|----------|--------|
| 示例 | llm-wiki-skill-okf 仓库 | `…/wiki-okf/` 文件夹 |
| 含 | `web/`、`llm-wiki/` 源码 | `index.md`、`concepts/` |

禁止在工具项目根 scaffold。禁止在 workspace 根 scatter（除非 workspace 名 == KB_NAME）。

## 创建完成后

- 空 `concepts/` 正常，ingest 后才有 `.md`
- 确认：存在 **`<KB_NAME>/index.md`**（含 `okf_version: "0.1"`）和 **`<KB_NAME>/BUNDLE.md`**

## 常见错误

| 错误 | 正确 |
|------|------|
| 在 `OKF/` 根下直接建 concepts/ | 建 `OKF/wiki-okf/concepts/` |
| 说「workspace 就是 bundle」 | workspace 是容器；**子文件夹 KB_NAME 才是 bundle** |
| workspace 叫 OKF 就把 KB 也叫 OKF | KB 默认名是 **wiki-okf**，与 workspace 名无关 |
| 在 llm-wiki-skill-okf 项目里 scaffold | 在用户 workspace 下的 `<KB_NAME>/` |
