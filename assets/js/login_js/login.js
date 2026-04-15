// assets/js/login.js - TAM DÜZƏLDİLMİŞ VERSİYA (CACHE DOLDURMA İLƏ)

document.addEventListener('DOMContentLoaded', () => {
    // === LOGIN FUNCTIONS ===
    const API_BASE = "http://vps.guvenfinans.az:8008";
    const loginForm = document.getElementById('loginForm');
    const statusEl = document.getElementById('authStatus');

    const setStatus = (type, msg) => {
        if (!statusEl) return;
        statusEl.className = `auth-status ${type}`;
        statusEl.textContent = msg;
        statusEl.hidden = false;
        statusEl.classList.remove('is-hidden');
    };

    const clearStatus = () => {
        if (!statusEl) return;
        statusEl.className = 'auth-status is-hidden';
        statusEl.textContent = '';
        statusEl.hidden = true;
    };

    // Əvvəlki sessiyaları təmizlə
    const clearOldSessions = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('guven_token');
        localStorage.removeItem('guven_token_type');
        localStorage.removeItem('guven_user_role');
        localStorage.removeItem('guven_user_id');
        localStorage.removeItem('guven_user');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_uuid');
        console.log('🧹 Old sessions cleared');
    };

    // ========== 🔥 YENİ: LOGIN ZAMANI CACHE-LƏRİ DOLDUR ==========
    const preloadAllCaches = async (token) => {
        console.log('🚀 Login: Bütün cache-lər doldurulur...');

        // API request üçün header
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        try {
            // 1. User məlumatlarını al
            console.log('📥 1/6 User məlumatları yüklənir...');
            const userRes = await fetch('http://vps.guvenfinans.az:8008/api/v1/auth/me', { headers });
            if (userRes.ok) {
                const userData = await userRes.json();
                const user = userData.user || userData;
                const companyCode = user.company_code || user.user?.company_code;

                if (companyCode) {
                    // 2. Sub-companies
                    console.log('📥 2/6 Sub-companies yüklənir...');
                    await fetch(`http://vps.guvenfinans.az:8008/api/v1/companies/${companyCode}/sub-companies`, { headers });

                    // 3. Departments
                    console.log('📥 3/6 Departments yüklənir...');
                    await fetch(`http://vps.guvenfinans.az:8008/api/v1/departments/company-code/${companyCode}`, { headers });

                    // 4. Employees
                    console.log('📥 4/6 Employees yüklənir...');
                    await fetch(`http://vps.guvenfinans.az:8008/api/v1/users/company/${companyCode}`, { headers });

                    // 5. Work types
                    console.log('📥 5/6 Work types yüklənir...');
                    const companyId = user.company_id || user.user?.company_id;
                    if (companyId) {
                        await fetch(`http://vps.guvenfinans.az:8008/api/v1/worktypes/company/${companyId}`, { headers });
                    }

                    // 6. Active tasks
                    console.log('📥 6/6 Active tasks yüklənir...');
                    await fetch('http://vps.guvenfinans.az:8008/api/v1/tasks/detailed?page=1&limit=100&status=pending,in_progress,waiting,overdue,pending_approval', { headers });
                }
            }

            console.log('✅ Bütün cache-lər uğurla dolduruldu!');

        } catch (error) {
            console.warn('⚠️ Cache doldurma xətası:', error);
            // Xəta olsa belə davam et
        }
    };

    // === GLOBAL FUNCTIONS ===
    const body = document.body;
    const siteShell = document.getElementById('site-shell');
    const loader = document.getElementById('gti-loader');
    const pageType = body?.dataset.page || '';
    const isHomePage = pageType === 'home';
    const isAdminPage = pageType === 'admin';
    const DASHBOARD_ROUTES = {
        company_admin: 'owner/owp.html',
        employee: 'worker/wp.html',
        admin: 'admin.html',
        super_admin: 'admin.html'
    };
    const STORAGE_KEYS = {
        projects: 'guven_projects',
        partners: 'guven_partners',
    };

    const parseArray = (value) => {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    const getStoredItems = (key) => parseArray(localStorage.getItem(key));
    const saveStoredItems = (key, data) => localStorage.setItem(key, JSON.stringify(data));

    const resolveDashboardRoute = () => {
        const storedRole = (localStorage.getItem('guven_user_role') || localStorage.getItem('guven_last_role_norm') || '').toLowerCase();
        return DASHBOARD_ROUTES[storedRole] || 'owner/owp.html';
    };

    const syncHomeSessionButtons = () => {
        if (!isHomePage) return;
        const registerBtn = document.getElementById('register-btn');
        const loginBtn = document.getElementById('login-btn');
        const profileBtn = document.getElementById('nav-profile-btn');
        const mobileProfileBtn = document.getElementById('mobile-profile-btn');
        const mobileAuthLinks = document.querySelectorAll('.mobile-menu-auth a');

        const isLoggedIn = Boolean(localStorage.getItem('auth_token') || localStorage.getItem('guven_token'));

        if (registerBtn) registerBtn.hidden = isLoggedIn;
        if (loginBtn) loginBtn.hidden = isLoggedIn;
        if (profileBtn) profileBtn.hidden = !isLoggedIn;
        if (mobileProfileBtn) mobileProfileBtn.hidden = !isLoggedIn;

        if (mobileAuthLinks.length) {
            mobileAuthLinks.forEach((link) => {
                link.hidden = isLoggedIn;
            });
        }

        const routeToDashboard = () => {
            window.location.href = resolveDashboardRoute();
        };

        if (profileBtn) {
            profileBtn.addEventListener('click', routeToDashboard);
        }
        if (mobileProfileBtn) {
            mobileProfileBtn.addEventListener('click', routeToDashboard);
        }
    };

    const renderEmptyState = (container, message) => {
        container.innerHTML = `<p class="empty-msg">${message}</p>`;
    };

    const createProjectSlide = (project) => {
        const article = document.createElement('article');
        article.className = 'project-slide';

        const card = document.createElement('div');
        card.className = 'project-card2';

        const media = document.createElement('div');
        media.className = 'project-media';
        const img = document.createElement('img');
        img.src = project.image || '';
        img.alt = project.title || 'Layihə';
        img.onerror = () => {
            img.onerror = null;
            img.src = 'https://via.placeholder.com/1200x700?text=Project';
        };
        const overlay = document.createElement('div');
        overlay.className = 'project-overlay';
        media.append(img, overlay);

        const bodyEl = document.createElement('div');
        bodyEl.className = 'project-body';

        const title = document.createElement('h3');
        title.className = 'project-title';
        title.textContent = project.title || 'Layihə';

        const desc = document.createElement('p');
        desc.className = 'project-desc clamp-3';
        desc.textContent = project.desc || '';

        const link = document.createElement('a');
        link.className = 'project-btn';
        link.href = project.link || '#';
        link.target = '_blank';
        link.rel = 'noopener';
        link.innerHTML = 'Bax <i class="fas fa-arrow-right"></i>';

        bodyEl.append(title, desc, link);
        card.append(media, bodyEl);
        article.append(card);
        return article;
    };

    const createPartnerCard = (partner) => {
        const article = document.createElement('article');
        article.className = 'project-card';

        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'project-image-wrapper';
        const img = document.createElement('img');
        img.src = partner.image || '';
        img.alt = partner.title || 'Partnyor';
        img.loading = 'lazy';
        img.onerror = () => {
            img.onerror = null;
            img.src = 'https://via.placeholder.com/800x500?text=Partner';
        };
        imageWrapper.appendChild(img);

        const bodyEl = document.createElement('div');
        bodyEl.className = 'partner-body';

        const title = document.createElement('h3');
        title.className = 'partner-title clamp-2';
        title.textContent = partner.title || 'Partnyor';

        const desc = document.createElement('p');
        desc.className = 'partner-desc clamp-3';
        desc.textContent = partner.desc || '';

        const link = document.createElement('a');
        link.className = 'partner-btn';
        link.href = partner.link || '#';
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Bax';

        bodyEl.append(title, desc, link);
        article.append(imageWrapper, bodyEl);
        return article;
    };

    const renderProjects = () => {
        const container = document.getElementById('projects-container');
        if (!container) return;
        const projects = getStoredItems(STORAGE_KEYS.projects);
        container.innerHTML = '';

        if (!projects.length) {
            renderEmptyState(container, 'Hələlik layihə yoxdur');
            return;
        }

        projects.forEach(project => container.appendChild(createProjectSlide(project)));
    };

    const renderPartners = () => {
        const container = document.getElementById('partners-container');
        if (!container) return;
        const partners = getStoredItems(STORAGE_KEYS.partners);
        container.innerHTML = '';

        if (!partners.length) {
            renderEmptyState(container, 'Hələlik partnyor yoxdur');
            return;
        }

        partners.forEach(partner => container.appendChild(createPartnerCard(partner)));
    };

    const initAdminPanel = () => {
        const tabButtons = document.querySelectorAll('.tabs button[data-tab]');
        const panels = document.querySelectorAll('.admin-panel[data-panel]');
        const projectForm = document.getElementById('project-form');
        const partnerForm = document.getElementById('partner-form');
        const projectList = document.getElementById('project-list');
        const partnerList = document.getElementById('partner-list');

        const activateTab = (tabName) => {
            tabButtons.forEach(btn => {
                const isActive = btn.dataset.tab === tabName;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive.toString());
            });
            panels.forEach(panel => {
                const isActive = panel.dataset.panel === tabName;
                panel.hidden = !isActive;
            });
        };

        tabButtons.forEach(button => {
            button.addEventListener('click', () => activateTab(button.dataset.tab));
        });

        const renderAdminList = (type) => {
            const isProject = type === 'project';
            const listEl = isProject ? projectList : partnerList;
            const items = getStoredItems(isProject ? STORAGE_KEYS.projects : STORAGE_KEYS.partners);
            if (!listEl) return;
            listEl.innerHTML = '';

            if (!items.length) {
                const empty = document.createElement('div');
                empty.className = 'empty-msg';
                empty.textContent = isProject ? 'Hələlik layihə yoxdur' : 'Hələlik partnyor yoxdur';
                listEl.appendChild(empty);
                return;
            }

            items.forEach((item, index) => {
                const row = document.createElement('div');
                row.className = 'list-item';

                const info = document.createElement('div');
                info.className = 'item-info';

                const title = document.createElement('span');
                title.className = 'item-title';
                title.textContent = item.title || (isProject ? 'Layihə' : 'Partnyor');

                const meta = document.createElement('span');
                meta.className = 'item-meta';
                meta.textContent = item.link || '';

                info.append(title, meta);

                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-danger';
                removeBtn.type = 'button';
                removeBtn.textContent = 'Sil';
                removeBtn.dataset.index = index.toString();
                removeBtn.dataset.type = type;

                row.append(info, removeBtn);
                listEl.appendChild(row);
            });
        };

        if (projectForm) {
            projectForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(projectForm);
                const newProject = {
                    image: formData.get('image')?.toString().trim(),
                    title: formData.get('title')?.toString().trim(),
                    desc: formData.get('desc')?.toString().trim(),
                    link: formData.get('link')?.toString().trim(),
                };
                const projects = getStoredItems(STORAGE_KEYS.projects);
                projects.push(newProject);
                saveStoredItems(STORAGE_KEYS.projects, projects);
                projectForm.reset();
                renderProjects();
                renderAdminList('project');
            });
        }

        if (partnerForm) {
            partnerForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(partnerForm);
                const newPartner = {
                    image: formData.get('image')?.toString().trim(),
                    title: formData.get('title')?.toString().trim(),
                    link: formData.get('link')?.toString().trim(),
                };
                const partners = getStoredItems(STORAGE_KEYS.partners);
                partners.push(newPartner);
                saveStoredItems(STORAGE_KEYS.partners, partners);
                partnerForm.reset();
                renderPartners();
                renderAdminList('partner');
            });
        }

        const listContainer = document.querySelector('.grid');
        if (listContainer) {
            listContainer.addEventListener('click', (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                if (target.dataset.type && target.dataset.index) {
                    const isProject = target.dataset.type === 'project';
                    const items = getStoredItems(isProject ? STORAGE_KEYS.projects : STORAGE_KEYS.partners);
                    items.splice(Number(target.dataset.index), 1);
                    saveStoredItems(isProject ? STORAGE_KEYS.projects : STORAGE_KEYS.partners, items);
                    renderAdminList(isProject ? 'project' : 'partner');
                    if (isProject) {
                        renderProjects();
                    } else {
                        renderPartners();
                    }
                }
            });
        }

        renderAdminList('project');
        renderAdminList('partner');
    };

    // === LOGIN SESSION HANDLING ===
    clearOldSessions();

    // Əgər artıq token varsa, dashboard-a yönləndir
    const existingToken = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');
    if (existingToken) {
        console.log('🔑 Existing token found, redirecting to dashboard...');
        window.location.href = resolveDashboardRoute();
        return;
    }

    // === LOGIN FORM HANDLING ===
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearStatus();

            const loginInput = document.getElementById('login');
            const passwordInput = document.getElementById('password');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            const rawLogin = loginInput?.value || '';
            const password = passwordInput?.value || '';

            if (!rawLogin || !password) {
                setStatus('error', 'Zəhmət olmasa email/nömrə və şifrəni daxil edin.');
                return;
            }

            submitBtn.disabled = true;
            setStatus('info', 'Məlumatlar yoxlanılır...');

            const formatLoginInput = (val) => {
                let clean = (val || '').trim();
                if (/^0\d{9}$/.test(clean)) {
                    clean = '+994' + clean.substring(1);
                }
                return clean;
            };

            const payload = {
                username: formatLoginInput(rawLogin),
                password: password
            };

            console.log('🔑 Login attempt for:', payload.username);

            try {
                const res = await fetch(`http://vps.guvenfinans.az:8008/api/v1/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });

                console.log('📥 Login response status:', res.status);

                let data;
                try {
                    data = await res.json();
                    console.log('📊 Login response data:', data);
                } catch (jsonError) {
                    console.error('❌ JSON parse error:', jsonError);
                    const text = await res.text();
                    console.error('📝 Response text:', text.substring(0, 200));
                    throw new Error('Serverdən gələn cavab düzgün deyil.');
                }

                if (!res.ok) {
                    const errorMsg = data?.detail || data?.message || 'Giriş uğursuz oldu.';
                    throw new Error(errorMsg);
                }

                // SUCCESS - Token-ləri saxla
                if (data.access_token) {
                    // Token-ləri saxla
                    localStorage.setItem('auth_token', data.access_token);
                    localStorage.setItem('guven_token', data.access_token);
                    localStorage.setItem('guven_token_type', data.token_type || 'Bearer');

                    // User məlumatları
                    if (data.user) {
                        localStorage.setItem('user_email', data.user.email || '');
                        localStorage.setItem('user_name', data.user.name || '');
                        localStorage.setItem('guven_user_id', data.user.id || '');
                        if (data.user.role) {
                            localStorage.setItem('guven_user_role', data.user.role);
                        }
                    }

                    // UUID
                    try {
                        const token = data.access_token;
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        if (payload.uuid) {
                            localStorage.setItem('user_uuid', payload.uuid);
                            console.log('✅ UUID saved:', payload.uuid);
                        }
                    } catch (e) {
                        console.warn('⚠️ UUID decode error:', e);
                    }

                    console.log('✅ Login successful! Tokens saved.');

                    // ========== 🔥 CACHE-LƏRİ DOLDUR (arxa planda) ==========
                    setStatus('info', 'Məlumatlar yüklənir...');

                    // Cache doldurma əməliyyatını başlat (amma gözləmə)
                    preloadAllCaches(data.access_token).then(() => {
                        console.log('✅ Cache preload tamamlandı');
                    }).catch(err => {
                        console.warn('⚠️ Cache preload xətası:', err);
                    });

                    setStatus('success', 'Uğurlu! Yönləndirilir...');
                    syncHomeSessionButtons();

                    // Dashboard-a yönləndir
                    setTimeout(() => {
                        window.location.href = resolveDashboardRoute();
                    }, 1500);

                } else {
                    throw new Error('Token alınmadı.');
                }

            } catch (err) {
                console.error('❌ Login error:', err);
                setStatus('error', err.message || 'Xəta baş verdi.');
                submitBtn.disabled = false;
                clearOldSessions();
            }
        });
    }

    // Debug
    console.log('🔍 Current localStorage:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        console.log(`  ${key}: ${value?.substring(0, 30)}...`);
    }

    // === PAGE INITIALIZATION ===
    syncHomeSessionButtons();

    // Loader
    if (!isHomePage) {
        if (loader) loader.remove();
        body.classList.remove('loader-active');
        if (siteShell) siteShell.style.opacity = '1';
    } else {
        const loaderDuration = 1500;
        const loaderFadeDuration = 420;
        let loaderHasRun = false;

        const runLoaderOnce = () => {
            if (loaderHasRun) return;
            loaderHasRun = true;
            if (siteShell) siteShell.style.opacity = '0';
            if (!loader) {
                body.classList.remove('loader-active');
                if (siteShell) siteShell.style.opacity = '1';
                return;
            }
            setTimeout(() => {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    loader.remove();
                    body.classList.remove('loader-active');
                    if (siteShell) siteShell.style.opacity = '1';
                }, loaderFadeDuration);
            }, loaderDuration);
        };

        if (document.readyState === 'complete') {
            runLoaderOnce();
        } else {
            window.addEventListener('load', runLoaderOnce, { once: true });
        }
    }

    // Header scroll effect
    const header = document.getElementById('main-header');
    if (header) {
        const updateHeaderState = () => {
            if (window.scrollY > 20) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        };
        window.addEventListener('scroll', updateHeaderState);
        updateHeaderState();
    }

    // Projects slider
    const slider = document.getElementById('projects-container');
    const prevBtn = document.getElementById('project-prev-btn');
    const nextBtn = document.getElementById('project-next-btn');
    if (slider && prevBtn && nextBtn) {
        nextBtn.addEventListener('click', () => slider.scrollBy({ left: 360, behavior: 'smooth' }));
        prevBtn.addEventListener('click', () => slider.scrollBy({ left: -360, behavior: 'smooth' }));
    }

    // Partners carousel
    const carousel = document.getElementById('partners-container');
    let isDown = false;
    let startX, scrollLeft;
    if (carousel) {
        carousel.addEventListener('mousedown', (e) => {
            isDown = true;
            carousel.classList.add('active');
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });
        carousel.addEventListener('mouseleave', () => {
            isDown = false;
            carousel.classList.remove('active');
        });
        carousel.addEventListener('mouseup', () => {
            isDown = false;
            carousel.classList.remove('active');
        });
        carousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2;
            carousel.scrollLeft = scrollLeft - walk;
        });
    }

    // Smooth scroll
    const scrollLinks = document.querySelectorAll('a[data-scroll-target]');
    const headerOffset = 150;
    scrollLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-scroll-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                const elementPosition = targetSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        });
    });

    // Consultation form
    const consultationForm = document.querySelector('.consultation-form');
    if (consultationForm) {
        const phoneInput = consultationForm.querySelector('input[name="phone"]');
        consultationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: consultationForm.name?.value || '',
                countryCode: consultationForm.countryCode?.value || '',
                phone: consultationForm.phone?.value || '',
                service: consultationForm.service?.value || '',
                details: consultationForm.details?.value || ''
            };
            console.log('Konsultasiya formu göndərildi:', formData);
        });
        if (phoneInput) {
            phoneInput.addEventListener('input', () => {
                phoneInput.value = phoneInput.value.replace(/\D/g, '');
            });
        }
    }

    // Mobile menu
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    if (mobileMenuToggle && mobileMenuOverlay) {
        const setMobileMenuState = (isActive) => {
            mobileMenuOverlay.classList.toggle('is-active', isActive);
            mobileMenuToggle.classList.toggle('is-open', isActive);
            mobileMenuOverlay.setAttribute('aria-hidden', (!isActive).toString());
            mobileMenuToggle.setAttribute('aria-expanded', isActive.toString());
            document.body.classList.toggle('menu-open', isActive);
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !isActive);
                icon.classList.toggle('fa-times', isActive);
            }
        };
        mobileMenuToggle.addEventListener('click', () => {
            setMobileMenuState(!mobileMenuOverlay.classList.contains('is-active'));
        });
        mobileMenuOverlay.addEventListener('click', (event) => {
            if (event.target === mobileMenuOverlay) setMobileMenuState(false);
        });
        const overlayLinks = mobileMenuOverlay.querySelectorAll('a, .mobile-auth-btn, .mobile-contact-link');
        overlayLinks.forEach(link => {
            link.addEventListener('click', () => setMobileMenuState(false));
        });
        const desktopMediaQuery = window.matchMedia('(min-width: 769px)');
        const handleDesktopResize = (event) => {
            if (event.matches) setMobileMenuState(false);
        };
        desktopMediaQuery.addEventListener('change', handleDesktopResize);
    }

    // Content rendering
    if (isHomePage) {
        renderProjects();
        renderPartners();
    }
    if (isAdminPage) {
        initAdminPanel();
    }
});