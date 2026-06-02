import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chapterIndex, loadChapter } from '../../data/loadChapter';
import { extractStudyTrees, extractAchievements } from '../../data/extractTools';
import type { Chapter } from '../../types';
import type { StudyTreeHit, AchievementHit } from '../../data/extractTools';

type ToolTab = 'trees' | 'achievements';

interface ToolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ToolModal({ isOpen, onClose }: ToolModalProps) {
  const [tab, setTab] = useState<ToolTab>('trees');
  const [studyQuery, setStudyQuery] = useState('');
  const [achQuery, setAchQuery] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (chapters.length === 0) {
        loadAllChapters();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const loadAllChapters = async () => {
    const loaded = await Promise.all(
      chapterIndex.map(idx => loadChapter(idx.id))
    );
    setChapters(loaded.filter(Boolean) as Chapter[]);
  };

  const studyTrees = useMemo(() => extractStudyTrees(chapters), [chapters]);
  const achievementHits = useMemo(() => extractAchievements(chapters), [chapters]);

  const filteredTrees = useMemo(() => {
    const q = studyQuery.trim().toLowerCase();
    return studyTrees.filter(hit => {
      if (!q) return true;
      return `${hit.label} ${hit.tree} ${hit.context} ${hit.chapterTitle}`.toLowerCase().includes(q);
    }).slice(0, 20);
  }, [studyQuery, studyTrees]);

  const filteredAchievements = useMemo(() => {
    const q = achQuery.trim().toLowerCase();
    return achievementHits.filter(hit => {
      if (!q) return true;
      return `${hit.achievement} ${hit.context} ${hit.chapterTitle}`.toLowerCase().includes(q);
    }).slice(0, 30);
  }, [achQuery, achievementHits]);

  const copyTree = async (hit: StudyTreeHit) => {
    await navigator.clipboard.writeText(hit.tree);
    setCopiedId(hit.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const cleanTitle = (t: string) => t.replace(/^第.+?\s*/, '');

  const phaseColor = (id: number) => {
    if (id <= 3) return '#4ade80';
    if (id <= 8) return '#60a5fa';
    if (id <= 11) return '#facc15';
    if (id <= 13) return '#f97316';
    if (id <= 16) return '#f43f5e';
    return '#c084fc';
  };

  if (!isOpen) return null;

  return (
    <div className="tool-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tool-modal-panel">
        {/* Header */}
        <div className="tool-modal-header">
          <div className="tool-modal-title-row">
            <div className="tool-modal-icon">
              {tab === 'trees' ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 2v14M4 7l5 5 5-5M4 12l5 4 5-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 2l2.5 5 5.5.8-4 3.9.9 5.3L9 14.5 4.1 17l.9-5.3-4-3.9 5.5-.8L9 2z" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <h2 className="tool-modal-title">
              {tab === 'trees' ? '时间研究树' : '成就检索'}
            </h2>
            <span className="tool-modal-count-badge">
              {tab === 'trees' ? studyTrees.length : achievementHits.length}
            </span>
          </div>

          {/* Tabs */}
          <div className="tool-modal-tabs">
            <button
              className={`tool-modal-tab ${tab === 'trees' ? 'is-active' : ''}`}
              onClick={() => setTab('trees')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 2v10M3 6l4 4 4-4M3 10l4 2 4-2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              研究树
              <span className="tool-modal-tab-count">{studyTrees.length}</span>
            </button>
            <button
              className={`tool-modal-tab ${tab === 'achievements' ? 'is-active' : ''}`}
              onClick={() => setTab('achievements')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1l2 4 4.5.6-3.3 3.2.8 4.2L7 11.5l-4 2.5.8-4.2L.5 5.6 5 5l2-4z" strokeLinejoin="round"/>
              </svg>
              成就检索
              <span className="tool-modal-tab-count">{achievementHits.length}</span>
            </button>
          </div>

          {/* Search */}
          <div className="tool-modal-search-wrap">
            <svg className="tool-modal-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="4.5"/>
              <path d="M10.5 10.5l3 3" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              className="tool-modal-search"
              placeholder={
                tab === 'trees'
                  ? '搜索 EC、TT、标准树、编号...'
                  : '搜索 r123、章节、上下文关键词...'
              }
              value={tab === 'trees' ? studyQuery : achQuery}
              onChange={e => tab === 'trees' ? setStudyQuery(e.target.value) : setAchQuery(e.target.value)}
            />
            {(tab === 'trees' ? studyQuery : achQuery) && (
              <button
                className="tool-modal-search-clear"
                onClick={() => tab === 'trees' ? setStudyQuery('') : setAchQuery('')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="tool-modal-body">
          {tab === 'trees' ? (
            <>
              {filteredTrees.length === 0 ? (
                <div className="tool-modal-empty">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
                    <circle cx="20" cy="20" r="15"/>
                    <path d="M14 20h12M20 14v12" strokeLinecap="round"/>
                  </svg>
                  <p>{studyQuery ? '没有匹配的研究树' : '加载中...'}</p>
                </div>
              ) : (
                <>
                  <div className="tool-modal-results-header">
                    <span>找到 {filteredTrees.length} 条结果</span>
                    {studyQuery && <span>（筛选自全部 {studyTrees.length} 条）</span>}
                  </div>
                  <div className="tool-modal-results-list">
                    {filteredTrees.map(hit => (
                      <article key={hit.id} className="tool-modal-study-item">
                        <div className="tool-modal-study-header">
                          <div className="tool-modal-study-meta">
                            <span
                              className="tool-modal-chapter-badge"
                              style={{ borderColor: phaseColor(hit.chapterId), color: phaseColor(hit.chapterId) }}
                            >
                              Ch{hit.chapterId}
                            </span>
                            <span className="tool-modal-chapter-title">{cleanTitle(hit.chapterTitle)}</span>
                          </div>
                          <h3 className="tool-modal-study-label">{hit.label}</h3>
                        </div>
                        <code className="tool-modal-tree-code">{hit.tree}</code>
                        <div className="tool-modal-study-footer">
                          <p className="tool-modal-study-context">{hit.context}</p>
                          <div className="tool-modal-study-actions">
                            <button
                              className={`tool-modal-copy-btn ${copiedId === hit.id ? 'is-copied' : ''}`}
                              onClick={() => copyTree(hit)}
                            >
                              {copiedId === hit.id ? (
                                <>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  已复制
                                </>
                              ) : (
                                <>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                                    <path d="M2 9V2h7" strokeLinecap="round"/>
                                  </svg>
                                  复制
                                </>
                              )}
                            </button>
                            <button
                              className="tool-modal-jump-btn"
                              onClick={() => {
                                navigate(`/chapter/${hit.chapterId}?q=${encodeURIComponent(hit.tree.slice(0, 8))}`);
                                onClose();
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              跳转原文
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {filteredAchievements.length === 0 ? (
                <div className="tool-modal-empty">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
                    <path d="M20 5l4 8 9 1.3-6.5 6.4 1.5 8.8L20 25l-8 5.5 1.5-8.8L7 14.3l9-1.3L20 5z"/>
                  </svg>
                  <p>{achQuery ? '没有匹配的成就' : '加载中...'}</p>
                </div>
              ) : (
                <>
                  <div className="tool-modal-results-header">
                    <span>找到 {filteredAchievements.length} 条结果</span>
                    {achQuery && <span>（筛选自全部 {achievementHits.length} 条）</span>}
                  </div>
                  <div className="tool-modal-achievement-list">
                    {filteredAchievements.map(hit => (
                      <button
                        key={hit.id}
                        className="tool-modal-achievement-row"
                        onClick={() => {
                          navigate(`/chapter/${hit.chapterId}?q=${encodeURIComponent(hit.achievement)}`);
                          onClose();
                        }}
                      >
                        <span
                          className="tool-modal-achievement-code"
                          style={{ borderColor: phaseColor(hit.chapterId), color: phaseColor(hit.chapterId) }}
                        >
                          {hit.achievement}
                        </span>
                        <div className="tool-modal-achievement-info">
                          <div className="tool-modal-achievement-chapter">
                            <span
                              className="tool-modal-chapter-badge"
                              style={{ borderColor: phaseColor(hit.chapterId), color: phaseColor(hit.chapterId) }}
                            >
                              Ch{hit.chapterId}
                            </span>
                            {cleanTitle(hit.chapterTitle)}
                          </div>
                          <p className="tool-modal-achievement-context">{hit.context}</p>
                        </div>
                        <svg className="tool-modal-achievement-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Close button */}
        <button className="tool-modal-close" onClick={onClose} aria-label="关闭">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
