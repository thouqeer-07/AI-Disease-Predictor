import React, { useState } from 'react';
import { X, Phone, User, Save, Heart } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';

const AddGuardianModal = ({ isOpen, onClose, onSave }) => {
 const { user } = useSelector((state) => state.auth);
 const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState({
 name: '',
 relationship: '',
 phone_number: ''
 });

  const countryCodes = [
    { code: '+91', label: '🇮🇳 +91' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+44', label: '🇬🇧 +44' },
    { code: '+971', label: '🇦🇪 +971' },
    { code: '+61', label: '🇦🇺 +61' },
    { code: '+966', label: '🇸🇦 +966' }
  ];

  const [countryCode, setCountryCode] = useState('+91');
  const [phoneError, setPhoneError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone_number') {
      const sanitized = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, phone_number: sanitized }));
      if (sanitized && (sanitized.length < 7 || sanitized.length > 15)) {
        setPhoneError('Phone number must be 7 to 15 digits.');
      } else {
        setPhoneError('');
      }
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const phoneDigits = formData.phone_number.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 7 || phoneDigits.length > 15) {
      setPhoneError('Please enter a valid phone number (7 to 15 digits).');
      return;
    }

    const fullPhone = `${countryCode}${phoneDigits}`;

    setLoading(true);
    try {
      const { error } = await supabase.from('emergency_contacts').insert([
        {
          user_id: user.id,
          name: formData.name,
          relationship: formData.relationship,
          phone_number: fullPhone,
          is_active: true
        },
      ]);

      if (error) throw error;
      
      onSave();
      onClose();
      setFormData({ name: '', relationship: '', phone_number: '' });
      setPhoneError('');
    } catch (error) {
      console.error('Error adding guardian:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl border-none">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-xl text-white">
              <Heart className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Add Guardian</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 ml-1">Guardian Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Full Name"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 ml-1">Relationship</label>
            <input
              name="relationship"
              type="text"
              required
              value={formData.relationship}
              onChange={handleInputChange}
              placeholder="e.g. Father, Spouse"
              className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 ml-1">Phone Number</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-3 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none text-slate-900 text-sm font-medium"
              >
                {countryCodes.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <div className="relative flex-1">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="phone_number"
                  type="tel"
                  required
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-900"
                />
              </div>
            </div>
            {phoneError && <p className="text-xs text-red-500 font-medium ml-1">{phoneError}</p>}
          </div>

 <Button type="submit" className="w-full py-4 text-lg gap-2 mt-4 bg-red-500 hover:bg-red-600 border-none" disabled={loading}>
 {loading ? 'Saving...' : (
 <>
 <Save className="w-5 h-5" />
 Add Emergency Contact
 </>
 )}
 </Button>
 </form>
 </Card>
 </div>
 );
};

export default AddGuardianModal;




