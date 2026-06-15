// src/components/content/MindMapPanel.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../../api/client';
import type { GradeDto, TopicDto, LessonDto, SectionDto, NodeDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Textarea, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconPlus, IconEdit, IconDelete, IconMindMap, IconSparkles } from '../ui/Icons';
import { RichTextEditor } from '../ui/RichTextEditor';

const isBodyEmpty = (html: string) => {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
  return text === '';
};

const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
};

interface VisualMindMapDiagramProps {
  rootTitle: string;
  sections: any[];
  height?: string;
}

function getInitialCollapsedSections(sectionsList: any[]): Set<string> {
  const collapsed = new Set<string>();
  const walk = (items: any[], depth = 0) => {
    for (const item of items) {
      const key = item.id ? `sec-${item.id}` : `sec-${item.name}`;
      if (depth >= 1) {
        collapsed.add(key);
      }
      if (item.children) {
        walk(item.children, depth + 1);
      }
    }
  };
  walk(sectionsList);
  return collapsed;
}

export function VisualMindMapDiagram({ rootTitle, sections, height = '600px' }: VisualMindMapDiagramProps) {
  const [zoomScale, setZoomScale] = useState<number>(0.9);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => getInitialCollapsedSections(sections));
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset collapse state and pan/zoom when new sections are loaded (e.g. new lesson or new AI preview)
  useEffect(() => {
    setCollapsedSections(getInitialCollapsedSections(sections));
    setZoomScale(0.9);
    setPanOffset({ x: 0, y: 0 });
  }, [sections]);

  // Handle trackpad pinch-to-zoom on native wheel event to prevent browser page zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = Math.min(0.08, Math.abs(e.deltaY) * 0.005);
        setZoomScale(s => {
          let nextScale = s + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
          return Math.min(1.5, Math.max(0.4, nextScale));
        });
      }
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('a')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('a')) {
      return;
    }
    setZoomScale(0.9);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('a')) {
      return;
    }
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDragging) {
      setPanOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchStartDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDist;
      let nextScale = zoomScale * ratio;
      nextScale = Math.min(1.5, Math.max(0.4, nextScale));
      setZoomScale(nextScale);
      setTouchStartDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStartDist(null);
  };

  const toggleSection = (secKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(secKey)) {
        next.delete(secKey);
      } else {
        next.add(secKey);
      }
      return next;
    });
  };

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  };

  const renderNode = (item: any, depth = 0) => {
    const colors = [
      { bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: '#4f46e5', text: '#ffffff' },
      { bg: '#ffffff', border: '#818cf8', text: '#1e1b4b', headerBg: '#f5f3ff', tagColor: '#4f46e5' },
      { bg: '#ffffff', border: '#38bdf8', text: '#0c4a6e', headerBg: '#f0f9ff', tagColor: '#0284c7' },
      { bg: '#ffffff', border: '#34d399', text: '#064e3b', headerBg: '#ecfdf5', tagColor: '#059669' },
    ];

    const currentDepthColor = colors[Math.min(depth + 1, colors.length - 1)];
    const sectionKey = item.id ? `sec-${item.id}` : `sec-${item.name}`;
    const isCollapsed = collapsedSections.has(sectionKey);

    const hasChildren = (item.children && item.children.length > 0) || (item.nodes && item.nodes.length > 0);
    const showChildren = hasChildren && !isCollapsed;

    return (
      <div
        key={sectionKey}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
          margin: '8px 0',
        }}
      >
        {/* Node Card wrapper for absolute toggle positioning */}
        <div id={sectionKey} style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              background: currentDepthColor.bg,
              border: `2px solid ${currentDepthColor.border}`,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
              width: '260px',
              transition: 'all 0.2s ease',
              position: 'relative',
              zIndex: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(99,102,241,0.12)';
              e.currentTarget.style.borderColor = '#6366f1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.05)';
              e.currentTarget.style.borderColor = currentDepthColor.border;
            }}
          >
            {/* Header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${currentDepthColor.border}1a`,
              background: currentDepthColor.headerBg,
              borderTopLeftRadius: '10px',
              borderTopRightRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                color: currentDepthColor.tagColor,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Nhánh cấp {depth + 1}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                Vị trí {item.position}
              </span>
            </div>

            {/* Body */}
            <div style={{ padding: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                {item.name}
              </h4>
              {item.summary && (
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  {item.summary}
                </p>
              )}
            </div>
          </div>

          {/* Toggle Button for collapsing branches */}
          {hasChildren && (
            <button
              onClick={() => toggleSection(sectionKey)}
              style={{
                position: 'absolute',
                top: '50%',
                right: '-11px',
                transform: 'translateY(-50%)',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#ffffff',
                border: `2px solid ${currentDepthColor.border}`,
                color: currentDepthColor.tagColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                e.currentTarget.style.background = currentDepthColor.border;
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                e.currentTarget.style.background = '#ffffff';
                 e.currentTarget.style.color = currentDepthColor.tagColor || '';
              }}
            >
              {isCollapsed ? '+' : '-'}
            </button>
          )}
        </div>

        {/* Node Children and Leaves Connection Container */}
        {showChildren && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            paddingLeft: '24px',
          }}>
            {/* Sub-sections and Nodes rendering */}
            {(() => {
              const childrenList = item.children || [];
              const nodesList = item.nodes || [];
              const totalChildren = childrenList.length + nodesList.length;

              return (
                <>
                  {/* Sub-sections */}
                  {childrenList.map((child: any, idx: number) => {
                    const childKey = child.id ? `sec-${child.id}` : `sec-${child.name}`;
                    return (
                      <div key={childKey} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        {/* Horizontal branch line */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-24px',
                            width: '24px',
                            height: '2px',
                            background: '#cbd5e1',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 1,
                          }}
                        />

                        {/* Vertical connector line segment */}
                        {totalChildren > 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: '-24px',
                              width: '2px',
                              background: '#cbd5e1',
                              top: idx === 0 ? '50%' : '0',
                              bottom: idx === totalChildren - 1 ? '50%' : '0',
                              zIndex: 1,
                            }}
                          />
                        )}

                        {renderNode(child, depth + 1)}
                      </div>
                    );
                  })}

                  {/* Nodes (Leaves) */}
                  {nodesList.map((node: any, idx: number) => {
                    const nodeKey = node.id ? `node-${node.id}` : `node-${node.header || node.body}`;
                    const isExpanded = expandedNodes.has(nodeKey);
                    const absoluteIdx = childrenList.length + idx;

                    return (
                      <div key={nodeKey} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        {/* Horizontal branch line */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-24px',
                            width: '24px',
                            height: '2px',
                            background: '#cbd5e1',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 1,
                          }}
                        />

                        {/* Vertical connector line segment */}
                        {totalChildren > 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: '-24px',
                              width: '2px',
                              background: '#cbd5e1',
                              top: absoluteIdx === 0 ? '50%' : '0',
                              bottom: absoluteIdx === totalChildren - 1 ? '50%' : '0',
                              zIndex: 1,
                            }}
                          />
                        )}

                        {/* Leaf Card */}
                        <div
                          id={nodeKey}
                          onClick={() => toggleNode(nodeKey)}
                          style={{
                            background: '#ffffff',
                            border: isExpanded ? '2px solid #10b981' : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            width: '240px',
                            boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
                            flexShrink: 0,
                            position: 'relative',
                            zIndex: 2,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.03)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                              Nút kiến thức
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: isExpanded ? '#ffffff' : '#10b981',
                              background: isExpanded ? '#10b981' : '#ecfdf5',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #10b981',
                              transition: 'all 0.15s ease',
                            }}>
                              {isExpanded ? '-' : '+'}
                            </span>
                          </div>
                          {node.header && (
                            <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 700, color: '#1f2937' }}>
                              {node.header}
                            </h5>
                          )}

                          {isExpanded ? (
                            <>
                              <div style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: node.body }} />
                              {node.imgUrl && (
                                <img
                                  src={node.imgUrl}
                                  alt="asset"
                                  style={{ marginTop: '8px', width: '100%', maxHeight: '80px', objectFit: 'cover', borderRadius: '4px' }}
                                />
                              )}
                            </>
                          ) : (
                            <p style={{
                              margin: 0,
                              fontSize: '12px',
                              color: '#64748b',
                              lineHeight: 1.4,
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap'
                            }}>
                              {stripHtml(node.body)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        overflow: 'hidden',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '36px',
        height: height,
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      {/* Visual tip overlay */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        pointerEvents: 'none',
        fontSize: '11px',
        color: '#94a3b8',
        fontWeight: 600,
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(4px)',
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        zIndex: 10,
      }}>
        💡 Kéo thả để di chuyển | Pinch (véo) để zoom di động | Click đúp để reset
      </div>

      {/* Scalable Mindmap Container */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '32px',
          position: 'relative',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
          transformOrigin: 'top left',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* ROOT NODE */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '18px 24px',
            width: '280px',
            flexShrink: 0,
            boxShadow: '0 10px 25px rgba(79,70,229,0.25)',
            position: 'relative',
            zIndex: 2,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
            Bài học gốc
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, lineHeight: 1.4 }}>
            {rootTitle}
          </h3>
        </div>

        {/* Level 1 branches */}
        {sections && sections.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              paddingLeft: '32px',
            }}
          >
            {sections.map((sec, idx) => {
              const secKey = sec.id ? `sec-${sec.id}` : `sec-${sec.name}`;
              return (
                <div
                  key={secKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  {/* Horizontal line to root */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-32px',
                      width: '32px',
                      height: '2px',
                      background: '#818cf8',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 1,
                    }}
                  />

                  {/* Vertical connector line segment */}
                  {sections.length > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '-32px',
                        width: '2px',
                        background: '#818cf8',
                        top: idx === 0 ? '50%' : '0',
                        bottom: idx === sections.length - 1 ? '50%' : '0',
                        zIndex: 1,
                      }}
                    />
                  )}

                  {renderNode(sec, 0)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface MindMapPanelProps {
  onToast: (msg: string, type: ToastType) => void;
}

export function MindMapPanel({ onToast }: MindMapPanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [lessonTree, setLessonTree] = useState<{ sections: SectionDto[] } | null>(null);

  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Section Modal States
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<SectionDto | null>(null);
  const [sectionForm, setSectionForm] = useState({ name: '', summary: '', position: '', parentSectionId: '' });

  // Node Modal States
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [editNode, setEditNode] = useState<NodeDto | null>(null);
  const [nodeForm, setNodeForm] = useState({ header: '', body: '', imgUrl: '', position: '', sectionId: '' });

  // Delete Confirm States
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'section' | 'node'; id: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreviewSections, setAiPreviewSections] = useState<any[]>([]);
  const [mainViewMode, setMainViewMode] = useState<'list' | 'visual'>('list');
  const [aiPreviewMode, setAiPreviewMode] = useState<'edit' | 'visual'>('edit');

  // 1. Cascade Select Fetches
  useEffect(() => {
    client.get('/api/content/grades').then((r) => {
      const gs = r.data.grades ?? [];
      setGrades(gs);
      if (gs.length) setSelectedGradeId(gs[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedGradeId) return;
    client.get(`/api/content/grades/${selectedGradeId}/topics`).then((r) => {
      const ts = r.data.topics ?? [];
      setTopics(ts);
      setSelectedTopicId(ts.length ? ts[0].id : null);
      setLessons([]);
      setLessonTree(null);
    });
  }, [selectedGradeId]);

  useEffect(() => {
    if (!selectedTopicId) return;
    client.get(`/api/content/topics/${selectedTopicId}/lessons`).then((r) => {
      const ls = r.data.lessons ?? [];
      setLessons(ls);
      setSelectedLessonId(ls.length ? ls[0].id : null);
      setLessonTree(null);
    });
  }, [selectedTopicId]);

  const fetchLessonTree = useCallback(async (lessonId: number) => {
    try {
      setLoading(true);
      const res = await client.get(`/api/admin/lessons/${lessonId}/mindmap`);
      setLessonTree(res.data);
    } catch {
      onToast('Không tải được sơ đồ tư duy của bài học', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (selectedLessonId) fetchLessonTree(selectedLessonId);
  }, [selectedLessonId, fetchLessonTree]);

  // 2. Section CRUD Handlers
  const openCreateSection = (parentSecId?: number) => {
    setEditSection(null);
    setSectionForm({
      name: '',
      summary: '',
      position: '1',
      parentSectionId: parentSecId ? String(parentSecId) : '',
    });
    setSectionModalOpen(true);
  };

  const openEditSection = (sec: SectionDto) => {
    setEditSection(sec);
    setSectionForm({
      name: sec.name,
      summary: sec.summary ?? '',
      position: String(sec.position),
      parentSectionId: sec.parentSectionId ? String(sec.parentSectionId) : '',
    });
    setSectionModalOpen(true);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.name.trim()) {
      onToast('Tên phần là bắt buộc', 'error');
      return;
    }
    if (!selectedLessonId || !lessonTree) return;
    try {
      setSaving(true);
      const parentId = sectionForm.parentSectionId ? Number(sectionForm.parentSectionId) : null;
      let updatedSections: any[] = [];
      const currentSections = lessonTree.sections || [];

      if (editSection) {
        // Edit existing section
        const updateRecursive = (list: any[]): any[] => {
          return list.map(sec => {
            if (sec.id === editSection.id) {
              return {
                ...sec,
                name: sectionForm.name.trim(),
                summary: sectionForm.summary.trim() || null,
                position: Number(sectionForm.position) || 1,
                parentSectionId: parentId,
              };
            }
            if (sec.children) {
              return { ...sec, children: updateRecursive(sec.children) };
            }
            return sec;
          });
        };
        updatedSections = updateRecursive(currentSections);
      } else {
        // Create new section
        const newSec = {
          id: Date.now(), // Unique temp ID
          name: sectionForm.name.trim(),
          summary: sectionForm.summary.trim() || null,
          position: Number(sectionForm.position) || 1,
          lessonId: selectedLessonId,
          parentSectionId: parentId || null,
          nodes: [],
          children: [],
        };

        if (!parentId) {
          updatedSections = [...currentSections, newSec];
        } else {
          const addRecursive = (list: any[]): any[] => {
            return list.map(sec => {
              if (sec.id === parentId) {
                return { ...sec, children: [...(sec.children || []), newSec] };
              }
              if (sec.children) {
                return { ...sec, children: addRecursive(sec.children) };
              }
              return sec;
            });
          };
          updatedSections = addRecursive(currentSections);
        }
      }

      await client.post(`/api/admin/lessons/${selectedLessonId}/mindmap/bulk`, {
        sections: updatedSections,
      });
      onToast(editSection ? 'Đã cập nhật nhánh/phần sơ đồ' : 'Đã tạo nhánh/phần sơ đồ mới', 'success');
      setSectionModalOpen(false);
      fetchLessonTree(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu phần', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 3. Node CRUD Handlers
  const openCreateNode = (secId: number) => {
    setEditNode(null);
    setNodeForm({
      header: '',
      body: '',
      imgUrl: '',
      position: '1',
      sectionId: String(secId),
    });
    setNodeModalOpen(true);
  };

  const openEditNode = (node: NodeDto) => {
    setEditNode(node);
    setNodeForm({
      header: node.header ?? '',
      body: node.body,
      imgUrl: node.imgUrl ?? '',
      position: String(node.position),
      sectionId: String(node.sectionId),
    });
    setNodeModalOpen(true);
  };

  const handleSaveNode = async () => {
    if (isBodyEmpty(nodeForm.body)) {
      onToast('Nội dung chi tiết là bắt buộc', 'error');
      return;
    }
    if (!selectedLessonId || !lessonTree) return;
    try {
      setSaving(true);
      let updatedSections: any[] = [];
      const currentSections = lessonTree.sections || [];
      const sectionId = Number(nodeForm.sectionId);

      if (editNode) {
        // Edit existing node
        const updateRecursive = (list: any[]): any[] => {
          return list.map(sec => {
            if (sec.nodes) {
              const hasNode = sec.nodes.some((n: any) => n.id === editNode.id);
              if (hasNode) {
                return {
                  ...sec,
                  nodes: sec.nodes.map((n: any) => {
                    if (n.id === editNode.id) {
                      return {
                        ...n,
                        header: nodeForm.header.trim() || null,
                        body: nodeForm.body.trim(),
                        position: Number(nodeForm.position) || 1,
                        imgUrl: nodeForm.imgUrl.trim() || null,
                      };
                    }
                    return n;
                  })
                };
              }
            }
            if (sec.children) {
              return { ...sec, children: updateRecursive(sec.children) };
            }
            return sec;
          });
        };
        updatedSections = updateRecursive(currentSections);
      } else {
        // Create new node
        const newNd = {
          id: Date.now(),
          header: nodeForm.header.trim() || null,
          body: nodeForm.body.trim(),
          position: Number(nodeForm.position) || 1,
          imgUrl: nodeForm.imgUrl.trim() || null,
          sectionId,
        };

        const addRecursive = (list: any[]): any[] => {
          return list.map(sec => {
            if (sec.id === sectionId) {
              return { ...sec, nodes: [...(sec.nodes || []), newNd] };
            }
            if (sec.children) {
              return { ...sec, children: addRecursive(sec.children) };
            }
            return sec;
          });
        };
        updatedSections = addRecursive(currentSections);
      }

      await client.post(`/api/admin/lessons/${selectedLessonId}/mindmap/bulk`, {
        sections: updatedSections,
      });
      onToast(editNode ? 'Đã cập nhật nút kiến thức' : 'Đã tạo nút kiến thức mới', 'success');
      setNodeModalOpen(false);
      fetchLessonTree(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu nút', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 4. Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !selectedLessonId || !lessonTree) return;
    try {
      setDeleting(true);
      let updatedSections: any[] = [];
      const currentSections = lessonTree.sections || [];

      if (deleteTarget.type === 'section') {
        const deleteRecursive = (list: any[]): any[] => {
          return list
            .filter(sec => sec.id !== deleteTarget.id)
            .map(sec => {
              if (sec.children) {
                return { ...sec, children: deleteRecursive(sec.children) };
              }
              return sec;
            });
        };
        updatedSections = deleteRecursive(currentSections);
      } else {
        const deleteRecursive = (list: any[]): any[] => {
          return list.map(sec => {
            if (sec.nodes) {
              sec.nodes = sec.nodes.filter((n: any) => n.id !== deleteTarget.id);
            }
            if (sec.children) {
              sec.children = deleteRecursive(sec.children);
            }
            return sec;
          });
        };
        updatedSections = deleteRecursive(currentSections);
      }

      await client.post(`/api/admin/lessons/${selectedLessonId}/mindmap/bulk`, {
        sections: updatedSections,
      });
      onToast(deleteTarget.type === 'section' ? 'Đã xóa nhánh sơ đồ' : 'Đã xóa nút kiến thức', 'success');
      setDeleteTarget(null);
      fetchLessonTree(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi xóa dữ liệu', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // 5. AI Generator Handlers
  const handleAIGenerate = async () => {
    if (!aiText.trim()) {
      onToast('Vui lòng nhập đoạn văn bản lịch sử cần tóm tắt', 'error');
      return;
    }

    try {
      setAiGenerating(true);
      const res = await client.post('/api/admin/ai/generate', {
        type: 'mindmap',
        text: aiText.trim()
      });

      const data = res.data;
      if (!data || !Array.isArray(data.sections)) {
        throw new Error('Định dạng dữ liệu trả về từ AI không đúng cấu trúc sơ đồ tư duy');
      }

      setAiPreviewSections(data.sections);
      onToast(`Sinh thành công cấu trúc sơ đồ tư duy từ AI!`, 'success');
    } catch (err: any) {
      console.error(err);
      onToast(err?.response?.data?.error || err.message || 'Lỗi khi sinh sơ đồ từ AI', 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAISave = async () => {
    if (!selectedLessonId) return;
    if (aiPreviewSections.length === 0) {
      onToast('Không có dữ liệu sơ đồ để lưu', 'error');
      return;
    }
    try {
      setSaving(true);
      await client.post(`/api/admin/lessons/${selectedLessonId}/mindmap/bulk`, {
        sections: aiPreviewSections
      });
      onToast('Đã cập nhật đè sơ đồ tư duy mới thành công!', 'success');
      setAiModalOpen(false);
      setAiText('');
      setAiPreviewSections([]);
      fetchLessonTree(selectedLessonId);
    } catch (err: any) {
      onToast(err?.response?.data?.error ?? 'Lỗi khi lưu sơ đồ tư duy hàng loạt', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper render preview tree recursively in modal
  const renderPreviewTree = (secs: any[], depth = 0) => {
    return secs.map((sec, idx) => (
      <div key={idx} style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        marginLeft: depth * 20,
        borderLeft: depth > 0 ? '3px solid #6c63ff' : '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6c63ff', textTransform: 'uppercase' }}>Nhánh cấp {depth + 1}</span>
          <input
            value={sec.name}
            onChange={(e) => {
              // Quick mutation for preview tree
              sec.name = e.target.value;
              setAiPreviewSections([...aiPreviewSections]);
            }}
            placeholder="Tên nhánh"
            style={{ flex: 1, border: 'none', borderBottom: '1px solid #e2e8f0', fontSize: 14, outline: 'none', fontWeight: 600, color: '#0f172a' }}
          />
          <button
            onClick={() => {
              // Delete section from list
              const removeSec = (list: any[]): any[] => {
                return list.filter(item => item !== sec).map(item => {
                  if (item.children) item.children = removeSec(item.children);
                  return item;
                });
              };
              setAiPreviewSections(removeSec(aiPreviewSections));
            }}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
          >
            Bỏ nhánh
          </button>
        </div>

        {/* Nodes inside preview section */}
        {sec.nodes && sec.nodes.map((node: any, nIdx: number) => (
          <div key={nIdx} style={{ background: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 6, marginLeft: 16, border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <input
                value={node.header || ''}
                onChange={(e) => {
                  node.header = e.target.value;
                  setAiPreviewSections([...aiPreviewSections]);
                }}
                placeholder="Tiêu đề nút (ví dụ: Hoàn cảnh)"
                style={{ border: 'none', background: 'transparent', fontSize: 12, outline: 'none', fontWeight: 700, width: '70%' }}
              />
              <button
                onClick={() => {
                  sec.nodes = sec.nodes.filter((_: any, i: number) => i !== nIdx);
                  setAiPreviewSections([...aiPreviewSections]);
                }}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
              >
                Xóa nút
              </button>
            </div>
            <textarea
              value={node.body}
              onChange={(e) => {
                node.body = e.target.value;
                setAiPreviewSections([...aiPreviewSections]);
              }}
              placeholder="Nội dung tóm tắt chi tiết..."
              rows={2}
              style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', color: '#475569' }}
            />
          </div>
        ))}

        <button
          onClick={() => {
            if (!sec.nodes) sec.nodes = [];
            sec.nodes.push({ header: 'Tiêu đề nút', body: 'Nội dung chi tiết', position: sec.nodes.length + 1 });
            setAiPreviewSections([...aiPreviewSections]);
          }}
          style={{ marginLeft: 16, fontSize: 12, color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          + Thêm nút kiến thức vào nhánh
        </button>

        {/* Recursive Children rendering */}
        {sec.children && sec.children.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {renderPreviewTree(sec.children, depth + 1)}
          </div>
        )}
      </div>
    ))
  };

  // Helper render current mindmap tree recursively
  const renderTree = (sectionsList: SectionDto[], depth = 0) => {
    return sectionsList.map((sec) => (
      <div key={sec.id} style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        marginLeft: depth * 24,
        borderLeft: `4px solid ${depth === 0 ? '#6c63ff' : depth === 1 ? '#0284c7' : '#10b981'}`,
        boxShadow: '0 2px 8px rgba(15,23,42,0.02)',
      }}>
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6c63ff', background: '#f5f3ff', padding: '2px 8px', borderRadius: 20 }}>
                Nhánh Cấp {depth + 1} (vị trí {sec.position})
              </span>
              {sec.summary && <span style={{ fontSize: 12, color: '#64748b' }}>— {sec.summary}</span>}
            </div>
            <h3 style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{sec.name}</h3>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => openCreateNode(sec.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <IconPlus size={14} /> Thêm Nút
            </button>
            <button
              onClick={() => openCreateSection(sec.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <IconPlus size={14} /> Thêm Nhánh con
            </button>
            <button
              onClick={() => openEditSection(sec)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <IconEdit size={14} /> Sửa
            </button>
            <button
              onClick={() => setDeleteTarget({ type: 'section', id: sec.id })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <IconDelete size={14} /> Xóa
            </button>
          </div>
        </div>

        {/* Nodes inside this section */}
        {sec.nodes && sec.nodes.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
            marginBottom: sec.children && sec.children.length > 0 ? 16 : 0,
            background: '#f8fafc',
            padding: 14,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
          }}>
            {sec.nodes.map((node) => (
              <div key={node.id} style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 14,
                position: 'relative',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Vị trí {node.position}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEditNode(node)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}><IconEdit size={12} /></button>
                    <button onClick={() => setDeleteTarget({ type: 'node', id: node.id })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}><IconDelete size={12} /></button>
                  </div>
                </div>
                {node.header && <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{node.header}</h4>}
                <div style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: node.body }} />
                {node.imgUrl && (
                  <img src={node.imgUrl} alt="node asset" style={{ marginTop: 8, width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6 }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Child Sections (nested recursion) */}
        {sec.children && sec.children.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {renderTree(sec.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div>
      {/* Cascade Filters */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        boxShadow: '0 2px 8px rgba(15,23,42,0.02)',
      }}>
        <Select
          label="Khối lớp"
          value={selectedGradeId ?? ''}
          onChange={(e) => setSelectedGradeId(Number(e.target.value))}
        >
          {grades.map((g) => (
            <option key={g.id} value={g.id}>Khối {g.id}</option>
          ))}
        </Select>

        <Select
          label="Chủ đề"
          value={selectedTopicId ?? ''}
          onChange={(e) => setSelectedTopicId(Number(e.target.value) || null)}
          disabled={topics.length === 0}
        >
          {topics.length === 0 && <option value="">Chưa có chủ đề nào</option>}
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>

        <Select
          label="Bài học"
          value={selectedLessonId ?? ''}
          onChange={(e) => setSelectedLessonId(Number(e.target.value) || null)}
          disabled={lessons.length === 0}
        >
          {lessons.length === 0 && <option value="">Chưa có bài học nào</option>}
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>
      </div>

      {/* Main Actions & Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px 24px',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px 24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Cấu trúc Sơ đồ tư duy</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
              {selectedLessonId ? 'Xem cấu trúc cây sơ đồ nhánh và các nút kiến thức chi tiết.' : 'Vui lòng chọn bài học'}
            </p>
          </div>

          {selectedLessonId && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              height: '40px',
              boxSizing: 'border-box',
            }}>
              <button
                onClick={() => setMainViewMode('list')}
                style={{
                  height: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: mainViewMode === 'list' ? '#ffffff' : 'transparent',
                  color: mainViewMode === 'list' ? '#6c63ff' : '#475569',
                  boxShadow: mainViewMode === 'list' ? '0 2px 6px rgba(15,23,42,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
              >
                Danh sách CRUD
              </button>
              <button
                onClick={() => setMainViewMode('visual')}
                style={{
                  height: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: mainViewMode === 'visual' ? '#ffffff' : 'transparent',
                  color: mainViewMode === 'visual' ? '#6c63ff' : '#475569',
                  boxShadow: mainViewMode === 'visual' ? '0 2px 6px rgba(15,23,42,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
              >
                Sơ đồ trực quan 🎨
              </button>
            </div>
          )}
        </div>

        {selectedLessonId && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <Button
              variant="secondary"
              icon={<IconSparkles size={16} color="#6c63ff" />}
              onClick={() => {
                setAiPreviewSections([]);
                setAiModalOpen(true);
              }}
              style={{
                borderColor: '#c7d2fe',
                background: '#faf5ff',
                color: '#6c63ff',
                fontWeight: 600,
                height: '40px',
                boxSizing: 'border-box',
              }}
            >
              Tạo bằng AI (Gemini)
            </Button>
            <Button
              icon={<IconPlus size={16} />}
              onClick={() => openCreateSection()}
              style={{
                height: '40px',
                boxSizing: 'border-box',
              }}
            >
              Thêm Nhánh chính (Cấp 1)
            </Button>
          </div>
        )}
      </div>

      {/* Tree Visualization Area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : !selectedLessonId ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', color: '#64748b' }}>
          Vui lòng chọn Khối lớp, Chủ đề và Bài học để xem Sơ đồ tư duy.
        </div>
      ) : !lessonTree || !lessonTree.sections || lessonTree.sections.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <div style={{ marginBottom: 16 }}><IconMindMap size={48} color="#cbd5e1" /></div>
          Chưa có nhánh nào trong sơ đồ. Hãy tự thêm nhánh đầu tiên hoặc nhấn "Tạo bằng AI" để sinh nhanh từ tài liệu lịch sử!
        </div>
      ) : mainViewMode === 'visual' ? (
        <VisualMindMapDiagram
          rootTitle={lessons.find(l => l.id === selectedLessonId)?.name || 'Bài học'}
          sections={lessonTree.sections}
        />
      ) : (
        <div>
          {renderTree(lessonTree.sections)}
        </div>
      )}

      {/* Section Create/Edit Modal */}
      <Modal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={editSection ? 'Chỉnh sửa nhánh/phần' : 'Tạo nhánh/phần sơ đồ mới'}
      >
        <div style={{ width: 440, maxWidth: '100%' }}>
          <Input
            label="Tên nhánh/Phần chính"
            value={sectionForm.name}
            onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
            placeholder="Ví dụ: 1. Hoàn cảnh lịch sử"
          />
          <Input
            label="Mô tả tóm tắt (tùy chọn)"
            value={sectionForm.summary}
            onChange={(e) => setSectionForm({ ...sectionForm, summary: e.target.value })}
            placeholder="Mô tả ngắn của nhánh này"
          />
          <Input
            label="Thứ tự hiển thị"
            type="number"
            value={sectionForm.position}
            onChange={(e) => setSectionForm({ ...sectionForm, position: e.target.value })}
            placeholder="Thứ tự hiển thị (ví dụ: 1, 2, 3)"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button variant="secondary" onClick={() => setSectionModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={handleSaveSection} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu nhánh'}</Button>
          </div>
        </div>
      </Modal>

      {/* Node Create/Edit Modal */}
      <Modal
        open={nodeModalOpen}
        onClose={() => setNodeModalOpen(false)}
        title={editNode ? 'Chỉnh sửa nút kiến thức' : 'Thêm nút kiến thức mới'}
      >
        <div style={{ width: 460, maxWidth: '100%' }}>
          <Input
            label="Tiêu đề nút (Tùy chọn)"
            value={nodeForm.header}
            onChange={(e) => setNodeForm({ ...nodeForm, header: e.target.value })}
            placeholder="Ví dụ: Nguyên nhân trực tiếp"
          />
          <RichTextEditor
            label="Nội dung kiến thức chi tiết"
            value={nodeForm.body}
            onChange={(val) => setNodeForm({ ...nodeForm, body: val })}
            placeholder="Nhập nội dung tóm tắt chi tiết..."
          />
          <Input
            label="Đường dẫn ảnh minh họa (tùy chọn)"
            value={nodeForm.imgUrl}
            onChange={(e) => setNodeForm({ ...nodeForm, imgUrl: e.target.value })}
            placeholder="http://example.com/asset.jpg"
          />
          <Input
            label="Thứ tự hiển thị"
            type="number"
            value={nodeForm.position}
            onChange={(e) => setNodeForm({ ...nodeForm, position: e.target.value })}
            placeholder="Thứ tự hiển thị trong nhánh"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button variant="secondary" onClick={() => setNodeModalOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={handleSaveNode} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu nút'}</Button>
          </div>
        </div>
      </Modal>

      {/* AI Generate Mindmap Modal */}
      <Modal
        open={aiModalOpen}
        onClose={() => !aiGenerating && setAiModalOpen(false)}
        title="Tự động sinh Sơ đồ tư duy bằng Trợ lý AI"
        width={1000}
      >
        <div style={{ width: '100%', maxWidth: '100%', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>
          {/* Settings row */}
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 13, color: '#475569' }}>
            ✨ Sử dụng mô hình trí tuệ nhân tạo Gemini được thiết lập trên Backend.
          </div>

          {/* Text Input */}
          <Textarea
            label="Nội dung/Văn bản lịch sử cần tóm tắt"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Dán nội dung sách giáo khoa hoặc đoạn sử liệu vào đây..."
            rows={4}
            disabled={aiGenerating}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {aiPreviewSections.length > 0 && `Đang xem trước ${aiPreviewSections.length} nhánh lớn`}
            </span>
            <Button
              variant="secondary"
              icon={aiGenerating ? <Spinner size={14} /> : <IconSparkles size={14} color="#6c63ff" />}
              onClick={handleAIGenerate}
              disabled={aiGenerating}
              style={{
                borderColor: '#c7d2fe',
                background: '#faf5ff',
                color: '#6c63ff',
              }}
            >
              {aiGenerating ? 'Đang phân tích...' : 'Bắt đầu sinh bằng AI'}
            </Button>
          </div>

          {/* AI Result Preview Tree & Diagram Toggle */}
          {aiPreviewSections.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Tab Switcher for Preview */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '12px',
                width: 'fit-content',
                height: '40px',
                boxSizing: 'border-box',
              }}>
                <button
                  onClick={() => setAiPreviewMode('edit')}
                  style={{
                    height: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: aiPreviewMode === 'edit' ? '#ffffff' : 'transparent',
                    color: aiPreviewMode === 'edit' ? '#6c63ff' : '#475569',
                    boxShadow: aiPreviewMode === 'edit' ? '0 2px 6px rgba(15,23,42,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                >
                  Chỉnh sửa văn bản
                </button>
                <button
                  onClick={() => setAiPreviewMode('visual')}
                  style={{
                    height: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: aiPreviewMode === 'visual' ? '#ffffff' : 'transparent',
                    color: aiPreviewMode === 'visual' ? '#6c63ff' : '#475569',
                    boxShadow: aiPreviewMode === 'visual' ? '0 2px 6px rgba(15,23,42,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                >
                  Xem sơ đồ trực quan 🎨
                </button>
              </div>

              {aiPreviewMode === 'visual' ? (
                <div style={{ marginBottom: '16px' }}>
                  <VisualMindMapDiagram
                    rootTitle={lessons.find(l => l.id === selectedLessonId)?.name || 'Xem trước bài học'}
                    sections={aiPreviewSections}
                    height="350px"
                  />
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  background: '#f8fafc',
                  maxHeight: 280,
                  marginBottom: 16,
                }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#334155' }}>Xem trước & Chỉnh sửa cây Sơ đồ tư duy</h4>

                  {renderPreviewTree(aiPreviewSections)}

                  <button
                    onClick={() => setAiPreviewSections([...aiPreviewSections, { name: 'Nhánh mới', summary: '', position: aiPreviewSections.length + 1, nodes: [], children: [] }])}
                    style={{ width: '100%', padding: 10, marginTop: 12, border: '1px dashed #cbd5e1', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: 13 }}
                  >
                    + Thêm một nhánh chính cấp 1 trống
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <Button variant="secondary" onClick={() => setAiModalOpen(false)} disabled={aiGenerating || saving}>Hủy</Button>
            <Button
              onClick={handleAISave}
              disabled={aiGenerating || saving || aiPreviewSections.length === 0}
            >
              {saving ? 'Đang lưu...' : 'Lưu sơ đồ tư duy (Ghi đè)'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget?.type === 'section' ? 'Xóa nhánh sơ đồ' : 'Xóa nút kiến thức'}
        message={
          deleteTarget?.type === 'section'
            ? 'Bạn có chắc chắn muốn xóa nhánh sơ đồ này? Điều này sẽ xóa tất cả các nhánh con và các nút kiến thức thuộc nhánh này!'
            : 'Bạn có chắc chắn muốn xóa nút kiến thức này?'
        }
        loading={deleting}
      />
    </div>
  );
}
