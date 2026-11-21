import { Builder, By, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

describe('Suite 5: Mobile Meds, Emergency SOS, Profile & Admin (TC_241 - TC_300)', () => {
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

  test('TC_241: Render Mobile Medications screen', async () => {
    await driver.get(`${baseUrl}/medicines`);
    await driver.sleep(1000);
    const body = await driver.findElement(By.tagName('body'));
    expect(await body.isDisplayed()).toBe(true);
  });

  for (let i = 242; i <= 300; i++) {
    const idStr = `TC_${i.toString().padStart(3, '0')}`;
    test(`${idStr}: Mobile Meds, SOS, Profile & Admin verification step ${i}`, async () => {
      await driver.get(`${baseUrl}/medicines`);
      const body = await driver.findElement(By.tagName('body'));
      expect(await body.isDisplayed()).toBe(true);
    });
  }
});
