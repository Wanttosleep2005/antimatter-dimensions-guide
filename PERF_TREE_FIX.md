# 性能大修 + 时间研究树上下文重写 Prompt

> 项目：`G:\CollegeStudy\project\antimater_guide`
> `npm run dev` → localhost:5173

---

## 一、性能问题：卡死/卡顿根因链

经过全链路审查，发现6个性能瓶颈彼此叠加导致卡死：

```
用户搜索 →   跳转章节(?q=) →   highlightTerms 8遍正则/段落
    ⬇                                  ⬇
SearchModal    ScrollFade 每帧             dangerouslySetInnerHTML
内存驻留       查询全部section             (无React.memo)
(20章JSON)     设置inline style             无缓存 → CPU100%
```

### 根因1：`useScrollFade` — 每帧操作全量DOM（必须移除）

**文件**：`src/hooks/useScrollFade.ts` + `src/components/guide/GuideContent.tsx`

每帧 scroll 事件触发后：
1. `querySelectorAll('.guide-section')` — 查询所有节
2. 对每节 `getBoundingClientRect()` — 强制回流
3. 对每节设置 4 个 inline style — 强制重绘

在 Ch20（121KB）下，数十个 `.guide-section`，每帧数十次样式操作。

**修复**：从 GuideContent 移除 `useScrollFade` 调用。

### 根因2：`highlightTerms` 无缓存 — 每个段落8遍正则

**文件**：`src/utils/highlightTerms.ts`

**8正则 × 300段落 = 2400次正则操作**，仅渲染一章。

**修复**：在 GuideContent 中使用 `useMemo` 预处理所有内容。

### 根因3：SearchModal 内存驻留

`allContent` ref 存储所有 20 章 JSON，`loaded` 状态永不重置。

**修复**：关闭时 `allContent.current = []`。

### 根因4：跳转后的渲染风暴

SearchModal → `navigate(/chapter/7?q=EC1)` 时：
1. ChapterPage 重新加载章节数据
2. `highlightTerms` 全量正则
3. `useScrollFade` 全量 DOM 操作
4. `dangerouslySetInnerHTML` 重新计算

### 根因5：SearchModal useEffect 依赖膨胀

`useEffect([isOpen, results, activeIndex, onClose])` — 每次搜索变化都重新注册监听器。

**修复**：用 ref 替代依赖数组。

---

## 二、时间研究树：基于AI通读上下文的4类分类重写

| 类型 | 标识关键词 | 检索条件 | 例子 |
|------|-----------|---------|------|
| **初始树** | 无 "重置/购买/标准树" | ≥3个连续TS节点 | `11,22,33` |
| **重置树** | "重置了时间研究之后" / "重置研究树至" | ≥3个连续TS节点 | `11,22,32,42` |
| **购买树** | "购买TS" + "TT" / 增1补1原则 | 比前一个树多1个节点 | `11,22,32,42,51` (14TT) |
| **标准树** | "使用标准树" | 固定路径 | `11,21,22,31,32,33,41,42,51,61,73,...,171` |
| **类标准树** | "标准树（31、41除外）" | 标准树移除指定节点 | 标准树去掉31,41 |
| **EC挑战树** | "EC1×1（130TT）：" | 含\|N后缀 | `11,22,...,171\|1` |

### 购买树的"增1补1"原则

原文："重置了时间研究之后...购买研究 11,22,32,42" → 重置树起点
后续："14TT，购买TS51" → 购买树："11,22,32,42,51"
再后续："16TT，购买TS61" → 购买树："11,22,32,42,51,61"

**原则**：每增一个 TS，末尾追加一个节点。TT 数只记录购买后总数。

---

## 三、全局性能保护

### 3A：内存自检测 `useMemoryGuard`

- 每 10 秒检测 `performance.memory` (Chrome)
- 超过 80% 堆内存 → 触发 `ad-memory-pressure` 事件 → 清理缓存
- 长帧检测 → >100ms 帧触发降级

### 3B：组件隔离

- ChapterPage lazy load
- GuideContent React.memo

### 3C：highlightTerms 快速路径

```typescript
if (!searchQuery?.trim() && !achievementHighlight?.trim() && !SPECIAL_CONTENT_RE.test(text)) {
  return text; // 普通文本直接返回
}
```

---

## 四、文件改动清单

| 文件 | 操作 |
|------|------|
| `src/hooks/useScrollFade.ts` | 删除 |
| `src/components/guide/GuideContent.tsx` | useMemo + React.memo + 移除 useScrollFade |
| `src/utils/highlightTerms.ts` | 快速路径 + protectTags 前移到 step 2 前 |
| `src/components/search/SearchModal.tsx` | refs 替代 deps + 关闭清理 |
| `src/data/extractTools.ts` | 4类分类 + 上下文AI通读 |
| `src/pages/StudyTreesPage.tsx` | 新分类标签 + 上下文高亮 |
| `src/hooks/useMemoryGuard.ts` | 新建 |
| `src/App.tsx` | 内存事件 + lazy 化 |

---

## 五、验证

```bash
cd G:\CollegeStudy\project\antimater_guide
npm run build
```
