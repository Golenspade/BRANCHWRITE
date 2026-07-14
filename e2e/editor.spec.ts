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
  await expect(page.getByTestId('wysiwyg-pane')).toBeVisible()
  await expect(page.locator('.vditor-ir').first()).toBeVisible({ timeout: 20_000 })
}

async function typeInWysiwyg(page: Page, text: string) {
  await expect(page.locator('.vditor-ir').first()).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(() => !!(window as unknown as { __branchwriteVditor?: { setValue: (v: string) => void } }).__branchwriteVditor)
  await page.evaluate((value) => {
    const api = (window as unknown as { __branchwriteVditor?: { setValue: (v: string, clearStack?: boolean) => void } }).__branchwriteVditor
    api?.setValue(value, true)
  }, text)
  // 等 v-model 同步进 Pinia
  await expect.poll(async () => {
    return page.evaluate(() => {
      const api = (window as unknown as { __branchwriteVditor?: { getValue: () => string } }).__branchwriteVditor
      return api?.getValue() ?? ''
    })
  }).toContain(text.slice(0, Math.min(8, text.length)))
}

async function typeInMonaco(page: Page, text: string) {
  await page.getByTestId('mode-source').click()
  await expect(page.getByTestId('editor-source-pane')).toBeVisible()
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

  test('创建书籍与文档后进入所见即所得写作模式', async ({ page }) => {
    await createBookAndChapter(page)
    await expect(page.getByTestId('editor-status-bar')).toContainText('第一章')
    await expect(page.getByTestId('mode-wysiwyg')).toBeVisible()
    await expect(page.getByTestId('wysiwyg-host')).toBeVisible()
  })

  test('所见即所得可输入并切换到只读预览', async ({ page }) => {
    await createBookAndChapter(page)

    await typeInWysiwyg(page, '这是一段测试正文 hello')
    await expect(page.getByTestId('editor-status-bar')).toContainText('字符')

    await page.getByTestId('mode-preview').click()
    await expect(page.getByTestId('editor-preview-pane')).toBeVisible()
    await expect(page.getByTestId('markdown-preview')).toContainText('这是一段测试正文 hello')

    await page.getByTestId('mode-wysiwyg').click()
    await expect(page.getByTestId('editor-wysiwyg-pane')).toBeVisible()
  })

  test('源码模式 Monaco 仍可用', async ({ page }) => {
    await createBookAndChapter(page)
    await typeInMonaco(page, '## 源码模式内容')
    await expect(page.getByTestId('editor-status-bar')).toContainText('字符')
  })

  test('保存版本后可进入 Diff 对比', async ({ page }) => {
    await createBookAndChapter(page)

    await typeInWysiwyg(page, '第一版内容')

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt')
      await dialog.accept('初始版本')
    })
    await page.getByTestId('save-version').click()

    await expect(page.getByRole('listitem').getByText('初始版本')).toBeVisible()

    await typeInWysiwyg(page, '第二版内容（已修改）')

    await page.getByTestId('mode-diff').click()
    await expect(page.getByTestId('editor-diff-pane')).toBeVisible()
    await expect(page.getByTestId('diff-pane')).toBeVisible()
    await expect(page.getByTestId('diff-compare-label')).toHaveText('初始版本')
    await expect(page.getByTestId('diff-added-count')).toBeVisible()
    await expect(page.getByTestId('diff-removed-count')).toBeVisible()
  })

  test('快捷键可切换到预览模式', async ({ page }) => {
    await createBookAndChapter(page)
    await typeInWysiwyg(page, '## 快捷键预览')

    await page.keyboard.press('ControlOrMeta+Digit3')
    await expect(page.getByTestId('editor-preview-pane')).toBeVisible()
    await expect(page.getByTestId('markdown-preview')).toContainText('快捷键预览')

    await page.keyboard.press('ControlOrMeta+Digit1')
    await expect(page.getByTestId('editor-wysiwyg-pane')).toBeVisible()
  })

  test('可插入本地图片到写作区', async ({ page }) => {
    await createBookAndChapter(page)
    await page.waitForFunction(() => !!(window as any).__branchwriteVditor?.insertImageFiles)

    const inserted = await page.evaluate(async () => {
      // 1x1 PNG
      const binary = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const file = new File([bytes], 'dot.png', { type: 'image/png' })
      const api = (window as any).__branchwriteVditor
      const err = await api.insertImageFiles([file])
      return { err, value: api.getValue() as string }
    })

    expect(inserted.err).toBeNull()
    expect(inserted.value).toContain('![dot](data:image/png;base64,')
    await expect(page.getByTestId('editor-status-bar')).toContainText('字符')
  })
})
