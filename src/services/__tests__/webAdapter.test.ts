import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WebFileSystemAdapter } from '../webAdapter'

describe('WebFileSystemAdapter', () => {
  // 每个测试前清空 localStorage
  beforeEach(() => {
    localStorage.clear()
  })

  // 每个测试后清空 localStorage
  afterEach(() => {
    localStorage.clear()
  })

  describe('createProject', () => {
    it('应该创建新项目并保存到 localStorage', async () => {
      const name = '测试项目'
      const description = '测试描述'
      const author = '测试作者'

      const project = await WebFileSystemAdapter.createProject(name, description, author)

      expect(project).toBeDefined()
      expect(project.name).toBe(name)
      expect(project.description).toBe(description)
      expect(project.author).toBe(author)
      expect(project.id).toMatch(/^project_/)
    })

    it('应该将项目添加到项目列表中', async () => {
      await WebFileSystemAdapter.createProject('项目1', '描述1', '作者1')
      await WebFileSystemAdapter.createProject('项目2', '描述2', '作者2')

      const projects = await WebFileSystemAdapter.listProjects()

      expect(projects).toHaveLength(2)
      expect(projects[0].name).toBe('项目2') // 最新的在前面
      expect(projects[1].name).toBe('项目1')
    })
  })

  describe('listProjects', () => {
    it('当没有项目时应该返回空数组', async () => {
      const projects = await WebFileSystemAdapter.listProjects()
      expect(projects).toEqual([])
    })

    it('应该返回所有已保存的项目', async () => {
      await WebFileSystemAdapter.createProject('项目1', '描述1', '作者1')
      await WebFileSystemAdapter.createProject('项目2', '描述2', '作者2')

      const projects = await WebFileSystemAdapter.listProjects()

      expect(projects).toHaveLength(2)
    })
  })

  describe('deleteProject', () => {
    it('应该删除指定的项目', async () => {
      const project1 = await WebFileSystemAdapter.createProject('项目1', '描述1', '作者1')
      const project2 = await WebFileSystemAdapter.createProject('项目2', '描述2', '作者2')

      await WebFileSystemAdapter.deleteProject(project1.id)

      const projects = await WebFileSystemAdapter.listProjects()
      expect(projects).toHaveLength(1)
      expect(projects[0].id).toBe(project2.id)
    })
  })

  describe('createDocument', () => {
    it('应该创建新文档', async () => {
      const project = await WebFileSystemAdapter.createProject('测试项目', '描述', '作者')
      
      const doc = await WebFileSystemAdapter.createDocument(
        project.id,
        '第一章',
        '章节'
      )

      expect(doc).toBeDefined()
      expect(doc.title).toBe('第一章')
      expect(doc.type).toBe('章节')
      expect(doc.book_id).toBe(project.id)
      expect(doc.word_count).toBe(0)
      expect(doc.character_count).toBe(0)
    })

    it('应该将文档添加到文档列表中', async () => {
      const project = await WebFileSystemAdapter.createProject('测试项目', '描述', '作者')
      
      await WebFileSystemAdapter.createDocument(project.id, '第一章', '章节')
      await WebFileSystemAdapter.createDocument(project.id, '第二章', '章节')

      const docs = await WebFileSystemAdapter.listDocuments(project.id)
      expect(docs).toHaveLength(2)
    })
  })

  describe('saveDocument and loadDocument', () => {
    it('应该保存和加载文档内容', async () => {
      const project = await WebFileSystemAdapter.createProject('测试项目', '描述', '作者')
      const doc = await WebFileSystemAdapter.createDocument(project.id, '第一章', '章节')
      
      const content = '这是测试内容，包含一些文字。'
      await WebFileSystemAdapter.saveDocument(project.id, doc.id, content)

      const loadedContent = await WebFileSystemAdapter.loadDocument(project.id, doc.id)
      expect(loadedContent).toBe(content)
    })

    it('保存文档时应该更新字数统计', async () => {
      const project = await WebFileSystemAdapter.createProject('测试项目', '描述', '作者')
      const doc = await WebFileSystemAdapter.createDocument(project.id, '第一章', '章节')
      
      const content = '这是 测试 内容'
      await WebFileSystemAdapter.saveDocument(project.id, doc.id, content)

      const docs = await WebFileSystemAdapter.listDocuments(project.id)
      const updatedDoc = docs.find(d => d.id === doc.id)
      
      expect(updatedDoc?.word_count).toBe(3) // 3个词
      expect(updatedDoc?.character_count).toBe(content.length)
    })
  })

  describe('localStorage 错误处理', () => {
    it('当 localStorage 数据损坏时应该返回空数组', async () => {
      // 模拟损坏的数据
      localStorage.setItem('branchwrite_projects', 'invalid json')

      const projects = await WebFileSystemAdapter.listProjects()
      expect(projects).toEqual([])
    })
  })
})
