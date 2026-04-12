/**
 * Auth Service - Complete logout with all cache clearing
 */

class AuthService {
    constructor(apiService) {
        this.api = apiService;
        this.currentUser = null;
        this.setupProfileButtons();
    }

    // Login statusunu yoxlamaq
    async checkAuthStatus() {
        console.log('🔐 Auth status yoxlanılır...');

        try {
            // Əvvəlcə token var mı yoxla
            if (!this.api.hasToken()) {
                console.log('🔴 Token yoxdur, login səhifəsinə yönləndirilir...');
                this.api.redirectToLogin();
                return false;
            }

            const response = await this.api.getCurrentUser();
            console.log('📄 API Response:', response);

            // Əgər response null-dursa (redirect olubsa)
            if (response === null) {
                return false;
            }

            if (response && response.success && response.user) {
                this.currentUser = response.user;
                console.log('✅ Auth successful for user:', this.currentUser.email);
                return true;
            }

            console.warn('⚠️ Auth uğursuz');
            return false;

        } catch (error) {
            console.error('❌ Auth xətası:', error.message);

            // Əgər cached data varsa istifadə et
            const cachedUser = this.getCachedUserData();
            if (cachedUser) {
                console.log('⚠️ Using cached user data due to API error');
                this.currentUser = cachedUser;
                return true;
            }

            return false;
        }
    }

    // User məlumatlarını saxla
    saveUserData(response) {
        if (!response || !response.user) return;

        // 1. guven_user_data kimi saxla
        localStorage.setItem('guven_user_data', JSON.stringify({
            success: true,
            user: response.user,
            timestamp: Date.now(),
            source: 'api-response'
        }));

        // 2. user kimi də saxla
        localStorage.setItem('user', JSON.stringify(response.user));

        // 3. Əgər email varsa, email key ilə də saxla
        if (response.user.email) {
            localStorage.setItem('user_email', response.user.email);
        }

        // 4. guven_last_me_body kimi də saxla (digər hissələr üçün)
        localStorage.setItem('guven_last_me_body', JSON.stringify(response));

        console.log('💾 User data saved to localStorage:', response.user.email);
    }

    // Cached user data almaq
    getCachedUserData() {
        // 1. guven_last_me_body-dən
        const lastMeBody = localStorage.getItem('guven_last_me_body');
        if (lastMeBody) {
            try {
                const parsed = JSON.parse(lastMeBody);
                if (parsed.success && parsed.user) {
                    console.log('✅ Cached data from guven_last_me_body');
                    return parsed.user;
                }
            } catch (e) {
                console.error('Parse guven_last_me_body error:', e);
            }
        }

        // 2. guven_user_data-dan
        const guvenData = localStorage.getItem('guven_user_data');
        if (guvenData) {
            try {
                const parsed = JSON.parse(guvenData);
                if (parsed.user) {
                    console.log('✅ Cached data from guven_user_data');
                    return parsed.user;
                }
            } catch (e) {
                console.error('Parse guven_user_data error:', e);
            }
        }

        // 3. user
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                console.log('✅ Cached data from user');
                return JSON.parse(userData);
            } catch (e) {
                console.error('Parse user error:', e);
            }
        }

        return null;
    }

    // ✅ YENİ METOD: User ID-ni almaq
    getUserId() {
        console.log('🔍 getUserId çağırıldı');

        // 1. Əvvəlcə currentUser-dən yoxla
        if (this.currentUser && this.currentUser.id) {
            console.log('✅ User ID currentUser-dən:', this.currentUser.id);
            return this.currentUser.id;
        }

        // 2. localStorage-dən guven_user_data yoxla
        const guvenData = localStorage.getItem('guven_user_data');
        if (guvenData) {
            try {
                const parsed = JSON.parse(guvenData);
                if (parsed.user && parsed.user.id) {
                    console.log('✅ User ID guven_user_data-dan:', parsed.user.id);
                    this.currentUser = parsed.user; // Cache et
                    return parsed.user.id;
                }
            } catch (e) {
                console.error('❌ Parse guven_user_data error:', e);
            }
        }

        // 3. Token-dən parse et
        const token = localStorage.getItem('guven_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userId = payload.sub || payload.user_id || payload.id;
                if (userId) {
                    console.log('✅ User ID token-dən:', userId);
                    return userId;
                }
            } catch (e) {
                console.error('❌ Token parse error:', e);
            }
        }

        // 4. window.app-dən yoxla
        if (window.app && window.app.currentUserId) {
            console.log('✅ User ID window.app-dən:', window.app.currentUserId);
            return window.app.currentUserId;
        }

        console.warn('⚠️ User ID tapılmadı');
        return null;
    }

    setupProfileButtons() {
        // Profile Menu
        const profileMenuBtn = document.getElementById('profileMenuBtn');
        if (profileMenuBtn) {
            profileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProfileMenu();
            });
        }

        // Logout Button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Close profile menu when clicking outside
        document.addEventListener('click', (e) => {
            const profileMenu = document.getElementById('profileMenu');
            if (profileMenu &&
                !profileMenu.contains(e.target) &&
                !profileMenuBtn?.contains(e.target)) {
                profileMenu.classList.remove('show');
            }
        });
    }

    // Toggle profile menu
    toggleProfileMenu() {
        const profileMenu = document.getElementById('profileMenu');
        if (profileMenu) {
            profileMenu.classList.toggle('show');
        }
    }

    // Show loading
    showLoading(message) {
        // Loading göstericiyi implement et
        console.log('⏳ Loading:', message);
        // Burada loading UI göster
    }

    // Show notification
    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        // Burada notification UI göster
    }

    async handleLogout() {
        try {
            if (confirm('Hesabdan çıxmaq istədiyinizə əminsiniz?')) {
                this.showLoading('Çıxış edilir...');

                // API logout çağır
                try {
                    await this.api.post('/auth/logout');
                } catch (error) {
                    console.log('Logout API not available, proceeding with local cleanup');
                }

                // BÜTÜN cache və məlumatları təmizlə
                this.clearAllStorage();

                // Bütün cookies-ləri təmizlə
                this.clearAllCookies();

                // Service Worker cache-ləri təmizlə
                await this.clearServiceWorkerCaches();

                // IndexedDB təmizlə
                await this.clearIndexedDB();

                // Cache Storage təmizlə
                await this.clearCacheStorage();

                // Session storage təmizlə
                sessionStorage.clear();

                 // ✅ DÜZGÜN LOGIN SƏHİFƏSİNƏ YÖNLƏNDİR
                setTimeout(() => {
                    // Cari path-ə bax
                    const currentPath = window.location.pathname;

                    // Login səhifəsinin düzgün yolunu təyin et
                    let loginPath = '/login.html'; // Varsayılan

                    // Əgər owner panelindəyiksə
                    if (currentPath.includes('/owner/')) {
                        loginPath = '../login.html'; // Bir qovluq yuxarı
                    }
                    // Əgər admin panelindəyiksə
                    else if (currentPath.includes('/admin/')) {
                        loginPath = '../login.html';
                    }
                    // Əgər kök qovluqdadırsa
                    else {
                        loginPath = '/login.html';
                    }

                    console.log('🔀 Yönləndirilir:', loginPath);
                    window.location.href = loginPath;

                }, 1000);
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
            this.showNotification('Çıxış zamanı xəta baş verdi', 'error');
        }
    }

    // BÜTÜN storage-ları təmizlə
    clearAllStorage() {
        console.log('🧹 BÜTÜN storage-lar təmizlənir...');

        // 1. LocalStorage təmizlə
        this.clearLocalStorage();

        // 2. SessionStorage təmizlə
        sessionStorage.clear();

        // 3. Cookies təmizlə
        this.clearAllCookies();

        // 4. Current user null et
        this.currentUser = null;

        // 5. API token təmizlə
        if (this.api) {
            this.api.clearToken();
        }

        console.log('✅ Bütün storage-lar təmizləndi');
    }

    // LocalStorage təmizlə
    clearLocalStorage() {
        console.log('🗑️ LocalStorage təmizlənir...');

        // Bütün localStorage item-larını təmizlə
        localStorage.clear();

        // Əlavə təmizlik üçün spesifik keys-lər
        const specificKeys = [
            // Auth keys
            'access_token',
            'refresh_token',
            'auth_token',
            'token',
            'session_token',
            'user_token',
            'login_token',

            // User data
            'user',
            'user_data',
            'user_info',
            'user_profile',
            'user_email',
            'user_id',
            'user_name',

            // App specific
            'last_login',
            'remember_me',
            'auth_state',
            'login_state',

            // Cache keys
            'cache_',
            'cached_',
            'last_cache',

            // Settings
            'settings',
            'app_settings',
            'user_settings',
            'theme',
            'language',

            // Form data
            'form_data',
            'draft',
            'unsaved'
        ];

        // Hər bir key-i təkrar təmizlə
        specificKeys.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log('✅ LocalStorage təmizləndi');
    }

    // Bütün cookies-ləri təmizlə
    clearAllCookies() {
        console.log('🍪 Bütün cookies-lər təmizlənir...');

        const domain = window.location.hostname;
        const baseDomain = domain.replace(/^www\./, '.'); // .guvenfinans.az formatı
        const pastDate = 'Thu, 01 Jan 1970 00:00:00 UTC';

        // 1. Cari domain-dəki bütün cookies-ləri təmizlə
        document.cookie.split(';').forEach(cookie => {
            const cookieName = cookie.trim().split('=')[0];
            if (cookieName) {
                // Müxtəlif domain və path kombinasiyaları ilə təmizlə
                const domains = [domain, baseDomain, ''];
                const paths = ['/', '', '/;'];

                domains.forEach(d => {
                    paths.forEach(p => {
                        document.cookie = `${cookieName}=; expires=${pastDate}; path=${p}; domain=${d};`;
                    });
                });
            }
        });

        // 2. Bilinən auth cookies-ləri spesifik olaraq təmizlə
        const knownCookies = [
            'access_token', 'refresh_token', 'session_id', 'XSRF-TOKEN',
            'xsrf_token', 'auth_token', 'token', 'guven_token', 'PHPSESSID',
            'ASP.NET_SessionId', 'JSESSIONID', 'remember_me', 'user_session',
            'auth_session', 'logged_in', 'login_token'
        ];

        knownCookies.forEach(cookieName => {
            const domains = [domain, baseDomain, ''];
            const paths = ['/', ''];

            domains.forEach(d => {
                paths.forEach(p => {
                    document.cookie = `${cookieName}=; expires=${pastDate}; path=${p}; domain=${d};`;
                });
            });
        });

        console.log('✅ Bütün cookies-lər təmizləndi');
    }

    // Service Worker cache-ləri təmizlə
    async clearServiceWorkerCaches() {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log(`🗑️ ${cacheNames.length} cache təmizlənir...`);

                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );

                console.log('✅ Service Worker cache-ləri təmizləndi');
            }
        } catch (error) {
            console.warn('⚠️ Service Worker cache təmizləmə xətası:', error);
        }
    }

    // IndexedDB təmizlə
    async clearIndexedDB() {
        try {
            if ('indexedDB' in window) {
                const dbs = await indexedDB.databases();

                await Promise.all(
                    dbs.map(db => {
                        return new Promise((resolve, reject) => {
                            const request = indexedDB.deleteDatabase(db.name);
                            request.onsuccess = () => resolve();
                            request.onerror = () => reject();
                        });
                    })
                );

                console.log(`✅ ${dbs.length} IndexedDB database təmizləndi`);
            }
        } catch (error) {
            console.warn('⚠️ IndexedDB təmizləmə xətası:', error);
        }
    }

    // Cache Storage təmizlə
    async clearCacheStorage() {
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
                console.log('✅ Cache Storage təmizləndi');
            }
        } catch (error) {
            console.warn('⚠️ Cache Storage təmizləmə xətası:', error);
        }
    }

    // Logout (alternativ metod)
    async logout() {
        try {
            await this.api.post('/auth/logout');
        } catch (error) {
            console.warn('Logout API xətası:', error);
        }

        // Bütün məlumatları təmizlə
        await this.clearAllStorage();
        this.currentUser = null;

        console.log('✅ Logout completed');
        return true;
    }

    // Getter'lər
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    hasToken() {
        return this.api.hasToken();
    }

    // ✅ İkinci yeni metod: getCurrentUserId (alternativ ad)
    getCurrentUserId() {
        return this.getUserId();
    }
}

window.AuthService = AuthService;