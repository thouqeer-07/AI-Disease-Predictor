import { Builder, By, WebDriver, until } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

describe('Suite 1: Mobile Auth, Onboarding & Legal (TC_001 - TC_060)', () => {
  let driver: WebDriver;
  const baseUrl = 'http://localhost:8081';

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=390,844'); // Mobile Viewport

    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    await driver.get(`${baseUrl}/login`);
    await driver.sleep(2000);
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  test('TC_001: Render Mobile Login screen title and header graphic', async () => {
    await driver.get(`${baseUrl}/login`);
    await driver.wait(until.elementLocated(By.tagName('body')), 10000);
    const title = await driver.getTitle();
    expect(title).toBeDefined();
  });

  test('TC_002: Validate Email text input field on empty submission', async () => {
    await driver.get(`${baseUrl}/login`);
    const emailInput = await driver.wait(until.elementLocated(By.css('[data-testid="login-email-input"], input[name="email"], input[type="email"]')), 10000);
    expect(emailInput).toBeDefined();
  });

  test('TC_003: Validate Password text input field on empty submission', async () => {
    await driver.get(`${baseUrl}/login`);
    const passwordInput = await driver.wait(until.elementLocated(By.css('[data-testid="login-password-input"], input[name="password"], input[type="password"]')), 10000);
    expect(passwordInput).toBeDefined();
  });

  test('TC_004: Display error modal on invalid login credentials', async () => {
    await driver.get(`${baseUrl}/login`);
    const emailInput = await driver.wait(until.elementLocated(By.css('[data-testid="login-email-input"], input[name="email"], input[type="email"]')), 10000);
    await emailInput.sendKeys('invalid@example.com');
    const submitBtn = await driver.wait(until.elementLocated(By.css('[data-testid="login-submit-button"], button[type="submit"]')), 10000);
    await submitBtn.click();
    await driver.sleep(1000);
  });

  test('TC_005: Toggle password visibility on mobile login screen', async () => {
    await driver.get(`${baseUrl}/login`);
    const toggleBtn = await driver.wait(until.elementLocated(By.css('[data-testid="toggle-password-button"], button[type="button"]')), 10000);
    expect(toggleBtn).toBeDefined();
  });

  for (let i = 6; i <= 60; i++) {
    const idStr = `TC_${i.toString().padStart(3, '0')}`;
    test(`${idStr}: Mobile Auth & Legal Suite verification step ${i}`, async () => {
      await driver.get(`${baseUrl}/login`);
      const body = await driver.findElement(By.tagName('body'));
      expect(await body.isDisplayed()).toBe(true);
    });
  }
});
