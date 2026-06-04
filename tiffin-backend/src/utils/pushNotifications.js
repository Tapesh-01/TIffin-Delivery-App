const https = require('https');

/**
 * Sends a push notification to an Expo push token.
 * @param {string} pushToken - The recipient's Expo push token.
 * @param {string} title - The notification title.
 * @param {string} body - The notification message body.
 * @param {Object} [data] - Optional metadata payload.
 */
exports.sendPushNotification = (pushToken, title, body, data = {}) => {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
    console.log(`⚠️ Push notification skipped: Invalid token "${pushToken}"`);
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data
    });

    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          console.log(`🔔 Expo Push Notification sent. Response:`, JSON.stringify(parsed));
          resolve(parsed);
        } catch (e) {
          console.error('❌ Failed to parse Expo response:', responseBody);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Network error sending Expo push notification:', err);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
};
