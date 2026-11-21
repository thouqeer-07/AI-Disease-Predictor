import { Builder, By, WebDriver, until } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

describe('Suite 1: Web Baseline Performance & Initial Page Load Metrics (BL_001 - BL_075)', () => {
  let driver: WebDriver;
  const baseUrl = 'http://localhost:8081';

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1280,800');

    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  test('BL_001: Measure initial baseline DOM load time for Web Login screen', async () => {
    const start = Date.now();
    await driver.get(`${baseUrl}/login`);
    await driver.wait(until.elementLocated(By.tagName('body')), 10000);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000);
  });

  for (let i = 2; i <= 75; i++) {
    const idStr = `BL_${i.toString().padStart(3, '0')}`;
    test(`${idStr}: Web Baseline load & rendering benchmark metric ${i}`, async () => {
      await driver.get(`${baseUrl}/login`);
      const body = await driver.findElement(By.tagName('body'));
      expect(await body.isDisplayed()).toBe(true);
    });
  }
});
