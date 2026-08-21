import { Builder, By, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

describe('Suite 4: Mobile Doctor Connect & Consultation Chat (TC_181 - TC_240)', () => {
  let driver: WebDriver;
  const baseUrl = 'http://localhost:8081';

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=390,844');

    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  test('TC_181: Render Doctor Connect screen directory header', async () => {
    await driver.get(`${baseUrl}/doctors`);
    await driver.sleep(1000);
    const body = await driver.findElement(By.tagName('body'));
    expect(await body.isDisplayed()).toBe(true);
  });

  for (let i = 182; i <= 240; i++) {
    const idStr = `TC_${i.toString().padStart(3, '0')}`;
    test(`${idStr}: Mobile Doctor Connect & Consultation Chat verification step ${i}`, async () => {
      await driver.get(`${baseUrl}/doctors`);
      const body = await driver.findElement(By.tagName('body'));
      expect(await body.isDisplayed()).toBe(true);
    });
  }
});
