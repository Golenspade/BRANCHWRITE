import { expect, type Page, test } from '@playwright/test'

async function fillNaiveInput(page: Page, testId: string, value: string) {
  await page.getByTestId(testId).locator('input, textarea').first().fill(value)
}

async function createBookAndChapter(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('create-book-btn')).toBeVisible()

  await page.getByTestId('create-book-btn').click()
  await fillNaiveInput(page, 'book-name-input', 'Playwright 测试书')
  await fillNaiveInput(page, 'book-author-input', 'E2E')
  await page.getByTestId('submit-book-btn').click()

  await expect(page).toHaveURL(/#\/workspace/)
  await expect(page.getByTestId('editor-empty')).toBeVisible()

  await page.getByTestId('create-doc-btn').click()
  await fillNaiveInput(page, 'doc-title-input', '第一章')
  await page.getByTestId('submit-doc-btn').click()

  await expect(page.getByTestId('editor-workspace')).toBeVisible()
  await expect(page.getByTestId('monaco-host')).toBeVisible()
  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 15_000 })
}

async function typeInMonaco(page: Page, text: string) {
  const editor = page.locator('.monaco-editor').first()
  await expect(editor).toBeVisible({ timeout: 15_000 })
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type(text, { delay: 15 })
}

test.describe('编辑器 WebView E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
    })
  })

  test('创建书籍与文档后可进入编辑器', async ({ page }) => {
    await createBookAndChapter(page)
    await expect(page.getByTestId('editor-status-bar')).toContainText('第一章')
    await expect(page.getByTestId('mode-edit')).toBeVisible()
  })

  test('支持输入、预览切换与状态栏统计', async ({ page }) => {
    await createBookAndChapter(page)

    await typeInMonaco(page, '# 标题\n\n这是一段测试正文 hello')
    await expect(page.getByTestId('editor-status-bar')).toContainText('字符')

    await page.getByTestId('mode-preview').click()
    await expect(page.getByTestId('editor-preview-pane')).toBeVisible()
    await expect(page.getByTestId('markdown-preview')).toContainText('这是一段测试正文 hello')

    await page.getByTestId('mode-edit').click()
    await expect(page.getByTestId('editor-edit-pane')).toBeVisible()
  })

  test('保存版本后可进入 Diff 对比', async ({ page }) => {
    await createBookAndChapter(page)

    await typeInMonaco(page, '第一版内容')

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt')
      await dialog.accept('初始版本')
    })
    await page.getByTestId('save-version').click()

    await expect(page.getByRole('listitem').getByText('初始版本')).toBeVisible()

    await typeInMonaco(page, '第二版内容（已修改）')

    await page.getByTestId('mode-diff').click()
    await expect(page.getByTestId('editor-diff-pane')).toBeVisible()
    await expect(page.getByTestId('diff-pane')).toBeVisible()
    await expect(page.getByTestId('diff-compare-label')).toHaveText('初始版本')
    await expect(page.getByTestId('diff-added-count')).toBeVisible()
    await expect(page.getByTestId('diff-removed-count')).toBeVisible()
  })

  test('快捷键可切换预览模式', async ({ page }) => {
    await createBookAndChapter(page)
    await typeInMonaco(page, '## 快捷键预览')

    await page.keyboard.press('ControlOrMeta+Digit2')
    await expect(page.getByTestId('editor-preview-pane')).toBeVisible()
    await expect(page.getByTestId('markdown-preview')).toContainText('快捷键预览')

    await page.keyboard.press('ControlOrMeta+Digit1')
    await expect(page.getByTestId('editor-edit-pane')).toBeVisible()
  })
})
