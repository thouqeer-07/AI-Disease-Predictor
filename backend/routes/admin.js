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
    // 1. Fetch admin's profile ID
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'admin@aurahealth.com')
      .single();

    if (profileError || !adminProfile) {
      console.error('Error fetching admin profile:', profileError);
      return res.status(500).json({ error: 'System Admin profile not found.' });
    }

    const adminId = adminProfile.id;

    // 2. Fetch doctor application inquiries
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

    // 2. Update status of the inquiry to 'read' (approved)
    const { error: updateError } = await supabase
      .from('inquiries')
      .update({ status: 'read' })
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

    // 2. Update status of the inquiry to 'urgent' (rejected)
    const { error: updateError } = await supabase
      .from('inquiries')
      .update({ status: 'urgent' })
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

// Fetch all patients
router.get('/patients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'patient')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching patients:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ patients: data || [] });
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
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    let users = [];
    if (!authError && authData?.users) {
      users = authData.users;
    }

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

    // Merge dob, document, and applicationDate into doctors data
    const doctorsWithDob = (data || []).map(doc => {
      const user = users.find(u => u.id === doc.id);
      const email = user?.email || doc.profiles?.email || null;
      
      let documentPhoto = null;
      let applicationDate = null;
      
      if (email) {
        // Find matching inquiry by email
        const app = parsedInquiries.find(a => a.email && a.email.toLowerCase() === email.toLowerCase());
        if (app) {
          documentPhoto = app.documentPhoto;
          applicationDate = app.applicationDate;
        }
      }

      return {
        ...doc,
        dob: user?.user_metadata?.dob || null,
        full_name: doc.name || user?.user_metadata?.full_name || 'N/A',
        bio: user?.user_metadata?.bio || doc.bio || null,
        education: user?.user_metadata?.education || null,
        documentPhoto,
        applicationDate
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
    if (userEmail) await supabase.from('profiles').delete().ilike('email', userEmail.trim());

    // 4. Delete emergency contacts & SOS logs
    await supabase.from('emergency_contacts').delete().eq('user_id', id);
    await supabase.from('sos_logs').delete().eq('user_id', id);

    // 5. Delete inquiries / applications
    await supabase.from('inquiries').delete().eq('patient_id', id);
    await supabase.from('inquiries').delete().eq('doctor_id', id);
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
