const { getDailyNewsForUser } = require('../_lib/news');

const fallbackStories = [
  {
    id: 'art-001',
    title: 'Community Development Program: Ipapo Scholarship Award Ceremony',
    category: 'Community',
    badge: 'Featured',
    author: 'Ipapo Media Desk',
    date: 'September 2026',
    readTime: '4 min read',
    image: 'img/group.jpg',
    summary: 'Celebrating excellence: Future Leaders Development Initiatives and Ipapo Scholarship Award Ceremony recognize promising scholars across Itesiwaju LGA.',
    content: '<p>The annual Ipapo Community Development and Scholarship Ceremony concluded yesterday with vibrant celebrations, bringing together elders, youth, community leaders, and descendants from across Nigeria and the diaspora.</p>',
    views: 1420
  },
  {
    id: 'art-005',
    title: 'Cultural Tourism: KAP Film Village & Resort Boosts Regional Economy',
    category: 'Media',
    badge: 'Regional Spotlight',
    author: 'Ipapo Culture Bureau',
    date: 'September 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
    summary: 'Kunle Afolayan’s landmark film studio and cultural resort project in the Ipapo/Itesiwaju axis brings global cinema and tourism to our doorsteps.',
    content: '<p>The development of the KAP Film Village & Resort in the picturesque landscape of the Ipapo/Itesiwaju territory represents one of the most exciting creative and infrastructural investments in southwest Nigeria.</p>',
    views: 3100
  }
];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = String(req.query && req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const stories = await getDailyNewsForUser(email).catch(() => fallbackStories);
    return res.status(200).json({ success: true, stories });
  } catch (error) {
    return res.status(200).json({ success: true, stories: fallbackStories, warning: 'Using local fallback data' });
  }
};
