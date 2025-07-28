import { Document } from '../models/Document';
import { DocumentManager } from '../models/DocumentManager';

/**
 * 简单的文档测试函数
 */
export function testDocument() {
  console.log('🧪 开始测试 CRDT 文档模型...');

  // 测试 1: 基本文档操作
  console.log('\n📝 测试 1: 基本文档操作');
  const doc = new Document('Hello World', '测试文档');
  console.log('初始文本:', doc.getText());
  console.log('文档统计:', doc.getStats());

  // 测试 2: 文本操作
  console.log('\n✏️ 测试 2: 文本操作');
  doc.insertText(5, ', BranchWrite1');
  console.log('插入后:', doc.getText());
  
  doc.deleteText(0, 5);
  console.log('删除后:', doc.getText());
  
  doc.replaceText(0, 5, 'Hi');
  console.log('替换后:', doc.getText());

  // 测试 3: 版本管理
  console.log('\n🔄 测试 3: 版本管理');
  const manager = new DocumentManager('初始内容', '版本测试文档');
  console.log('初始版本:', manager.getCurrentDocument().getText());
  
  manager.updateDocument('这是第一次修改');
  const commit1 = manager.createCommit('第一次修改');
  console.log('第一次提交 ID:', commit1);
  
  manager.updateDocument('这是第二次修改，内容更丰富了');
  const commit2 = manager.createCommit('第二次修改');
  console.log('第二次提交 ID:', commit2);
  
  const history = manager.getCommitHistory();
  console.log('提交历史:', history.map(h => ({ id: h.id.substring(0, 8), message: h.message })));

  // 测试 4: 版本切换
  console.log('\n🔀 测试 4: 版本切换');
  console.log('当前内容:', manager.getCurrentDocument().getText());
  
  const success = manager.checkoutCommit(commit1);
  console.log('切换到第一次提交:', success);
  console.log('切换后内容:', manager.getCurrentDocument().getText());

  // 测试 5: 文档克隆和合并
  console.log('\n🔗 测试 5: 文档克隆和合并');
  const originalDoc = new Document('原始文档内容');
  const clonedDoc = originalDoc.clone();
  
  originalDoc.insertText(0, '[原始] ');
  clonedDoc.insertText(0, '[克隆] ');
  
  console.log('原始文档:', originalDoc.getText());
  console.log('克隆文档:', clonedDoc.getText());
  
  // 合并变更
  originalDoc.merge(clonedDoc);
  console.log('合并后原始文档:', originalDoc.getText());

  console.log('\n✅ 所有测试完成！');
}

/**
 * 在浏览器控制台中运行测试
 */
export function runTestInBrowser() {
  if (typeof window !== 'undefined') {
    // 将测试函数暴露到全局作用域
    (window as any).testBranchWrite = testDocument;
    console.log('💡 在浏览器控制台中运行 testBranchWrite() 来测试文档模型');
  }
}
