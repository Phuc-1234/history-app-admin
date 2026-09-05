// src/components/content/MindMapPanel.tsx
import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import client from '../../api/client';
import type { GradeDto, TopicDto, LessonDto, SectionDto, NodeDto, AdminVideoDto } from '../../types/api';
import type { TabId, NavParams } from '../../pages/DashboardPage';
import type { ToastType } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input, Textarea, Select } from '../ui/FormField';
import { Spinner } from '../ui/Spinner';
import { IconMindMap, IconMagicWand, IconAlert, IconDelete } from '../ui/Icons';
import { RichTextEditor } from '../ui/RichTextEditor';
import { getDeleteErrorMessage } from '../../utils/deleteHelper';
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

// ─── Card geometry: layout and DOM must agree ────────────────────────────────
// computeTreeLayout positions cards using getNodeHeight(), so every card MUST
// render at exactly that height (fixed height + border-box + clamped text).
// Before this, cards grew with their text and overlapped the cards below —
// clicks landed on the wrong card (opening note 3 expanded note 2) and long
// text covered the +/- buttons of the rows underneath.

const lineClamp = (lines: number): CSSProperties =>
  ({
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }) as CSSProperties;

// Node keys must be unique even for data without ids (e.g. AI-generated
// preview). Duplicate keys made two nodes share one expandedNodes entry, so
// toggling one node expanded/collapsed the other one too.
function buildSectionKey(sec: any, parentKey: string, index: number): string {
  return sec.id != null ? `sec-${sec.id}` : `${parentKey}/s${index}`;
}

function buildNodeKey(secKey: string, node: any, index: number): string {
  return node.id != null ? `node-${node.id}` : `${secKey}/n${index}`;
}

interface VisualMindMapDiagramProps {
  rootTitle: string;
  sections: any[];
  height?: string;
  resetKey?: string | number;
  expandSectionTrigger?: { id: number; ts: number } | null;
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
        height: data.cardHeight ?? 140,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(79,70,229,0.25)',
        border: '1px solid rgba(255,255,255,0.1)',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 24px 12px 24px', flex: 1, minHeight: 0 }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
          Bài học gốc
        </div>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, lineHeight: 1.4, ...lineClamp(2) }}>
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

const depthColors = [
  { border: '#4f46e5', text: '#ffffff', headerBg: '#4f46e5', tagColor: '#ffffff' }, // 0: Root (Lesson)
  { border: '#818cf8', text: '#1e1b4b', headerBg: '#f5f3ff', tagColor: '#4f46e5' }, // 1: Cấp 1
  { border: '#38bdf8', text: '#0c4a6e', headerBg: '#f0f9ff', tagColor: '#0284c7' }, // 2: Cấp 2
  { border: '#34d399', text: '#064e3b', headerBg: '#ecfdf5', tagColor: '#059669' }, // 3: Cấp 3
  { border: '#fbbf24', text: '#78350f', headerBg: '#fffbeb', tagColor: '#d97706' }, // 4: Cấp 4
  { border: '#f472b6', text: '#500724', headerBg: '#fdf2f8', tagColor: '#db2777' }, // 5: Cấp 5
  { border: '#a78bfa', text: '#2e1065', headerBg: '#faf5ff', tagColor: '#7c3aed' }, // 6: Cấp 6
];

const SectionNode = ({ data }: any) => {
  const depth = data.depth || 0;
  const currentDepthColor = depthColors[Math.min(depth, depthColors.length - 1)];

  return (
    <div
      style={{
        background: '#ffffff',
        border: `2px solid ${currentDepthColor.border}`,
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
        width: '260px',
        height: data.cardHeight ?? (data.summary ? 170 : 140),
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        overflow: 'visible',
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
      <div style={{ padding: '14px 14px 10px 14px', flex: 1, minHeight: 0 }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', lineHeight: 1.4, ...lineClamp(2) }}>
          {data.name}
        </h4>
        {data.summary && (
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4, ...lineClamp(3) }}>
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
          type="button"
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
            zIndex: 30,
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
        height: data.cardHeight ?? (isExpanded ? 280 : 110),
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        overflow: 'hidden',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: 'transparent', border: 'none', left: 0, top: '50%' }}
      />

      <div style={{ padding: '12px 14px 10px 14px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
            Nút kiến thức
          </span>
          <button
            type="button"
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
              width: '18px',
              height: '18px',
              flexShrink: 0,
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
          <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 700, color: '#1f2937', ...lineClamp(2) }}>
            {data.header}
          </h5>
        )}

        {isExpanded ? (
          <div className="nodrag nowheel" style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingRight: '2px' }}>
            <div style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: data.body }} />
            {data.imgUrl && (
              <img
                src={data.imgUrl}
                alt="asset"
                style={{ marginTop: '8px', width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px' }}
              />
            )}
          </div>
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

// These heights are the CONTRACT between computeTreeLayout and the rendered
// cards: every card component renders at exactly its cardHeight (fixed height,
// border-box, clamped text). If a card renders taller, it overlaps the rows
// below and clicks start landing on the wrong card.
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
      // Declarative dimensions: every toggle rebuilds the node array, which
      // wipes ReactFlow's `measured` cache and leaves nodes visibility:hidden
      // until the ResizeObserver re-measures. While hidden, every +/- button
      // is dead — the "spam rồi nhấn không được" bug. Declared width/height
      // keep nodes visible instantly and pin the wrapper to the layout size.
      width: nodeW,
      height: nodeH,
      data: { ...node.data, depth, isCollapsed: node.isCollapsed, isExpanded: node.isExpanded, cardHeight: nodeH },
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
    
    const edgeColor = depthColors[Math.min(depth + 1, depthColors.length - 1)].border;
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
    width: nodeW,
    height: nodeH,
    data: { ...node.data, depth, isCollapsed: node.isCollapsed, isExpanded: node.isExpanded, cardHeight: nodeH },
  });

  const subtreeHeight = Math.max(nodeH, childrenTotalHeight);
  return { subtreeHeight, centerY };
}

function getInitialCollapsedSections(_sectionsList?: any[]): Set<string> {
  // Expand all branches by default
  return new Set<string>();
}

function findAncestorKeys(sectionsList: any[], targetId: number): string[] {
  const keys: string[] = [];
  const walk = (items: any[], parentKey: string): boolean => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = buildSectionKey(item, parentKey, i);
      if (item.id === targetId) {
        keys.push(key);
        return true;
      }
      if (item.children && item.children.length > 0) {
        if (walk(item.children, key)) {
          keys.push(key);
          return true;
        }
      }
    }
    return false;
  };
  walk(sectionsList, 'root');
  return keys;
}

// ─── VisualMindMapDiagramContent & Provider ───────────────────────────────────

function VisualMindMapDiagramContent({
  rootTitle,
  sections,
  height = '600px',
  resetKey,
  expandSectionTrigger,
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
  const lastFittedTitleRef = useRef<string | null>(null);

  const effectiveResetKey = resetKey !== undefined ? resetKey : rootTitle;
  const prevResetKeyRef = useRef<string | number | undefined>(effectiveResetKey);

  // Re-initialize collapsed sections ONLY when effectiveResetKey changes (e.g. lesson changed or fresh AI generation)
  useEffect(() => {
    if (prevResetKeyRef.current !== effectiveResetKey) {
      prevResetKeyRef.current = effectiveResetKey;
      setCollapsedSections(getInitialCollapsedSections(sections));
    }
  }, [effectiveResetKey, sections]);

  // When expandSectionTrigger fires (e.g. adding a new branch or saving an edited branch),
  // expand the target section and all its ancestors so it remains fully visible.
  useEffect(() => {
    if (expandSectionTrigger?.id != null) {
      const ancestorKeys = findAncestorKeys(sections, expandSectionTrigger.id);
      if (ancestorKeys.length > 0) {
        setCollapsedSections(prev => {
          const next = new Set(prev);
          ancestorKeys.forEach(k => next.delete(k));
          return next;
        });
      }
    }
  }, [expandSectionTrigger, sections]);

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

  const mapSectionToTreeNode = useCallback((sec: any, depth = 1, parentKey = 'root', index = 0): TreeNode => {
    const secKey = buildSectionKey(sec, parentKey, index);
    const isCollapsed = collapsedSections.has(secKey);

    const childNodes = (sec.nodes || []).map((node: any, idx: number) => {
      const nodeKey = buildNodeKey(secKey, node, idx);
      const isExpanded = expandedNodes.has(nodeKey);
      return {
        id: nodeKey,
        type: 'knowledge' as const,
        data: {
          id: node.id,
          header: node.header,
          body: node.body,
          videoId: node.videoId,
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

    const childSections = (sec.children || []).map((c: any, i: number) => mapSectionToTreeNode(c, depth + 1, secKey, i));

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
      children: sections.map((sec, i) => mapSectionToTreeNode(sec, 1, 'root', i)),
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
    
    if (lastFittedTitleRef.current !== rootTitle) {
      lastFittedTitleRef.current = rootTitle;
      setTimeout(() => {
        fitView({ duration: 300, padding: 0.1 });
      }, 50);
    }
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
        <Controls showInteractive={false} />
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

// ─── Tree Mutation Helpers (used by both Main MindMap & AI Preview) ───────────

function updateSectionInTree(list: any[], editId: number, data: { name: string; summary: string | null; position: number; parentSectionId: number | null }): any[] {
  return list.map(sec => {
    if (sec.id === editId) {
      return {
        ...sec,
        name: data.name,
        summary: data.summary,
        position: data.position,
        parentSectionId: data.parentSectionId,
      };
    }
    if (sec.children) {
      return { ...sec, children: updateSectionInTree(sec.children, editId, data) };
    }
    return sec;
  });
}

function addSectionToTree(list: any[], parentId: number | null, newSec: any): any[] {
  if (!parentId) {
    return [...list, newSec];
  }
  return list.map(sec => {
    if (sec.id === parentId) {
      return { ...sec, children: [...(sec.children || []), newSec] };
    }
    if (sec.children) {
      return { ...sec, children: addSectionToTree(sec.children, parentId, newSec) };
    }
    return sec;
  });
}

function updateNodeInTree(list: any[], editId: number, data: { header: string | null; body: string; position: number; videoId: string | null }): any[] {
  return list.map(sec => {
    if (sec.nodes) {
      const hasNode = sec.nodes.some((n: any) => n.id === editId);
      if (hasNode) {
        return {
          ...sec,
          nodes: sec.nodes.map((n: any) => {
            if (n.id === editId) {
              return { ...n, ...data };
            }
            return n;
          })
        };
      }
    }
    if (sec.children) {
      return { ...sec, children: updateNodeInTree(sec.children, editId, data) };
    }
    return sec;
  });
}

function addNodeToTree(list: any[], sectionId: number, newNd: any): any[] {
  return list.map(sec => {
    if (sec.id === sectionId) {
      return { ...sec, nodes: [...(sec.nodes || []), newNd] };
    }
    if (sec.children) {
      return { ...sec, children: addNodeToTree(sec.children, sectionId, newNd) };
    }
    return sec;
  });
}

function deleteSectionFromTree(list: any[], deleteId: number): any[] {
  return list
    .filter(sec => sec.id !== deleteId)
    .map(sec => {
      if (sec.children) {
        return { ...sec, children: deleteSectionFromTree(sec.children, deleteId) };
      }
      return sec;
    });
}

function deleteNodeFromTree(list: any[], deleteId: number): any[] {
  return list.map(sec => {
    if (sec.nodes) {
      sec.nodes = sec.nodes.filter((n: any) => n.id !== deleteId);
    }
    if (sec.children) {
      return { ...sec, children: deleteNodeFromTree(sec.children, deleteId) };
    }
    return sec;
  });
}

interface MindMapPanelProps {
  onToast: (msg: string, type: ToastType) => void;
  navParams?: NavParams;
  onNavigate?: (tab: TabId, params?: NavParams) => void;
}

export function MindMapPanel({ onToast, navParams, onNavigate: _onNavigate }: MindMapPanelProps) {
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [lessons, setLessons] = useState<LessonDto[]>([]);
  const [lessonTree, setLessonTree] = useState<{ sections: SectionDto[] } | null>(null);

  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Target scope for edits: 'main' operates on lessonTree and calls API; 'ai' operates locally on aiPreviewSections
  const [editScope, setEditScope] = useState<'main' | 'ai'>('main');

  // Controls expanding specific branch hierarchy (e.g. on new branch creation or edit)
  const [expandSectionTrigger, setExpandSectionTrigger] = useState<{ id: number; ts: number } | null>(null);
  const [aiGenVersion, setAiGenVersion] = useState(0);

  // Section Modal States
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<SectionDto | null>(null);
  const [sectionForm, setSectionForm] = useState({ name: '', summary: '', position: '', parentSectionId: '' });

  // Node Modal States
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [editNode, setEditNode] = useState<NodeDto | null>(null);
  const [nodeForm, setNodeForm] = useState({ header: '', body: '', videoId: '', position: '', sectionId: '' });
  const [videos, setVideos] = useState<AdminVideoDto[]>([]);

  // Delete Confirm States
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'section' | 'node'; id: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // AI Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreviewSections, setAiPreviewSections] = useState<any[]>([]);

  const [aiSaveConfirmOpen, setAiSaveConfirmOpen] = useState(false);
  const [deleteMindMapConfirmOpen, setDeleteMindMapConfirmOpen] = useState(false);

  // 1. Sequential Cascade Select Fetches
  useEffect(() => {
    let isMounted = true;
    const targetGradeId = navParams?.gradeId ? Number(navParams.gradeId) : null;
    const targetTopicId = navParams?.topicId ? Number(navParams.topicId) : null;
    const targetLessonId = navParams?.lessonId ? Number(navParams.lessonId) : null;

    async function loadCascade() {
      try {
        // High-speed parallel fetch if targetGradeId & targetTopicId are provided in navParams
        if (targetGradeId && targetTopicId) {
          const [gRes, tRes, lRes] = await Promise.all([
            client.get('/api/content/grades'),
            client.get(`/api/content/grades/${targetGradeId}/topics`),
            client.get(`/api/content/topics/${targetTopicId}/lessons`)
          ]);
          if (!isMounted) return;

          const gs: GradeDto[] = gRes.data.grades ?? [];
          const ts: TopicDto[] = tRes.data.topics ?? [];
          const ls: LessonDto[] = lRes.data.lessons ?? [];

          setGrades(gs);
          setTopics(ts);
          setLessons(ls);

          setSelectedGradeId(targetGradeId);
          setSelectedTopicId(targetTopicId);

          const activeLessonId = targetLessonId && ls.some(l => l.id === targetLessonId)
            ? targetLessonId
            : (ls.length ? ls[0].id : null);

          setSelectedLessonId(activeLessonId);
          return;
        }

        // Step 1: Fetch Grades
        const gRes = await client.get('/api/content/grades');
        if (!isMounted) return;
        const gs: GradeDto[] = gRes.data.grades ?? [];
        setGrades(gs);

        const activeGradeId = targetGradeId && gs.some(g => g.id === targetGradeId)
          ? targetGradeId
          : (gs.length ? gs[0].id : null);

        setSelectedGradeId(activeGradeId);

        if (!activeGradeId) {
          setTopics([]);
          setLessons([]);
          setSelectedTopicId(null);
          setSelectedLessonId(null);
          return;
        }

        // Step 2: Fetch Topics for activeGradeId
        const tRes = await client.get(`/api/content/grades/${activeGradeId}/topics`);
        if (!isMounted) return;
        const ts: TopicDto[] = tRes.data.topics ?? [];
        setTopics(ts);

        const activeTopicId = targetTopicId && ts.some(t => t.id === targetTopicId)
          ? targetTopicId
          : (ts.length ? ts[0].id : null);

        setSelectedTopicId(activeTopicId);

        if (!activeTopicId) {
          setLessons([]);
          setSelectedLessonId(null);
          return;
        }

        // Step 3: Fetch Lessons for activeTopicId
        const lRes = await client.get(`/api/content/topics/${activeTopicId}/lessons`);
        if (!isMounted) return;
        const ls: LessonDto[] = lRes.data.lessons ?? [];
        setLessons(ls);

        const activeLessonId = targetLessonId && ls.some(l => l.id === targetLessonId)
          ? targetLessonId
          : (ls.length ? ls[0].id : null);

        setSelectedLessonId(activeLessonId);

      } catch (err) {
        console.error('Error loading MindMap cascade:', err);
      }
    }

    loadCascade();
    client.get('/api/admin/videos').then((r) => { if (isMounted) setVideos(r.data.videos ?? []); }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [navParams?.gradeId, navParams?.topicId, navParams?.lessonId]);

  const handleGradeChange = async (gId: number | null) => {
    setSelectedGradeId(gId);
    setLessonTree(null);
    if (!gId) {
      setTopics([]);
      setLessons([]);
      setSelectedTopicId(null);
      setSelectedLessonId(null);
      return;
    }
    try {
      const res = await client.get(`/api/content/grades/${gId}/topics`);
      const ts: TopicDto[] = res.data.topics ?? [];
      setTopics(ts);
      if (ts.length > 0) {
        const firstTopicId = ts[0].id;
        setSelectedTopicId(firstTopicId);
        const lRes = await client.get(`/api/content/topics/${firstTopicId}/lessons`);
        const ls: LessonDto[] = lRes.data.lessons ?? [];
        setLessons(ls);
        setSelectedLessonId(ls.length > 0 ? ls[0].id : null);
      } else {
        setSelectedTopicId(null);
        setLessons([]);
        setSelectedLessonId(null);
      }
    } catch {
      onToast('Không tải được danh sách chủ đề', 'error');
    }
  };

  const handleTopicChange = async (tId: number | null) => {
    setSelectedTopicId(tId);
    setLessonTree(null);
    if (!tId) {
      setLessons([]);
      setSelectedLessonId(null);
      return;
    }
    try {
      const res = await client.get(`/api/content/topics/${tId}/lessons`);
      const ls: LessonDto[] = res.data.lessons ?? [];
      setLessons(ls);
      setSelectedLessonId(ls.length > 0 ? ls[0].id : null);
    } catch {
      onToast('Không tải được danh sách bài học', 'error');
    }
  };

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
    if (selectedLessonId) {
      setLessonTree(null);
      fetchLessonTree(selectedLessonId);
    }
  }, [selectedLessonId, fetchLessonTree]);

  // 2. Section CRUD Handlers
  const openCreateSection = (parentSecId?: number, scope: 'main' | 'ai' = 'main') => {
    setEditScope(scope);
    setEditSection(null);
    setSectionForm({
      name: '',
      summary: '',
      position: '1',
      parentSectionId: parentSecId ? String(parentSecId) : '',
    });
    if (parentSecId) {
      setExpandSectionTrigger({ id: parentSecId, ts: Date.now() });
    }
    setSectionModalOpen(true);
  };

  const openEditSection = (sec: SectionDto, scope: 'main' | 'ai' = 'main') => {
    setEditScope(scope);
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
    const position = Number(sectionForm.position);
    if (isNaN(position) || position < 0) {
      onToast('Thứ tự hiển thị phải là số không âm', 'error');
      return;
    }

    const parentId = sectionForm.parentSectionId ? Number(sectionForm.parentSectionId) : null;
    if (parentId) {
      setExpandSectionTrigger({ id: parentId, ts: Date.now() });
    } else if (editSection) {
      setExpandSectionTrigger({ id: editSection.id, ts: Date.now() });
    }

    if (editScope === 'ai') {
      if (editSection) {
        setAiPreviewSections(prev => updateSectionInTree(prev, editSection.id, {
          name: sectionForm.name.trim(),
          summary: sectionForm.summary.trim() || null,
          position: position || 1,
          parentSectionId: parentId,
        }));
        onToast('Đã cập nhật nhánh xem trước', 'success');
      } else {
        const newSec = {
          id: Date.now(),
          name: sectionForm.name.trim(),
          summary: sectionForm.summary.trim() || null,
          position: position || 1,
          lessonId: selectedLessonId,
          parentSectionId: parentId || null,
          nodes: [],
          children: [],
        };
        setAiPreviewSections(prev => addSectionToTree(prev, parentId, newSec));
        onToast('Đã tạo nhánh xem trước mới', 'success');
      }
      setSectionModalOpen(false);
      return;
    }

    if (!selectedLessonId || !lessonTree) return;
    try {
      setSaving(true);
      const currentSections = lessonTree.sections || [];
      let updatedSections: any[] = [];

      if (editSection) {
        updatedSections = updateSectionInTree(currentSections, editSection.id, {
          name: sectionForm.name.trim(),
          summary: sectionForm.summary.trim() || null,
          position: position || 1,
          parentSectionId: parentId,
        });
      } else {
        const newSec = {
          id: Date.now(),
          name: sectionForm.name.trim(),
          summary: sectionForm.summary.trim() || null,
          position: position || 1,
          lessonId: selectedLessonId,
          parentSectionId: parentId || null,
          nodes: [],
          children: [],
        };
        updatedSections = addSectionToTree(currentSections, parentId, newSec);
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
  const openCreateNode = (secId: number, scope: 'main' | 'ai' = 'main') => {
    setEditScope(scope);
    setEditNode(null);
    setNodeForm({
      header: '',
      body: '',
      videoId: '',
      position: '1',
      sectionId: String(secId),
    });
    if (secId) {
      setExpandSectionTrigger({ id: secId, ts: Date.now() });
    }
    setNodeModalOpen(true);
  };

  const openEditNode = (node: NodeDto, scope: 'main' | 'ai' = 'main') => {
    setEditScope(scope);
    setEditNode(node);
    setNodeForm({
      header: node.header ?? '',
      body: node.body,
      videoId: node.videoId ?? '',
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
    const position = Number(nodeForm.position);
    if (isNaN(position) || position < 0) {
      onToast('Thứ tự hiển thị phải là số không âm', 'error');
      return;
    }
    const sectionId = Number(nodeForm.sectionId);
    if (sectionId) {
      setExpandSectionTrigger({ id: sectionId, ts: Date.now() });
    }

    if (editScope === 'ai') {
      if (editNode) {
        setAiPreviewSections(prev => updateNodeInTree(prev, editNode.id, {
          header: nodeForm.header.trim() || null,
          body: nodeForm.body.trim(),
          position: position || 1,
          videoId: nodeForm.videoId || null,
        }));
        onToast('Đã cập nhật nút kiến thức xem trước', 'success');
      } else {
        const newNd = {
          id: Date.now(),
          header: nodeForm.header.trim() || null,
          body: nodeForm.body.trim(),
          position: position || 1,
          videoId: nodeForm.videoId || null,
          sectionId,
        };
        setAiPreviewSections(prev => addNodeToTree(prev, sectionId, newNd));
        onToast('Đã tạo nút kiến thức xem trước mới', 'success');
      }
      setNodeModalOpen(false);
      return;
    }

    if (!selectedLessonId || !lessonTree) return;
    try {
      setSaving(true);
      const currentSections = lessonTree.sections || [];
      let updatedSections: any[] = [];

      if (editNode) {
        updatedSections = updateNodeInTree(currentSections, editNode.id, {
          header: nodeForm.header.trim() || null,
          body: nodeForm.body.trim(),
          position: position || 1,
          videoId: nodeForm.videoId || null,
        });
      } else {
        const newNd = {
          id: Date.now(),
          header: nodeForm.header.trim() || null,
          body: nodeForm.body.trim(),
          position: position || 1,
          videoId: nodeForm.videoId || null,
          sectionId,
        };
        updatedSections = addNodeToTree(currentSections, sectionId, newNd);
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
    if (!deleteTarget) return;

    if (editScope === 'ai') {
      if (deleteTarget.type === 'section') {
        setAiPreviewSections(prev => deleteSectionFromTree(prev, deleteTarget.id));
      } else {
        setAiPreviewSections(prev => deleteNodeFromTree(prev, deleteTarget.id));
      }
      onToast(deleteTarget.type === 'section' ? 'Đã xóa nhánh sơ đồ xem trước' : 'Đã xóa nút kiến thức xem trước', 'success');
      setDeleteTarget(null);
      return;
    }

    if (!selectedLessonId || !lessonTree) return;
    try {
      setDeleting(true);
      const currentSections = lessonTree.sections || [];
      let updatedSections: any[] = [];

      if (deleteTarget.type === 'section') {
        updatedSections = deleteSectionFromTree(currentSections, deleteTarget.id);
      } else {
        updatedSections = deleteNodeFromTree(currentSections, deleteTarget.id);
      }

      await client.post(`/api/admin/lessons/${selectedLessonId}/mindmap/bulk`, {
        sections: updatedSections,
      });
      onToast(deleteTarget.type === 'section' ? 'Đã xóa nhánh sơ đồ' : 'Đã xóa nút kiến thức', 'success');
      setDeleteTarget(null);
      fetchLessonTree(selectedLessonId);
    } catch (err: any) {
      onToast(getDeleteErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteMindMap = async () => {
    if (!selectedLessonId) return;
    try {
      setDeleting(true);
      await client.delete(`/api/admin/lessons/${selectedLessonId}/mindmap`);
      onToast('Đã xóa sơ đồ tư duy của bài học', 'success');
      setDeleteMindMapConfirmOpen(false);
      fetchLessonTree(selectedLessonId);
    } catch (err: any) {
      onToast(getDeleteErrorMessage(err), 'error');
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
      setAiGenVersion(v => v + 1);
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
            onChange={(e) => handleGradeChange(Number(e.target.value) || null)}
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
            onChange={(e) => handleTopicChange(Number(e.target.value) || null)}
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
            {lessonTree && lessonTree.sections && lessonTree.sections.length > 0 && (
              <Button
                variant="danger"
                icon={<IconDelete size={14} />}
                onClick={() => setDeleteMindMapConfirmOpen(true)}
                disabled={deleting}
                style={{
                  height: '34px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              >
                Xóa sơ đồ tư duy
              </Button>
            )}
            <Button
              variant="secondary"
              icon={<IconMagicWand size={14} color="#c37938" />}
              onClick={() => {
                setAiPreviewSections([]);
                setAiModalOpen(true);
              }}
              style={{
                borderColor: 'rgba(195, 121, 56, 0.25)',
                background: 'rgba(195, 121, 56, 0.05)',
                color: '#c37938',
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
      {loading && !lessonTree ? (
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
        <div style={{ position: 'relative' }}>
          <VisualMindMapDiagram
            rootTitle={lessons.find(l => l.id === selectedLessonId)?.name || 'Bài học'}
            sections={lessonTree.sections}
            height="calc(100vh - 230px)"
            resetKey={selectedLessonId ?? 'empty'}
            expandSectionTrigger={expandSectionTrigger}
            onAddSection={(parentId) => openCreateSection(parentId, 'main')}
            onEditSection={(sec) => openEditSection(sec, 'main')}
            onDeleteSection={(id) => {
              setEditScope('main');
              setDeleteTarget({ type: 'section', id });
            }}
            onAddNode={(secId) => openCreateNode(secId, 'main')}
            onEditNode={(node) => openEditNode(node, 'main')}
            onDeleteNode={(id) => {
              setEditScope('main');
              setDeleteTarget({ type: 'node', id });
            }}
          />
          {loading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '16px',
              zIndex: 1000,
            }}>
              <Spinner size={36} />
            </div>
          )}
        </div>
      )}

      {/* Section Create/Edit Modal */}
      <Modal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={editSection ? 'Chỉnh sửa nhánh/phần' : 'Tạo nhánh/phần sơ đồ mới'}
        zIndex={1050}
      >
        <div style={{ width: 440, maxWidth: '100%' }}>
          <Input
            label="nội dung nhánh/lá"
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
            min={0}
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
        zIndex={1050}
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
          <Select
            label="Video liên kết (Tùy chọn)"
            value={nodeForm.videoId}
            onChange={(e) => setNodeForm({ ...nodeForm, videoId: e.target.value })}
          >
            <option value="">— Không liên kết video —</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </Select>
          <Input
            label="Thứ tự hiển thị"
            type="number"
            min={0}
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
        width={1100}
      >
        <div style={{ width: '100%', maxWidth: '100%', maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '4px' }}>
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
            <span>AI có thể mắc sai sót. Bạn có thể thêm, sửa, xóa trực tiếp trên sơ đồ xem trước bên dưới trước khi lưu.</span>
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
              {aiPreviewSections.length > 0 && `Đang xem trước ${aiPreviewSections.length} nhánh lớn (Có thể chỉnh sửa trực tiếp)`}
            </span>
            <Button
              variant="secondary"
              icon={aiGenerating ? <Spinner size={14} /> : <IconMagicWand size={14} color="#c37938" />}
              onClick={handleAIGenerate}
              disabled={aiGenerating}
              style={{
                borderColor: 'rgba(195, 121, 56, 0.25)',
                background: 'rgba(195, 121, 56, 0.05)',
                color: '#c37938',
              }}
            >
              {aiGenerating ? 'Đang phân tích...' : 'Bắt đầu sinh bằng AI'}
            </Button>
          </div>

          {/* AI Result Preview Visual Diagram */}
          {aiPreviewSections.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Xem trước & chỉnh sửa sơ đồ trực quan 🎨</span>
              </div>
              <VisualMindMapDiagram
                rootTitle={lessons.find(l => l.id === selectedLessonId)?.name || 'Xem trước bài học'}
                sections={aiPreviewSections}
                height="460px"
                resetKey={`ai-gen-${aiGenVersion}`}
                expandSectionTrigger={expandSectionTrigger}
                onAddSection={(parentId) => openCreateSection(parentId, 'ai')}
                onEditSection={(sec) => openEditSection(sec, 'ai')}
                onDeleteSection={(id) => {
                  setEditScope('ai');
                  setDeleteTarget({ type: 'section', id });
                }}
                onAddNode={(secId) => openCreateNode(secId, 'ai')}
                onEditNode={(node) => openEditNode(node, 'ai')}
                onDeleteNode={(id) => {
                  setEditScope('ai');
                  setDeleteTarget({ type: 'node', id });
                }}
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

      {/* Delete Entire Mind Map Confirmation */}
      <ConfirmDialog
        open={deleteMindMapConfirmOpen}
        onCancel={() => setDeleteMindMapConfirmOpen(false)}
        onConfirm={handleDeleteMindMap}
        title="Xóa sơ đồ tư duy"
        message="Bạn có chắc chắn muốn xóa toàn bộ sơ đồ tư duy của bài học này? Tất cả các nhánh sơ đồ tư duy sẽ bị xóa và bài học sẽ không còn sơ đồ tư duy."
        loading={deleting}
      />
    </div>
  );
}
