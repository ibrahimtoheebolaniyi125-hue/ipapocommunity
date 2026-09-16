

(function (global) {
    'use strict';

    const EVENTS_KEY = 'ipapo_events_db';
    const RSVP_KEY = 'ipapo_user_rsvps';
    const SUBMISSIONS_KEY = 'ipapo_community_submissions';
    const NOTIFICATIONS_KEY = 'ipapo_user_notifications';
    const USER_DEVICE_NOTICES_KEY = 'ipapo_device_notices';

    const SEED_EVENTS = [
        {
            id: 'evt-001',
            title: 'Ipapo Annual Cultural Carnival & Masquerade Festival',
            date: 'Saturday, October 17, 2026',
            time: '10:00 AM WAT',
            venue: 'Palace Square, Eleyinpo Royal Grounds, Ipapo',
            category: 'Culture',
            image: 'img/ippao.jpg',
            description: 'A grand celebration of cultural heritage, traditional music, dance displays, royal blessings, and community reunion for all families.',
            attendees: 340
        },
        {
            id: 'evt-002',
            title: 'Ipapo Inter-School Football Final & Athletics Championship',
            date: 'Friday, November 6, 2026',
            time: '02:30 PM WAT',
            venue: 'Muslim High School Stadium Grounds, Ipapo',
            category: 'Sports',
            image: 'img/school.jpg',
            description: 'The championship showdown between high schools across Itesiwaju LGA. Come support our youth athletes and rising stars.',
            attendees: 185
        },
        {
            id: 'evt-003',
            title: 'Ipapo Youth Tech & Digital Entrepreneurship Workshop',
            date: 'Saturday, November 21, 2026',
            time: '09:00 AM WAT',
            venue: 'Ipapo Community Town Hall, Center Point',
            category: 'Education',
            image: 'img/fipsupro.jpg',
            description: 'Hands-on digital training in web development, smartphone media production, and freelancing skills organized by FIPSU & partners.',
            attendees: 92
        },
        {
            id: 'evt-004',
            title: 'Ipapo Descendants General Assembly & Town Development Summit',
            date: 'Saturday, December 26, 2026',
            time: '11:00 AM WAT',
            venue: 'Ipapo Civic Center, Station Road',
            category: 'Community',
            image: 'img/group.jpg',
            description: 'Deliberations on township infrastructure projects, security, education endowments, and development roadmaps for the upcoming year.',
            attendees: 520
        }
    ];

    // Seed Notifications
    const SEED_NOTIFICATIONS = [
        {
            id: 'notif-001',
            type: 'breaking',
            title: 'Breaking: College of Education Roofing Phase Commences',
            message: 'Construction workers have begun structural roofing on the new Ipapo campus main lecture halls.',
            time: '2 hours ago',
            read: false,
            link: 'news.html'
        },
        {
            id: 'notif-002',
            type: 'live',
            title: 'Live Now: Community Morning Brief on Air',
            message: 'Listen to special interviews featuring local agricultural leaders and education advocates.',
            time: 'Today, 06:30 AM',
            read: false,
            link: 'live.html'
        },
        {
            id: 'notif-003',
            type: 'event',
            title: 'Upcoming: Ipapo Youth Tech Workshop registration open',
            message: 'Reserve your seat for the free digital skills masterclass happening this November.',
            time: 'Yesterday',
            read: true,
            link: 'events.html'
        },
        {
            id: 'notif-004',
            type: 'announcement',
            title: 'Public Announcement: Traditional Black Soap Exhibition',
            message: 'Local producers will be showcasing Ose Abuwe crafts at the upcoming zonal trade fair.',
            time: '3 days ago',
            read: true,
            link: 'community.html'
        }
    ];

    class DashboardService {
        constructor() {
            this._initDb();
        }

        _initDb() {
            if (!localStorage.getItem(EVENTS_KEY)) {
                localStorage.setItem(EVENTS_KEY, JSON.stringify(SEED_EVENTS));
            }
            if (!localStorage.getItem(NOTIFICATIONS_KEY)) {
                localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(SEED_NOTIFICATIONS));
            }
            if (!localStorage.getItem(SUBMISSIONS_KEY)) {
                localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
            }
        }

        // Events & RSVPs
        getAllEvents() {
            try {
                return JSON.parse(localStorage.getItem(EVENTS_KEY)) || SEED_EVENTS;
            } catch (e) {
                return SEED_EVENTS;
            }
        }

        getUserRsvps() {
            try {
                return JSON.parse(localStorage.getItem(RSVP_KEY)) || [];
            } catch (e) {
                return [];
            }
        }

        isRsvpd(eventId) {
            return this.getUserRsvps().includes(eventId);
        }

        toggleRsvp(eventId) {
            let rsvps = this.getUserRsvps();
            const events = this.getAllEvents();
            const ev = events.find(e => e.id === eventId);
            let hasRsvpd = false;

            if (rsvps.includes(eventId)) {
                rsvps = rsvps.filter(id => id !== eventId);
                if (ev && ev.attendees > 0) ev.attendees -= 1;
                hasRsvpd = false;
            } else {
                rsvps.push(eventId);
                if (ev) ev.attendees += 1;
                hasRsvpd = true;
            }

            localStorage.setItem(RSVP_KEY, JSON.stringify(rsvps));
            localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
            window.dispatchEvent(new CustomEvent('ipapo:rsvp-changed', { detail: { eventId, hasRsvpd } }));
            return hasRsvpd;
        }

        getRsvpdEvents() {
            const rsvpIds = this.getUserRsvps();
            const events = this.getAllEvents();
            return events.filter(e => rsvpIds.includes(e.id));
        }

        addEvent(eventData) {
            const events = this.getAllEvents();
            const newEvt = {
                id: 'evt-' + Date.now().toString(36),
                title: eventData.title,
                date: eventData.date,
                time: eventData.time,
                venue: eventData.venue,
                category: eventData.category || 'Community',
                image: eventData.image || 'img/group.jpg',
                description: eventData.description || '',
                attendees: 1
            };
            events.push(newEvt);
            localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
            return newEvt;
        }

        deleteEvent(eventId) {
            let events = this.getAllEvents();
            events = events.filter(e => e.id !== eventId);
            localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
            return true;
        }
        getSubmissions() {
            try {
                return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY)) || [];
            } catch (e) {
                return [];
            }
        }

        submitStory(storyData) {
            const submissions = this.getSubmissions();
            const newSub = {
                id: 'sub_' + Date.now().toString(36),
                title: storyData.title,
                category: storyData.category,
                location: storyData.location,
                description: storyData.description,
                image: storyData.image || 'img/group.jpg',
                contactName: storyData.contactName,
                contactPhone: storyData.contactPhone,
                contactEmail: storyData.contactEmail,
                status: 'pending',
                submittedAt: new Date().toISOString()
            };

            submissions.unshift(newSub);
            localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
            this._logRemoteActivity('submission_created', 'New citizen story submitted', newSub.title, { submissionId: newSub.id });
            return newSub;
        }

        async _logRemoteActivity(eventType, title, message, metadata = {}) {
            const token = localStorage.getItem('ipapo_supabase_access_token');
            if (!token) return;
            try {
                await fetch('/api/activity/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ eventType, title, message, metadata })
                });
            } catch (error) {
                console.warn('Activity log unavailable:', error);
            }
        }

        updateSubmissionStatus(submissionId, status) {
            const submissions = this.getSubmissions();
            const idx = submissions.findIndex(s => s.id === submissionId);
            if (idx !== -1) {
                submissions[idx].status = status;
                localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
                return submissions[idx];
            }
            return null;
        }
        getNotifications() {
            try {
                return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)) || SEED_NOTIFICATIONS;
            } catch (e) {
                return SEED_NOTIFICATIONS;
            }
        }

        getUnreadCount() {
            return this.getNotifications().filter(n => !n.read).length;
        }

        markNotificationAsRead(id) {
            const list = this.getNotifications();
            const notif = list.find(n => n.id === id);
            if (notif) {
                notif.read = true;
                localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
                window.dispatchEvent(new CustomEvent('ipapo:notifications-changed'));
            }
        }

        markAllNotificationsAsRead() {
            const list = this.getNotifications();
            list.forEach(n => n.read = true);
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
            window.dispatchEvent(new CustomEvent('ipapo:notifications-changed'));
        }

        addNotification(notifData) {
            const list = this.getNotifications();
            const newN = {
                id: 'notif-' + Date.now().toString(36),
                type: notifData.type || 'announcement',
                title: notifData.title,
                message: notifData.message,
                time: 'Just now',
                read: false,
                link: notifData.link || 'notifications.html'
            };
            list.unshift(newN);
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
            window.dispatchEvent(new CustomEvent('ipapo:notifications-changed'));
            return newN;
        }

        async broadcastDailyDigestToUser(userEmail) {
            const digestItems = window.NewsService ? await window.NewsService.getDailyNewsForUser(userEmail) : [];
            if (!digestItems.length) return [];

            const current = JSON.parse(localStorage.getItem(USER_DEVICE_NOTICES_KEY) || '{}');
            const sent = current[userEmail] || [];
            const toSend = digestItems.filter(item => !sent.includes(item.id));

            toSend.forEach(item => {
                this.addNotification({
                    type: 'breaking',
                    title: `Daily update: ${item.title}`,
                    message: `${item.summary || 'Fresh community update is now available on Ipapo Broadcast.'}`,
                    link: `article.html?id=${item.id}`
                });
            });

            current[userEmail] = Array.from(new Set(sent.concat(toSend.map(item => item.id))));
            localStorage.setItem(USER_DEVICE_NOTICES_KEY, JSON.stringify(current));
            return toSend;
        }

        getDailyUserNews(userEmail) {
            if (!window.NewsService) return [];
            return window.NewsService.getDailyNewsForUser(userEmail);
        }

        getUserNotificationsForDevice(userEmail) {
            const all = this.getNotifications();
            if (!userEmail) return all;
            return all.filter(n => n.link && n.link.includes('article.html') || true);
        }

        // Summary Stats
        getUserDashboardStats(user) {
            const savedCount = (global.NewsService ? global.NewsService.getSavedIds().length : 0);
            const rsvpCount = this.getUserRsvps().length;
            const submissions = this.getSubmissions();
            const userSubmissionsCount = user ? 
                submissions.filter(s => s.contactEmail === user.email || s.contactName === `${user.firstName} ${user.lastName}`).length : 0;
            const unreadNotifs = this.getUnreadCount();

            return {
                savedCount,
                rsvpCount,
                userSubmissionsCount,
                unreadNotifs
            };
        }
    }

    global.DashboardService = new DashboardService();

})(typeof window !== 'undefined' ? window : this);
