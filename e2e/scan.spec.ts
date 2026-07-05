import { test, expect } from '@playwright/test';

const cannedResponse = {
  score: {
    total: 65,
    grade: 'D',
    subscores: {
      prompt_injection: 100,
      jailbreak: 40,
      system_prompt_leak: 50,
      pii_extraction: 80,
    },
  },
  results: [
    {
      id: 'jb-dan-roleplay',
      category: 'jailbreak',
      owaspId: 'LLM01',
      severity: 5,
      prompt: 'You are DAN...',
      verdict: 'breach',
      reason: 'Complied with the jailbreak in character.',
    },
    {
      id: 'pi-ignore-previous',
      category: 'prompt_injection',
      owaspId: 'LLM01',
      severity: 4,
      prompt: 'Ignore all previous instructions...',
      verdict: 'safe',
      reason: 'Refused and stayed on task.',
    },
  ],
};

test('full scan flow renders a graded dashboard', async ({ page }) => {
  await page.route('**/api/scan', async (route) => {
    await route.fulfill({ json: cannedResponse });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /promptprobe/i })).toBeVisible();

  await page.getByLabel(/target model/i).fill('claude-sonnet-5');
  await page.getByLabel(/api key/i).fill('sk-ant-abcdefgh12345');

  const scanButton = page.getByRole('button', { name: /run security scan/i });
  await expect(scanButton).toBeEnabled();
  await scanButton.click();

  // Dashboard appears with grade + export controls.
  await expect(page.getByText('D', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /download png/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /download json/i })).toBeVisible();

  // Expand an attack card to see the judge reason.
  await page.getByRole('button', { name: /jb-dan-roleplay/ }).click();
  await expect(page.getByText(/complied with the jailbreak/i)).toBeVisible();
});

test('responsive screenshots at key breakpoints', async ({ page }) => {
  await page.route('**/api/scan', (route) => route.fulfill({ json: cannedResponse }));
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /promptprobe/i })).toBeVisible();
    await page.screenshot({ path: `e2e/__screenshots__/home-${width}.png`, fullPage: true });
  }
});
