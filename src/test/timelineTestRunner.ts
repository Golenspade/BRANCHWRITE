/**
 * 时间线测试运行器 - 可以在浏览器控制台中运行
 */

import { TimelineTest } from './TimelineTest';

// 将测试函数暴露到全局对象，方便在控制台调用
declare global {
  interface Window {
    runTimelineTests: () => Promise<void>;
    TimelineTest: typeof TimelineTest;
  }
}

// 暴露测试函数到全局
if (typeof window !== 'undefined') {
  window.runTimelineTests = async () => {
    try {
      console.log('🚀 开始运行时间线测试...');
      await TimelineTest.runAllTests();
      console.log('🎉 时间线测试全部通过！');
    } catch (error) {
      console.error('❌ 时间线测试失败:', error);
    }
  };
  
  window.TimelineTest = TimelineTest;
  
  console.log('📋 时间线测试已准备就绪！');
  console.log('💡 在控制台中运行 runTimelineTests() 来执行测试');
  console.log('💡 或者运行 TimelineTest.testBasicTimeline() 来测试基本功能');
}

export { TimelineTest };
