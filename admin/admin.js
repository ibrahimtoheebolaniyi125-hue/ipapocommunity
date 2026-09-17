
(function (global) {
    'use strict';

    const SETTINGS_KEY = 'ipapo_station_settings';

    const DEFAULT_SETTINGS = {
        stationName: 'Ipapo Broadcast',
        frequencyTag: 'Online & 98.5 FM Community Relay',
        streamUrl: 'https://stream.zeno.fm/8dxamh3bkg0uv',
        studioPhone: '08070426269',
        studioEmail: 'contact@ipapo.ng',
        studioAddress: 'Broadcasting House, Center Road, Ipapo, Oyo State',
        maintenanceMode: false
    };

    const SUCCESSFUL_RESIDENTS = [
        {
            name: 'Mrs. Adebisi Ojo',
            title: 'Agribusiness Mentor',
            highlight: 'Built a 12-acre cassava and poultry enterprise that now provides jobs to 28 households in Ipapo.',
            location: 'Ipapo Central'
        },
        {
            name: 'Mr. Tunde Ajibola',
            title: 'Tech & Youth Advocate',
            highlight: 'Launched a digital skills academy that has trained 140 youths in coding, media, and entrepreneurship.',
            location: 'Eleyinpo Ward'
        },
        {
            name: 'Hajia Rukayat Lawal',
            title: 'Community Health Champion',
            highlight: 'Coordinates maternal health outreach and school nutrition support across four communities in Itesiwaju.',
            location: 'Oke-Ogun Axis'
        }
    ];

    class AdminController {
        constructor() {
            this._initSettings();
        }

        _initSettings() {
            if (!localStorage.getItem(SETTINGS_KEY)) {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
            }
        }

        getSettings() {
            try {
                return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || DEFAULT_SETTINGS;
            } catch (e) {
                return DEFAULT_SETTINGS;
            }
        }

        saveSettings(newSettings) {
            const current = this.getSettings();
            const updated = { ...current, ...newSettings };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
            return updated;
        }

        getDashboardStats() {
            const users = (global.AuthService ? global.AuthService._getUsers() : []);
            const news = (global.NewsService ? global.NewsService.getAllNews() : []);
            const submissions = (global.DashboardService ? global.DashboardService.getSubmissions() : []);
            const events = (global.DashboardService ? global.DashboardService.getAllEvents() : []);

            return {
                totalUsers: users.length,
                totalNews: news.length,
                publishedArticles: news.length,
                pendingSubmissions: submissions.filter(s => s.status === 'pending').length,
                totalEvents: events.length
            };
        }

        getSuccessfulResidents() {
            return SUCCESSFUL_RESIDENTS;
        }

        getAllUsers() {
            return global.AuthService ? global.AuthService._getUsers() : [];
        }

        updateUserRole(userId, newRole) {
            if (!global.AuthService) return false;
            const users = global.AuthService._getUsers();
            const user = users.find(u => u.id === userId);
            if (user) {
                user.role = newRole;
                global.AuthService._saveUsers(users);
                return true;
            }
            return false;
        }

        toggleUserStatus(userId) {
            if (!global.AuthService) return false;
            const users = global.AuthService._getUsers();
            const user = users.find(u => u.id === userId);
            if (user) {
                user.status = user.status === 'blocked' ? 'active' : 'blocked';
                global.AuthService._saveUsers(users);
                return user.status;
            }
            return null;
        }

        approveSubmission(submissionId) {
            if (!global.DashboardService || !global.NewsService) return false;
            const sub = global.DashboardService.updateSubmissionStatus(submissionId, 'approved');
            if (sub) {
                // Publish directly to news
                global.NewsService.addArticle({
                    title: sub.title,
                    category: sub.category,
                    badge: 'Community Story',
                    isBreaking: false,
                    author: sub.contactName || 'Community Contributor',
                    date: 'September 2026',
                    readTime: '3 min read',
                    image: sub.image || 'img/group.jpg',
                    summary: sub.description.substring(0, 180) + '...',
                    content: `<p>${sub.description}</p><p><strong>Location:</strong> ${sub.location || 'Ipapo'}</p>`
                });

                if (global.DashboardService.addNotification) {
                    global.DashboardService.addNotification({
                        type: 'announcement',
                        title: 'New Community Story Approved',
                        message: `"${sub.title}" has been reviewed and published to Ipapo Broadcast.`,
                        link: 'news.html'
                    });
                }
                return true;
            }
            return false;
        }

        rejectSubmission(submissionId) {
            if (!global.DashboardService) return false;
            return global.DashboardService.updateSubmissionStatus(submissionId, 'rejected');
        }
    }

    global.AdminController = new AdminController();

})(typeof window !== 'undefined' ? window : this);
