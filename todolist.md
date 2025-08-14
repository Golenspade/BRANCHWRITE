# 开发待办（Timeline 时间线功能）

> 原则：先搭框架实现基础可用，再逐步增强；每项任务尽量细化为 10–30 分钟可完成的最小单元；每阶段都可独立验收。

## Phase 0 稳定化与一致性（1–2 天）

- 类型统一与适配
  - [ ] 收敛 CommitInfo 到 src/types/index（timestamp: number, isAutoCommit: boolean 等）
  - [ ] 在 services 层增加适配函数：将后端/存储的 CommitInfo 转换为统一类型
  - [ ] 替换 TimelineManager/TimelineView/VersionManager 等处的 CommitInfo 引用
  - [ ] 删除重复/冲突类型，解决循环导入

- 事件驱动刷新
  - [ ] 在 DocumentManager 内添加轻量 EventEmitter（on/off/emit）
  - [ ] 发射事件：commitAdded/historyLoaded/documentCheckout
  - [ ] 移除 TimelineView 的 setInterval 轮询，改为订阅文档事件
  - [ ] 在卸载时正确取消订阅，避免内存泄漏

- Branch API 一致化
  - [ ] 将分支唯一键统一为 branchId（字符串），名称仅用于展示
  - [ ] 规范 TimelineManager.createBranch/mergeBranch 的签名与返回值
  - [ ] 修正所有调用处传入 name 的地方，统一传入 id

- 最小持久化（Web/Tauri）
  - [ ] 设计时间线数据序列化结构（nodes/connections/branches/metadata）
  - [ ] Web：localStorage 写入与读取 API（按书籍/项目 id 命名空间）
  - [ ] Tauri：fileSystemService 新增 save_timeline/load_timeline 命令桥接（暂用占位实现）
  - [ ] TimelineView 初始化时加载；操作后延迟写入（debounce）

## Phase 1 时间线 MVP（2–3 天）

- 可视化与交互
  - [ ] Timeline 组件：添加“缩放到全图（fit to bounds）”方法
  - [ ] 增加 tooltip：悬浮显示时间/消息/字数/分支
  - [ ] 键盘导航：←→ 切换相邻节点；Esc 清除选择
  - [ ] 多选：Ctrl/⌘ 切换、Shift 连选（更新 selectedNodeIds）

- 文档联动
  - [ ] 节点双击打开 VersionDetail 弹窗（保持只读预览）
  - [ ] 右键菜单：与当前版本进行 Diff（打开 VersionDiff）
  - [ ] 回滚操作：弹出确认框后调用 DocumentManager.checkoutCommit

- 搜索与筛选
  - [ ] Controls 面板：关键词输入 + 范围（时间、是否自动提交）
  - [ ] 高亮匹配节点，滚动聚焦第一个结果
  - [ ] 清除筛选按钮，恢复全量显示

- 性能与指标
  - [ ] 视口裁剪已具备：补齐连接线快速可见性判断
  - [ ] 增加“节点/连接渲染耗时”统计输出到 DEV HUD
  - [ ] 压测 5k 节点：记录首次渲染耗时、交互帧率；提交 performance.md

- 测试
  - [ ] TimelineManager 单测：构建/分支/合并/搜索/统计
  - [ ] Timeline 组件交互测试：缩放/选择/双击
  - [ ] 文档事件联动集成测试：新增提交后时间线自动刷新

## Phase 2 分支语义与持久化（3–5 天）

- 模型下沉
  - [ ] 在 DocumentManager 中引入分支模型；提交携带 branchId
  - [ ] 从任意节点创建分支（生成新 branchId），主分支为 main
  - [ ] 版本列表（VersionManager）按分支过滤/显示

- 合并（Merge）语义
  - [ ] 定义 merge 节点数据结构（sourceBranchId/targetBranchId/message）
  - [ ] Timeline 以汇入箭头样式绘制 merge 连接
  - [ ] 合并后：源分支 isActive=false，endNodeId=mergeNodeId；目标分支延续

- 元数据
  - [ ] 节点标签（tags）增删改 UI
  - [ ] 里程碑（milestoneTitle、isMilestone）标注与样式
  - [ ] 分支描述/颜色编辑与持久化

## Phase 3 导出与桌面端集成（2–3 天）

- 导出
  - [ ] JSON 导出完善（包含统计信息与版本）
  - [ ] 支持导出 PNG/SVG（可视窗口/完整时间线两种模式）

- Tauri 持久化
  - [ ] fileSystemService：实现 save_timeline/load_timeline 桥接 Tauri 命令
  - [ ] 桌面端启动/切换书籍后自动恢复时间线

## 验收标准（MVP）

- [ ] 1000+ 提交渲染与交互稳定；fit to bounds、搜索/筛选可用
- [ ] 双击查看详情、与当前版本 Diff、回滚可用（含确认）
- [ ] 分支创建可用；合并具备基本可视占位或禁用说明
- [ ] 刷新后时间线结构与元数据完整恢复（Web）

## 工程约束

- [ ] 单文件 ≤200 行（TS/JS）；大组件拆分：模型/渲染/容器
- [ ] 公共类型集中 src/types，避免循环依赖
- [ ] 为关键路径补充测试，CI 通过；性能指标记录在 performance.md

