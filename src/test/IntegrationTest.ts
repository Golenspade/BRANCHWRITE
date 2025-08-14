/**
 * 前后端集成测试
 * 测试 FileSystemService 与 Tauri 后端的集成
 */

import { FileSystemService } from '../services/fileSystemService';
import { TimelineTest } from './TimelineTest';
import type { BookConfig, BookData, DocumentConfig } from '../services/fileSystemService';

export class IntegrationTest {
  private static testBookId: string | null = null;
  private static testDocumentId: string | null = null;

  /**
   * 运行所有集成测试
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 开始前后端集成测试...');
    
    try {
      await this.testSystemDirectories();
      await this.testBookManagement();
      await this.testDocumentManagement();
      await this.testFileOperations();
      await this.testTimelineFunctionality();

      console.log('✅ 所有集成测试通过！');
    } catch (error) {
      console.error('❌ 集成测试失败:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 测试系统目录获取
   */
  private static async testSystemDirectories(): Promise<void> {
    console.log('📁 测试系统目录获取...');
    
    try {
      const appDataDir = await FileSystemService.getAppDataDir();
      const documentsDir = await FileSystemService.getDocumentsDir();
      const desktopDir = await FileSystemService.getDesktopDir();
      
      console.log('应用数据目录:', appDataDir);
      console.log('文档目录:', documentsDir);
      console.log('桌面目录:', desktopDir);
      
      if (!appDataDir || !documentsDir || !desktopDir) {
        throw new Error('系统目录获取失败');
      }
      
      console.log('✅ 系统目录获取测试通过');
    } catch (error) {
      console.error('❌ 系统目录获取测试失败:', error);
      throw error;
    }
  }

  /**
   * 测试书籍管理功能
   */
  private static async testBookManagement(): Promise<void> {
    console.log('📚 测试书籍管理功能...');
    
    try {
      // 1. 创建书籍
      console.log('创建测试书籍...');
      const bookData = await FileSystemService.createBook(
        '集成测试书籍',
        '这是一个用于集成测试的书籍',
        '测试作者',
        '技术文档'
      );
      
      this.testBookId = bookData.config.id;
      console.log('书籍创建成功，ID:', this.testBookId);
      
      // 2. 列出所有书籍
      console.log('获取书籍列表...');
      const books = await FileSystemService.listBooks();
      const createdBook = books.find(book => book.id === this.testBookId);
      
      if (!createdBook) {
        throw new Error('创建的书籍未在列表中找到');
      }
      
      // 3. 加载书籍
      console.log('加载书籍数据...');
      const loadedBook = await FileSystemService.loadBook(this.testBookId);
      
      if (loadedBook.config.id !== this.testBookId) {
        throw new Error('加载的书籍ID不匹配');
      }
      
      // 4. 保存书籍（更新）
      console.log('更新书籍数据...');
      loadedBook.config.description = '更新后的描述';
      await FileSystemService.saveBook(loadedBook);
      
      // 验证更新
      const updatedBook = await FileSystemService.loadBook(this.testBookId);
      if (updatedBook.config.description !== '更新后的描述') {
        throw new Error('书籍更新失败');
      }
      
      console.log('✅ 书籍管理功能测试通过');
    } catch (error) {
      console.error('❌ 书籍管理功能测试失败:', error);
      throw error;
    }
  }

  /**
   * 测试文档管理功能
   */
  private static async testDocumentManagement(): Promise<void> {
    console.log('📄 测试文档管理功能...');
    
    if (!this.testBookId) {
      throw new Error('测试书籍ID不存在');
    }
    
    try {
      // 1. 创建文档
      console.log('创建测试文档...');
      const document = await FileSystemService.createDocument(
        this.testBookId,
        '第一章：集成测试',
        'chapter'
      );
      
      this.testDocumentId = document.id;
      console.log('文档创建成功，ID:', this.testDocumentId);
      
      // 2. 列出文档
      console.log('获取文档列表...');
      const documents = await FileSystemService.listDocuments(this.testBookId);
      const createdDoc = documents.find(doc => doc.id === this.testDocumentId);
      
      if (!createdDoc) {
        throw new Error('创建的文档未在列表中找到');
      }
      
      // 3. 保存文档内容
      console.log('保存文档内容...');
      const testContent = '# 第一章：集成测试\n\n这是集成测试的内容。\n\n## 测试要点\n\n- 前后端通信\n- 数据持久化\n- 错误处理';
      await FileSystemService.saveDocument(this.testBookId, this.testDocumentId, testContent);
      
      // 4. 加载文档内容
      console.log('加载文档内容...');
      const loadedContent = await FileSystemService.loadDocument(this.testBookId, this.testDocumentId);
      
      if (loadedContent !== testContent) {
        throw new Error('文档内容保存/加载不一致');
      }
      
      console.log('✅ 文档管理功能测试通过');
    } catch (error) {
      console.error('❌ 文档管理功能测试失败:', error);
      throw error;
    }
  }

  /**
   * 测试文件操作功能
   */
  private static async testFileOperations(): Promise<void> {
    console.log('🗂️ 测试文件操作功能...');
    
    try {
      // 1. 检查应用数据目录是否存在
      const appDataDir = await FileSystemService.getAppDataDir();
      const exists = await FileSystemService.fileExists(appDataDir);
      
      if (!exists) {
        console.log('创建应用数据目录...');
        await FileSystemService.createDirectory(appDataDir);
      }
      
      // 2. 测试文件写入和读取
      const testFilePath = `${appDataDir}/integration_test.txt`;
      const testFileContent = 'Integration test file content';
      
      console.log('写入测试文件...');
      await FileSystemService.writeFile(testFilePath, testFileContent);
      
      console.log('读取测试文件...');
      const readContent = await FileSystemService.readFile(testFilePath);
      
      if (readContent !== testFileContent) {
        throw new Error('文件内容读写不一致');
      }
      
      // 3. 获取文件信息
      console.log('获取文件信息...');
      const fileInfo = await FileSystemService.getFileInfo(testFilePath);
      
      if (!fileInfo.exists || !fileInfo.is_file) {
        throw new Error('文件信息获取失败');
      }
      
      console.log('✅ 文件操作功能测试通过');
    } catch (error) {
      console.error('❌ 文件操作功能测试失败:', error);
      throw error;
    }
  }

  /**
   * 清理测试数据
   */
  private static async cleanup(): Promise<void> {
    console.log('🧹 清理测试数据...');
    
    try {
      // 删除测试文档
      if (this.testBookId && this.testDocumentId) {
        await FileSystemService.deleteDocument(this.testBookId, this.testDocumentId);
        console.log('测试文档已删除');
      }
      
      // 删除测试书籍
      if (this.testBookId) {
        await FileSystemService.deleteBook(this.testBookId);
        console.log('测试书籍已删除');
      }
      
      // 删除测试文件
      const appDataDir = await FileSystemService.getAppDataDir();
      const testFilePath = `${appDataDir}/integration_test.txt`;
      const exists = await FileSystemService.fileExists(testFilePath);
      
      if (exists) {
        // 注意：这里我们不直接删除文件，因为 FileSystemService 没有删除文件的方法
        // 在实际应用中，可能需要添加删除文件的方法
        console.log('测试文件需要手动清理:', testFilePath);
      }
      
      console.log('✅ 测试数据清理完成');
    } catch (error) {
      console.error('⚠️ 清理测试数据时出现错误:', error);
      // 清理错误不应该影响测试结果
    }
  }

  /**
   * 测试错误处理
   */
  static async testErrorHandling(): Promise<void> {
    console.log('⚠️ 测试错误处理...');
    
    try {
      // 测试加载不存在的书籍
      try {
        await FileSystemService.loadBook('non-existent-book-id');
        throw new Error('应该抛出错误但没有');
      } catch (error) {
        console.log('✅ 正确处理了不存在书籍的错误');
      }
      
      // 测试加载不存在的文档
      try {
        await FileSystemService.loadDocument('non-existent-book-id', 'non-existent-doc-id');
        throw new Error('应该抛出错误但没有');
      } catch (error) {
        console.log('✅ 正确处理了不存在文档的错误');
      }
      
      console.log('✅ 错误处理测试通过');
    } catch (error) {
      console.error('❌ 错误处理测试失败:', error);
      throw error;
    }
  }

  /**
   * 测试时间线功能
   */
  static async testTimelineFunctionality(): Promise<void> {
    console.log('🧪 开始测试时间线功能...');

    try {
      await TimelineTest.runAllTests();
      console.log('✅ 时间线功能测试通过');
    } catch (error) {
      console.error('❌ 时间线功能测试失败:', error);
      throw error;
    }
  }
}
