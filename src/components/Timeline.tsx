import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type {
  TimelineData,
  TimelineEvent,
  TimelineViewState
} from '../types/timeline';

interface TimelineProps {
  data: TimelineData;
  viewState: TimelineViewState;
  onViewStateChange: (viewState: TimelineViewState) => void;
  onNodeClick?: (nodeId: string, event: TimelineEvent) => void;
  onNodeDoubleClick?: (nodeId: string, event: TimelineEvent) => void;
  onConnectionClick?: (connectionId: string, event: TimelineEvent) => void;
  onBackgroundClick?: (event: TimelineEvent) => void;
  width?: number;
  height?: number;
}

export function Timeline({
  data,
  viewState,
  onViewStateChange,
  onNodeClick,
  onNodeDoubleClick,
  onConnectionClick,
  onBackgroundClick,
  width = 800,
  height = 400,
}: TimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickNodeId, setLastClickNodeId] = useState<string>('');
  const [renderStats, setRenderStats] = useState({ nodes: 0, connections: 0, renderTime: 0 });

  // 计算变换矩阵
  const transform = `translate(${viewState.offsetX}, ${viewState.offsetY}) scale(${viewState.zoom})`;

  // 性能优化：计算可见区域
  const visibleBounds = useMemo(() => {
    const margin = 100; // 额外的边距
    return {
      left: (-viewState.offsetX / viewState.zoom) - margin,
      top: (-viewState.offsetY / viewState.zoom) - margin,
      right: (-viewState.offsetX + width) / viewState.zoom + margin,
      bottom: (-viewState.offsetY + height) / viewState.zoom + margin,
    };
  }, [viewState.offsetX, viewState.offsetY, viewState.zoom, width, height]);

  // 过滤可见的节点和连接
  const visibleNodes = useMemo(() => {
    return data.nodes.filter(node =>
      node.x >= visibleBounds.left &&
      node.x <= visibleBounds.right &&
      node.y >= visibleBounds.top &&
      node.y <= visibleBounds.bottom
    );
  }, [data.nodes, visibleBounds]);

  const visibleConnections = useMemo(() => {
    return data.connections.filter(connection => {
      const fromNode = data.nodes.find(n => n.id === connection.fromNodeId);
      const toNode = data.nodes.find(n => n.id === connection.toNodeId);

      if (!fromNode || !toNode) return false;

      // 检查连接线是否与可见区域相交
      const minX = Math.min(fromNode.x, toNode.x);
      const maxX = Math.max(fromNode.x, toNode.x);
      const minY = Math.min(fromNode.y, toNode.y);
      const maxY = Math.max(fromNode.y, toNode.y);

      return !(maxX < visibleBounds.left ||
               minX > visibleBounds.right ||
               maxY < visibleBounds.top ||
               minY > visibleBounds.bottom);
    });
  }, [data.connections, data.nodes, visibleBounds]);

  // 更新渲染统计
  useEffect(() => {
    const startTime = performance.now();
    setRenderStats({
      nodes: visibleNodes.length,
      connections: visibleConnections.length,
      renderTime: performance.now() - startTime,
    });
  }, [visibleNodes.length, visibleConnections.length]);

  // 处理鼠标事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // 左键
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewState.offsetX, y: e.clientY - viewState.offsetY });
    }
  }, [viewState.offsetX, viewState.offsetY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const newOffsetX = e.clientX - dragStart.x;
      const newOffsetY = e.clientY - dragStart.y;
      
      onViewStateChange({
        ...viewState,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    }
  }, [isDragging, dragStart, viewState, onViewStateChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 处理滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, viewState.zoom * zoomFactor));
    
    // 计算缩放中心点
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      
      const newOffsetX = centerX - (centerX - viewState.offsetX) * (newZoom / viewState.zoom);
      const newOffsetY = centerY - (centerY - viewState.offsetY) * (newZoom / viewState.zoom);
      
      onViewStateChange({
        ...viewState,
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    }
  }, [viewState, onViewStateChange]);

  // 处理节点点击
  const handleNodeClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const now = Date.now();
    const isDoubleClick = now - lastClickTime < 300 && lastClickNodeId === nodeId;
    
    const event: TimelineEvent = {
      type: isDoubleClick ? 'node-double-click' : 'node-click',
      nodeId,
      position: { x: e.clientX, y: e.clientY },
      modifiers: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
      },
    };

    if (isDoubleClick) {
      onNodeDoubleClick?.(nodeId, event);
    } else {
      onNodeClick?.(nodeId, event);
      
      // 更新选中状态
      let newSelectedIds: string[];
      if (event.modifiers.ctrl) {
        // Ctrl+点击：切换选中状态
        newSelectedIds = viewState.selectedNodeIds.includes(nodeId)
          ? viewState.selectedNodeIds.filter(id => id !== nodeId)
          : [...viewState.selectedNodeIds, nodeId];
      } else {
        // 普通点击：单选
        newSelectedIds = [nodeId];
      }
      
      onViewStateChange({
        ...viewState,
        selectedNodeIds: newSelectedIds,
      });
    }
    
    setLastClickTime(now);
    setLastClickNodeId(nodeId);
  }, [lastClickTime, lastClickNodeId, viewState, onViewStateChange, onNodeClick, onNodeDoubleClick]);

  // 处理连接线点击
  const handleConnectionClick = useCallback((connectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const event: TimelineEvent = {
      type: 'connection-click',
      connectionId,
      position: { x: e.clientX, y: e.clientY },
      modifiers: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
      },
    };
    
    onConnectionClick?.(connectionId, event);
  }, [onConnectionClick]);

  // 处理背景点击
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    const event: TimelineEvent = {
      type: 'background-click',
      position: { x: e.clientX, y: e.clientY },
      modifiers: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
      },
    };
    
    onBackgroundClick?.(event);
    
    // 清除选中状态
    onViewStateChange({
      ...viewState,
      selectedNodeIds: [],
    });
  }, [viewState, onViewStateChange, onBackgroundClick]);

  // 渲染网格
  const renderGrid = () => {
    if (!data.layout.showGrid) return null;
    
    const gridSize = 50;
    const lines = [];
    
    // 垂直线
    for (let x = 0; x <= width; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#f3f4f6"
          strokeWidth={1}
        />
      );
    }
    
    // 水平线
    for (let y = 0; y <= height; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="#f3f4f6"
          strokeWidth={1}
        />
      );
    }
    
    return <g className="timeline-grid">{lines}</g>;
  };

  // 渲染连接线
  const renderConnections = () => {
    return visibleConnections.map(connection => {
      const fromNode = data.nodes.find(n => n.id === connection.fromNodeId);
      const toNode = data.nodes.find(n => n.id === connection.toNodeId);
      
      if (!fromNode || !toNode) return null;
      
      const strokeWidth = connection.type === 'merge' ? 3 : 2;
      const strokeDasharray = connection.type === 'branch' ? '5,5' : undefined;
      
      return (
        <line
          key={connection.id}
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke={connection.color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          style={{ cursor: 'pointer' }}
          onClick={(e) => handleConnectionClick(connection.id, e)}
        />
      );
    });
  };

  // 渲染节点
  const renderNodes = () => {
    return visibleNodes.map(node => {
      const isSelected = viewState.selectedNodeIds.includes(node.id);
      const isHovered = viewState.hoveredNodeId === node.id;
      
      const radius = data.layout.nodeRadius;
      const strokeWidth = isSelected ? 3 : (isHovered ? 2 : 1);
      const fill = node.type === 'merge' ? '#ffffff' : node.branchColor;
      const stroke = isSelected ? '#2563eb' : node.branchColor;
      
      return (
        <g key={node.id}>
          {/* 节点圆圈 */}
          <circle
            cx={node.x}
            cy={node.y}
            r={radius}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleNodeClick(node.id, e)}
            onMouseEnter={() => onViewStateChange({
              ...viewState,
              hoveredNodeId: node.id,
            })}
            onMouseLeave={() => onViewStateChange({
              ...viewState,
              hoveredNodeId: undefined,
            })}
          />
          
          {/* 节点类型图标 */}
          {node.type === 'merge' && (
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              fontSize="10"
              fill={node.branchColor}
              pointerEvents="none"
            >
              ⚡
            </text>
          )}
          
          {node.isMilestone && (
            <text
              x={node.x}
              y={node.y - radius - 5}
              textAnchor="middle"
              fontSize="12"
              fill="#f59e0b"
              pointerEvents="none"
            >
              ⭐
            </text>
          )}
          
          {/* 提交消息 */}
          {viewState.showCommitMessages && (
            <text
              x={node.x}
              y={node.y + radius + 15}
              textAnchor="middle"
              fontSize="10"
              fill="#4b5563"
              pointerEvents="none"
              style={{ maxWidth: '100px' }}
            >
              {node.message.length > 20 ? `${node.message.substring(0, 20)}...` : node.message}
            </text>
          )}
          
          {/* 时间戳 */}
          {data.layout.showTimestamps && (
            <text
              x={node.x}
              y={node.y + radius + (viewState.showCommitMessages ? 30 : 15)}
              textAnchor="middle"
              fontSize="8"
              fill="#9ca3af"
              pointerEvents="none"
            >
              {new Date(node.timestamp).toLocaleDateString()}
            </text>
          )}
        </g>
      );
    });
  };

  // 渲染分支标签
  const renderBranchLabels = () => {
    if (!viewState.showBranchLabels) return null;
    
    return data.branches.map((branch, index) => (
      <text
        key={branch.id}
        x={10}
        y={index * data.layout.branchSpacing + 20}
        fontSize="12"
        fill={branch.color}
        fontWeight="bold"
        pointerEvents="none"
      >
        {branch.name}
      </text>
    ));
  };

  return (
    <div style={{ width, height, border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleBackgroundClick}
      >
        {/* 背景 */}
        <rect width={width} height={height} fill="#ffffff" />
        
        {/* 网格 */}
        {renderGrid()}
        
        {/* 主要内容组 */}
        <g transform={transform}>
          {/* 连接线 */}
          {renderConnections()}
          
          {/* 节点 */}
          {renderNodes()}
          
          {/* 分支标签 */}
          {renderBranchLabels()}
        </g>

        {/* 性能统计 (开发模式) */}
        {import.meta.env.DEV && (
          <text
            x={width - 200}
            y={20}
            fontSize="10"
            fill="#6b7280"
            pointerEvents="none"
          >
            渲染: {renderStats.nodes}节点 {renderStats.connections}连接 {renderStats.renderTime.toFixed(1)}ms
          </text>
        )}
      </svg>
    </div>
  );
}
