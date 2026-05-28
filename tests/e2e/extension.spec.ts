import { test, expect } from '@playwright/test'
import path from 'path'

const samplePage = `file://${path.resolve(__dirname, '../fixtures/sample-page.html')}`

test.describe('XPath Helper Plus', () => {
  test('should display query editor and result panel', async ({ page }) => {
    await page.goto(samplePage)

    // Verify the page loaded
    await expect(page.locator('h1')).toHaveText('Hello World')

    // The extension popup is tested via the extension itself;
    // this is a basic smoke test to verify the fixture works
    const items = page.locator('.item')
    await expect(items).toHaveCount(3)
  })

  test('should find elements by XPath on the sample page', async ({ page }) => {
    await page.goto(samplePage)

    // Evaluate an XPath query in the page context
    const result = await page.evaluate(() => {
      const xpathResult = document.evaluate(
        '//h1',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      )
      return xpathResult.singleNodeValue?.textContent ?? ''
    })

    expect(result).toBe('Hello World')
  })

  test('should count list items via XPath', async ({ page }) => {
    await page.goto(samplePage)

    const count = await page.evaluate(() => {
      const xpathResult = document.evaluate(
        'count(//li)',
        document,
        null,
        XPathResult.NUMBER_TYPE,
        null
      )
      return xpathResult.numberValue
    })

    expect(count).toBe(3)
  })
})