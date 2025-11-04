/**
 * 检查数据库内容的脚本
 */

// 检查 localStorage 中的数据
function checkLocalStorage() {
  console.log('\n📦 检查 localStorage 数据...\n')
  
  const keys = Object.keys(localStorage)
  const branchwriteKeys = keys.filter(k => k.startsWith('branchwrite_'))
  
  if (branchwriteKeys.length === 0) {
    console.log('❌ 没有找到任何数据')
    return
  }
  
  console.log(`✅ 找到 ${branchwriteKeys.length} 个数据项:\n`)
  
  branchwriteKeys.forEach(key => {
    const value = localStorage.getItem(key)
    console.log(`🔑 ${key}`)
    
    try {
      const parsed = JSON.parse(value || '{}')
      if (Array.isArray(parsed)) {
        console.log(`   📊 数组，包含 ${parsed.length} 项`)
        if (parsed.length > 0) {
          console.log(`   📝 第一项:`, JSON.stringify(parsed[0], null, 2).split('\n').slice(0, 5).join('\n'))
        }
      } else if (typeof parsed === 'object') {
        console.log(`   📄 对象:`, JSON.stringify(parsed, null, 2).split('\n').slice(0, 5).join('\n'))
      } else {
        console.log(`   📝 值:`, value?.substring(0, 100))
      }
    } catch {
      console.log(`   📝 文本:`, value?.substring(0, 100))
    }
    console.log('')
  })
  
  // 详细显示项目列表
  const projectsKey = 'branchwrite_projects'
  const projectsData = localStorage.getItem(projectsKey)
  
  if (projectsData) {
    try {
      const projects = JSON.parse(projectsData)
      console.log('\n📚 书籍/项目列表:\n')
      projects.forEach((project: any, index: number) => {
        console.log(`${index + 1}. ${project.name}`)
        console.log(`   ID: ${project.id}`)
        console.log(`   作者: ${project.author || '未知'}`)
        console.log(`   创建时间: ${new Date(project.created_at).toLocaleString('zh-CN')}`)
        console.log(`   最后修改: ${new Date(project.last_modified).toLocaleString('zh-CN')}`)
        
        // 检查该项目的文档
        const docsKey = `branchwrite_documents_${project.id}`
        const docsData = localStorage.getItem(docsKey)
        if (docsData) {
          const docs = JSON.parse(docsData)
          console.log(`   📄 文档数量: ${docs.length}`)
          docs.forEach((doc: any, docIndex: number) => {
            console.log(`      ${docIndex + 1}. ${doc.title} (${doc.word_count} 字)`)
          })
        } else {
          console.log(`   📄 文档数量: 0`)
        }
        console.log('')
      })
    } catch (error) {
      console.error('解析项目数据失败:', error)
    }
  }
}

// 统计信息
function showStatistics() {
  console.log('\n📊 数据统计:\n')
  
  try {
    const projectsData = localStorage.getItem('branchwrite_projects')
    const projects = projectsData ? JSON.parse(projectsData) : []
    
    let totalDocs = 0
    let totalWords = 0
    let totalChars = 0
    
    projects.forEach((project: any) => {
      const docsKey = `branchwrite_documents_${project.id}`
      const docsData = localStorage.getItem(docsKey)
      if (docsData) {
        const docs = JSON.parse(docsData)
        totalDocs += docs.length
        docs.forEach((doc: any) => {
          totalWords += doc.word_count || 0
          totalChars += doc.character_count || 0
        })
      }
    })
    
    console.log(`📚 总书籍数: ${projects.length}`)
    console.log(`📄 总文档数: ${totalDocs}`)
    console.log(`✍️  总字数: ${totalWords.toLocaleString()}`)
    console.log(`🔤 总字符数: ${totalChars.toLocaleString()}`)
    
    // 存储使用情况
    let totalSize = 0
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('branchwrite_')) {
        const value = localStorage.getItem(key)
        totalSize += (key.length + (value?.length || 0)) * 2 // UTF-16
      }
    })
    
    console.log(`💾 存储使用: ${(totalSize / 1024).toFixed(2)} KB`)
    console.log(`📦 存储限制: ~5-10 MB (浏览器限制)`)
    console.log(`📈 使用率: ${((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2)}%`)
    
  } catch (error) {
    console.error('统计失败:', error)
  }
}

// 主函数
function main() {
  console.log('=' .repeat(60))
  console.log('🔍 BranchWrite 数据库检查工具')
  console.log('=' .repeat(60))
  
  if (typeof localStorage === 'undefined') {
    console.log('\n❌ localStorage 不可用（可能不在浏览器环境中）')
    return
  }
  
  checkLocalStorage()
  showStatistics()
  
  console.log('\n' + '=' .repeat(60))
  console.log('✅ 检查完成')
  console.log('=' .repeat(60) + '\n')
}

// 如果在浏览器环境中，直接运行
if (typeof window !== 'undefined') {
  main()
}

// 导出供其他地方使用
export { checkLocalStorage, showStatistics }
