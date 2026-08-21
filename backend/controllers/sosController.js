const { supabase } = require('../lib/supabase');
const { sendEmergencyWhatsApp } = require('../services/whatsappService');

const triggerSOS = async (req, res) => {
  const { userId, location } = req.body;

  // Format coordinate string into a Google Maps URL and extract raw numbers
  let formattedLocation = location || 'Not Shared';
  let extractedLat = 0;
  let extractedLon = 0;
  
  if (location && typeof location === 'string') {
    // Try to match standard "lat, lon" or Google Maps URL format
    const match = location.match(/([-+]?\d{1,2}(?:\.\d+)?)\s*,\s*([-+]?\d{1,3}(?:\.\d+)?)/);
    if (match) {
      const latNum = parseFloat(match[1]);
      const lonNum = parseFloat(match[2]);
      if (latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180) {
        formattedLocation = `https://google.com/maps?q=${latNum},${lonNum}`;
        extractedLat = latNum;
        extractedLon = lonNum;
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

    const sendResults = [];

    // 4. Send notifications to all active emergency contacts
    for (const contact of contacts) {
      const results = { name: contact.name, phoneNumber: contact.phone_number };

      // Send WhatsApp via Baileys (Replacing Twilio WA)
      try {
        await sendEmergencyWhatsApp(contact.phone_number, extractedLat, extractedLon, patientName);
        results.whatsAppSent = true;
      } catch (waErr) {
        console.error(`Failed to send Baileys WhatsApp to ${contact.name}:`, waErr.message);
        results.whatsAppSent = false;
      }

      sendResults.push(results);
    }

    return res.status(200).json({
      success: true,
      message: 'SOS WhatsApp notifications dispatched successfully via Baileys!',
      contactsCount: contacts.length,
      twilioConfigured: true, // Legacy flag kept for frontend compatibility
      results: sendResults
    });

  } catch (error) {
    console.error('SOS activation general failure:', error);
    return res.status(500).json({ error: 'Internal server error while activating SOS' });
  }
};

module.exports = { triggerSOS };
