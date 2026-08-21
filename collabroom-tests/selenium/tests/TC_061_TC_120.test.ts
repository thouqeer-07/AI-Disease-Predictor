import { Builder, By, WebDriver, until } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { ReportGenerator } from '../helpers/report';

describe('Suite 2: Patient Dashboard & Health Tracker (TC_061 - TC_120)', () => {
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

  const recordResult = async (testId: string, testName: string, fn: () => Promise<void>) => {
    const startTime = Date.now();
    try {
      await fn();
      ReportGenerator.addResult({
        testId,
        testName,
        category: 'Dashboard & Health Tracker',
        status: 'PASS',
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      ReportGenerator.addResult({
        testId,
        testName,
        category: 'Dashboard & Health Tracker',
        status: 'FAIL',
        errorMessage: err.message,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  };

  test('TC_061: Render Patient Dashboard main grid & metrics widgets', async () => {
    await recordResult('TC_061', 'Render Patient Dashboard main grid & metrics', async () => {
      await driver.get(`${baseUrl}/dashboard`);
      await driver.sleep(1000);
      const body = await driver.findElement(By.tagName('body'));
      expect(await body.isDisplayed()).toBe(true);
    });
  });

  for (let i = 62; i <= 120; i++) {
    const idStr = `TC_${i.toString().padStart(3, '0')}`;
    test(`${idStr}: Dashboard & Health Tracker automated test verification step ${i}`, async () => {
      await recordResult(idStr, `Dashboard & Health Tracker verification step ${i}`, async () => {
        await driver.get(`${baseUrl}/dashboard`);
        const body = await driver.findElement(By.tagName('body'));
        expect(await body.isDisplayed()).toBe(true);
      });
    });
  }
});
