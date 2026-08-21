async function loginUserMobile(driver, email = 'patient@aurahealth.com', password = 'Password123!') {
  try {
    const emailField = await driver.$('~mobile-email-input');
    if (await emailField.isExisting()) {
      await emailField.setValue(email);
      const passwordField = await driver.$('~mobile-password-input');
      await passwordField.setValue(password);
      const submitBtn = await driver.$('~mobile-login-submit-btn');
      await submitBtn.click();
    }
  } catch (e) {
    // Auth helper fallback
  }
}

module.exports = { loginUserMobile };
