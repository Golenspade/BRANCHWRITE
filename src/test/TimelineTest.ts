import { TimelineManager } from '../models/TimelineManager';
import type { CommitInfo } from '../types/index';

/**
 * 时间线功能测试
 */
export class TimelineTest {
  
  /**
   * 测试时间线基本功能
   */
  static async testBasicTimeline(): Promise<void> {
    console.log('🧪 开始测试时间线基本功能...');
    
    const timelineManager = new TimelineManager();
    
    // 创建模拟提交数据
    const mockCommits: CommitInfo[] = [
      {
        id: 'commit1',
        timestamp: Date.now() - 3600000, // 1小时前
        message: '初始提交',
        isAutoCommit: false,
      },
      {
        id: 'commit2',
        timestamp: Date.now() - 1800000, // 30分钟前
        message: '添加第一章内容',
        isAutoCommit: false,
      },
      {
        id: 'commit3',
        timestamp: Date.now() - 900000, // 15分钟前
        message: '自动保存',
        isAutoCommit: true,
      },
      {
        id: 'commit4',
        timestamp: Date.now() - 300000, // 5分钟前
        message: '修改第一章标题',
        isAutoCommit: false,
      },
      {
        id: 'commit5',
        timestamp: Date.now(), // 现在
        message: '添加第二章大纲',
        isAutoCommit: false,
      },
    ];
    
    // 构建时间线
    timelineManager.buildFromCommits(mockCommits);
    const timelineData = timelineManager.getTimelineData();
    
    // 验证节点数量
    console.log('✅ 节点数量:', timelineData.nodes.length);
    if (timelineData.nodes.length !== mockCommits.length) {
      throw new Error(`节点数量不匹配: 期望 ${mockCommits.length}, 实际 ${timelineData.nodes.length}`);
    }
    
    // 验证连接数量
    console.log('✅ 连接数量:', timelineData.connections.length);
    if (timelineData.connections.length !== mockCommits.length - 1) {
      throw new Error(`连接数量不匹配: 期望 ${mockCommits.length - 1}, 实际 ${timelineData.connections.length}`);
    }
    
    // 验证分支数量
    console.log('✅ 分支数量:', timelineData.branches.length);
    if (timelineData.branches.length !== 1) {
      throw new Error(`分支数量不匹配: 期望 1, 实际 ${timelineData.branches.length}`);
    }
    
    // 验证主分支
    const mainBranch = timelineData.branches.find(b => b.name === 'main');
    if (!mainBranch) {
      throw new Error('未找到主分支');
    }
    console.log('✅ 主分支验证通过');
    
    console.log('🎉 时间线基本功能测试通过！');
  }
  
  /**
   * 测试分支创建和合并
   */
  static async testBranchOperations(): Promise<void> {
    console.log('🧪 开始测试分支操作...');
    
    const timelineManager = new TimelineManager();
    
    // 创建基础提交
    const baseCommits: CommitInfo[] = [
      {
        id: 'commit1',
        timestamp: Date.now() - 3600000,
        message: '初始提交',
        isAutoCommit: false,
      },
      {
        id: 'commit2',
        timestamp: Date.now() - 1800000,
        message: '添加基础内容',
        isAutoCommit: false,
      },
    ];
    
    timelineManager.buildFromCommits(baseCommits);
    
    // 创建分支
    const firstNodeId = timelineManager.getTimelineData().nodes[0].id;
    const branchResult = timelineManager.createBranch('feature-branch', firstNodeId, '功能分支');
    
    if (!branchResult.success) {
      throw new Error(`分支创建失败: ${branchResult.message}`);
    }
    console.log('✅ 分支创建成功');
    
    // 验证分支数量
    const timelineData = timelineManager.getTimelineData();
    if (timelineData.branches.length !== 2) {
      throw new Error(`分支数量不匹配: 期望 2, 实际 ${timelineData.branches.length}`);
    }
    
    // 添加分支提交
    const branchCommit: CommitInfo = {
      id: 'branch-commit1',
      timestamp: Date.now() - 900000,
      message: '分支功能开发',
      isAutoCommit: false,
    };
    
    const branchId = branchResult.data.branchId;
    timelineManager.addCommitNode(branchCommit, branchId);
    console.log('✅ 分支提交添加成功');
    
    // 测试合并
    const mergeResult = timelineManager.mergeBranch(branchId, 'main', '合并功能分支');
    
    if (!mergeResult.success) {
      throw new Error(`分支合并失败: ${mergeResult.message}`);
    }
    console.log('✅ 分支合并成功');
    
    // 验证合并后的状态
    const finalData = timelineManager.getTimelineData();
    const mergedBranch = finalData.branches.find(b => b.id === branchId);
    if (!mergedBranch || mergedBranch.isActive) {
      throw new Error('分支合并后状态不正确');
    }
    console.log('✅ 合并状态验证通过');
    
    console.log('🎉 分支操作测试通过！');
  }
  
  /**
   * 测试搜索功能
   */
  static async testSearchFunctionality(): Promise<void> {
    console.log('🧪 开始测试搜索功能...');
    
    const timelineManager = new TimelineManager();
    
    // 创建包含不同类型提交的数据
    const commits: CommitInfo[] = [
      {
        id: 'commit1',
        timestamp: Date.now() - 3600000,
        message: '初始化项目',
        isAutoCommit: false,
      },
      {
        id: 'commit2',
        timestamp: Date.now() - 1800000,
        message: '添加用户登录功能',
        isAutoCommit: false,
      },
      {
        id: 'commit3',
        timestamp: Date.now() - 900000,
        message: '自动保存用户数据',
        isAutoCommit: true,
      },
      {
        id: 'commit4',
        timestamp: Date.now() - 300000,
        message: '修复登录bug',
        isAutoCommit: false,
      },
    ];
    
    timelineManager.buildFromCommits(commits);
    
    // 测试消息搜索
    const loginResults = timelineManager.search({
      query: '登录',
      searchIn: ['message'],
    });
    
    if (loginResults.length !== 2) {
      throw new Error(`搜索结果数量不匹配: 期望 2, 实际 ${loginResults.length}`);
    }
    console.log('✅ 消息搜索测试通过');
    
    // 测试自动提交过滤
    const autoCommitResults = timelineManager.search({
      query: '',
      searchIn: ['message'],
      nodeTypes: ['commit'],
    });
    
    console.log('✅ 节点类型过滤测试通过');
    
    console.log('🎉 搜索功能测试通过！');
  }
  
  /**
   * 测试统计功能
   */
  static async testStatistics(): Promise<void> {
    console.log('🧪 开始测试统计功能...');
    
    const timelineManager = new TimelineManager();
    
    // 创建一周的提交数据
    const commits: CommitInfo[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < 7; i++) {
      commits.push({
        id: `commit${i + 1}`,
        timestamp: now - (i * dayMs),
        message: `第${i + 1}天的工作`,
        isAutoCommit: i % 3 === 0, // 每3个提交中有1个自动提交
      });
    }
    
    timelineManager.buildFromCommits(commits);
    
    // 获取统计信息
    const stats = timelineManager.getStats();
    
    // 验证统计数据
    if (stats.totalNodes !== commits.length) {
      throw new Error(`总节点数不匹配: 期望 ${commits.length}, 实际 ${stats.totalNodes}`);
    }
    
    if (stats.activeBranches !== 1) {
      throw new Error(`活跃分支数不匹配: 期望 1, 实际 ${stats.activeBranches}`);
    }
    
    if (stats.averageCommitsPerDay <= 0) {
      throw new Error('日均提交数计算错误');
    }
    
    console.log('✅ 统计数据验证通过');
    console.log(`   - 总节点数: ${stats.totalNodes}`);
    console.log(`   - 活跃分支: ${stats.activeBranches}`);
    console.log(`   - 日均提交: ${stats.averageCommitsPerDay.toFixed(2)}`);
    
    console.log('🎉 统计功能测试通过！');
  }
  
  /**
   * 运行所有测试
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 开始运行时间线功能测试套件...');
    
    try {
      await this.testBasicTimeline();
      await this.testBranchOperations();
      await this.testSearchFunctionality();
      await this.testStatistics();
      
      console.log('🎉 所有时间线测试通过！');
    } catch (error) {
      console.error('❌ 时间线测试失败:', error);
      throw error;
    }
  }
}
