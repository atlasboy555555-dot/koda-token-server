const { AccessToken } = require('livekit-server-sdk');
const express = require('express');
const cloudinary = require('cloudinary').v2;
 
const app = express();
app.use(express.json());
 
// Configure Cloudinary with your credentials from Railway env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
 
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});
 
// ── LiveKit token ─────────────────────────────────────────────────────────────
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
 
// ── Cloudinary delete ─────────────────────────────────────────────────────────
// Called by KODA when a VOD, clip, or verified lounge image is deleted.
// Cloudinary requires a signed request (api_secret) to destroy assets —
// this endpoint does the signing server-side so the secret stays safe.
app.post('/api/cloudinary-delete', async (req, res) => {
  const { public_id, resource_type } = req.query;
  if (!public_id) {
    return res.status(400).json({ error: 'Missing public_id' });
  }
  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type || 'video',
    });
    console.log(`[Cloudinary] Deleted ${resource_type || 'video'}: ${public_id} →`, result);
    return res.json(result);
  } catch (err) {
    console.error('[Cloudinary] Delete failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
});
 
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Token server running on port ${PORT}`));
