const { supabase } = require('../lib/supabase');

const triggerSOS = async (req, res) => {
  const { userId, location } = req.body;

  // Format coordinate string (e.g. "Latitude: 13.0254, Longitude: 80.0169") into a Google Maps URL
  let formattedLocation = location || 'Not Shared';
  if (location && typeof location === 'string') {
    const coordsRegex = /(?:latitude|lat)?\s*:?\s*([-+]?\d+(?:\.\d+)?)\s*[\s,;/|]\s*(?:longitude|lon|lng)?\s*:?\s*([-+]?\d+(?:\.\d+)?)/i;
    const match = location.match(coordsRegex);
    if (match) {
      const lat = match[1];
      const lon = match[2];
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180) {
        formattedLocation = `https://google.com/maps?q=${lat},${lon}`;
      }
    }
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // 1. Get the patient's profile details to get their full name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
    }
    const patientName = profile?.full_name || 'A patient';

    // 2. Fetch active emergency contacts (guardians) for this patient
    const { data: contacts, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (contactsError) {
      console.error('Error fetching emergency contacts:', contactsError);
      return res.status(500).json({ error: 'Failed to retrieve emergency contacts' });
    }

    // 3. Log the SOS activation in the insights table
    const timeString = new Date().toLocaleTimeString();
    const alertMessage = `SOS Activated! Emergency contacts notified at ${timeString}.`;
    const { error: logError } = await supabase
      .from('insights')
      .insert([
        {
          user_id: userId,
          type: 'emergency',
          content: alertMessage
        }
      ]);

    if (logError) {
      console.error('Error logging emergency insight:', logError);
    }

    if (!contacts || contacts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'SOS logged, but no active emergency contacts were found to notify.',
        contactsCount: 0
      });
    }

    // 4. Retrieve Twilio configuration from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const fromSmsNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
    const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER?.trim();

    console.log('DEBUG SOS: Account SID =', accountSid ? 'FOUND' : 'MISSING', '| Auth Token =', authToken ? 'FOUND' : 'MISSING', '| From Phone =', fromSmsNumber ? 'FOUND' : 'MISSING');

    const hasTwilioSms = accountSid && authToken && fromSmsNumber;
    const hasTwilioWhatsApp = accountSid && authToken && fromWhatsAppNumber;

    if (!hasTwilioSms && !hasTwilioWhatsApp) {
      console.warn('Twilio credentials missing in backend .env. SOS logged in DB but messages not sent.');
      return res.status(200).json({
        success: true,
        message: 'SOS alert registered! (SMS/WhatsApp notifications skipped - Twilio credentials not configured in backend .env)',
        contactsCount: contacts.length,
        twilioConfigured: false
      });
    }

    // Keep message under 120 characters to fit Twilio trial account single-segment limits (160 chars including disclaimer)
    const messageBody = `🚨 SOS: ${patientName} activated emergency alert. Loc: ${formattedLocation}. Check on them immediately!`;
    const sendResults = [];

    // Basic authentication header for Twilio API
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // 5. Send notifications to all active emergency contacts
    for (const contact of contacts) {
      const results = { name: contact.name, phoneNumber: contact.phone_number };

      // Send SMS if configured
      if (hasTwilioSms) {
        try {
          const smsResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              To: contact.phone_number,
              From: fromSmsNumber,
              Body: messageBody
            })
          });
          const smsData = await smsResponse.json();
          results.smsSent = smsResponse.ok;
          if (!smsResponse.ok) {
            console.error(`Twilio SMS error to ${contact.phone_number}:`, smsData);
          }
        } catch (smsErr) {
          console.error(`Failed to send SMS to ${contact.name}:`, smsErr);
          results.smsSent = false;
        }
      }

      // Send WhatsApp if configured
      if (hasTwilioWhatsApp) {
        try {
          const waResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              To: `whatsapp:${contact.phone_number}`,
              From: `whatsapp:${fromWhatsAppNumber}`,
              Body: messageBody
            })
          });
          const waData = await waResponse.json();
          results.whatsAppSent = waResponse.ok;
          if (!waResponse.ok) {
            console.error(`Twilio WhatsApp error to ${contact.phone_number}:`, waData);
          }
        } catch (waErr) {
          console.error(`Failed to send WhatsApp to ${contact.name}:`, waErr);
          results.whatsAppSent = false;
        }
      }

      sendResults.push(results);
    }

    return res.status(200).json({
      success: true,
      message: 'SOS notifications dispatched successfully!',
      contactsCount: contacts.length,
      twilioConfigured: true,
      results: sendResults
    });

  } catch (error) {
    console.error('SOS activation general failure:', error);
    return res.status(500).json({ error: 'Internal server error while activating SOS' });
  }
};

module.exports = { triggerSOS };
