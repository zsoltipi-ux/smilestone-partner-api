// Vercel Serverless Function: Partner Application Handler
// Receives form data → AI analysis via Claude → Email to hq@smilestone.hu via Resend

export default async function handler(req, res) {
  // CORS headers for GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = req.body;

    // 1. Validate required fields
    if (!formData.name || !formData.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. AI Analysis via Claude API
    const analysis = await analyzeApplicant(formData);

    // 3. Send email via Resend
    await sendEmail(formData, analysis);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function analyzeApplicant(data) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return 'AI elemzés nem elérhető (nincs API key konfigurálva).';
  }

  const prompt = `Elemezd ezt a SmileStone partner-jelöltet. Adj egy rövid magyar nyelvű összefoglalót (max 300 szó), ami tartalmazza:

1. **Fit Score** (1-10): Mennyire illik partnernek?
2. **Erősségek**: Mi szól mellette?
3. **Red flags**: Mi szól ellene vagy mi hiányzik?
4. **Javasolt kérdések az első hívásra**: 2-3 konkrét kérdés

Jelölt adatok:
- Név: ${data.name}
- Email: ${data.email}
- Telefon: ${data.phone || 'nem adta meg'}
- Bemutkozás: ${data.about || 'nem töltötte ki'}
- Labor kapcsolatok: ${data.network || 'nem válaszolt'}
- Régiók: ${data.regions || 'nem választott'}
- Heti időráfordítás: ${data.time || 'nem válaszolt'}
- B2B/ERP tapasztalat: ${data.b2b || 'nem válaszolt'}
- Motiváció: ${data.motivation || 'nem töltötte ki'}
- Kérdések: ${data.questions || 'nincs'}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    const result = await response.json();
    return result.content?.[0]?.text || 'Nem sikerült elemezni.';
  } catch (e) {
    console.error('Claude API error:', e);
    return 'AI elemzés hiba: ' + e.message;
  }
}

async function sendEmail(formData, analysis) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #00BAEF;">🤝 Új partner jelentkezés</h2>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; font-weight: bold; width: 180px;">Név</td>
          <td style="padding: 8px;">${formData.name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; font-weight: bold;">Email</td>
          <td style="padding: 8px;"><a href="mailto:${formData.email}">${formData.email}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; font-weight: bold;">Telefon</td>
          <td style="padding: 8px;">${formData.phone || '—'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; font-weight: bold;">Labor kapcsolatok</td>
          <td style="padding: 8px;">${formData.network || '—'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; font-weight: bold;">Régiók</td>
          <td style="padding: 8px;">${formData.regions || '—'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; font-weight: bold;">Heti idő</td>
          <td style="padding: 8px;">${formData.time || '—'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; font-weight: bold;">B2B tapasztalat</td>
          <td style="padding: 8px;">${formData.b2b || '—'}</td>
        </tr>
      </table>

      <h3 style="margin-top: 16px;">Bemutkozás</h3>
      <p style="background: #f5f5f5; padding: 12px; border-radius: 8px;">${formData.about || '—'}</p>

      <h3>Mi fogta meg</h3>
      <p style="background: #f5f5f5; padding: 12px; border-radius: 8px;">${formData.motivation || '—'}</p>

      <h3>Kérdései</h3>
      <p style="background: #f5f5f5; padding: 12px; border-radius: 8px;">${formData.questions || '—'}</p>

      <hr style="margin: 24px 0; border: none; border-top: 2px solid #00BAEF;">

      <h2 style="color: #00BAEF;">🤖 AI Elemzés</h2>
      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; border: 1px solid #cceeff; white-space: pre-wrap;">${analysis}</div>

      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        Ez az email automatikusan generálódott a SmileStone Partner Landing Page-ről.
      </p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: 'hq@smilestone.hu',
      subject: `🤝 Új partner jelentkezés: ${formData.name} — ${formData.regions || 'régió nem megadva'}`,
      html: htmlBody
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend error: ${err}`);
  }
}
