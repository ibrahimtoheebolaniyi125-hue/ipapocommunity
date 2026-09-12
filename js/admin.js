

(function (global) {
    'use strict';

    const SETTINGS_KEY = 'ipapo_station_settings';

    const DEFAULT_SETTINGS = {
        stationName: 'Ipapo Broadcast',
        frequencyTag: 'Online & 98.5 FM Community Relay',
        streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
        studioPhone: '08070426269',
        studioEmail: 'contact@ipapo.ng',
        studioAddress: 'Broadcasting House, Center Road, Ipapo, Oyo State',
        maintenanceMode: false
    };

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
