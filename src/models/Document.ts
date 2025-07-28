import * as Automerge from '@automerge/automerge';
import { TextOperation } from '../types';

interface DocumentData {
  text: Automerge.Text;
  metadata: {
    title: string;
    createdAt: number;
    lastModified: number;
    version: number;
  };
}

export class Document {
  private doc: Automerge.Doc<DocumentData>;
  private changeListeners: ((content: string) => void)[] = [];

  constructor(initialText: string = '', title: string = 'Untitled') {
    this.doc = Automerge.from({
      text: new Automerge.Text(initialText),
      metadata: {
        title,
        createdAt: Date.now(),
        lastModified: Date.now(),
        version: 1,
      },
    });
  }

  /**
   * 应用文本变更操作
   */
  applyChange(operations: TextOperation[]): void {
    this.doc = Automerge.change(this.doc, (doc) => {
      for (const op of operations) {
        switch (op.type) {
          case 'insert':
            if (op.content) {
              // 在指定位置插入文本
              doc.text.insertAt(op.position, ...op.content.split(''));
            }
            break;
          case 'delete':
            if (op.length) {
              // 删除指定位置和长度的文本
              for (let i = 0; i < op.length; i++) {
                if (op.position < doc.text.length) {
                  doc.text.deleteAt(op.position);
                }
              }
            }
            break;
          case 'retain':
            // 保留操作，不做任何改变
            break;
        }
      }
      doc.metadata.lastModified = Date.now();
      doc.metadata.version += 1;
    });

    // 通知监听器
    this.notifyListeners();
  }

  /**
   * 直接设置文本内容
   */
  setText(text: string): void {
    this.doc = Automerge.change(this.doc, (doc) => {
      // 清空现有文本
      doc.text.deleteAt(0, doc.text.length);
      // 插入新文本
      if (text.length > 0) {
        doc.text.insertAt(0, ...text.split(''));
      }
      doc.metadata.lastModified = Date.now();
      doc.metadata.version += 1;
    });
    this.notifyListeners();
  }

  /**
   * 获取当前文档的纯文本内容
   */
  getText(): string {
    return this.doc.text.toString();
  }

  /**
   * 获取文档元数据
   */
  getMetadata() {
    return this.doc.metadata;
  }

  /**
   * 获取当前文档的序列化状态
   */
  getState(): Uint8Array {
    return Automerge.save(this.doc);
  }

  /**
   * 从序列化状态加载文档
   */
  loadState(stateData: Uint8Array): void {
    try {
      this.doc = Automerge.load(stateData);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load document state:', error);
      throw new Error('Invalid document state data');
    }
  }

  /**
   * 获取文档的变更历史
   */
  getChanges(): Automerge.Change[] {
    return Automerge.getAllChanges(this.doc);
  }

  /**
   * 应用变更集
   */
  applyChanges(changes: Automerge.Change[]): void {
    this.doc = Automerge.applyChanges(this.doc, changes);
    this.notifyListeners();
  }

  /**
   * 添加变更监听器
   */
  addChangeListener(listener: (content: string) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * 移除变更监听器
   */
  removeChangeListener(listener: (content: string) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const content = this.getText();
    this.changeListeners.forEach(listener => listener(content));
  }

  /**
   * 创建文档的副本
   */
  clone(): Document {
    const newDoc = new Document();
    newDoc.loadState(this.getState());
    return newDoc;
  }

  /**
   * 合并另一个文档的变更
   */
  merge(otherDoc: Document): void {
    const otherChanges = otherDoc.getChanges();
    this.applyChanges(otherChanges);
  }

  /**
   * 获取文档统计信息
   */
  getStats() {
    const text = this.getText();
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const lines = text.split('\n');

    return {
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      words: words.length,
      lines: lines.length,
      paragraphs: text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length,
    };
  }

  /**
   * 插入文本到指定位置
   */
  insertText(position: number, text: string): void {
    this.applyChange([{
      type: 'insert',
      position,
      content: text,
    }]);
  }

  /**
   * 删除指定范围的文本
   */
  deleteText(position: number, length: number): void {
    this.applyChange([{
      type: 'delete',
      position,
      length,
    }]);
  }

  /**
   * 替换指定范围的文本
   */
  replaceText(position: number, length: number, newText: string): void {
    this.applyChange([
      {
        type: 'delete',
        position,
        length,
      },
      {
        type: 'insert',
        position,
        content: newText,
      },
    ]);
  }

  /**
   * 获取文档的版本号
   */
  getVersion(): number {
    return this.doc.metadata.version;
  }

  /**
   * 获取文档的头部信息（用于快速预览）
   */
  getHeadInfo() {
    const text = this.getText();
    const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
    const stats = this.getStats();

    return {
      title: this.doc.metadata.title,
      preview,
      stats,
      version: this.doc.metadata.version,
      lastModified: this.doc.metadata.lastModified,
      createdAt: this.doc.metadata.createdAt,
    };
  }

  /**
   * 检查文档是否为空
   */
  isEmpty(): boolean {
    return this.doc.text.length === 0;
  }

  /**
   * 获取文档的哈希值（用于快速比较）
   */
  getHash(): string {
    const state = this.getState();
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < state.length; i++) {
      const char = state[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }
}
