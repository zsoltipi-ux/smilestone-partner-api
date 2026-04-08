// Vercel Serverless Function: Partner Application → Email Notification
// Receives form data → sends summary email to hq@smilestone.hu via Resend

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const d = req.body;
    if (!d.name || !d.email) return res.status(400).json({ error: 'Missing required fields' });
    await sendEmail(d);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function sendEmail(d) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  const html = `
<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
  <h2 style="color:#00BAEF">🤝 Új partner jelentkezés</h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr style="border-bottom:1px solid #eee"><td style="padding:8px;font-weight:bold;width:180px">Név</td><td style="padding:8px">${d.name}</td></tr>
    <tr style="border-bottom:1px solid #eee"><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px"><a href="mailto:${d.email}">${d.email}</a></td></tr>
    <tr style="border-bottom:1px solid #eee"><td style="padding:8px;font-weight:bold">Telefon</td><td style="padding:8px">${d.phone||'—'}</td></tr>
    <tr style="border-bottom:1px solid #eee"><td style="padding:8px;font-weight:bold">Labor kapcsolatok</td><td style="padding:8px">${d.network||'—'}</td></tr>
    <tr style="border-bottom:1px solid #eee"><td style="padding:8px;font-weight:bold">Régiók</td><td style="padding:8px">${d.regions||'—'}</td></tr>
    <tr style="border-bottom:1px solid #eee"><td style="padding:8px;font-weight:bold">Heti idő</td><td style="padding:8px">${d.time||'—'}</td></tr>
    <tr style="border-bottom:1px solid #eee"><td style="padding:8px;font-weight:bold">B2B tapasztalat</td><td style="padding:8px">${d.b2b||'—'}</td></tr>
  </table>
  <h3>Bemutkozás</h3>
  <p style="background:#f5f5f5;padding:12px;border-radius:8px">${d.about||'—'}</p>
  <h3>Mi fogta meg</h3>
  <p style="background:#f5f5f5;padding:12px;border-radius:8px">${d.motivation||'—'}</p>
  <h3>Kérdései</h3>
  <p style="background:#f5f5f5;padding:12px;border-radius:8px">${d.questions||'—'}</p>
  <p style="color:#999;font-size:12px;margin-top:24px">Automatikusan küldve a SmileStone Partner Landing Page-ről.</p>
</div>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: 'hq@smilestone.hu',
      subject: `🤝 Új partner: ${d.name} — ${d.regions||'régió n/a'}`,
      html
    })
  });

  if (!resp.ok) throw new Error('Resend error: ' + await resp.text());
}
