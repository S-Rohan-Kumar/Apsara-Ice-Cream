const fs = require('fs');
const path = require('path');

function getEnvKey() {
  if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.trim();
  }
  if (process.env.GOOGLE_MAPS_API_KEY) {
    return process.env.GOOGLE_MAPS_API_KEY.trim();
  }
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^(?:EXPO_PUBLIC_)?GOOGLE_MAPS_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
    if (match && match[1]) {
      return match[1].trim();
    }
    const rawMatch = content.match(/AIzaSy[A-Za-z0-9_-]+/);
    if (rawMatch) {
      return rawMatch[0].trim();
    }
  }
  return '';
}

module.exports = ({ config }) => {
  const apiKey = getEnvKey();
  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: apiKey,
        },
      },
    },
  };
};
