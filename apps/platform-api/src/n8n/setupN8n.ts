import { chromium } from "playwright";
export async function setupN8nOwner(params: {
  n8nHostPort: number;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  basicAuthUser?: string;
  basicAuthPass?: string;
}) {
  const {
    n8nHostPort,
    email,
    firstName,
    lastName,
    password,
    basicAuthUser,
    basicAuthPass,
  } = params;

  const setupUrl = `http://localhost:${n8nHostPort}/setup`;

  const browser = await chromium.launch({ headless: false }); // debug ON
  const context = await browser.newContext({
    httpCredentials:
      basicAuthUser && basicAuthPass
        ? { username: basicAuthUser, password: basicAuthPass }
        : undefined,
  });

  const page = await context.newPage();

  // ✅ Retry loop because /setup keeps reloading until n8n is ready
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      console.log(`🔄 n8n setup attempt ${attempt}...`);
      await page.goto(setupUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

      // If startup page shows "n8n is starting up", wait and retry
      const bodyText = await page.textContent("body");
      if (bodyText?.toLowerCase().includes("n8n is starting")) {
        console.log("⏳ n8n still starting... waiting 3s");
        await page.waitForTimeout(3000);
        continue;
      }

      // ✅ wait until inputs exist
      await page.waitForSelector('input[type="email"]', { timeout: 15000 });
      break;
    } catch (err) {
      console.log("⚠️ setup page not stable yet, waiting 3s...");
      await page.waitForTimeout(3000);
      if (attempt === 10) {
        await browser.close();
        throw err;
      }
    }
  }

  // ✅ Fill the form
  await page.locator('input[type="email"]').fill(email);

  const textInputs = page.locator('input[type="text"]');
  await textInputs.nth(0).fill(firstName);
  await textInputs.nth(1).fill(lastName);

  await page.locator('input[type="password"]').fill(password);

  // ✅ Click Next
  await page.getByRole("button", { name: /next/i }).click();

  // ✅ Wait for redirect away from /setup
  await page.waitForTimeout(5000);

 return { browser, page };

}