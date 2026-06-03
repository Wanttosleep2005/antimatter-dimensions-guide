# 反物质维度攻略站 — 下一轮功能修复 Prompt

> 项目：`G:\CollegeStudy\project\antimater_guide`
> 基于 Commit：`85663e2`（2026-06-02 23:30）— **当前逻辑不可改动**
> 加载技能：`coding-guidelines` + `前端开发`

---

## ⚠️ 强制前置要求

1. **先 git commit 快照**：`git add -A && git commit -m "backup: before next-round fixes"`
2. **每完成一项功能立即 `npm run build` 验证无错误**
3. **只改目标文件，不动相邻代码、不动现有样式、不动现有路由**
4. **localStorage 11个保留键名不可变**（见现有 FEATURES.md）

---

## 一、遗漏修复：RU\d+ 大小写识别

### 问题
当章节文本中出现 `ru52`（小写）或 `RU 52`（带空格）时，系统无法将其识别为一个整体：
- `GAME_TERM_RE` 是大小写敏感的 → 只匹配大写 `RU52`
- `CURRENCY_RE` 也是大小写敏感 → 只匹配大写 `RU`（且 `RU` 在 `RU52` 内部因 lookahead 被正确跳过）
- `injectGlossaryTooltips` 的 `wrapGlossaryText` 对 "RU" 使用 `(?<![A-Za-z0-9])RU(?![A-Za-z0-9])` → 也只匹配大写
- 如果文本写的是 `ru52`（小写），三套系统都 miss，RU52 显示为裸文本

### 修复
**文件**：`src/utils/highlightTerms.ts`

方案：在 `getGameTermTip()` 和 `highlightTerms()` Step 0（achievement normalization）之后、Step 1 之前，增加一个文本规范化步骤：

```typescript
// Step 0.1: Normalize game term casing
// Converts lowercase/混合大小写的RU/DU/IU/PU + number → uppercase
s = s.replace(/\b(ru|du|iu|pu|ts|ec|ic|td|id|cel)(\d+)\b/gi,
  (_, prefix, num) => prefix.toUpperCase() + num
);
```

这只处理大小写问题，不影响现有逻辑。

---

## 二、功能增强清单

### 2.1 一键复制研究树 / 自动机代码 / 购买器设置

**研究树（StudyTreesPage）**：
- 已有复制按钮，但复制内容缺少游戏导入格式的 `|N` 后缀
- 修改：`copyTree()` 中，若 `hit.tree` 不以 `|\d` 结尾则补 `|0`

**自动机代码（AutomatorPage）**：
- 已有复制按钮，确认复制完整 base64 数据块（含 `AntimatterDimensionsAutomatorDataFormat` 前缀）

**购买器设置（PurchasePanel）**：
- 当前只检测和显示购买设置行，无复制功能
- 新增：面板底部加"复制全部设置"按钮，将 `hints` 数组中的所有行以 `\n` 连接复制到剪贴板

### 2.2 关键步骤高亮

在 `GuideContent` 中，对包含以下关键词的段落添加左侧 accent bar 或背景色标记：
- 关键词：「注意」「重要」「关键」「必须」「千万不要」「后果很严重」
- 实现：在 `dangerouslySetInnerHTML` 之前检测，若有匹配则给 `<p>` 添加 CSS class `callout-warning`
- CSS：`background: rgba(251, 191, 36, 0.06); border-left: 3px solid var(--accent-warning); padding-left: 12px;`

### 2.3 术语悬浮解释优化

**问题**：当前 `data-tip` 属性值过长（如 IP 的 tooltip 包含 "无限点数 (Infinity Points) — 到达1e308AM后大坍缩获得"），导致：
- 复制文本时 data-tip 内容混入选区
- 悬浮提示框超出屏幕右侧

**修复**：
1. 缩短 `currencyDefs` 的 label：去掉 `— 详细说明` 部分，只保留核心名称，如 `无限点数 (Infinity Points)`
2. 在 `index.css` 中对 `.glossary-inline::after`、`.currency-inline::after` 的 tooltip 增加 `max-width: 320px; white-space: normal; word-break: break-word;`
3. 对 glossary tooltip 同样截短：data-tip 只显示 `全称｜描述前30字`

### 2.4 章节内搜索固定栏

当用户通过 `?q=` 参数跳转到章节后，在页面顶部添加一个固定的搜索上下文栏：
- 显示：`搜索："EC1" — 第 7 章，共匹配 N 处` + `[↑上一处] [↓下一处] [清除]`
- ↑↓ 切换滚动到上一个/下一个 `<mark class="search-highlight">`
- 固定在页面顶部（`position: sticky; top: 0; z-index: 40`）
- 点击清除 → `navigate(/chapter/7)` 去掉查询参数

### 2.5 可折叠长表格 / 长代码块

**表格**（如 EC 挑战表格、永恒前期 TT 路径列表）：
- 默认折叠，显示"展开表格（N行）"按钮
- 实现：用 `<details><summary>` 包裹，或 React state toggle

**代码块**（如自动机脚本的 base64 数据块）：
- 默认只显示前 200 字符 + "... (点击展开)"
- 展开后显示完整数据 + 一键复制

### 2.6 阅读位置更明确

当前：仅有 `ReadingProgress` 顶部进度条。
改进：
- 在 `GuideContent` 中，当前视口内的 section 标题在 TOC（章节内目录）中添加高亮（active 态）
- 使用 `IntersectionObserver` 监听所有 `.guide-section`，当前可见的 section 在 TOC pills 中高亮

### 2.7 错误 / 注意事项独立样式

新建 CSS class：
```css
.alert-danger  { background: rgba(239,68,68,0.08);  border-left: 3px solid #ef4444; }  /* ⚠ 危险/禁止 */
.alert-warn    { background: rgba(251,191,36,0.08);  border-left: 3px solid #fbbf24; }  /* 🔶 注意/警告 */
.alert-info    { background: rgba(56,189,248,0.08);  border-left: 3px solid #38bdf8; }  /* ℹ 提示/备注 */
.alert-success { background: rgba(52,211,153,0.08);  border-left: 3px solid #34d399; }  /* ✅ 完成/确认 */
```

在 `GuideContent` 渲染中，检测段落前缀关键词自动应用对应 class：
- `千万不要` / `后果很严重` / `注意不要` → `alert-danger`
- `注意` / `重要` / `关键` / `建议` → `alert-warn`
- `提示` / `备注` → `alert-info`
- `已完成` / `解锁` → `alert-success`

### 2.8 购买器设置优化

**当前**：`PurchasePanel.tsx` 用正则检测含 `自动购买器|自动购买|购买器设置|粘滞键|最大.*购买|购买单个|购买\d+|优先购买` 的行。

**优化**：
1. 购买器设置行按类别分组显示：
   - "自动购买器"（自动永恒/自动大坍缩/自动星系/自动维度提升）
   - "计数频率"（购买单个/购买最大）
   - "粘滞键"
   - "优先级"
2. 每行旁边加一个小按钮：点击后将该行文本复制到剪贴板（方便粘贴到游戏内设置）
3. 提取自动购买器数值配置（如 `0.4秒`、`25秒`）并高亮数字部分

---

## 三、文件改动清单

| 文件 | 改动 |
|------|------|
| `src/utils/highlightTerms.ts` | Step 0.1 大小写规范化 + 缩短 currencyDefs label |
| `src/utils/glossaryTooltips.ts` | 缩短 data-tip 至 30 字限制 |
| `src/pages/StudyTreesPage.tsx` | 复制补 `|0` 后缀 |
| `src/pages/AutomatorPage.tsx` | 确认复制完整数据 |
| `src/components/guide/PurchasePanel.tsx` | 分类分组 + 逐行复制 + 数值高亮 |
| `src/components/guide/GuideContent.tsx` | 关键步骤高亮 + TOC active + alert class + 搜索固定栏 |
| `src/index.css` | tooltip max-width + alert classes + 搜索固定栏样式 |
| `src/App.tsx` | 无改动（除非添加搜索固定栏到 Layout） |

---

## 四、构建验证

```bash
cd G:\CollegeStudy\project\antimater_guide
npm run build 2>&1 | tail -5
```

每完成一个文件改动立即验证，确保 0 错误。
