const { supabase } = require('../lib/supabase');

async function seedAdmin() {
  console.log('🔄 Checking if Admin account exists...');
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('❌ Error listing users to check admin:', error.message || error);
      return;
    }
    
    const adminExists = data?.users?.some(u => u.email === 'admin@aurahealth.com');
    if (!adminExists) {
      console.log('🚀 Admin account not found. Seeding admin account...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'admin@aurahealth.com',
        password: 'admin123',
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          full_name: 'Platform Admin'
        }
      });
      
      if (createError) {
        console.error('❌ Failed to seed admin user in Auth:', createError.message || createError);
      } else {
        console.log('✅ Admin user successfully created in Auth!');
      }
    } else {
      console.log('✅ Admin account already exists in Auth.');
    }
  } catch (err) {
    console.error('❌ Unexpected error during admin seeding:', err.message || err);
  }
}

module.exports = { seedAdmin };
