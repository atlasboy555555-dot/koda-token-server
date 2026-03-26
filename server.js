const { AccessToken } = require('livekit-server-sdk');
const express = require('express');
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.get('/api/livekit-token', async (req, res) => {
  const { room, identity, canPublish } = req.query;

  if (!room || !identity) {
    return res.status(400).json({ error: 'Missing room or identity' });
  }

  try {
    const token = new AccessToken(
      process.env.LK_API_KEY,
      process.env.LK_API_SECRET,
      { identity, ttl: '6h' }
    );

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: canPublish === 'true',
      canSubscribe: true,
    });

    return res.json({ token: await token.toJwt() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Token server running on port ${PORT}`));
