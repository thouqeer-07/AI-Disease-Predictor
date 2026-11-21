const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// Submit Doctor Verification Application
router.post('/apply', async (req, res) => {
  const { 
    fullName, email, phoneNumber, gender, 
    specialty, licenseNumber, hospitalName, 
    hospitalAddress, experienceYears, dob, documentPhoto 
  } = req.body;

  try {
    // 1. Fetch admin's profile ID
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'admin@aurahealth.com')
      .single();

    if (profileError || !adminProfile) {
      console.error('Error fetching admin profile:', profileError);
      return res.status(500).json({ error: 'System Admin profile not found. Please contact support.' });
    }

    const adminId = adminProfile.id;

    // 2. Prepare payload
    const applicationPayload = {
      fullName,
      email,
      phoneNumber,
      gender,
      specialty,
      licenseNumber,
      hospitalName,
      hospitalAddress,
      experienceYears,
      dob: dob || '',
      documentPhoto // base64 string photocopy
    };

    // 3. Insert as inquiry referencing adminId
    const { data, error } = await supabase
      .from('inquiries')
      .insert([
        {
          patient_id: adminId,
          doctor_id: adminId,
          patient_name: fullName,
          subject: 'doctor_application',
          message: JSON.stringify(applicationPayload),
          status: 'new' // representing pending
        }
      ])
      .select();

    if (error) {
      console.error('Error inserting doctor application:', error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ message: 'Application submitted successfully.', data: data[0] });
  } catch (err) {
    console.error('Apply catch error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Check if email has an approved application
router.post('/check-approval', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    // Query approved doctor applications
    const { data: inquiries, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('subject', 'doctor_application')
      .eq('status', 'read'); // 'read' status represents approved

    if (error) {
      console.error('Error checking approval:', error);
      return res.status(400).json({ error: error.message });
    }

    // Find if any approved inquiry has the matching email in its parsed payload
    let approvedApp = null;
    for (const inq of inquiries) {
      try {
        const payload = JSON.parse(inq.message);
        if (payload.email && payload.email.toLowerCase() === email.toLowerCase()) {
          approvedApp = payload;
          break;
        }
      } catch (e) {
        console.error('Failed to parse inquiry message JSON:', e);
      }
    }

    if (approvedApp) {
      return res.json({ approved: true, details: approvedApp });
    } else {
      return res.json({ approved: false });
    }
  } catch (err) {
    console.error('Check approval catch error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Fetch all public doctor profiles (including bio and education from auth metadata)
router.get('/public-profiles', async (req, res) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor');

    const { data: infoData, error: infoError } = await supabase
      .from('doctors')
      .select('*');

    if (profileError || infoError) throw new Error('Error fetching doctor data');

    // Fetch auth users for bio and education metadata
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    let users = [];
    if (!authError && authData?.users) {
      users = authData.users;
    }

    const formattedDoctors = (profileData || []).map(profile => {
      const info = (infoData || []).find(i => i.id === profile.id);
      const user = users.find(u => u.id === profile.id);
      
      return {
        id: profile.id,
        name: profile.full_name || user?.user_metadata?.full_name || 'Dr. Medical Professional',
        specialty: info?.specialty || 'General Physician',
        hospital: info?.hospital_name || 'AuraHealth Clinic',
        address: info?.hospital_address || 'Clinic Address Pending',
        rating: 4.9,
        reviewsCount: 24,
        status: 'online',
        bio: user?.user_metadata?.bio || info?.bio || null,
        education: user?.user_metadata?.education || null
      };
    });

    res.json({ doctors: formattedDoctors });
  } catch (error) {
    console.error('Error fetching public profiles:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
