/**
 * circularNav.js - Dalğa Formasında Naviqasiya Sistemi
 * @version 1.1.0
 * @lastModified 2026-04-19
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    console.log('🌊 WaveNav yükləndi - v1.1.0 (FLIP layout animasiyası aktivdir)');

    // ===== ELEMENTLƏRİ SEÇ =====
    const waveNav = document.getElementById('waveNav');
    const navItems = document.querySelectorAll('.wave-item');

    // Bölmələr
    const sections = {
        new: document.getElementById('newTableSection'),
        active: document.getElementById('activeTableSection'),
        external: document.getElementById('externalTableSection'),
        partner: document.getElementById('partnerTableSection'),
        report: document.getElementById('reportTableSection'),
        archive: document.getElementById('archiveTableSection')
    };

    const newTaskSection = document.getElementById('newTaskCreateSection');

    // Dəyişənlər
    let activeItem = null;
    let currentSection = 'new';
    let lastClickedItem = null; // ƏLAVƏ EDİLDİ - Son kliklənən item-i izləmək üçün
    let isLayoutAnimating = false;
    let runningAnimations = [];

    // ===== BÜTÜN BÖLMƏLƏRİ GİZLƏ =====
    function hideAllSections() {
        Object.values(sections).forEach(s => { if(s) s.style.display = 'none'; });
        if(newTaskSection) newTaskSection.style.display = 'none';
    }

    // ===== BÖLMƏ GÖSTƏR =====
    function showSection(name) {
        hideAllSections();
        if(name === 'new' && newTaskSection) newTaskSection.style.display = 'block';
        else if(sections[name]) sections[name].style.display = 'block';
    }

    // ===== SEÇİMİ TƏMİZLƏ =====
    function removeSelected() {
        navItems.forEach(item => item.classList.remove('selected'));
    }

    // ===== FLIP LAYOUT ANİMASİYASI =====
    function stopRunningAnimations() {
        if (!runningAnimations.length) return;

        runningAnimations.forEach((anim) => {
            try {
                anim.cancel();
            } catch (_) {
                // ignore
            }
        });

        runningAnimations = [];

        if (waveNav) {
            waveNav.style.willChange = '';
            waveNav.style.overflow = '';
        }

        navItems.forEach((item) => {
            item.style.transition = '';
            item.style.transform = '';
            item.style.willChange = '';
            item.style.transformOrigin = '';
        });
    }

    function animateWaveLayoutChange(changeLayoutFn) {
        if (!waveNav || !navItems.length) {
            changeLayoutFn();
            return Promise.resolve();
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            changeLayoutFn();
            return Promise.resolve();
        }

        const ANIMATION_DURATION = 680;
        const ANIMATION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

        stopRunningAnimations();

        const firstRects = new Map();
        navItems.forEach((item) => {
            firstRects.set(item, item.getBoundingClientRect());
        });

        const firstWaveNavRect = waveNav.getBoundingClientRect();
        const firstWaveNavStyles = window.getComputedStyle(waveNav);
        const firstWaveNavPadding = {
            top: firstWaveNavStyles.paddingTop,
            right: firstWaveNavStyles.paddingRight,
            bottom: firstWaveNavStyles.paddingBottom,
            left: firstWaveNavStyles.paddingLeft
        };

        changeLayoutFn();

        const lastWaveNavRect = waveNav.getBoundingClientRect();
        const lastWaveNavStyles = window.getComputedStyle(waveNav);
        const lastWaveNavPadding = {
            top: lastWaveNavStyles.paddingTop,
            right: lastWaveNavStyles.paddingRight,
            bottom: lastWaveNavStyles.paddingBottom,
            left: lastWaveNavStyles.paddingLeft
        };

        const originalOverflow = waveNav.style.overflow;
        waveNav.style.overflow = 'visible';

        return new Promise((resolve) => {
            let pendingAnimations = 1; // container animation

            const finalizeAnimation = () => {
                pendingAnimations -= 1;
                if (pendingAnimations > 0) return;

                waveNav.style.willChange = '';
                waveNav.style.overflow = originalOverflow || 'hidden';

                navItems.forEach((item) => {
                    item.style.transition = '';
                    item.style.transform = '';
                    item.style.willChange = '';
                    item.style.transformOrigin = '';
                });

                runningAnimations = [];
                resolve();
            };

            waveNav.style.willChange = 'width, height, padding';
            const containerAnimation = waveNav.animate(
                [
                    {
                        width: `${firstWaveNavRect.width}px`,
                        height: `${firstWaveNavRect.height}px`,
                        paddingTop: firstWaveNavPadding.top,
                        paddingRight: firstWaveNavPadding.right,
                        paddingBottom: firstWaveNavPadding.bottom,
                        paddingLeft: firstWaveNavPadding.left
                    },
                    {
                        width: `${lastWaveNavRect.width}px`,
                        height: `${lastWaveNavRect.height}px`,
                        paddingTop: lastWaveNavPadding.top,
                        paddingRight: lastWaveNavPadding.right,
                        paddingBottom: lastWaveNavPadding.bottom,
                        paddingLeft: lastWaveNavPadding.left
                    }
                ],
                {
                    duration: ANIMATION_DURATION,
                    easing: ANIMATION_EASING,
                    fill: 'both'
                }
            );
            containerAnimation.onfinish = finalizeAnimation;
            containerAnimation.oncancel = finalizeAnimation;
            runningAnimations.push(containerAnimation);

            navItems.forEach((item) => {
                const first = firstRects.get(item);
                const last = item.getBoundingClientRect();
                if (!first || !last) return;

                const dx = first.left - last.left;
                const dy = first.top - last.top;
                const sx = first.width / (last.width || 1);
                const sy = first.height / (last.height || 1);

                if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) {
                    return;
                }

                item.style.willChange = 'transform';
                item.style.transformOrigin = 'top left';
                item.style.transition = 'none';
                item.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

                // Reflow: invert vəziyyəti tətbiq olunsun
                item.getBoundingClientRect();

                pendingAnimations += 1;
                const animation = item.animate(
                    [
                        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
                        { transform: 'translate(0px, 0px) scale(1, 1)' }
                    ],
                    {
                        duration: ANIMATION_DURATION,
                        easing: ANIMATION_EASING,
                        fill: 'both'
                    }
                );

                animation.onfinish = finalizeAnimation;
                animation.oncancel = finalizeAnimation;
                runningAnimations.push(animation);
            });
        });
    }

    // ===== PANEL BALACALAŞ =====
    function minimizePanel() {
        return animateWaveLayoutChange(() => {
            waveNav.classList.add('minimized');
        });
    }

    // ===== PANEL NORMALA QAYIT =====
    function restorePanel() {
        return animateWaveLayoutChange(() => {
            waveNav.classList.remove('minimized');
        });
    }

    // ===== BÜTÜN PANELLERİ GÖSTER (sadece panel görünsün, bölmələr gizlənsin) =====
    function showOnlyPanel() {
        hideAllSections();
        console.log('📌 Sadəcə panel göstərilir');
        return restorePanel();
    }

    function resetNavSelectionState() {
        removeSelected();
        lastClickedItem = null;
        activeItem = null;
        currentSection = 'new';
    }

    // ===== KLİK HADİSƏLƏRİ =====
    navItems.forEach(item => {
        item.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (isLayoutAnimating) return;
            isLayoutAnimating = true;

            try {
                const target = this.dataset.target;
                console.log('🔘 Klik:', target, 'Son klik:', lastClickedItem ? lastClickedItem.dataset.target : 'yoxdur');

                // ƏGƏR EYNİ İTEM-Ə TƏKRAR KLİK OLUNUB SA
                if(lastClickedItem === this) {
                    console.log('🔄 Eyni item-ə təkrar klik - panel geri qayıdır');

                    // Seçimi təmizlə
                    resetNavSelectionState();

                    // Bütün bölmələri gizlət (sadəcə panel qalsın)
                    hideAllSections();

                    // Panel normala qayıt (mərkəzdə görünsün)
                    await restorePanel();

                    // Animasiya bitəndən sonra yenidən gizlət (digər script müdaxilələrinə qarşı)
                    hideAllSections();

                    return;
                }

                // ƏGƏR YENİ İTEM-Ə KLİK OLUNUB SA

                // Seçimi idarə et
                removeSelected();
                this.classList.add('selected');
                activeItem = this;

                // Bölməni göstər
                showSection(target);
                currentSection = target;

                // Panel balacalaş (yuxarı qalxsın)
                await minimizePanel();

                // Son klikləni yadda saxla
                lastClickedItem = this;
            } finally {
                isLayoutAnimating = false;
            }
        });
    });

    // ===== PANELƏ KLİK =====
    if(waveNav) {
        waveNav.addEventListener('click', function(e) {
            // Yalnız düymələr (.wave-item) state dəyişə bilər.
            // Container-in boş sahəsinə klik edildikdə heç bir state dəyişikliyi etmə.
            if(!e.target.closest('.wave-item')) {
                e.stopPropagation();
                return;
            }
        });
    }

    // ===== ESC DÜYMƏSİ =====
    document.addEventListener('keydown', async e => {
        if(e.key === 'Escape') {
            if (isLayoutAnimating) return;
            isLayoutAnimating = true;

            try {
                if(waveNav?.classList.contains('minimized')) {
                // Balacalaşmışdırsa - normala qayıt
                await restorePanel();
                if(activeItem) {
                    const target = activeItem.dataset.target;
                    showSection(target);
                }
            } else {
                // Normal vəziyyətdədirsə - sadəcə paneli göstər
                await showOnlyPanel();
                resetNavSelectionState();
            }
            } finally {
                isLayoutAnimating = false;
            }
        }
    });

    // ===== İLKİN YÜKLƏMƏ =====
    hideAllSections();


    // İlk item-i seç
    const newItem = document.querySelector('[data-target="new"]');
    if(newItem) {
        newItem.classList.add('selected');
        activeItem = newItem;
        lastClickedItem = newItem; // ƏLAVƏ EDİLDİ
    }

    console.log('✅ Panel hazır - FLIP animasiya aktiv');
    console.log('📌 İstifadə:');
    console.log('   - Eyni item-ə təkrar klik → panel geri qayıdır');
    console.log('   - ESC düyməsi → panel normala qayıdır');
    console.log('   - Panelə klik → panel açılır');
});
