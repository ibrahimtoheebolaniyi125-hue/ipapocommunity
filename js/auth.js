

(function (global) {
    'use strict';

    const USERS_KEY = 'ipapo_users_db';
    const SESSION_KEY = 'ipapo_active_session';
    const REMEMBER_KEY = 'ipapo_remember_pref';
    const SEED_USERS = [
        {
            id: 'usr_res_001',
            firstName: 'Ibrahim',
            lastName: 'Olaniyi',
            username: 'ibrahim_ipapo',
            email: 'resident@ipapo.ng',
            password: 'Ipapo@2026!', 
            phone: '08070426269',
            location: 'Isale Baale, Ipapo',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            role: 'resident',
            createdAt: '2026-01-15T09:00:00.000Z',
            status: 'active'
        },
        {
            id: 'usr_adm_001',
            firstName: 'Editorial',
            lastName: 'Director',
            username: 'admin',
            email: 'admin@ipapo.ng',
            password: 'Admin@2026!',
            phone: '08070426269',
            location: 'Ipapo Station HQ, Oyo State',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
            role: 'admin',
            createdAt: '2026-01-01T08:00:00.000Z',
            status: 'active'
        }
    ];

    class AuthService {
        constructor() {
            this._initDb();
        }

        _initDb() {
            if (!localStorage.getItem(USERS_KEY)) {
                localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
            }
        }

        _getUsers() {
            try {
                return JSON.parse(localStorage.getItem(USERS_KEY)) || SEED_USERS;
            } catch (e) {
                console.error('Failed to read users DB', e);
                return SEED_USERS;
            }
        }

        _saveUsers(users) {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
        getCurrentUser() {
            try {
                const session = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
                return session ? JSON.parse(session) : null;
            } catch (e) {
                console.error('Session retrieval error', e);
                return null;
            }
        }
        isAuthenticated() {
            return this.getCurrentUser() !== null;
        
        }
        isAdmin() {
            const user = this.getCurrentUser();
            return user && (user.role === 'admin' || user.role === 'superadmin');
        }
        async login(identifier, password, rememberMe = false) {
         
            await new Promise(resolve => setTimeout(resolve, 600));

            const users = this._getUsers();
            const cleanIdentifier = identifier.trim().toLowerCase();

            const user = users.find(u => 
                (u.email.toLowerCase() === cleanIdentifier || u.username.toLowerCase() === cleanIdentifier)
            );

            if (!user) {
                throw new Error('Account not found with this email or username.');
            }

            if (user.password !== password) {
                throw new Error('Incorrect password. Please verify and try again.');
            }

            if (user.status === 'blocked') {
                throw new Error('This account has been suspended. Please contact station support.');
            }
            const sessionUser = {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                phone: user.phone,
                location: user.location,
                avatar: user.avatar,
                role: user.role,
                createdAt: user.createdAt
            };

            const sessionStr = JSON.stringify(sessionUser);

            if (rememberMe) {
                localStorage.setItem(SESSION_KEY, sessionStr);
                localStorage.setItem(REMEMBER_KEY, 'true');
            } else {
                sessionStorage.setItem(SESSION_KEY, sessionStr);
                localStorage.removeItem(REMEMBER_KEY);
            }
            window.dispatchEvent(new CustomEvent('ipapo:auth-changed', { detail: sessionUser }));

            return sessionUser;
        }

        async register(formData) {
            await new Promise(resolve => setTimeout(resolve, 700));

            const { firstName, lastName, username, email, phone, location, password } = formData;
            if (!firstName || !lastName || !username || !email || !password) {
                throw new Error('Please fill in all required fields.');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Please provide a valid email address.');
            }
            const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!passwordRegex.test(password)) {
                throw new Error('Password must have at least 8 characters, one uppercase letter, one number, and one special character.');
            }

            const users = this._getUsers();

            if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
                throw new Error('An account with this email address already exists.');
            }

            if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
                throw new Error('This username is already taken. Please choose another.');
            }

            const newUser = {
                id: 'usr_' + Date.now().toString(36),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                username: username.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
                phone: phone ? phone.trim() : '',
                location: location ? location.trim() : 'Ipapo, Oyo State',
                password: password,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
                role: 'resident',
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            users.push(newUser);
            this._saveUsers(users);

            return newUser;
        }
        async resetPassword(email) {
            await new Promise(resolve => setTimeout(resolve, 600));

            const users = this._getUsers();
            const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

            if (!user) {
                return { success: true, message: 'If that email exists in our community registry, reset instructions have been sent.' };
            }

            return {
                success: true,
                message: `Reset link successfully generated for ${user.email}. (Demo: Password is "${user.password}")`
            };
        }
        async updateProfile(updates) {
            const currentUser = this.getCurrentUser();
            if (!currentUser) throw new Error('Not authenticated');

            const users = this._getUsers();
            const userIndex = users.findIndex(u => u.id === currentUser.id);

            if (userIndex === -1) throw new Error('User record not found');

            const allowedUpdates = ['firstName', 'lastName', 'phone', 'location', 'avatar'];
            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    users[userIndex][field] = updates[field];
                    currentUser[field] = updates[field];
                }
            });

            this._saveUsers(users);

            const sessionStr = JSON.stringify(currentUser);
            if (localStorage.getItem(SESSION_KEY)) {
                localStorage.setItem(SESSION_KEY, sessionStr);
            }
            if (sessionStorage.getItem(SESSION_KEY)) {
                sessionStorage.setItem(SESSION_KEY, sessionStr);
            }

            window.dispatchEvent(new CustomEvent('ipapo:auth-changed', { detail: currentUser }));
            return currentUser;
        }
        async changePassword(oldPassword, newPassword) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const currentUser = this.getCurrentUser();
            if (!currentUser) throw new Error('Not authenticated');

            const users = this._getUsers();
            const user = users.find(u => u.id === currentUser.id);

            if (!user || user.password !== oldPassword) {
                throw new Error('Current password is incorrect.');
            }

            const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                throw new Error('New password must contain at least 8 characters, an uppercase letter, a number, and a special character.');
            }

            user.password = newPassword;
            this._saveUsers(users);
            return true;
        }
        logout() {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(REMEMBER_KEY);
            window.dispatchEvent(new CustomEvent('ipapo:auth-changed', { detail: null }));
        }
        guardProtectedPage(loginPath = 'index.html') {
            if (!this.isAuthenticated()) {
                const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.replace(`${loginPath}?redirect=${currentUrl}`);
            }
        }
        guardGuestPage(homePath = 'home.html') {
            if (this.isAuthenticated()) {
                window.location.replace(homePath);
            }
        }
        guardAdminPage(adminLoginPath = 'admin-login.html') {
            if (!this.isAuthenticated() || !this.isAdmin()) {
                window.location.replace(adminLoginPath);
            }
        }
    }
    global.AuthService = new AuthService();

})(typeof window !== 'undefined' ? window : this);
