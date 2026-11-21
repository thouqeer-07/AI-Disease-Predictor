const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { supabase } = require('../lib/supabase');

// Active-memory store for OTPs (In a real app, use Redis or a database table)
// Key: email (string), Value: { otp: string, expiresAt: number }
const otpStore = new Map();

let transporter;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log('✉️ Patient route initialized with custom SMTP server:', process.env.SMTP_HOST);
} else {
  // Fallback to dynamic Ethereal account
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'mock.user@ethereal.email',
      pass: 'mock_password'
    }
  });

  nodemailer.createTestAccount((err, account) => {
    if (err) {
      console.warn('⚠️ Using fallback Ethereal transporter for patient registration emails:', err.message);
    } else {
      transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass
        }
      });
      console.log('✉️ Patient route initialized dynamic Ethereal test account:', account.user);
    }
  });
}

// Check if an email is already registered across Auth, Doctors, and Pending Inquiries
router.post('/check-email-exists', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ exists: false, error: 'Email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Check Supabase Auth users
    let authMatch = false;
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      authMatch = (authData?.users || []).some(u => u.email && u.email.toLowerCase() === cleanEmail);
    } catch (e) {
      console.warn('Auth listUsers notice:', e);
    }

    if (authMatch) {
      return res.json({
        exists: true,
        message: 'This email address is already registered. Please change your email ID or log in to your account.'
      });
    }

    // 2. Check Doctors table
    const { data: docData } = await supabase.from('doctors').select('id').ilike('email', cleanEmail);
    if (docData && docData.length > 0) {
      return res.json({
        exists: true,
        message: 'This email address is already registered to a doctor account. Please change your email ID or log in.'
      });
    }

    // 3. Check PENDING Doctor Applications in Inquiries table (only status === 'new')
    const { data: inqData } = await supabase
      .from('inquiries')
      .select('*')
      .eq('subject', 'doctor_application')
      .eq('status', 'new');

    const inqMatch = (inqData || []).some(inq => {
      try {
        const payload = JSON.parse(inq.message);
        return payload.email && payload.email.trim().toLowerCase() === cleanEmail;
      } catch (e) {
        return false;
      }
    });

    if (inqMatch) {
      return res.json({
        exists: true,
        message: 'A pending verification request with this email address is currently awaiting admin review. Please wait for approval.'
      });
    }

    return res.json({ exists: false });
  } catch (err) {
    console.error('Check email error:', err);
    return res.json({ exists: false });
  }
});

// Send Welcome & OTP Email
router.post('/send-welcome', async (req, res) => {
  const { email, fullName } = req.body;

  if (!email || !fullName) {
    return res.status(400).json({ error: 'Email and full name are required.' });
  }

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  console.log('========================================');
  console.log(`🔑 [DEBUG OTP GENERATED] Email: ${email} | OTP: ${otp}`);
  console.log('========================================');

  // Store OTP with 10-minute expiration
  otpStore.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });

  const subject = 'Welcome to AuraHealth - Your Verification Code';
  const html = `<div style="font-family: sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; max-width: 600px; background-color: #ffffff; color: #1e293b;">
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="color: #1d4ed8; margin: 0; font-size: 28px;">AuraHealth</h1>
      <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Your AI Healthcare Companion</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">Hello <strong style="color: #0f172a;">${fullName}</strong>,</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #475569;">
      Welcome to AuraHealth! We're thrilled to have you join our platform. To complete your registration and secure your account, please use the verification code below.
    </p>

    <div style="text-align: center; margin: 35px 0;">
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; display: inline-block; letter-spacing: 5px; font-size: 32px; font-weight: bold; color: #1d4ed8; border: 2px dashed #cbd5e1;">
        ${otp}
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">This code expires in 10 minutes.</p>
    </div>

    <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
      If you did not create this account, please ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
    
    <div style="text-align: center; color: #94a3b8; font-size: 12px;">
      <p style="margin: 0;">© ${new Date().getFullYear()} AuraHealth. All rights reserved.</p>
    </div>
  </div>`;

  try {
    const info = await transporter.sendMail({
      from: '"AuraHealth" <noreply@aurahealth.com>',
      to: email,
      subject: subject,
      html: html
    });
    console.log('✅ OTP Welcome email sent to', email);
    res.json({ success: true, message: 'OTP email sent.' });
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    res.status(500).json({ error: 'Failed to send OTP email.' });
  }
});

// Verify OTP Endpoint
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const record = otpStore.get(email.toLowerCase());

  console.log(`🔍 [DEBUG OTP VERIFY] Email: ${email} | Provided OTP: ${otp} | Expected OTP: ${record ? record.otp : 'N/A'}`);

  if (!record) {
    return res.status(400).json({ error: 'No pending verification found for this email.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP.' });
  }

  // OTP is valid!
  otpStore.delete(email.toLowerCase());

  try {
    // 1. Fetch user by email directly from Supabase Auth
    const { data: authData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const user = authData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'AuraHealth user not found with this email.' });
    }

    // 2. Update Auth metadata and confirm email
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        email_confirm: true,
        user_metadata: { ...user.user_metadata, is_verified: true, aura_verified: true } 
      }
    );

    if (updateError) {
      console.error('Failed to update auth metadata:', updateError);
      throw updateError;
    }

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Error during OTP verification process:', err);
    res.status(500).json({ error: 'Failed to process verification.' });
  }
});

// Send Password Reset Link Email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const trimmedEmail = email.trim().toLowerCase();

  try {
    // 1. Generate password recovery link using Supabase Admin
    let resetLink = `http://localhost:5173/reset-password?email=${encodeURIComponent(trimmedEmail)}`;
    try {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: trimmedEmail,
        options: {
          redirectTo: 'http://localhost:5173/reset-password'
        }
      });
      if (!linkErr && linkData?.properties?.action_link) {
        resetLink = linkData.properties.action_link;
      }
    } catch (gErr) {
      console.warn('⚠️ Admin generateLink warning:', gErr.message || gErr);
    }

    // 2. Build email content
    const subject = 'AuraHealth - Reset Your Account Password';
    const html = `<div style="font-family: sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; max-width: 600px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h2 style="color: #1d4ed8; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">AuraHealth</h2>
      </div>
      <h3 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 700;">Password Reset Request</h3>
      <p style="font-size: 15px; line-height: 1.6; color: #475569;">We received a request to reset the password for your AuraHealth account linked to <strong>${trimmedEmail}</strong>.</p>
      <p style="font-size: 15px; line-height: 1.6; color: #475569;">Please click the button below to set a new password for your account:</p>
      <div style="margin: 35px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(29, 78, 216, 0.2); display: inline-block;">Reset Password Now</a>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #64748b;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${resetLink}" style="color: #1d4ed8; word-break: break-all;">${resetLink}</a></p>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
      <p style="font-size: 13px; line-height: 1.5; color: #94a3b8;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
      <p style="font-size: 11px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center;">© 2026 AuraHealth Core Inc. Secure Clinical Environment.</p>
     </div>`;

    console.log(`✉️ Dispatching password reset email to ${trimmedEmail}...`);

    const info = await transporter.sendMail({
      from: '"AuraHealth Security" <noreply@aurahealth.com>',
      to: trimmedEmail,
      subject: subject,
      html: html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('✉️ Password reset email sent. URL:', previewUrl || 'Gmail SMTP Dispatched');

    res.json({
      success: true,
      message: `Password reset email sent to ${trimmedEmail}. Please check your inbox.`,
      emailUrl: previewUrl || null
    });
  } catch (err) {
    console.error('❌ Error sending password reset email:', err.message || err);
    res.status(500).json({ error: 'Failed to send password reset email. Please try again.' });
  }
});

// Update Password endpoint
router.post('/reset-password', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and new password are required.' });
  }

  try {
    // 1. Fetch user by email
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = usersData.users.find(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // 2. Update user's password in Supabase
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (updateError) throw updateError;

    console.log(`🔑 Password updated successfully for user: ${email}`);

    res.json({
      success: true,
      message: 'Password updated successfully. You can now log in with your new password.'
    });
  } catch (err) {
    console.error('❌ Error updating password:', err.message || err);
    res.status(500).json({ error: 'Failed to update password: ' + (err.message || 'Unknown error') });
  }
});

module.exports = router;
