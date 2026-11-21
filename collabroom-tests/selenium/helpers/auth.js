const { By, until } = require('selenium-webdriver');

async function loginUser(driver, baseUrl = 'http://localhost:8081', email = 'testuser@aurahealth.com', password = 'Password123!') {
  await driver.get(`${baseUrl}/login`);
  
  // Wait for login form to load
  await driver.wait(until.elementLocated(By.css('[data-testid="login-form"], [data-testid="login-email-input"], input[type="email"]')), 10000);
  
  // Find input fields
  const emailInput = await driver.wait(until.elementLocated(By.css('[data-testid="login-email-input"], input[type="email"], input[name="email"]')), 5000);
  await emailInput.clear();
  await emailInput.sendKeys(email);

  const passwordInput = await driver.wait(until.elementLocated(By.css('[data-testid="login-password-input"], input[type="password"], input[name="password"]')), 5000);
  await passwordInput.clear();
  await passwordInput.sendKeys(password);

  const submitButton = await driver.wait(until.elementLocated(By.css('[data-testid="login-submit-button"], button[type="submit"]')), 5000);
  await submitButton.click();

  // Wait for navigation to dashboard or authenticated state
  try {
    await driver.wait(until.urlContains('/dashboard'), 5000);
  } catch (e) {
    // If auth failed or test mode, proceed
  }
}

module.exports = { loginUser };
