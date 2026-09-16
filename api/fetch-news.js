const { getDailyStories } = require('./_lib/news');

const fallbackStories = [
  {
    id: 'art-001',
    title: 'Community Development Program: Ipapo Scholarship Award Ceremony',
    category: 'Community',
    badge: 'Featured',
    isBreaking: true,
    author: 'Ipapo Media Desk',
    date: 'September 2026',
    readTime: '4 min read',
    image: 'img/group.jpg',
    summary: 'Celebrating excellence: Future Leaders Development Initiatives and Ipapo Scholarship Award Ceremony recognize promising scholars across Itesiwaju LGA.',
    content: '<p>The annual Ipapo Community Development and Scholarship Ceremony concluded yesterday with vibrant celebrations, bringing together elders, youth, community leaders, and descendants from across Nigeria and the diaspora.</p><p>Organized through collaborative efforts between the Ipapo Descendants Union and community welfare committees, this year\'s initiative awarded educational grants and school materials to over 120 deserving secondary and tertiary students representing various quarters of Ipapo.</p>',
    views: 1420,
    source: 'local-fallback'
  },
  {
    id: 'art-005',
    title: 'Cultural Tourism: KAP Film Village & Resort Boosts Regional Economy',
    category: 'Media',
    badge: 'Regional Spotlight',
    isBreaking: true,
    author: 'Ipapo Culture Bureau',
    date: 'September 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
    summary: 'Kunle Afolayan’s landmark film studio and cultural resort project in the Ipapo/Itesiwaju axis brings global cinema and tourism to our doorsteps.',
    content: '<p>The development of the KAP Film Village & Resort in the picturesque landscape of the Ipapo/Itesiwaju territory represents one of the most exciting creative and infrastructural investments in southwest Nigeria.</p><p>Spearheaded by celebrated filmmaker Kunle Afolayan, the facility combines authentic Yoruba architectural heritage with world-class production sets, recording suites, and eco-tourism lodges.</p>',
    views: 3100,
    source: 'local-fallback'
  },
  {
    id: 'art-008',
    title: 'Education Infrastructure: Construction of College of Education Advances',
    category: 'Education',
    badge: 'Development',
    isBreaking: true,
    author: 'Infrastructure Desk',
    date: 'September 2026',
    readTime: '4 min read',
    image: 'img/building.jpg',
    summary: 'New campus facilities, lecture halls, and housing units take shape in Ipapo to expand teacher training across Oyo State.',
    content: '<p>Construction of the new College of Education campus in Ipapo is progressing steadily, marking a decisive milestone in tertiary educational development for Itesiwaju Local Government Area.</p><p>Site engineers report that modern lecture theatres, administrative blocks, student hostels, and ICT laboratories are nearing roofing stages.</p>',
    views: 1840,
    source: 'local-fallback'
  }
];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const force = req.query && req.query.force === '1';
    const stories = await getDailyStories(force).catch(() => fallbackStories);
    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      stories
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      stories: fallbackStories,
      warning: error.message || 'Using local fallback data'
    });
  }
};
