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


---


好的，我会基于你详细描述的目录结构和目标迁移计划，将“桌面唯一 Tauri 环境迁移”任务分解为 Requirement → Feature → Task 的形式，并生成 Markdown 格式的任务清单，方便你或团队落地执行。


# Web 应用迁移至 Tauri 桌面模式的方案与任务清单

## 需求 (Requirement)

* **桌面环境唯一运行**：应用仅支持桌面 Tauri 环境运行（运行时必须存在 `window.__TAURI__`），不再兼容纯浏览器模式。
* **原生能力统一调用**：所有文件系统访问、对话框等功能通过 Tauri 提供的原生接口或后端命令实现，彻底移除此前为 Web 环境提供的降级适配逻辑。
* **统一开发打包流程**：开发和构建流程标准化，统一使用 Tauri 命令（例如 `npm run tauri dev`进行调试、`npm run tauri build`进行打包），不再使用纯 Web 的启动方式。
* **数据平滑迁移**：保证用户现有数据不丢失，将 Web 版（浏览器 localStorage）中的存储数据迁移到桌面应用的本地文件存储中，提供自动或手动的导入机制。
* **代码可维护性提升**：重构代码结构按功能模块组织，拆分过于庞大的组件和逻辑，减少重复模型，实现代码结构清晰、单文件规模可控（遵循单文件不超200行等内部规范）。
* **应用安全性增强**：在桌面应用中贯彻最小权限原则（Tauri API 白名单只开放必要功能），并增加必要的安全措施（如启用内容安全策略等），确保发布后的桌面应用安全稳定。

## 特性 (Features)

* **桌面专属启动模式**：实现应用只能通过桌面方式启动的特性。在应用启动时检测环境，如果未发现 Tauri 注入（即不存在 `window.__TAURI__`），则中止运行并提示必须使用桌面应用启动，避免误用网页模式。开发调试时默认走桌面 WebView 环境。
* **统一的文件系统与对话框接口**：改造所有文件读写、目录浏览、文件选择/导出对话框为调用 Tauri 提供的原生功能。移除浏览器环境下的 `WebFileSystemAdapter` 实现，统一通过 Tauri 后端命令或 `@tauri-apps/api` 模块执行文件操作（读取、写入、列举目录）和弹出系统对话框，从而具备完整的本地文件访问能力。
* **数据持久化与迁移机制**：新增数据迁移功能，在首次运行桌面应用时自动将旧版 Web 存储的数据迁移到桌面文件系统（例如将 localStorage 中以 `branchwrite_` 前缀的条目保存为本地文件）。必要时提供手动触发迁移的选项，确保历史笔记、文档等数据无缝转移到新版应用中。迁移完成后做标记避免重复导入。
* **模块化的代码架构**：按照功能将代码分区重构。例如，新建 `timeline`、`versioning`、`editor` 等功能模块目录，归类相关组件、模型和类型文件。拆分过于臃肿的组件（如将目前近700行的 **BookWorkspace** 拆解为子组件：工具栏、侧边栏、编辑器区域等），划分全局状态管理为更细粒度的 slice 或模块。这样的改动提升代码可读性和可维护性，并符合内部代码规范。
* **代码清理和冗余移除**：清理项目中过时或未使用的代码路径。停用并归档仅服务于 Web 环境的逻辑与组件（如旧版的 **VersionManager** 模型类、**HighlightEditor/TestHighlightEditor** 实验组件、**ProjectManager** 页面等），确保应用不包含冗余功能。同时统一重复的类型和数据模型（例如统一 commit 提交记录的类型定义，规范时间戳格式），避免平行的逻辑存在。
* **桌面打包发布与安全**：调整 Tauri 配置以准备桌面应用发布。包括设置应用标识、应用图标和版本信息，精简 Tauri API 白名单只允许文件系统、对话框、路径等必要权限。执行打包流程产出安装文件，并根据需要配置代码签名。在前端启用内容安全策略 (CSP) 等安全设置。更新项目文档（README等），注明新版仅支持桌面运行以及新的开发/打包方式。

## 任务清单 (Task Checklist)

1. **强制桌面运行模式**：修改启动脚本使开发默认使用桌面环境运行（例如将 `package.json` 中的`npm run dev`指向 `tauri dev`）。在应用入口 (`App.tsx`) 添加环境检查逻辑：若检测不到 `window.__TAURI__` 则渲染错误提示并终止应用，引导开发者使用正确的命令启动。移除或隐藏之前用于区分环境的提示组件（如 EnvironmentBanner）。同时，更新测试启动逻辑，确保集成测试在桌面环境下正常运行（移除原先“非桌面则跳过测试”的分支）。
2. **文件系统与对话框功能迁移**：移除 Web 环境下的文件系统适配层（删除或废弃 `WebFileSystemAdapter` 相关代码），将 `fileSystemService` 中的实现统一为通过 Tauri 后端调用。针对目前仍为占位的功能（如打开文件对话框、保存文件、导出目录选择等），在 Rust 后端 (`src-tauri`) 实现对应命令，并在 Tauri 配置中开启所需权限。前端所有涉及文件读写、导入导出、目录选择的功能改用 Tauri API：比如使用 `@tauri-apps/api/fs` 进行文件读写，使用 `@tauri-apps/api/dialog` 调用系统对话框。调整相关组件逻辑（例如导出按钮、打开文件按钮）使其调用新的服务层方法。经过此调整，应用的文件访问和系统交互能力将统一走桌面端实现，在各平台下都有一致表现。
3. **实现数据迁移机制**：开发启动时的数据迁移脚本。在应用首次以桌面模式运行时，扫描浏览器 localStorage 中历史数据（例如键名包含先前应用前缀的内容）。将检测到的每本书籍/文档的数据写入桌面应用的持久存储目录（如用户主目录下的`.branchwrite/books/{bookId}/`目录对应的文件）。迁移完成后记录状态（避免每次启动重复迁移）。另外，在设置或欢迎界面提供“导入浏览器数据”的手动选项，让用户可以主动触发迁移过程（以防自动迁移遗漏或需要从特定浏览器环境导入）。测试迁移前后数据一致性，确保用户在新版应用中可以看到旧有笔记内容。
4. **重构代码结构模块**：按功能模块拆分重构现有代码库。新建 `src/features` 目录，将时间线 (**timeline**)、版本管理 (**versioning**)、编辑器 (**editor**) 等相关的组件、模型、类型文件分别移动到对应子目录下，形成清晰的功能区域划分。例如，创建 `src/features/timeline/`（包含 TimelineView 组件、TimelineManager 模型、timeline 类型定义等），`src/features/versioning/`（包含 VersionManager组件、VersionDetail/VersionDiff组件、Diff算法等），`src/features/editor/` 等。重构 **BookWorkspace** 页面，将其拆分成更小的组件（如 `Toolbar.tsx`, `Sidebar.tsx`, `EditorPane.tsx` 等）各司其职，并保证每个文件代码行数在可维护范围内。调整全局状态管理（store）结构，考虑将单一的 `appStore` 拆分为更细的 slice（如书本信息、文档内容、UI 状态分别管理）或者在现有 store 中模块化处理逻辑。这一步骤完成后，项目结构将更加清晰，方便后续功能完善和维护。
5. **清理和整合代码**：移除过时或冗余的代码模块，确保应用仅保留有效路径。梳理项目中未被使用的文件与组件，针对以下内容进行处理：将**仅用于 Web 环境**的逻辑标记弃用并迁出主代码路径（例如 `webAdapter.ts` 全部停用）；删除或归档旧的模型和组件（如早期版本遗留的 `VersionManager.ts` 类、未使用的 `HighlightEditor.tsx`/`TestHighlightEditor.tsx`、未集成的 `ProjectManager.tsx` 等），以避免混淆。统一数据模型与类型定义，在 `src/types/index.ts` 中集中维护核心类型（如 Commit 提交记录的结构），消除重复定义并保证前后端一致（例如将时间戳统一使用数值型）。此外，优化时间线相关的更新机制：修改 **DocumentManager**，使其在新增提交或变更时触发事件（例如使用发布/订阅模式）通知时间线组件，这样 **TimelineView** 可以取消掉当前依赖的定时轮询逻辑，改为事件驱动即时更新，提升效率和可靠性。完成这些清理与优化后，代码库将更加整洁一致。
6. **打包配置与发布验证**：更新 Tauri 配置 (`tauri.conf.json`) 以匹配桌面应用发布需求。设置正确的应用名称和唯一标识符（bundle identifier），配置应用图标和版本号等元数据。调整 Tauri 的权限白名单，只保留文件系统访问、对话框、路径、Shell 等实际用到的 API，未声明的接口默认禁止，确保应用不会无意调用多余的原生能力。随后，在各开发环境下执行打包命令 `npm run tauri build`，验证构建过程是否顺利产出可安装的应用程序（Windows .exe安装包、macOS .app 或 .dmg、Linux 可执行等）。根据需要配置代码签名流程（例如 Windows 签名证书、macOS Developer ID）以消除系统的未知来源警告。安装并运行打包后的应用，验证其功能与开发环境一致。
7. **安全加固与文档更新**：在完成功能迁移和代码重构后，着手增强应用安全性并完善文档。启用前端内容安全策略（CSP），限制加载的资源来源，防范XSS等攻击。同时在应用中加入基本的错误捕获和崩溃防护措施。复查 Tauri 配置确保仅启用了必要的API接口权限。最后，更新项目文档（尤其是README和开发者指南），明确说明新版应用**仅支持桌面(Tauri)模式运行**，列出新的开发命令和打包发布流程，提示迁移后的数据存储位置等信息。通过完善的文档，确保团队其他成员或开源用户能够顺利跟进这一系列改动。

完成以上任务后，项目将成功从浏览器Web应用迁移为桌面端应用。所有文件系统和对话框能力都将通过Tauri获得，开发和使用体验统一，代码结构更清晰易维护，同时应用在桌面环境下的安全性和稳定性也将有所提升。

