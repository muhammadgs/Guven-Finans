// Admin Panel JavaScript - auth.js
async function loadCurrentUser() {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user || data;

            // İstifadəçi məlumatlarını göstər
            const userNameElement = document.getElementById('userName');
            const userRoleElement = document.getElementById('userRole');
            const userAvatarElement = document.getElementById('userAvatar');

            if (userNameElement) {
                userNameElement.textContent =
                    `${currentUser.ceo_name || currentUser.name || ''} ${currentUser.ceo_lastname || currentUser.surname || ''}`.trim() || currentUser.email;
            }

            if (userRoleElement) {
                userRoleElement.textContent =
                    currentUser.is_super_admin ? 'Super Admin' :
                    currentUser.is_admin ? 'Admin' :
                    currentUser.user_type === 'ceo' ? 'CEO' :
                    currentUser.user_type === 'company_admin' ? 'Şirkət Admini' : 'İşçi';
            }

            if (userAvatarElement) {
                const firstName = currentUser.ceo_name ? currentUser.ceo_name.charAt(0).toUpperCase() :
                                currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A';
                userAvatarElement.textContent = firstName;
            }

        } else if (response.status === 401) {
            // Token yanlışdır, login səhifəsinə yönləndir
            window.location.href = 'login.html';
        } else {
            showError('İstifadəçi məlumatları alına bilmədi');
        }
    } catch (error) {
        console.error('İstifadəçi məlumatları yüklənərkən xəta:', error);
        window.location.href = 'login.html';
    }
}

// Logout function
async function logoutUser() {
    try {
        const token = localStorage.getItem('guven_token');
        if (token) {
            await fetch(`${API_BASE}/api/v1/auth/logout`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (error) {
        console.error('Çıxış edərkən xəta:', error);
    } finally {
        localStorage.removeItem('guven_token');
        window.location.href = 'login.html';
    }
}