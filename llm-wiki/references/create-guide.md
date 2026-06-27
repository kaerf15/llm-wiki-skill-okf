# Create Guide — 如何新建 OKF 知识库

Skill **仅在用户明确要求创建知识库时**才执行 scaffold。用户没说要建，不要主动创建。

创建前必须弄清：**名称（文件夹名）** 和 **类型**。项目目录 ≠ 知识库目录。

## 何时创建

| 用户说 | Agent 做 |
|--------|----------|
| 「帮我建一个知识库」「部署 llm-wiki」「scaffold」等 | 进入下方创建流程 |
| 只问 OKF 是什么、怎么用 ingest | **不创建**，只回答 |
| 已在现有知识库里 ingest / query | **不创建**，直接操作当前 bundle |

## 创建前：名称与类型

**用户已说明的，直接用；未说明的，先问；问后仍没有的，用默认值。**

### 1. 知识库名称（文件夹名）

- 用户**指定了名称**（如 `my-ai-wiki`、`sales-catalog`）→ **就用这个名称**作为文件夹名。
- 用户**未指定** → **先问**：「知识库文件夹想叫什么？」
- 用户表示随便 / 跳过 / 不回答 → 默认文件夹名 **`wiki-okf`**。

最终路径示例：`~/Documents/<名称>/` 或用户指定的父目录 + `<名称>/`。

### 2. 知识库类型

- 用户**指定了类型** → 用对应 `--type` 和目录结构 scaffold。
- 用户**未指定** → **先问**：「是什么类型的知识库？」并简要说明下表四选一。
- 用户表示随便 / 跳过 / 不回答 → 默认类型 **`research`**。

| `--type` | 适用场景 | 自动创建的 concept 目录 |
|----------|----------|-------------------------|
| `research`（**默认**） | 论文、文章、通用研究 | `concepts/` · `entities/` · `summaries/` |
| `catalog` | 数据资产、表、指标 | `datasets/` · `tables/` · `metrics/` |
| `operations` | 运维手册、SOP | `playbooks/` · `runbooks/` · `references/` |
| `general` | 最小 starter | `topics/` |

用户说「数据目录 / catalog / 表和指标」→ `--type catalog`。  
用户说「运维 / runbook / SOP」→ `--type operations`。  
其余或未说明 → `--type research`（默认）。

### 3. 主题标题（可选）

用于 `index.md`、`AGENTS.md` 的 H1。优先用用户给的描述；否则用知识库名称的友好写法（如 `sales-catalog` → `Sales Catalog`）。

## 决策小结

```
用户要求创建？
  否 → 不 scaffold
  是 →
    名称：用户给了 → 用用户的；没给 → 问；仍无 → wiki-okf
    类型：用户给了 → 用对应 --type；没给 → 问；仍无 → research
    BUNDLE_ROOT = <父目录>/<名称>/  （独立文件夹，不在工具项目里）
    scaffold.py BUNDLE_ROOT "<主题标题>" --type <类型>
    安装 skill 到 BUNDLE_ROOT/.agents/skills/llm-wiki/
```

## 两个目录，不要混

| | 项目（工具代码） | 知识库（OKF bundle） |
|--|------------------|----------------------|
| 是什么 | llm-wiki-skill-okf 仓库 | 上面确定的 `<名称>/` 文件夹 |
| 包含 | `llm-wiki/`、`web/`、`audit-shared/` | `index.md`、`concepts/` 等 |
| workspace | 不要当知识库 | 用户应打开这个文件夹 |

**禁止**：在 `llm-wiki-skill-okf` 项目根下 scaffold。

## 命令示例

```bash
# 用户名称=my-ai-wiki，类型未说 → 默认 research
python3 scripts/scaffold.py ~/Documents/my-ai-wiki "My AI Wiki" --type research

# 用户名称=sales-catalog，类型=catalog
python3 scripts/scaffold.py ~/Documents/sales-catalog "Sales Catalog" --type catalog

mkdir -p ~/Documents/my-ai-wiki/.agents/skills
cp -R <skill-source>/llm-wiki ~/Documents/my-ai-wiki/.agents/skills/llm-wiki
```

用户 workspace **已是**空的目标文件夹时，`BUNDLE_ROOT` 用 `.`：

```bash
python3 scripts/scaffold.py . "Sales Catalog" --type catalog
```

## 创建完成后

空骨架（只有 `index.md`、空 concept 目录）是正常的，ingest 后才有内容。  
完整 OKF 内部结构见 `references/okf-guide.md`。

## 常见错误

| 错误 | 正确做法 |
|------|----------|
| 用户没要求就创建 | 等用户明确说「创建 / 部署 / scaffold」 |
| 用户给了名称却改成 wiki-okf | **严格使用用户指定的文件夹名** |
| 用户说了 catalog 却用 research | **按用户类型选 --type** |
| 未问就用默认且不告知 | 默认值可以静默用，但创建前应至少尝试问一次 |
| 在工具项目里建知识库 | 在独立路径 `<名称>/` 下建 |
