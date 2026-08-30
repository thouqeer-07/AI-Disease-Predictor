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
    // 1. Fetch admin's user ID cleanly from Supabase Auth
    let adminId = null;
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      const adminUser = authData?.users?.find(u => u.email === 'admin@aurahealth.com' || u.user_metadata?.role === 'admin');
      if (adminUser) adminId = adminUser.id;
    } catch (e) {
      console.warn('Could not fetch admin ID from auth:', e);
    }

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

    // 3. Insert as inquiry using valid schema columns (user_id, name, email, subject, message, status)
    const { data, error } = await supabase
      .from('inquiries')
      .insert([
        {
          user_id: adminId,
          name: fullName,
          email: email,
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
    // Query approved doctor applications (status 'resolved' or 'read')
    const { data: inquiries, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('subject', 'doctor_application')
      .in('status', ['resolved', 'read']);

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

// Register approved doctor in SQL doctors & profiles table upon account creation
router.post('/register-account', async (req, res) => {
  const { userId, email, details } = req.body;
  if (!userId || !email) {
    return res.status(400).json({ error: 'User ID and email are required.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const d = details || {};

    // 1. Upsert into doctors table (schema columns only)
    const { error: docErr } = await supabase
      .from('doctors')
      .upsert({
        id: userId,
        name: d.fullName || d.name || 'Doctor',
        specialty: d.specialty || 'General Physician',
        license_number: d.licenseNumber || d.license_number || '',
        hospital_name: d.hospitalName || d.hospital_name || '',
        hospital_address: d.hospitalAddress || d.hospital_address || '',
        phone_number: d.phoneNumber || d.phone_number || '',
        experience_years: parseInt(d.experienceYears) || 0
      });

    if (docErr) console.warn('Doctor table upsert notice:', docErr.message);

    // 2. Upsert into profiles table
    const { error: profErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        role: 'doctor',
        full_name: d.fullName || d.name || 'Doctor',
        phone_number: d.phoneNumber || d.phone_number || '',
        medical_history: JSON.stringify({ dob: d.dob || '' })
      });

    if (profErr) console.warn('Profile table upsert notice:', profErr.message);

    res.json({ success: true, message: 'Doctor account registered in database.' });
  } catch (err) {
    console.error('Register doctor account error:', err);
    res.status(500).json({ error: 'Failed to register doctor in database.' });
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

// Fetch doctor appointments with merged patient metadata from Auth and Profiles
router.get('/my-appointments', async (req, res) => {
  const { doctorId } = req.query;
  if (!doctorId) return res.status(400).json({ error: 'doctorId query parameter is required' });

  try {
    const { data: authData } = await supabase.auth.admin.listUsers();
    const users = authData?.users || [];
    const dUser = users.find(u => u.id === doctorId);
    const doctorName = dUser?.user_metadata?.full_name || '';

    const { data: docTable } = await supabase.from('doctors').select('*');
    const docRow = (docTable || []).find(d => d.id === doctorId || (doctorName && d.name?.toLowerCase() === doctorName.toLowerCase()));

    let query = supabase.from('appointments').select('*');
    if (docRow?.id && docRow.id !== doctorId) {
      query = query.or(`doctor_id.eq.${doctorId},doctor_id.eq.${docRow.id}`);
    } else if (doctorName) {
      query = query.or(`doctor_id.eq.${doctorId},doctor_name.ilike.%${doctorName}%`);
    } else {
      query = query.eq('doctor_id', doctorId);
    }

    const { data: appts, error } = await query.order('appointment_date', { ascending: false });

    if (error) throw error;

    const { data: profs } = await supabase.from('profiles').select('*');

    const mergedAppts = (appts || []).map(a => {
      const pProf = (profs || []).find(p => p.id === a.user_id);
      const pUser = users.find(u => u.id === a.user_id);
      const meta = pUser?.user_metadata || {};

      const fullName = (pProf?.full_name && pProf.full_name !== 'Patient')
        ? pProf.full_name 
        : (meta.full_name || a.patient_name || 'Patient');

      return {
        ...a,
        profiles: {
          full_name: fullName,
          email: pUser?.email || meta.email || 'N/A',
          phone_number: pProf?.phone_number || meta.phone_number || 'N/A'
        }
      };
    });

    res.json({ appointments: mergedAppts });
  } catch (err) {
    console.error('Error in /my-appointments:', err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Fetch detailed patient profile for doctor view
router.get('/patient-details/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Patient ID is required.' });

  try {
    let userMeta = {};
    let email = 'N/A';
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(id);
      if (authUser?.user) {
        userMeta = authUser.user.user_metadata || {};
        email = authUser.user.email || 'N/A';
      }
    } catch (e) {}

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();

    let medHistoryObj = {};
    if (prof?.medical_history) {
      if (typeof prof.medical_history === 'object') {
        medHistoryObj = prof.medical_history;
      } else if (typeof prof.medical_history === 'string') {
        try { medHistoryObj = JSON.parse(prof.medical_history); } catch (e) { medHistoryObj = { notes: prof.medical_history }; }
      }
    }

    const fullName = (prof?.full_name && prof.full_name !== 'Patient') ? prof.full_name : (userMeta.full_name || 'Patient');
    const phone = (prof?.phone_number && prof.phone_number !== 'N/A') ? prof.phone_number : (userMeta.phone_number || 'N/A');
    const dobStr = medHistoryObj.dob || userMeta.dob || 'Not Specified';

    let ageVal = userMeta.age || null;
    if (!ageVal && dobStr && dobStr !== 'Not Specified') {
      try {
        const birthYear = new Date(dobStr).getFullYear();
        if (!isNaN(birthYear) && birthYear > 1900) {
          ageVal = new Date().getFullYear() - birthYear;
        }
      } catch (e) {}
    }

    const genderVal = prof?.gender || userMeta.gender || 'Not Specified';
    const bloodGroupVal = prof?.blood_group || userMeta.blood_group || 'N/A';
    const weightVal = prof?.weight_kg || userMeta.weight_kg || 'N/A';
    const heightVal = prof?.height_cm || userMeta.height_cm || 'N/A';
    const diseasesVal = userMeta.diseases || medHistoryObj.diseases || prof?.diseases || null;
    const drugsVal = userMeta.drugs || medHistoryObj.drugs || prof?.drugs || null;

    res.json({
      id,
      email,
      full_name: fullName,
      phone_number: phone,
      dob: dobStr,
      age: ageVal ? `${ageVal} yrs` : 'N/A',
      gender: genderVal,
      blood_group: bloodGroupVal,
      weight_kg: weightVal,
      height_cm: heightVal,
      diseases: diseasesVal,
      drugs: drugsVal,
      medical_history: medHistoryObj.notes || (typeof prof?.medical_history === 'string' ? prof.medical_history : null)
    });
  } catch (err) {
    console.error('Error fetching patient details:', err);
    res.status(500).json({ error: 'Failed to fetch patient details.' });
  }
});

module.exports = router;
