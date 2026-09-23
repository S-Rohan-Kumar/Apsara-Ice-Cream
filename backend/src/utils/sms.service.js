import axios from 'axios';

export const sendSMS = async (phone, otpCode) => {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    console.log(`[SMS Service] FAST2SMS_API_KEY not configured. Running in local simulation mode.`);
    return { success: false, mode: 'simulation' };
  }

  try {
    const payload = {
      route: 'otp',
      variables_values: otpCode,
      numbers: cleanPhone,
    };

    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', payload, {
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data && (response.data.return === true || response.data.status_code === 200)) {
      console.log(`[SMS Service] Fast2SMS dispatched successfully to +91${cleanPhone}`);
      return { success: true, provider: 'fast2sms', data: response.data };
    } else {
      console.warn(`[SMS Service] Fast2SMS notice: ${response.data?.message || JSON.stringify(response.data)}`);
      return { success: false, provider: 'fast2sms', error: response.data?.message };
    }
  } catch (error) {
    const errData = error.response?.data || error.message;
    console.warn(`[SMS Service] Fast2SMS dispatch notice:`, errData);
    return { success: false, error: errData };
  }
};
