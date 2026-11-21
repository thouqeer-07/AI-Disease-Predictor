const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { supabase } = require('../lib/supabase');

// Set up SMTP email transporter (configured via environment variables)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER || 'mock.user@ethereal.email',
    pass: process.env.SMTP_PASS || 'mock_password'
  }
});

// Helper function to send email notification
async function sendEmailNotification(toEmail, doctorName, status) {
  const subject = status === 'approved' 
    ? 'AuraHealth Doctor Registration Request Approved!' 
    : 'AuraHealth Doctor Registration Request Update';

  const html = status === 'approved'
    ? `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px;">
        <h2 style="color: #0f766e;">Congratulations Dr. ${doctorName}!</h2>
        <p>Your registration request has been successfully reviewed and approved by the AuraHealth admin team.</p>
        <p>You can now proceed to create your official professional account on our platform using the approved email: <strong>${toEmail}</strong>.</p>
        <div style="margin: 30px 0;">
          <a href="http://localhost:5173/register" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Create Account Now</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">This is an automated security notification from AuraHealth. Please do not reply directly to this email.</p>
       </div>`
    : `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px;">
        <h2 style="color: #b91c1c;">AuraHealth Registration Request Status</h2>
        <p>Dear Dr. ${doctorName},</p>
        <p>Thank you for submitting your verification details to AuraHealth. Unfortunately, our admin team was unable to verify your professional credentials at this time, and your request has been rejected.</p>
        <p>Please double-check your license details and document copies and resubmit a request with valid documents.</p>
        <p style="color: #64748b; font-size: 12px;">This is an automated security notification from AuraHealth. Please do not reply directly to this email.</p>
       </div>`;

  console.log(`✉️ Sending mail to ${toEmail}...`);
  console.log(`[Subject]: ${subject}`);
  console.log(`[Body Snippet]: Approving Dr. ${doctorName}`);

  // NodeMailer sending (Ethereal test account/console logging fallback)
  try {
    const info = await transporter.sendMail({
      from: '"AuraHealth Portal" <noreply@aurahealth.com>',
      to: toEmail,
      subject: subject,
      html: html
    });
    console.log('✉️ Mail sent successfully. URL:', nodemailer.getTestMessageUrl(info) || 'Console log only');
    return { success: true, url: nodemailer.getTestMessageUrl(info) || null };
  } catch (err) {
    console.error('❌ Error sending mail via nodemailer:', err.message || err);
    return { success: false, error: err.message };
  }
}

// Get all applications (pending & past)
router.get('/applications', async (req, res) => {
  try {
    // Fetch doctor application inquiries
    const { data: inquiries, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('subject', 'doctor_application')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing inquiries:', error);
      return res.status(400).json({ error: error.message });
    }

    // 3. Map and parse payload
    const applications = inquiries.map(inq => {
      let payload = {};
      try {
        payload = JSON.parse(inq.message);
      } catch (e) {
        console.error('JSON parsing failed:', e);
      }
      return {
        id: inq.id,
        status: inq.status, // 'new' = pending, 'read' = approved, 'urgent' = rejected
        created_at: inq.created_at,
        ...payload
      };
    });

    res.json({ applications });
  } catch (err) {
    console.error('Fetch applications catch error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Approve application
router.post('/approve-doctor', async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Application ID is required.' });
  }

  try {
    // 1. Fetch inquiry details
    const { data: inquiry, error: fetchError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !inquiry) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    let payload = {};
    try {
      payload = JSON.parse(inquiry.message);
    } catch (e) {
      console.error('Failed to parse inquiry message JSON:', e);
    }

    // 2. Update status of the inquiry to 'resolved' (approved)
    const { error: updateError } = await supabase
      .from('inquiries')
      .update({ status: 'resolved' })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating inquiry status:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    // 3. Check if doctor profile already exists in profiles table by email
    if (payload.email) {
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', payload.email);

      if (existingProfiles && existingProfiles.length > 0) {
        const docProfile = existingProfiles[0];
        
        // Update profile role to doctor and store dob in medical_history JSON
        const dobVal = payload.dob || payload.dateOfBirth || '';
        await supabase
          .from('profiles')
          .update({
            role: 'doctor',
            full_name: payload.fullName || docProfile.full_name,
            medical_history: JSON.stringify({ dob: dobVal })
          })
          .eq('id', docProfile.id);

        // Upsert into doctors table
        await supabase
          .from('doctors')
          .upsert({
            id: docProfile.id,
            name: payload.fullName || docProfile.full_name,
            specialty: payload.specialty || 'General Physician',
            hospital_name: payload.hospitalName || 'AuraHealth Clinic',
            hospital_address: payload.hospitalAddress || 'Clinic Address Pending',
            experience_years: parseInt(payload.experienceYears) || 0
          });
      }
    }

    // 4. Send email notification
    const emailResult = await sendEmailNotification(payload.email || 'doctor@aurahealth.com', payload.fullName || 'Doctor', 'approved');

    res.json({ 
      success: true, 
      message: `Doctor ${payload.fullName || ''} approved. Notification email dispatched.`,
      emailUrl: emailResult.url 
    });
  } catch (err) {
    console.error('Approve doctor catch error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Reject application
router.post('/reject-doctor', async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Application ID is required.' });
  }

  try {
    // 1. Fetch inquiry details
    const { data: inquiry, error: fetchError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !inquiry) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const payload = JSON.parse(inquiry.message);

    // 2. Update status of the inquiry to 'resolved' (rejected)
    const { error: updateError } = await supabase
      .from('inquiries')
      .update({ status: 'resolved' })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating inquiry status:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    // 3. Send email notification
    const emailResult = await sendEmailNotification(payload.email, payload.fullName, 'rejected');

    res.json({ 
      success: true, 
      message: `Doctor ${payload.fullName} rejected. Notification email dispatched.`,
      emailUrl: emailResult.url 
    });
  } catch (err) {
    console.error('Reject doctor catch error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Fetch all patients (queries Supabase Auth & profiles table)
router.get('/patients', async (req, res) => {
  try {
    let authUsers = [];
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users) authUsers = authData.users;
    } catch (e) {
      console.error('Error listing auth users:', e);
    }

    let profiles = [];
    try {
      const { data: profData } = await supabase.from('profiles').select('*');
      if (profData) profiles = profData;
    } catch (e) {}

    // Filter for accounts with patient role or non-admin/non-doctor user accounts
    const patientUsers = authUsers.filter(u => {
      const r = u.user_metadata?.role || u.role;
      return r === 'patient' || (!r && u.email !== 'admin@aurahealth.com');
    });

    const patients = patientUsers.map(u => {
      const meta = u.user_metadata || {};
      const prof = profiles.find(p => p.id === u.id) || {};
      
      const dobStr = meta.dob || prof.dob || null;
      let ageVal = meta.age || prof.age || null;
      if ((!ageVal || ageVal === 0 || ageVal === '0') && dobStr && dobStr !== 'Not Specified') {
        const birthYear = new Date(dobStr).getFullYear();
        if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= new Date().getFullYear()) {
          ageVal = new Date().getFullYear() - birthYear;
        }
      }

      let rawWeight = meta.weight_kg || meta.weight || prof.weight_kg || prof.weight || null;
      let rawHeight = meta.height_cm || meta.height || prof.height_cm || prof.height || null;

      // Sanitize unrealistic test entries (>300kg or >300cm)
      if (rawWeight && (isNaN(parseFloat(rawWeight)) || parseFloat(rawWeight) > 500)) {
        rawWeight = null;
      }
      if (rawHeight && (isNaN(parseFloat(rawHeight)) || parseFloat(rawHeight) > 300)) {
        rawHeight = null;
      }

      const diseasesVal = meta.diseases || prof.diseases || null;
      const drugsVal = meta.drugs || prof.drugs || null;

      let medHistory = prof.medical_history || meta.medical_history || null;
      if (!medHistory && (diseasesVal || drugsVal || dobStr)) {
        medHistory = {
          dob: dobStr !== 'Not Specified' ? dobStr : null,
          diseases: diseasesVal,
          drugs: drugsVal
        };
      }

      return {
        id: u.id,
        email: u.email || meta.email || 'N/A',
        full_name: meta.full_name || prof.full_name || 'Patient',
        phone_number: meta.phone_number || prof.phone_number || 'N/A',
        dob: dobStr || 'Not Specified',
        age: ageVal ? `${ageVal} yrs` : 'N/A',
        gender: meta.gender || prof.gender || 'Not Specified',
        blood_group: meta.blood_group || prof.blood_group || 'N/A',
        weight_kg: rawWeight,
        height_cm: rawHeight,
        diseases: diseasesVal,
        drugs: drugsVal,
        medical_history: medHistory,
        created_at: u.created_at || prof.created_at || new Date().toISOString(),
        applicationDate: u.created_at || prof.created_at || new Date().toISOString(),
        role: 'patient',
        is_verified: meta.is_verified || false
      };
    });

    res.json({ patients });
  } catch (err) {
    console.error('Fetch patients catch error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Fetch all verified doctors
router.get('/doctors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching doctors:', error);
      return res.status(400).json({ error: error.message });
    }
    
    // Fetch auth users to get user_metadata (like dob)
    let users = [];
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users) users = authData.users;
    } catch (e) {}

    // Fetch inquiries to link documents and application dates
    const { data: inquiries } = await supabase.from('inquiries').select('*');
    const parsedInquiries = (inquiries || []).map(inq => {
      try {
        const payload = JSON.parse(inq.message);
        return { ...payload, applicationDate: inq.created_at };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // Auto-sync any doctor accounts registered in Supabase Auth missing from SQL doctors table
    const doctorAuthUsers = users.filter(u => u.user_metadata?.role === 'doctor' || u.role === 'doctor');
    for (const dUser of doctorAuthUsers) {
      const existsInTable = (data || []).some(d => d.id === dUser.id);
      if (!existsInTable && dUser.email) {
        const meta = dUser.user_metadata || {};
        try {
          await supabase.from('doctors').upsert({
            id: dUser.id,
            name: meta.full_name || 'Doctor',
            specialty: meta.specialty || 'General Physician',
            license_number: meta.license_number || meta.licenseNumber || '',
            hospital_name: meta.hospital_name || meta.hospitalName || '',
            hospital_address: meta.hospital_address || meta.hospitalAddress || '',
            phone_number: meta.phone_number || meta.phoneNumber || ''
          });
        } catch (e) {}
      }
    }

    // Re-fetch updated doctors list
    const { data: updatedDocs } = await supabase.from('doctors').select('*').order('created_at', { ascending: false });
    const finalDocsList = updatedDocs || data || [];

    // Merge dob, document, and applicationDate into doctors data
    const doctorsWithDob = finalDocsList.map(doc => {
      const user = users.find(u => u.id === doc.id || (u.email && doc.email && u.email.toLowerCase() === doc.email.toLowerCase()));
      const email = doc.email || user?.email || null;
      
      let app = null;
      if (email) {
        app = parsedInquiries.find(a => a.email && a.email.toLowerCase() === email.toLowerCase());
      }
      if (!app && doc.name) {
        app = parsedInquiries.find(a => a.fullName && a.fullName.toLowerCase() === doc.name.toLowerCase());
      }

      return {
        ...doc,
        id: doc.id || user?.id,
        email: email || app?.email || user?.email || 'N/A',
        full_name: doc.name || user?.user_metadata?.full_name || app?.fullName || 'N/A',
        specialty: doc.specialty || app?.specialty || user?.user_metadata?.specialty || 'General Physician',
        license_number: doc.license_number || app?.licenseNumber || app?.license_number || user?.user_metadata?.license_number || 'N/A',
        hospital_name: doc.hospital_name || app?.hospitalName || app?.hospital_name || user?.user_metadata?.hospital_name || 'N/A',
        hospital_address: doc.hospital_address || app?.hospitalAddress || app?.hospital_address || user?.user_metadata?.hospital_address || 'N/A',
        phone_number: doc.phone_number || user?.user_metadata?.phone_number || app?.phoneNumber || 'N/A',
        experience_years: doc.experience_years || app?.experienceYears || 0,
        dob: user?.user_metadata?.dob || app?.dob || doc.dob || 'Not Specified',
        gender: user?.user_metadata?.gender || app?.gender || doc.gender || 'Not Specified',
        bio: user?.user_metadata?.bio || doc.bio || app?.bio || null,
        education: user?.user_metadata?.education || doc.education || app?.education || null,
        documentPhoto: app?.documentPhoto || doc.documentPhoto || null,
        created_at: app?.applicationDate || app?.created_at || user?.created_at || doc.created_at || new Date().toISOString(),
        applicationDate: app?.applicationDate || app?.created_at || user?.created_at || doc.created_at || new Date().toISOString()
      };
    });

    res.json({ doctors: doctorsWithDob });
  } catch (err) {
    console.error('Fetch doctors catch error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Delete an application inquiry record (POST & DELETE)
const deleteApplicationHandler = async (req, res) => {
  const id = req.params.id || req.body.id;
  if (!id) return res.status(400).json({ error: 'Application ID is required.' });

  try {
    const { error } = await supabase
      .from('inquiries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting application:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'Application record removed successfully.' });
  } catch (err) {
    console.error('Delete application error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

router.delete('/applications/:id', deleteApplicationHandler);
router.post('/delete-application', deleteApplicationHandler);

// Delete a doctor account and associated profile/auth data (POST & DELETE)
// Shared Complete Cascade User Purge Helper
const deleteUserCompleteCascade = async (id) => {
  if (!id) return;
  try {
    // 1. Get user profile/doctor details before deleting
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    const { data: doc } = await supabase.from('doctors').select('*').eq('id', id).maybeSingle();
    
    const userEmail = prof?.email || doc?.email || null;

    // 2. Delete from doctors table
    await supabase.from('doctors').delete().eq('id', id);
    if (userEmail) await supabase.from('doctors').delete().ilike('email', userEmail.trim());

    // 3. Delete from profiles table
    await supabase.from('profiles').delete().eq('id', id);

    // 4. Delete emergency contacts & SOS logs
    await supabase.from('emergency_contacts').delete().eq('user_id', id);
    await supabase.from('sos_logs').delete().eq('user_id', id);

    // 5. Delete inquiries / applications
    await supabase.from('inquiries').delete().eq('user_id', id);
    if (userEmail) {
      const { data: inquiries } = await supabase.from('inquiries').select('*');
      for (const inq of (inquiries || [])) {
        try {
          const payload = JSON.parse(inq.message);
          if (payload.email && payload.email.trim().toLowerCase() === userEmail.trim().toLowerCase()) {
            await supabase.from('inquiries').delete().eq('id', inq.id);
          }
        } catch (e) {}
      }
    }

    // 6. Delete from Supabase Auth
    try {
      await supabase.auth.admin.deleteUser(id);
    } catch (authErr) {
      console.warn('Auth delete user notice:', authErr.message);
    }
  } catch (err) {
    console.error('Error during cascade user deletion:', err);
  }
};

// Delete a doctor account (POST & DELETE)
const deleteDoctorHandler = async (req, res) => {
  const id = req.params.id || req.body.id;
  if (!id) return res.status(400).json({ error: 'Doctor ID is required.' });

  try {
    await deleteUserCompleteCascade(id);
    res.json({ success: true, message: 'Doctor account and all associated data permanently deleted.' });
  } catch (err) {
    console.error('Delete doctor error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

router.delete('/doctors/:id', deleteDoctorHandler);
router.post('/delete-doctor', deleteDoctorHandler);

// Delete a patient account (POST & DELETE)
const deletePatientHandler = async (req, res) => {
  const id = req.params.id || req.body.id;
  if (!id) return res.status(400).json({ error: 'Patient ID is required.' });

  try {
    await deleteUserCompleteCascade(id);
    res.json({ success: true, message: 'Patient account and all associated data permanently deleted.' });
  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

router.delete('/patients/:id', deletePatientHandler);
router.post('/delete-patient', deletePatientHandler);

module.exports = router;
