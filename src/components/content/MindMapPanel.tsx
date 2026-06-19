// src/components/content/MindMapPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import type { GradeDto, TopicDto, LessonDto, SectionDto, NodeDto } from '../../types/api';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Textarea } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconMindMap, IconMagicWand, IconAlert } from '../ui/Icons';
import { RichTextEditor } from '../ui/RichTextEditor';
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

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
  onAddSection?: (parentId?: number) => void;
  onEditSection?: (sec: any) => void;
  onDeleteSection?: (id: number) => void;
  onAddNode?: (secId: number) => void;
  onEditNode?: (node: any) => void;
  onDeleteNode?: (id: number) => void;
}

// ─── Custom React Flow Nodes ──────────────────────────────────────────────────

const RootNode = ({ data }: any) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
        color: '#ffffff',
        borderRadius: '16px',
        width: '280px',
        boxShadow: '0 10px 25px rgba(79,70,229,0.25)',
        border: '1px solid rgba(255,255,255,0.1)',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 24px 12px 24px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
          Bài học gốc
        </div>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, lineHeight: 1.4 }}>
          {data.label}
        </h3>
      </div>
      
      {data.onAddSection && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'flex-start',
          background: 'rgba(255,255,255,0.05)',
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onAddSection();
            }}
            className="nodrag"
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0,
            }}
          >
            ➕ Thêm Nhánh chính (Cấp 1)
          </button>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: 'transparent', border: 'none', right: 0, top: '50%' }}
      />
    </div>
  );
};

const SectionNode = ({ data }: any) => {
  const depth = data.depth || 0;
  const colors = [
    { border: '#4f46e5', text: '#ffffff' },
    { border: '#818cf8', text: '#1e1b4b', headerBg: '#f5f3ff', tagColor: '#4f46e5' },
    { border: '#38bdf8', text: '#0c4a6e', headerBg: '#f0f9ff', tagColor: '#0284c7' },
    { border: '#34d399', text: '#064e3b', headerBg: '#ecfdf5', tagColor: '#059669' },
  ];
  const currentDepthColor = colors[Math.min(depth, colors.length - 1)];

  return (
    <div
      style={{
        background: '#ffffff',
        border: `2px solid ${currentDepthColor.border}`,
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
        width: '260px',
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', left: 0, top: '50%' }}
      />
      
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
          Nhánh cấp {depth}
        </span>
        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
          Vị trí {data.position}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 14px 10px 14px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
          {data.name}
        </h4>
        {data.summary && (
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
            {data.summary}
          </p>
        )}
      </div>

      {/* Action Buttons Footer */}
      {(data.onAddSection || data.onAddNode || data.onEditSection || data.onDeleteSection) && (
        <div style={{
          borderTop: '1px solid #f1f5f9',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc',
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onAddSection(data.id);
              }}
              className="nodrag"
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              + Nhánh
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onAddNode(data.id);
              }}
              className="nodrag"
              style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              + Nút
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onEditSection(data.rawSection);
              }}
              className="nodrag"
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer', padding: 0 }}
            >
              Sửa
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteSection(data.id);
              }}
              className="nodrag"
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', padding: 0 }}
            >
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button for collapsing branches */}
      {data.hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse();
          }}
          className="nodrag"
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
        >
          {data.isCollapsed ? '+' : '-'}
        </button>
      )}

      {!data.isCollapsed && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: 'transparent', border: 'none', right: 0, top: '50%' }}
        />
      )}
    </div>
  );
};

const KnowledgeNode = ({ data }: any) => {
  const isExpanded = data.isExpanded;

  return (
    <div
      style={{
        background: '#ffffff',
        border: isExpanded ? '2px solid #10b981' : '1px solid #e2e8f0',
        borderRadius: '10px',
        width: '240px',
        boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', left: 0, top: '50%' }}
      />
      
      <div style={{ padding: '12px 14px 10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
            Nút kiến thức
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleExpand();
            }}
            className="nodrag"
            style={{
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
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {isExpanded ? '-' : '+'}
          </button>
        </div>

        {data.header && (
          <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 700, color: '#1f2937' }}>
            {data.header}
          </h5>
        )}

        {isExpanded ? (
          <>
            <div style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: data.body }} />
            {data.imgUrl && (
              <img
                src={data.imgUrl}
                alt="asset"
                style={{ marginTop: '8px', width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px' }}
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
            {stripHtml(data.body)}
          </p>
        )}
      </div>

      {/* Action Footer */}
      {(data.onEditNode || data.onDeleteNode) && (
        <div style={{
          borderTop: '1px solid #f1f5f9',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: '#f8fafc',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onEditNode(data.rawNode);
            }}
            className="nodrag"
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            Sửa
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onDeleteNode(data.id);
            }}
            className="nodrag"
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            Xóa
          </button>
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  root: RootNode,
  section: SectionNode,
  knowledge: KnowledgeNode,
};

// ─── Layout & Tree Math Helpers ───────────────────────────────────────────────

interface TreeNode {
  id: string;
  type: 'root' | 'section' | 'knowledge';
  data: any;
  children: TreeNode[];
  isCollapsed?: boolean;
  isExpanded?: boolean;
}

const getNodeHeight = (node: TreeNode) => {
  if (node.type === 'root') return 140;
  if (node.type === 'knowledge') {
    return node.isExpanded ? 280 : 110;
  }
  return node.data.summary ? 170 : 140;
};

const getNodeWidth = (node: TreeNode) => {
  if (node.type === 'root') return 280;
  if (node.type === 'section') return 260;
  return 240;
};

function computeTreeLayout(
  node: TreeNode,
  depth: number,
  startY: number,
  parentX: number,
  parentWidth: number,
  gapX: number,
  gapY: number,
  nodesList: any[],
  edgesList: any[]
): { subtreeHeight: number; centerY: number } {
  const nodeW = getNodeWidth(node);
  const nodeH = getNodeHeight(node);
  const currentX = depth === 0 ? 0 : parentX + parentWidth + gapX;

  const children = node.isCollapsed ? [] : node.children;

  if (children.length === 0) {
    const centerY = startY + nodeH / 2;
    nodesList.push({
      id: node.id,
      type: node.type,
      position: { x: currentX, y: startY },
      draggable: true,
      data: { ...node.data, depth, isCollapsed: node.isCollapsed, isExpanded: node.isExpanded },
    });
    return { subtreeHeight: nodeH, centerY };
  }

  let currentY = startY;
  const childCenterYs: number[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const { subtreeHeight: cSubtreeH, centerY: cCenterY } = computeTreeLayout(
      child,
      depth + 1,
      currentY,
      currentX,
      nodeW,
      gapX,
      gapY,
      nodesList,
      edgesList
    );
    childCenterYs.push(cCenterY);
    
    const edgeColor = depth === 0 ? '#818cf8' : depth === 1 ? '#38bdf8' : '#34d399';
    edgesList.push({
      id: `edge-${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      type: 'smoothstep',
      style: { stroke: edgeColor, strokeWidth: depth === 0 ? 3 : 2 },
      pathOptions: { borderRadius: 12 },
    });
    currentY += cSubtreeH + gapY;
  }

  const childrenTotalHeight = currentY - startY - gapY;
  const centerY = startY + childrenTotalHeight / 2;
  const nodeY = centerY - nodeH / 2;

  nodesList.push({
    id: node.id,
    type: node.type,
    position: { x: currentX, y: nodeY },
    draggable: true,
    data: { ...node.data, depth, isCollapsed: node.isCollapsed, isExpanded: node.isExpanded },
  });

  const subtreeHeight = Math.max(nodeH, childrenTotalHeight);
  return { subtreeHeight, centerY };
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

// ─── VisualMindMapDiagramContent & Provider ───────────────────────────────────

function VisualMindMapDiagramContent({
  rootTitle,
  sections,
  height = '600px',
  onAddSection,
  onEditSection,
  onDeleteSection,
  onAddNode,
  onEditNode,
  onDeleteNode,
}: VisualMindMapDiagramProps) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => getInitialCollapsedSections(sections));
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCollapsedSections(getInitialCollapsedSections(sections));
  }, [sections]);

  const toggleSection = useCallback((secKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(secKey)) {
        next.delete(secKey);
      } else {
        next.add(secKey);
      }
      return next;
    });
  }, []);

  const toggleNode = useCallback((nodeKey: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  }, []);

  const mapSectionToTreeNode = useCallback((sec: any, depth = 1): TreeNode => {
    const secKey = sec.id ? `sec-${sec.id}` : `sec-${sec.name}`;
    const isCollapsed = collapsedSections.has(secKey);
    
    const childNodes = (sec.nodes || []).map((node: any) => {
      const nodeKey = node.id ? `node-${node.id}` : `node-${node.header || node.body}`;
      const isExpanded = expandedNodes.has(nodeKey);
      return {
        id: nodeKey,
        type: 'knowledge' as const,
        data: {
          id: node.id,
          header: node.header,
          body: node.body,
          imgUrl: node.imgUrl,
          position: node.position,
          rawNode: node,
          onToggleExpand: () => toggleNode(nodeKey),
          onEditNode,
          onDeleteNode,
        },
        children: [],
        isExpanded,
      };
    });

    const childSections = (sec.children || []).map((c: any) => mapSectionToTreeNode(c, depth + 1));

    return {
      id: secKey,
      type: 'section',
      data: {
        id: sec.id,
        name: sec.name,
        summary: sec.summary,
        position: sec.position,
        hasChildren: (sec.children && sec.children.length > 0) || (sec.nodes && sec.nodes.length > 0),
        rawSection: sec,
        onToggleCollapse: () => toggleSection(secKey),
        onAddSection,
        onEditSection,
        onDeleteSection,
        onAddNode,
        onDeleteNode,
      },
      children: [...childSections, ...childNodes],
      isCollapsed,
    };
  }, [collapsedSections, expandedNodes, toggleSection, toggleNode, onAddSection, onEditSection, onDeleteSection, onAddNode, onEditNode, onDeleteNode]);

  useEffect(() => {
    const rootNode: TreeNode = {
      id: 'root',
      type: 'root',
      data: {
        label: rootTitle,
        onAddSection: () => onAddSection && onAddSection(),
      },
      children: sections.map(sec => mapSectionToTreeNode(sec, 1)),
      isCollapsed: false,
    };

    const calculatedNodes: any[] = [];
    const calculatedEdges: any[] = [];
    
    computeTreeLayout(
      rootNode,
      0, // depth
      0, // startY
      0, // parentX
      0, // parentWidth
      120, // gapX
      36, // gapY
      calculatedNodes,
      calculatedEdges
    );

    setNodes(calculatedNodes);
    setEdges(calculatedEdges);
    
    setTimeout(() => {
      fitView({ duration: 300, padding: 0.1 });
    }, 50);
  }, [sections, collapsedSections, expandedNodes, rootTitle, mapSectionToTreeNode, fitView, setNodes, setEdges, onAddSection]);

  return (
    <div
      style={{
        width: '100%',
        height: height,
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={1.5}
        fitView
      >
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function VisualMindMapDiagram(props: VisualMindMapDiagramProps) {
  return (
    <ReactFlowProvider>
      <VisualMindMapDiagramContent {...props} />
    </ReactFlowProvider>
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

  const [aiSaveConfirmOpen, setAiSaveConfirmOpen] = useState(false);

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





  return (
    <div>
      {/* Cascade Filters */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '10px 16px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px',
        boxShadow: '0 2px 8px rgba(15,23,42,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Khối lớp:</label>
          <select
            value={selectedGradeId ?? ''}
            onChange={(e) => setSelectedGradeId(Number(e.target.value))}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '6px 12px',
              color: '#0f172a',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>Khối {g.id}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Chủ đề:</label>
          <select
            value={selectedTopicId ?? ''}
            onChange={(e) => setSelectedTopicId(Number(e.target.value) || null)}
            disabled={topics.length === 0}
            style={{
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '6px 12px',
              color: '#0f172a',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {topics.length === 0 && <option value="">Chưa có chủ đề nào</option>}
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Bài học:</label>
          <select
            value={selectedLessonId ?? ''}
            onChange={(e) => setSelectedLessonId(Number(e.target.value) || null)}
            disabled={lessons.length === 0}
            style={{
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '6px 12px',
              color: '#0f172a',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {lessons.length === 0 && <option value="">Chưa có bài học nào</option>}
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Actions & Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px 24px',
        marginBottom: 12
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Cấu trúc Sơ đồ tư duy</h2>
        </div>

        {selectedLessonId && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <Button
              variant="secondary"
              icon={<IconMagicWand size={14} color="#6c63ff" />}
              onClick={() => {
                setAiPreviewSections([]);
                setAiModalOpen(true);
              }}
              style={{
                borderColor: '#c7d2fe',
                background: '#faf5ff',
                color: '#6c63ff',
                fontWeight: 600,
                height: '34px',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            >
              Trợ lý AI
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
      ) : (
        <VisualMindMapDiagram
          rootTitle={lessons.find(l => l.id === selectedLessonId)?.name || 'Bài học'}
          sections={lessonTree.sections}
          height="calc(100vh - 230px)"
          onAddSection={openCreateSection}
          onEditSection={openEditSection}
          onDeleteSection={(id) => setDeleteTarget({ type: 'section', id })}
          onAddNode={openCreateNode}
          onEditNode={openEditNode}
          onDeleteNode={(id) => setDeleteTarget({ type: 'node', id })}
        />
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
        <div style={{ width: '100%', maxWidth: '100%', maxHeight: '76vh', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Settings row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: '#fffbeb',
            borderRadius: 8,
            border: '1px solid #fef3c7',
            marginBottom: 16,
            fontSize: 13,
            color: '#b45309',
            width: 'fit-content',
            fontWeight: 500,
          }}>
            <IconAlert size={16} color="#b45309" />
            <span>AI có thể mắc sai sót. Hãy kiểm tra kỹ thông tin trước khi lưu.</span>
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
              icon={aiGenerating ? <Spinner size={14} /> : <IconMagicWand size={14} color="#6c63ff" />}
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

          {/* AI Result Preview Visual Diagram */}
          {aiPreviewSections.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Xem trước sơ đồ trực quan từ AI 🎨</span>
              </div>
              <VisualMindMapDiagram
                rootTitle={lessons.find(l => l.id === selectedLessonId)?.name || 'Xem trước bài học'}
                sections={aiPreviewSections}
                height="320px"
              />
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <Button variant="secondary" onClick={() => setAiModalOpen(false)} disabled={aiGenerating || saving}>Hủy</Button>
            <Button
              onClick={() => setAiSaveConfirmOpen(true)}
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

      {/* AI Save Confirmation */}
      <ConfirmDialog
        open={aiSaveConfirmOpen}
        onCancel={() => setAiSaveConfirmOpen(false)}
        onConfirm={async () => {
          setAiSaveConfirmOpen(false);
          await handleAISave();
        }}
        title="Xác nhận ghi đè sơ đồ tư duy"
        message="Hành động này sẽ ghi đè và THAY THẾ hoàn toàn sơ đồ tư duy hiện tại của bài học này bằng cấu trúc sơ đồ tư duy mới từ AI. Bạn có chắc chắn muốn tiếp tục không?"
        loading={saving}
      />
    </div>
  );
}
