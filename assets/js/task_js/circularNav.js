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
    function animateWaveLayoutChange(changeLayoutFn) {
        if (!waveNav || !navItems.length) {
            changeLayoutFn();
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            changeLayoutFn();
            return;
        }

        const firstRects = new Map();
        navItems.forEach((item) => {
            firstRects.set(item, item.getBoundingClientRect());
        });

        changeLayoutFn();

        const runningAnimations = [];
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

            const animation = item.animate(
                [
                    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
                    { transform: 'translate(0px, 0px) scale(1, 1)' }
                ],
                {
                    duration: 680,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'both'
                }
            );

            animation.onfinish = () => {
                item.style.transition = '';
                item.style.transform = '';
                item.style.willChange = '';
                item.style.transformOrigin = '';
            };

            animation.oncancel = animation.onfinish;
            runningAnimations.push(animation);
        });

        if (!runningAnimations.length) {
            navItems.forEach((item) => {
                item.style.transition = '';
                item.style.transform = '';
                item.style.willChange = '';
                item.style.transformOrigin = '';
            });
        }
    }

    // ===== PANEL BALACALAŞ =====
    function minimizePanel() {
        animateWaveLayoutChange(() => {
            waveNav.classList.add('minimized');
        });
    }

    // ===== PANEL NORMALA QAYIT =====
    function restorePanel() {
        animateWaveLayoutChange(() => {
            waveNav.classList.remove('minimized');
        });
    }

    // ===== BÜTÜN PANELLERİ GÖSTER (sadece panel görünsün, bölmələr gizlənsin) =====
    function showOnlyPanel() {
        hideAllSections();
        restorePanel();
        console.log('📌 Sadəcə panel göstərilir');
    }

    // ===== KLİK HADİSƏLƏRİ =====
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const target = this.dataset.target;
            console.log('🔘 Klik:', target, 'Son klik:', lastClickedItem ? lastClickedItem.dataset.target : 'yoxdur');

            // ƏGƏR EYNİ İTEM-Ə TƏKRAR KLİK OLUNUB SA
            if(lastClickedItem === this) {
                console.log('🔄 Eyni item-ə təkrar klik - panel geri qayıdır');

                // Seçimi təmizlə
                removeSelected();

                // Panel normala qayıt (mərkəzdə görünsün)
                restorePanel();

                // Bütün bölmələri gizlət (sadəcə panel qalsın)
                hideAllSections();

                // Son klikləni sıfırla
                lastClickedItem = null;
                activeItem = null;

                return;
            }

            // ƏGƏR YENİ İTEM-Ə KLİK OLUNUB SA

            // Seçimi idarə et
            removeSelected();
            this.classList.add('selected');
            activeItem = this;

            // Bölməni göstər
            showSection(target);

            // Panel balacalaş (yuxarı qalxsın)
            minimizePanel();

            // Son klikləni yadda saxla
            lastClickedItem = this;
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
    document.addEventListener('keydown', e => {
        if(e.key === 'Escape') {
            if(waveNav?.classList.contains('minimized')) {
                // Balacalaşmışdırsa - normala qayıt
                restorePanel();
                if(activeItem) {
                    const target = activeItem.dataset.target;
                    showSection(target);
                }
            } else {
                // Normal vəziyyətdədirsə - sadəcə paneli göstər
                showOnlyPanel();
                removeSelected();
                lastClickedItem = null;
                activeItem = null;
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
