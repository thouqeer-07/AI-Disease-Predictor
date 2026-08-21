const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

let sock = null;

async function connectToWhatsApp() {
  const authDir = path.join(__dirname, '..', 'auth_info_baileys');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We'll handle QR manually to make it clearer
    logger: pino({ level: 'silent' }), // Suppress excessive logs
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log('🤖 WhatsApp Bot Requires Authentication!');
      console.log('Please scan the QR code below using your WhatsApp app:');
      console.log('Go to Settings > Linked Devices > Link a Device');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log('WhatsApp logged out. Please delete the auth_info_baileys folder and restart to pair again.');
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Bot Connected Successfully!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

/**
 * Sends a native WhatsApp location message to the specified number
 * @param {string} phoneNumber - Phone number with country code (e.g., 919876543210)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {string} patientName - Name of the patient
 */
async function sendEmergencyWhatsApp(phoneNumber, latitude, longitude, patientName) {
  if (!sock) {
    throw new Error('WhatsApp Socket not initialized.');
  }

  // Format the phone number into a JID (WhatsApp ID)
  // Ensure it only contains digits and append @s.whatsapp.net
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const jid = `${cleanNumber}@s.whatsapp.net`;

  // First, check if the number is registered on WhatsApp
  const [result] = await sock.onWhatsApp(jid);
  if (!result || !result.exists) {
    throw new Error(`The number ${phoneNumber} is not registered on WhatsApp.`);
  }

  const messageBody = `🚨 *EMERGENCY SOS ALERT* 🚨\n\n${patientName} has activated an emergency SOS.\nHere is their live location. Check on them immediately!`;

  // Send introductory text message
  await sock.sendMessage(result.jid, { text: messageBody });

  // Send actual Location message
  await sock.sendMessage(result.jid, {
    location: {
      degreesLatitude: latitude,
      degreesLongitude: longitude,
    }
  });

  return true;
}

module.exports = {
  connectToWhatsApp,
  sendEmergencyWhatsApp
};
