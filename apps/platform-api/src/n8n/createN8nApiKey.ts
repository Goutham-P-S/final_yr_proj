import { Page } from "playwright";

export async function createN8nApiKey(params: {
  page: Page;
  n8nHostPort: number;
  label?: string;
}): Promise<string> {
  const { page, n8nHostPort, label = "platform-auto" } = params;

  const apiUrl = `http://localhost:${n8nHostPort}/settings/api`;

  // 1️⃣ Navigate to API settings
  await page.goto(apiUrl, { waitUntil: "domcontentloaded" });

  await page.waitForSelector('button:has-text("Create an API Key")', {
    timeout: 30000,
  });

  // open modal
  await page.click('button:has-text("Create an API Key")');



  // 3️⃣ Wait for modal input
  const labelInput = page.locator('input[placeholder*="Internal"]');
  await labelInput.waitFor({ timeout: 15000 });

  // 4️⃣ Fill label (REQUIRED – you already found this 👌)
  await labelInput.fill(label);

  // 5️⃣ Click Save
  await page.getByRole("button", { name: /^save$/i }).click();

 // ⏳ Wait for modal content
 const apiKeyLocator = page.locator(
    '[data-test-id="copy-input"] > span'
  );

  await apiKeyLocator.waitFor({ state: "visible", timeout: 20000 });

  const apiKey = (await apiKeyLocator.textContent())?.trim();
  console.log("🔍 Extracted API key:", apiKey);
  if (!apiKey || apiKey.length < 20) {
    throw new Error("API key not found or invalid");
  }

  // 6️⃣ Close modal
  await page.getByRole("button", { name: /done/i }).click();

  return apiKey;
}