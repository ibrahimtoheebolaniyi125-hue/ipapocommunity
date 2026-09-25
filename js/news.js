

(function (global) {
    'use strict';

    const NEWS_KEY = 'ipapo_news_db';
    const SAVED_KEY = 'ipapo_saved_news_ids';
    const COMMENTS_KEY = 'ipapo_article_comments';
    const DAILY_DIGEST_KEY = 'ipapo_daily_news_digest';
    const SCAM_ALERTS_KEY = 'ipapo_scam_alerts';
    const USER_NEWS_SEEN_KEY = 'ipapo_seen_news_by_user';

    const SEED_NEWS = [
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
            content: `
                <p>The annual Ipapo Community Development and Scholarship Ceremony concluded yesterday with vibrant celebrations, bringing together elders, youth, community leaders, and descendants from across Nigeria and the diaspora.</p>
                
                <p>Organized through collaborative efforts between the Ipapo Descendants Union and community welfare committees, this year's initiative awarded educational grants and school materials to over 120 deserving secondary and tertiary students representing various quarters of Ipapo.</p>
                
                <h3>Empowering Tomorrow's Leaders</h3>
                <p>Speaking at the town hall gathering, community elders emphasized that investing in quality education remains the bedrock of regional progress. Beyond cash awards, the scholarship package provides recipients with academic mentorship, digital literacy workshops, and career coaching sessions coordinated by university graduates from Ipapo.</p>
                
                <blockquote>"Our mission is to ensure no child in Ipapo is deprived of learning due to financial barriers. The future of our town relies on the knowledge and dedication of our youth."</blockquote>
                
                <p>Community leaders pledged continued expansion of the fund, calling on business leaders and philanthropists to support upcoming community infrastructure, library facilities, and vocational training hubs.</p>
            `,
            views: 1420
        },
        {
            id: 'art-002',
            title: 'Leadership & Public Affairs: Spotlight on Amofin Beulah Adeoye',
            category: 'Politics',
            badge: 'Interview',
            isBreaking: false,
            author: 'Special Correspondent',
            date: 'September 2026',
            readTime: '6 min read',
            image: 'img/amofin.jpg',
            summary: 'An in-depth perspective on leadership, governance, grassroots empowerment, and the vision of Amofin Beulah Adeoye for Oyo State.',
            content: `
                <p>Amofin Beulah Adeoye, a seasoned legal luminary, financial advisor, and philanthropist with roots in the region, continues to engage critical grassroots stakeholders on sustainable community empowerment and economic expansion.</p>
                
                <h3>A Vision Built on Public Service</h3>
                <p>During a recent civic dialogue hosted in Ipapo, discussions centered around improving agricultural value chains, rural electrification, healthcare accessibility, and educational development across Oyo North and the state at large.</p>
                
                <p>Amofin Beulah underscored the importance of participatory governance where community voices actively shape state policies. Emphasizing transparency and accountability, he urged residents to stay informed, engaged, and united towards regional prosperity.</p>
                
                <p>Ipapo Broadcast continues to provide a balanced, non-partisan platform for public leaders and citizens to converse, scrutinize ideas, and chart actionable pathways for community progress.</p>
            `,
            views: 2150
        },
        {
            id: 'art-003',
            title: 'Sports Festival Coverage: Muslim High School & Youth Football League',
            category: 'Sports',
            badge: 'Sports Desk',
            isBreaking: false,
            author: 'Ipapo Sports Desk',
            date: 'September 2026',
            readTime: '3 min read',
            image: 'img/school.jpg',
            summary: 'Thrilling moments from the inter-house athletic competitions at Muslim High School Ipapo and the ongoing youth football tournaments.',
            content: `
                <p>The spirit of sportsmanship was on full display at the Muslim High School sports grounds in Ipapo as students, alumni, and parents gathered for the annual inter-house athletics competition.</p>
                
                <p>Yellow House emerged victorious in track events, edging out Green House in an electric 4x100m relay final that had spectators cheering from the sidelines. The event also served as a scouting ground for young athletes who will represent the town at upcoming regional zonal trials in Oyo State.</p>
                
                <h3>Honoring Historical Athletic Roots</h3>
                <p>The sports desk also paid tribute to the legendary Ipapo Community Grammar School 1982 football squad, whose historic feats continue to inspire the next generation of grassroots footballers currently competing in the Ipapo Youth Champions League.</p>
            `,
            views: 980
        },
        {
            id: 'art-004',
            title: 'FIPSU Initiatives: Federation of Ipapo Students Union Launches Mentorship Drive',
            category: 'Education',
            badge: 'Youth & Campus',
            isBreaking: false,
            author: 'Student Union Bureau',
            date: 'September 2026',
            readTime: '4 min read',
            image: 'img/DARH7119.JPG',
            summary: 'FIPSU President Salam Waris Abioye outlines new campus outreach, free JAMB/WAEC forms, and digital skills training for local youth.',
            content: `
                <p>The Federation of Ipapo Students Union (FIPSU), representing university, polytechnic, and college students across Nigeria, has officially launched its 2026 Academic Support and Career Orientation campaign.</p>
                
                <p>FIPSU President Salam Waris Abioye noted that the executive council has partnered with indigenous professionals to distribute free UTME/JAMB forms and facilitate weekend tutorials for graduating secondary school students across Ipapo.</p>
                
                <p>Additionally, FIPSU's tech committee will host an introductory web design and coding bootcamp, offering Ipapo youths practical technical skills to tap into the modern digital economy.</p>
            `,
            views: 1240
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
            content: `
                <p>The development of the KAP Film Village & Resort in the picturesque landscape of the Ipapo/Itesiwaju territory represents one of the most exciting creative and infrastructural investments in southwest Nigeria.</p>
                
                <p>Spearheaded by celebrated filmmaker Kunle Afolayan, the facility combines authentic Yoruba architectural heritage with world-class production sets, recording suites, and eco-tourism lodges.</p>
                
                <p>Local artisans, caterers, and transport operators are experiencing a surge in economic opportunities as domestic and international film crews continue to utilize the resort for major motion pictures and cultural showcases.</p>
            `,
            views: 3100
        },
        {
            id: 'art-006',
            title: 'Royal Heritage: The Reign & Legacy of HRM Oba Yekini Ademola Abioye II',
            category: 'Culture',
            badge: 'Heritage',
            isBreaking: false,
            author: 'Palace Liaison',
            date: 'September 2026',
            readTime: '5 min read',
            image: 'img/ippao.jpg',
            summary: 'Preserving traditions and fostering peace: The royal stool of the Eleyinpo of Ipapo and its historic beaded crown monarchy.',
            content: `
                <p>The royal stool of the Eleyinpo of Ipapo carries hundreds of years of rich history, bravery, and unity for the people of Ipapo. Currently occupied by HRM Oba Yekini Ademola Abioye II, the palace remains the heartbeat of civic harmony and cultural preservation.</p>
                
                <p>Reflecting on the milestone when the royal stool received beaded crown-wearing status—a landmark development facilitated by the late Alaafin of Oyo, Oba Lamidi Olayiwola Adeyemi III—residents continue to celebrate their royal legacy with pride during annual festivals and communal gatherings.</p>
                
                <p>Kabiyesi continues to champion community peace, youth education, and infrastructural growth, welcoming sons and daughters of Ipapo from all over the world to invest in their ancestral homeland.</p>
            `,
            views: 2890
        },
        {
            id: 'art-007',
            title: 'Local Craft Spotlight: Traditional Black Soap (Ose Abuwe) Enterprise in Ipapo',
            category: 'Community',
            badge: 'Local Business',
            isBreaking: false,
            author: 'Economic Watch',
            date: 'September 2026',
            readTime: '3 min read',
            image: 'img/black.jpg',
            summary: 'Ipapo women entrepreneurs lead the production of natural, chemical-free Ose Abuwe soap, creating sustainable livelihoods and organic skincare.',
            content: `
                <p>For generations, the production of traditional black soap (Ose Abuwe) has thrived in Ipapo. Crafted from palm bunch ash, pure palm kernel oil, and healing botanical extracts, this natural product has earned widespread acclaim for gentle skincare and therapeutic qualities.</p>
                
                <p>Today, local women cooperatives in Ipapo are packaging and distributing Ose Abuwe to retail markets across Ibadan, Lagos, and Abuja, proving that traditional indigenous crafts can build thriving modern micro-enterprises.</p>
            `,
            views: 1100
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
            content: `
                <p>Construction of the new College of Education campus in Ipapo is progressing steadily, marking a decisive milestone in tertiary educational development for Itesiwaju Local Government Area.</p>
                
                <p>Site engineers report that modern lecture theatres, administrative blocks, student hostels, and ICT laboratories are nearing roofing stages. When completed, the institution will train qualified educators, generate local employment, and provide affordable higher education access to youth in surrounding communities.</p>
            `,
            views: 1840
        }
    ];

    class NewsService {
        constructor() {
            this._initDb();
        }

        _initDb() {
            if (!localStorage.getItem(NEWS_KEY)) {
                localStorage.setItem(NEWS_KEY, JSON.stringify(SEED_NEWS));
            }
        }

        getAllNews() {
            try {
                return JSON.parse(localStorage.getItem(NEWS_KEY)) || SEED_NEWS;
            } catch (e) {
                console.error(e);
                return SEED_NEWS;
            }
        }

        _saveNews(articles) {
            localStorage.setItem(NEWS_KEY, JSON.stringify(articles));
        }

        async syncFromApi() {
            try {
                const response = await fetch(global.ipapoApiUrl('/api/fetch-news'));
                if (!response.ok) {
                    return this.getAllNews();
                }
                const payload = await response.json();
                const stories = Array.isArray(payload.stories) ? payload.stories : [];
                if (stories.length) {
                    this._saveNews(stories);
                    return stories;
                }
                return this.getAllNews();
            } catch (error) {
                console.warn('Could not sync news from API:', error);
                return this.getAllNews();
            }
        }

        getArticleById(id) {
            const list = this.getAllNews();
            return list.find(a => a.id === id) || null;
        }

        getBreakingNews() {
            return this.getAllNews().filter(a => a.isBreaking);
        }

        filterByCategory(category) {
            const list = this.getAllNews();
            if (!category || category.toLowerCase() === 'all') return list;
            return list.filter(a => a.category.toLowerCase() === category.toLowerCase());
        }

        searchArticles(query) {
            const list = this.getAllNews();
            if (!query) return list;
            const q = query.toLowerCase().trim();
            return list.filter(a => 
                a.title.toLowerCase().includes(q) ||
                a.summary.toLowerCase().includes(q) ||
                a.category.toLowerCase().includes(q) ||
                a.author.toLowerCase().includes(q)
            );
        }
        getSavedIds() {
            try {
                return JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
            } catch (e) {
                return [];
            }
        }

        isArticleSaved(id) {
            return this.getSavedIds().includes(id);
        }

        toggleSaveArticle(id) {
            let saved = this.getSavedIds();
            let isSaved = false;
            if (saved.includes(id)) {
                saved = saved.filter(item => item !== id);
                isSaved = false;
            } else {
                saved.push(id);
                isSaved = true;
            }
            localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
            window.dispatchEvent(new CustomEvent('ipapo:saved-news-changed', { detail: { id, isSaved } }));
            return isSaved;
        }

        getSavedArticles() {
            const savedIds = this.getSavedIds();
            const allNews = this.getAllNews();
            return allNews.filter(a => savedIds.includes(a.id));
        }

        // Comments
        getComments(articleId) {
            try {
                const map = JSON.parse(localStorage.getItem(COMMENTS_KEY)) || {};
                return map[articleId] || [
                    {
                        name: 'Bayo Adeleke',
                        date: '2 days ago',
                        text: 'A very inspiring update for the entire Ipapo community! Kudos to Ipapo Broadcast for keeping us informed.'
                    }
                ];
            } catch (e) {
                return [];
            }
        }

        addComment(articleId, { name, text }) {
            const map = JSON.parse(localStorage.getItem(COMMENTS_KEY)) || {};
            if (!map[articleId]) map[articleId] = [];
            
            const comment = {
                id: 'cmt_' + Date.now(),
                name: name.trim(),
                date: 'Just now',
                text: text.trim(),
                timestamp: new Date().toISOString()
            };
            
            map[articleId].unshift(comment);
            localStorage.setItem(COMMENTS_KEY, JSON.stringify(map));
            const token = localStorage.getItem('ipapo_supabase_access_token');
            if (token) {
                fetch('/api/activity/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        eventType: 'comment_created',
                        title: 'New community comment posted',
                        message: comment.text,
                        metadata: { articleId }
                    })
                }).catch(() => {});
            }
            return comment;
        }

        getAllComments() {
            try {
                const map = JSON.parse(localStorage.getItem(COMMENTS_KEY)) || {};
                return Object.entries(map).flatMap(([articleId, comments]) => comments.map(comment => ({
                    ...comment,
                    articleId,
                    articleTitle: this.getArticleById(articleId)?.title || articleId
                })));
            } catch (e) {
                return [];
            }
        }

        addCommentReply(articleId, commentId, text) {
            const map = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '{}');
            const comments = map[articleId] || [];
            const comment = comments.find(item => item.id === commentId);
            if (!comment) return null;
            comment.reply = {
                name: 'Ipapo Broadcast Admin',
                text: text.trim(),
                date: 'Just now',
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(COMMENTS_KEY, JSON.stringify(map));
            return comment.reply;
        }

        // Admin Management
        addArticle(articleData) {
            const list = this.getAllNews();
            const newArt = {
                id: 'art-' + Date.now().toString(36),
                title: articleData.title,
                category: articleData.category || 'Community',
                badge: articleData.badge || 'Latest',
                isBreaking: Boolean(articleData.isBreaking),
                author: articleData.author || 'Ipapo Media',
                date: articleData.date || 'September 2026',
                readTime: articleData.readTime || '4 min read',
                image: articleData.image || 'img/group.jpg',
                summary: articleData.summary || '',
                content: articleData.content || `<p>${articleData.summary || ''}</p>`,
                views: 1
            };
            list.unshift(newArt);
            this._saveNews(list);
            return newArt;
        }

        updateArticle(id, updates) {
            const list = this.getAllNews();
            const idx = list.findIndex(a => a.id === id);
            if (idx === -1) throw new Error('Article not found');
            list[idx] = { ...list[idx], ...updates };
            this._saveNews(list);
            return list[idx];
        }

        deleteArticle(id) {
            let list = this.getAllNews();
            list = list.filter(a => a.id !== id);
            this._saveNews(list);
            return true;
        }

        getDailyDigest() {
            const todayKey = new Date().toISOString().slice(0, 10);
            const existing = JSON.parse(localStorage.getItem(DAILY_DIGEST_KEY) || '{}');
            if (existing.date === todayKey && Array.isArray(existing.items) && existing.items.length) {
                return existing.items;
            }

            const digest = this.getAllNews().slice(0, 5).map((article, index) => ({
                ...article,
                digestDate: todayKey,
                rank: index + 1,
                isDailyDigest: true
            }));

            localStorage.setItem(DAILY_DIGEST_KEY, JSON.stringify({ date: todayKey, items: digest }));
            return digest;
        }

        getDailyNewsForUser(userEmail = 'all') {
            const digest = this.getDailyDigest();
            const seenMap = JSON.parse(localStorage.getItem(USER_NEWS_SEEN_KEY) || '{}');
            const seen = new Set((seenMap[userEmail] || []).concat(userEmail === 'all' ? [] : seenMap.all || []));
            return digest.filter(item => !seen.has(item.id));
        }

        getUnseenNewsForUser(userEmail = 'all') {
            return this.getDailyNewsForUser(userEmail);
        }

        markNewsSeenForUser(userEmail, itemId) {
            if (!userEmail || !itemId) return [];
            const seenMap = JSON.parse(localStorage.getItem(USER_NEWS_SEEN_KEY) || '{}');
            const userSeen = new Set(seenMap[userEmail] || []);
            userSeen.add(itemId);
            seenMap[userEmail] = Array.from(userSeen);
            localStorage.setItem(USER_NEWS_SEEN_KEY, JSON.stringify(seenMap));
            return seenMap[userEmail];
        }

        getScamAlerts() {
            try {
                return JSON.parse(localStorage.getItem(SCAM_ALERTS_KEY)) || [];
            } catch (e) {
                return [];
            }
        }

        evaluateScamAlert(text) {
            const raw = String(text || '').trim();
            if (!raw) {
                return { score: 0, label: 'No alert', severity: 'low', risk: 'none', reasons: [] };
            }

            const lower = raw.toLowerCase();
            const flaggedPatterns = [
                ['urgent', 'Immediate action required to avoid missing out'],
                ['send money', 'Money transfer requested before verification'],
                ['fake prize', 'Prize or reward claim wording detected'],
                ['bitcoin', 'Cryptocurrency or untraceable payment requested'],
                ['wire transfer', 'Unusual payment method demanded'],
                ['click this link', 'Direct link bait used to push users into a trap'],
                ['guaranteed return', 'Guaranteed profit claims are not credible'],
                ['claim your refund', 'Refund solicitation pattern often used in scams'],
                ['crypto', 'Crypto-based payment demand'],
                ['login to verify', 'Urgent account verification scam technique'],
                ['pay before approval', 'Payment demanded before legitimate review']
            ];

            const reasons = flaggedPatterns
                .filter(([pattern]) => lower.includes(pattern))
                .map(([, reason]) => reason);

            const score = Math.min(100, reasons.length * 18 + (/(?:cash|crypto|bitcoin|transfer|urgent|today|now)/.test(lower) ? 12 : 0));

            let label = 'Likely safe';
            let severity = 'low';
            let risk = 'safe';

            if (score >= 75) {
                label = 'Scam alert';
                severity = 'critical';
                risk = 'high';
            } else if (score >= 45) {
                label = 'Suspicious notice';
                severity = 'medium';
                risk = 'medium';
            } else if (score > 0) {
                label = 'Needs verification';
                severity = 'low';
                risk = 'low';
            }

            return { score, label, severity, risk, reasons };
        }

        addScamAlert(rawText, source = 'community') {
            const analysis = this.evaluateScamAlert(rawText);
            const alerts = this.getScamAlerts();
            const newAlert = {
                id: 'scam-' + Date.now().toString(36),
                source,
                text: rawText,
                risk: analysis.risk,
                severity: analysis.severity,
                label: analysis.label,
                score: analysis.score,
                reasons: analysis.reasons,
                createdAt: new Date().toISOString()
            };

            alerts.unshift(newAlert);
            localStorage.setItem(SCAM_ALERTS_KEY, JSON.stringify(alerts.slice(0, 20)));
            return newAlert;
        }
    }

    global.NewsService = new NewsService();

})(typeof window !== 'undefined' ? window : this);
