// taskEditModule.js - PROFESSIONAL VERSIYA (SAATı GÖSTƏRƏN)
const TaskEditModule = {
    // Timer state-ni saxla
    timerInterval: null,
    currentTaskElapsedTime: 0,
    hasManualTimeAdded: false,

    // ==================== TASK EDIT MODAL ====================
    openEditTaskModal: async function (taskId, taskType = 'active') {
        try {
            console.log(`✏️ Task redaktə modalı açılır: ${taskId} (${taskType})`);

            this.currentTaskId = taskId;
            this.currentTableType = taskType;

            let endpoint = `/tasks/${taskId}`;

            const response = await makeApiRequest(endpoint, 'GET');

            if (!response || response.error) {
                alert('❌ Task məlumatları tapılmadı!');
                return;
            }

            const task = response.data || response;
            console.log('📋 Task məlumatları:', task);

            // Vaxt məlumatlarını saxla
            this.currentTaskElapsedTime = task.total_elapsed_seconds || 0;

            // Company cache yoxla və lazım olduqda yüklə
            if (!window.companyCache || Object.keys(window.companyCache).length === 0) {
                await this.loadCompanies();
            } else {
                console.log('✅ Company cache mövcuddur, select yenilənir');
                this.updateCompanySelect();
            }

            // Modal göstər
            this.showEditModal(task, taskType, taskId);

        } catch (error) {
            console.error('❌ Edit modal açılarkən xəta:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    // ==================== ŞİRKƏTLƏRİ YÜKLƏ ====================
    loadCompanies: async function () {
        try {
            console.log('🏢 Şirkətlər yüklənir...');

            if (window.taskManager && window.taskManager.companyCache) {
                console.log('✅ TaskManager.companyCache tapıldı:', window.taskManager.companyCache);

                if (!window.companyCache) {
                    window.companyCache = {};
                }

                Object.entries(window.taskManager.companyCache).forEach(([id, name]) => {
                    window.companyCache[id] = {
                        name: name,
                        id: id,
                        from_taskmanager: true
                    };
                });

                const myId = window.taskManager?.myCompany?.id || window.taskManager?.userData?.companyId;
                if (myId && window.companyCache[myId]) {
                    window.companyCache[myId].is_my_company = true;
                }

                console.log(`✅ TaskManager-dən ${Object.keys(window.taskManager.companyCache).length} şirkət kopyalandı`);

                this.updateCompanySelect();
                return;
            }

            console.log('⚠️ TaskManager.companyCache tapılmadı, API-dən yüklənir...');

            const userData = window.taskManager?.userData;
            if (!userData) {
                console.warn('⚠️ User data tapılmadı');
                await this.loadCompaniesFromLocal();
                return;
            }

            const companyCode = userData.companyCode || userData.company_code;
            const myCompanyId = userData.companyId || userData.company_id;

            if (!companyCode || !myCompanyId) {
                console.warn('⚠️ Company məlumatları tapılmadı');
                await this.loadCompaniesFromLocal();
                return;
            }

            if (!window.companyCache) {
                window.companyCache = {};
            }

            let myCompanyRealName = null;

            try {
                const companyResponse = await makeApiRequest(`/companies/code/${companyCode}`, 'GET', null, {silent: true});
                if (companyResponse && !companyResponse.error) {
                    const companyData = companyResponse.data || companyResponse;
                    myCompanyRealName = companyData.company_name || companyData.name;
                }
            } catch (err) {
                console.log('ℹ️ API-dən şirkət adı alınmadı:', err.message);
            }

            if (!myCompanyRealName) {
                myCompanyRealName = userData.companyName || userData.company_name;
            }

            window.companyCache[myCompanyId] = {
                name: myCompanyRealName,
                code: companyCode,
                id: myCompanyId,
                is_my_company: true
            };

            if (window.taskManager && window.taskManager.subsidiaryCompanies) {
                window.taskManager.subsidiaryCompanies.forEach(company => {
                    if (company.id && company.company_name) {
                        window.companyCache[company.id] = {
                            name: company.company_name,
                            code: company.company_code,
                            id: company.id,
                            is_subsidiary: true,
                            from_taskmanager: true
                        };
                    }
                });
            } else {
                try {
                    const endpoint = `/companies/code/${companyCode}`;
                    const response = await makeApiRequest(endpoint, 'GET', null, {silent: true});

                    let companies = [];
                    if (response && response.data) {
                        if (Array.isArray(response.data)) {
                            companies = response.data;
                        } else if (response.data.sub_companies && Array.isArray(response.data.sub_companies)) {
                            companies = response.data.sub_companies;
                        }
                    } else if (response && Array.isArray(response)) {
                        companies = response;
                    } else if (response && response.sub_companies && Array.isArray(response.sub_companies)) {
                        companies = response.sub_companies;
                    }

                    companies.forEach(company => {
                        if (!company) return;
                        const companyId = company.id || company.company_id;
                        if (!companyId) return;
                        window.companyCache[companyId] = {
                            name: company.name || company.company_name || 'Adsız şirkət',
                            code: company.code || company.company_code,
                            id: companyId,
                            is_subsidiary: true
                        };
                    });
                } catch (error) {
                    console.error(`❌ API xətası:`, error);
                }
            }

            try {
                localStorage.setItem('companies_cache', JSON.stringify(window.companyCache));
            } catch (e) {
                console.warn('⚠️ LocalStorage save xətası:', e);
            }

            this.updateCompanySelect();

        } catch (error) {
            console.error('❌ Şirkətlər yüklənərkən xəta:', error);
            await this.loadCompaniesFromLocal();
        }
    },

    loadCompaniesFromLocal: async function () {
        try {
            if (!window.companyCache) {
                window.companyCache = {};
            }

            if (window.taskManager?.companyCache) {
                Object.entries(window.taskManager.companyCache).forEach(([id, name]) => {
                    if (!window.companyCache[id]) {
                        window.companyCache[id] = {name: name, id: id, from_taskmanager: true};
                    }
                });
                const myId = window.taskManager?.myCompany?.id || window.taskManager?.userData?.companyId;
                if (myId && window.companyCache[myId]) {
                    window.companyCache[myId].is_my_company = true;
                }
            }

            try {
                const cachedCompanies = localStorage.getItem('companies_cache');
                if (cachedCompanies) {
                    const parsed = JSON.parse(cachedCompanies);
                    Object.entries(parsed).forEach(([id, data]) => {
                        if (!window.companyCache[id]) {
                            window.companyCache[id] = typeof data === 'string'
                                ? {name: data, id: id}
                                : data;
                        }
                    });
                }
            } catch (e) {
            }

            const userData = window.taskManager?.userData;
            if (userData) {
                const myCompanyId = userData.companyId || userData.company_id;
                if (myCompanyId && !window.companyCache[myCompanyId]) {
                    window.companyCache[myCompanyId] = {
                        name: userData.companyName || userData.company_name,
                        id: myCompanyId,
                        is_my_company: true
                    };
                }
            }

            this.updateCompanySelect();
        } catch (e) {
            console.error('❌ loadCompaniesFromLocal xətası:', e);
        }
    },

    updateCompanySelect: function () {
        const companySelect = document.getElementById('editCompany');
        if (!companySelect) return;

        let options = '<option value="">Şirkət seçin...</option>';

        if (window.companyCache && Object.keys(window.companyCache).length > 0) {
            const myCompanyEntries = [];
            const otherEntries = [];

            Object.entries(window.companyCache).forEach(([companyId, companyData]) => {
                if (!companyData) return;
                let companyName = typeof companyData === 'object'
                    ? (companyData.name || companyData.company_name || `Şirkət ${companyId}`)
                    : companyData;
                const isMyCompany = typeof companyData === 'object' && companyData.is_my_company === true;
                (isMyCompany ? myCompanyEntries : otherEntries).push({id: companyId, name: companyName, isMyCompany});
            });

            myCompanyEntries.forEach(e => {
                options += `<option value="${e.id}">${this.escapeHtml(e.name)}</option>`;
            });
            otherEntries.forEach(e => {
                options += `<option value="${e.id}">🏢 ${this.escapeHtml(e.name)}</option>`;
            });
        } else {
            options += '<option value="" disabled>Şirkət tapılmadı</option>';
        }

        companySelect.innerHTML = options;
    },

    _getCompanyNameById: function (companyId) {
        if (!companyId) return null;

        if (window.companyCache && window.companyCache[companyId]) {
            const d = window.companyCache[companyId];
            return typeof d === 'object' ? (d.name || d.company_name) : d;
        }

        if (window.taskManager?.companyCache?.[companyId]) {
            return window.taskManager.companyCache[companyId];
        }

        if (window.taskManager?.subsidiaryCompanies) {
            const found = window.taskManager.subsidiaryCompanies.find(c => String(c.id) === String(companyId));
            if (found) return found.company_name;
        }

        if (window.taskManager?.myCompany && String(window.taskManager.myCompany.id) === String(companyId)) {
            return window.taskManager.myCompany.company_name;
        }

        return null;
    },

    // ==================== VAXT FORMATLAYICISI ====================
    formatSeconds: function (seconds) {
        if (!seconds || seconds < 0) return '0s';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}s ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    },

    // ==================== SAATI GÜNCƏLLƏ ====================
    startTimeTimer: function () {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            this.currentTaskElapsedTime++;
            const timerEl = document.getElementById('currentTimeDisplay');
            if (timerEl) {
                timerEl.textContent = this.formatSeconds(this.currentTaskElapsedTime);
            }
        }, 1000);
    },

    stopTimeTimer: function () {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    showEditModal: function (task, taskType, taskId) {
        const oldModal = document.getElementById('taskEditModalOverlay');
        if (oldModal) oldModal.remove();

        const realCompanyId = task.company_id;
        const realCompanyName = task.company_name || this._getCompanyNameById(realCompanyId) || `Şirkət ID: ${realCompanyId}`;

        console.log(`🏢 Task ${taskId} üçün əsl sahib şirkət:`);
        console.log(`   company_id: ${realCompanyId}`);
        console.log(`   company_name: ${realCompanyName}`);

        const selectedViewableId = task.viewable_company_id;
        let selectedViewableName = task.viewable_company_name;

        console.log(`🎯 Edit modal: Task ${taskId} üçün görünən şirkət:`);
        console.log(`   viewable_company_id: ${selectedViewableId}`);
        console.log(`   viewable_company_name: ${selectedViewableName}`);
        console.log(`   is_company_viewable: ${task.is_company_viewable}`);

        // ========== ŞİRKƏT SİYAHISINI HAZIRLA ==========
        let companyOptions = '<option value="">Şirkət seçin...</option>';
        let selectedOptionHtml = '';

        if (window.companyCache && Object.keys(window.companyCache).length > 0) {
            const myCompanyEntries = [];
            const otherEntries = [];

            Object.entries(window.companyCache).forEach(([companyId, companyData]) => {
                if (!companyData) return;
                let companyName = typeof companyData === 'object'
                    ? (companyData.name || companyData.company_name || `Şirkət ${companyId}`)
                    : companyData;
                const isMyCompany = typeof companyData === 'object' && companyData.is_my_company === true;

                if (isMyCompany) {
                    myCompanyEntries.push({ id: companyId, name: companyName, isMyCompany: true });
                } else {
                    otherEntries.push({ id: companyId, name: companyName, isMyCompany: false });
                }
            });

            let selectedEntry = null;
            selectedEntry = otherEntries.find(entry => String(entry.id) === String(selectedViewableId));
            if (!selectedEntry) {
                selectedEntry = myCompanyEntries.find(entry => String(entry.id) === String(selectedViewableId));
            }

            if (selectedEntry) {
                const icon = selectedEntry.isMyCompany ? '' : '🏢 ';
                selectedOptionHtml = `<option value="${selectedEntry.id}" selected>${icon}${this.escapeHtml(selectedEntry.name)} ✓</option>`;
                console.log(`✅ Seçilmiş görünən şirkət tapıldı: ${selectedEntry.name} (ID: ${selectedEntry.id})`);
            } else if (selectedViewableId) {
                let fallbackName = selectedViewableName;
                if (!fallbackName) {
                    fallbackName = `Şirkət ID: ${selectedViewableId}`;
                }
                selectedOptionHtml = `<option value="${selectedViewableId}" selected>🏢 ${this.escapeHtml(fallbackName)} ✓</option>`;
            }

            myCompanyEntries.forEach(entry => {
                if (!selectedEntry || String(entry.id) !== String(selectedEntry.id)) {
                    companyOptions += `<option value="${entry.id}">${this.escapeHtml(entry.name)}</option>`;
                }
            });

            otherEntries.forEach(entry => {
                if (!selectedEntry || String(entry.id) !== String(selectedEntry.id)) {
                    companyOptions += `<option value="${entry.id}">🏢 ${this.escapeHtml(entry.name)}</option>`;
                }
            });

            if (selectedOptionHtml) {
                companyOptions = selectedOptionHtml + companyOptions;
            }
        }

        // 🕐 CARI VAXT MƏLUMATLARI
        const totalSeconds = task.total_elapsed_seconds || 0;
        const pausedSeconds = task.total_paused_seconds || 0;
        const totalElapsedFormatted = this.formatSeconds(totalSeconds);

        const modalHTML = `
            <div class="task-edit-modal-overlay" id="taskEditModalOverlay">
                <div class="task-edit-modal">
                    <div class="modal-header">
                        <h3><i class="fa-solid fa-edit"></i> Task Redaktəsi</h3>
                        <button class="close-btn" onclick="TaskEditModule.closeEditModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="task-info-header">
                            <span class="task-type-badge ${taskType}">
                                ${taskType === 'external' ? '🌐 Xarici Task' : '🏢 Daxili Task'}
                            </span>
                            <span class="task-id">ID: ${taskId}</span>
                        </div>
                        
                        <form id="taskEditForm">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="editTaskTitle">Task Başlığı:</label>
                                    <input type="text" id="editTaskTitle" class="form-control" 
                                           value="${this.escapeHtml(task.task_title || task.title || '')}" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editTaskDescription">Açıqlama:</label>
                                    <textarea id="editTaskDescription" class="form-control" rows="3">${this.escapeHtml(task.task_description || task.description || '')}</textarea>
                                </div>
                                
                                <div class="form-group" id="notesFormGroup">
                                    <label for="editTaskNotes" id="notesLabel">
                                        <i class="fa-solid fa-pen"></i> Qeydlər:
                                        <span id="notesRequiredWarning" style="display:none; color:#dc2626; font-size:12px; margin-left:8px;">
                                            <i class="fa-solid fa-circle-exclamation"></i> Mütləq qeyd əlavə edin!
                                        </span>
                                    </label>
                                    <textarea id="editTaskNotes" class="form-control" rows="3" 
                                              placeholder="Qeydlər...${this.hasManualTimeAdded ? ' (Manual vaxt əlavə edilib, qeyd yazmağınız mütləqdir!)' : ''}"
                                              style="${this.hasManualTimeAdded ? 'border:2px solid #dc2626; background:#fef2f2;' : ''}">${this.escapeHtml(task.notes || '')}</textarea>
                                    <small id="notesHelpText" style="display:${this.hasManualTimeAdded ? 'block' : 'none'}; color:#dc2626; font-size:11px; margin-top:5px;">
                                        <i class="fa-solid fa-info-circle"></i> ⚠️ Manual vaxt əlavə etdiyiniz üçün bu sahəyə qeyd yazmağınız MÜTLƏQDİR!
                                    </small>
                                </div>

                                <!-- 🕐 VAXT BÖLMƏSİ -->
                                <div class="form-group timer-section">
                                    <label><i class="fa-solid fa-clock"></i> İşlənmiş Vaxt</label>
                                    <div class="timer-display">
                                        <div class="timer-item">
                                            <span class="timer-label">Cari Vaxt:</span>
                                            <span class="timer-value" id="currentTimeDisplay">${totalElapsedFormatted}</span>
                                        </div>
                                        <div class="timer-item">
                                            <span class="timer-label">Pauzada:</span>
                                            <span class="timer-value">${this.formatSeconds(pausedSeconds)}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- MANUAL SAAT ƏLAVƏ ET -->
                                <div class="form-group manual-time-section">
                                    <label><i class="fa-solid fa-plus-circle"></i> Əl ilə Saat Əlavə Et</label>
                                    <div class="manual-time-input">
                                        <div class="time-inputs">
                                            <div class="time-input-group">
                                                <label for="addHours">Saat:</label>
                                                <input type="number" id="addHours" class="form-control" min="0" max="23" value="0" placeholder="0">
                                            </div>
                                            <div class="time-input-group">
                                                <label for="addMinutes">Dəqiqə:</label>
                                                <input type="number" id="addMinutes" class="form-control" min="0" max="59" value="0" placeholder="0">
                                            </div>
                                            <div class="time-input-group">
                                                <label for="addSeconds">Saniyə:</label>
                                                <input type="number" id="addSeconds" class="form-control" min="0" max="59" value="0" placeholder="0">
                                            </div>
                                        </div>
                                        <button type="button" class="btn btn-add-time" onclick="TaskEditModule.addManualTime()">
                                            <i class="fa-solid fa-plus"></i> Əlavə Et
                                        </button>
                                    </div>
                                    <small style="color:#6c757d;display:block;margin-top:8px;">
                                        <i class="fa-solid fa-info-circle"></i> Daxil etdiyiniz vaxt cari vaxtla toplanacaq
                                    </small>
                                </div>
                                
                                <!-- 🔥 GİZLİ SAHİB ŞİRKƏTİ (company_id) -->
                                <input type="hidden" id="editRealCompanyId" value="${realCompanyId}">
                                
                                <div class="form-group">
                                    <label for="editCompany">
                                        <i class="fa-solid fa-building"></i> Görünən Şirkət:
                                    </label>
                                    <select id="editCompany" class="form-control">
                                        ${companyOptions}
                                    </select>
                                    <small style="color:#6c757d;display:block;margin-top:5px;">
                                        <i class="fa-solid fa-info-circle"></i> 
                                        Task bu şirkətə görünəcək (Əsl sahib: <strong>${this.escapeHtml(realCompanyName)}</strong>)
                                    </small>
                                </div>
                                
                                <!-- Görünmə Ayarları -->
                                <div class="form-group viewable-company-section" style="margin-top:15px;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;">
                                    <label style="font-weight:600;color:#2c3e50;margin-bottom:10px;display:block;">
                                        <i class="fa-solid fa-eye"></i> Görünmə Ayarları
                                    </label>
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <input type="checkbox" id="editIsCompanyViewable" class="form-check-input" 
                                               ${task.is_company_viewable ? 'checked' : ''} style="width:18px;height:18px;">
                                        <label for="editIsCompanyViewable" style="margin:0;cursor:pointer;">
                                            Başqa şirkətlərə görünsün
                                        </label>
                                    </div>
                                    <div id="viewableCompanyInfo" style="margin-top:10px;font-size:12px;color:#6c757d;">
                                        <i class="fa-solid fa-info-circle"></i> 
                                        Task yalnız seçilmiş şirkət tərəfindən görünəcək
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editDueDate">Son Tarix:</label>
                                        <input type="date" id="editDueDate" class="form-control" 
                                               value="${task.due_date ? task.due_date.split('T')[0] : ''}">
                                    </div>
                                    <div class="form-group">
                                        <label for="editPriority">Prioritet:</label>
                                        <select id="editPriority" class="form-control">
                                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Aşağı</option>
                                            <option value="medium" ${(!task.priority || task.priority === 'medium') ? 'selected' : ''}>Orta</option>
                                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Yüksək</option> 
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editStatus">Status:</label>
                                        <select id="editStatus" class="form-control">
                                            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Gözləyir</option>
                                            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>İşlənir</option>
                                            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                                            <option value="rejected" ${task.status === 'rejected' ? 'selected' : ''}>İmtina edildi</option>
                                            <option value="cancelled" ${task.status === 'cancelled' ? 'selected' : ''}>Ləğv edildi</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="editProgress">Proqress (%):</label>
                                        <div class="progress-container">
                                            <input type="range" id="editProgress" class="form-control-range" 
                                                   min="0" max="100" step="5"
                                                   value="${task.progress_percentage || 0}">
                                            <span id="progressValue" class="progress-value">${task.progress_percentage || 0}%</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="task-details-section">
                                    <div class="detail-item">
                                        <span class="detail-label">Yaradan:</span>
                                        <span class="detail-value">${this.escapeHtml(task.creator_name || task.created_by_name || 'Bilinmir')}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Təyin edilib:</span>
                                        <span class="detail-value">${this.escapeHtml(task.assigned_to_name || 'Təyin edilməyib')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <input type="hidden" id="editTaskId" value="${taskId}">
                                <input type="hidden" id="editTaskType" value="${taskType}">
                                <input type="hidden" id="editTotalSeconds" value="${totalSeconds}">
                                
                                <button type="button" class="btn btn-primary" onclick="TaskEditModule.saveTaskEdit()">
                                    <i class="fa-solid fa-save"></i> Yadda Saxla
                                </button>
                                <button type="button" class="btn btn-secondary" onclick="TaskEditModule.closeEditModal()">
                                    <i class="fa-solid fa-times"></i> Ləğv et
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Timer başlat
        this.startTimeTimer();

        // Event listeners
        const isViewableCheckbox = document.getElementById('editIsCompanyViewable');
        if (isViewableCheckbox) {
            isViewableCheckbox.addEventListener('change', function () {
                const infoDiv = document.getElementById('viewableCompanyInfo');
                if (infoDiv) {
                    if (this.checked) {
                        infoDiv.innerHTML = '<i class="fa-solid fa-info-circle"></i> Task seçilmiş şirkət tərəfindən görünəcək';
                    } else {
                        infoDiv.innerHTML = '<i class="fa-solid fa-info-circle"></i> Task yalnız öz şirkətiniz tərəfindən görünəcək';
                    }
                }
            });
        }

        const progressSlider = document.getElementById('editProgress');
        const progressValue = document.getElementById('progressValue');
        if (progressSlider && progressValue) {
            progressSlider.addEventListener('input', function () {
                progressValue.textContent = this.value + '%';
            });
        }
    },


    // ==================== MANUAL SAAT ƏLAVƏ ET ====================
    addManualTime: async function () {
        const hoursEl = document.getElementById('addHours');
        const minutesEl = document.getElementById('addMinutes');
        const secondsEl = document.getElementById('addSeconds');
        const taskId = document.getElementById('editTaskId')?.value;

        if (!taskId) {
            alert('❌ Task ID tapılmadı!');
            return;
        }

        const hours = parseInt(hoursEl?.value || 0);
        const minutes = parseInt(minutesEl?.value || 0);
        const seconds = parseInt(secondsEl?.value || 0);

        if (hours === 0 && minutes === 0 && seconds === 0) {
            alert('⚠️ Zəhmət olmasa saat, dəqiqə və ya saniyə daxil edin!');
            return;
        }

        const totalSecondsToAdd = (hours * 3600) + (minutes * 60) + seconds;



        // Loading göstər
        const addBtn = document.querySelector('.btn-add-time');
        const originalBtnText = addBtn?.innerHTML;
        if (addBtn) {
            addBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Əlavə edilir...';
            addBtn.disabled = true;
        }

        try {
            const response = await makeApiRequest(`/tasks/${taskId}/add-manual-time`, 'POST', {
                added_seconds: totalSecondsToAdd,
                reason: reason.trim()
            });

            if (response && !response.error) {
                // UI yenilə
                this.currentTaskElapsedTime = response.new_total_seconds;
                const timerEl = document.getElementById('currentTimeDisplay');
                if (timerEl) {
                    timerEl.textContent = this.formatSeconds(this.currentTaskElapsedTime);
                }

                // hidden input yenilə
                const editTotalSecondsInput = document.getElementById('editTotalSeconds');
                if (editTotalSecondsInput) {
                    editTotalSecondsInput.value = response.new_total_seconds;
                }

                // Input-ları sıfırla
                hoursEl.value = 0;
                minutesEl.value = 0;
                secondsEl.value = 0;

                // 🔥🔥🔥 MANUAL VAXT ƏLAVƏ OLUNDUĞUNU İŞARƏLƏ
                this.hasManualTimeAdded = true;

                // 🔥 QEYDLƏR SAHƏSİNİ QIRMIZI RƏNGƏ BOYAN VƏ XƏBƏRDARLIQ GÖSTƏR
                this.highlightNotesField(true);

                alert(`✅ ${response.added_hours} saat əlavə edildi!\n📊 Ümumi vaxt: ${response.new_actual_hours} saat\n📝 Xahiş olunur aşağıdakı Qeydlər sahəsinə əlavə etdiyiniz vaxtla bağlı izahat yazasınız!`);

            } else {
                throw new Error(response?.detail || response?.error || 'Əlavə alınmadı');
            }

        } catch (error) {
            console.error('❌ Manual vaxt əlavə xətası:', error);
            alert('❌ Xəta: ' + error.message);
        } finally {
            if (addBtn) {
                addBtn.innerHTML = originalBtnText;
                addBtn.disabled = false;
            }
        }
    },

    // 🔥 YENİ FUNKSİYA: Qeydlər sahəsini vurğula
    highlightNotesField: function(highlight) {
        const notesTextarea = document.getElementById('editTaskNotes');
        const notesFormGroup = document.getElementById('notesFormGroup');
        const notesHelpText = document.getElementById('notesHelpText');
        const notesRequiredWarning = document.getElementById('notesRequiredWarning');

        if (highlight) {
            if (notesTextarea) {
                notesTextarea.style.border = '2px solid #dc2626';
                notesTextarea.style.backgroundColor = '#fef2f2';
                notesTextarea.placeholder = '⚠️ Mütləq qeyd yazın! Manual vaxt əlavə edildi.';
            }
            if (notesFormGroup) {
                notesFormGroup.classList.add('required-field');
            }
            if (notesHelpText) {
                notesHelpText.style.display = 'block';
            }
            if (notesRequiredWarning) {
                notesRequiredWarning.style.display = 'inline-block';
            }
        } else {
            if (notesTextarea) {
                notesTextarea.style.border = '';
                notesTextarea.style.backgroundColor = '';
                notesTextarea.placeholder = 'Qeydlər...';
            }
            if (notesHelpText) {
                notesHelpText.style.display = 'none';
            }
            if (notesRequiredWarning) {
                notesRequiredWarning.style.display = 'none';
            }
        }
    },

    // 🔥 QEYDLƏRİ YOXLA (saveTaskEdit-dən əvvəl çağır)
    validateNotesBeforeSave: function() {
        if (this.hasManualTimeAdded) {
            const notesValue = document.getElementById('editTaskNotes')?.value || '';
            if (!notesValue.trim()) {
                alert('⚠️ Manual vaxt əlavə etdiyiniz üçün Qeydlər sahəsini doldurmağınız MÜTLƏQDİR!\n\nZəhmət olmasa əlavə etdiyiniz vaxtla bağlı izahat yazın.');

                // Qırmızı rəngi daha da vurğula
                const notesTextarea = document.getElementById('editTaskNotes');
                if (notesTextarea) {
                    notesTextarea.style.border = '3px solid #dc2626';
                    notesTextarea.style.backgroundColor = '#fee2e2';
                    notesTextarea.focus();
                }
                return false;
            }
        }
        return true;
    },



    closeEditModal: function () {
        this.stopTimeTimer();
        // 🔥 Manual vaxt flag-ini sıfırla
        this.hasManualTimeAdded = false;
        const modal = document.getElementById('taskEditModalOverlay');
        if (modal) modal.remove();
    },

    // taskEditModule.js - saveTaskEdit funksiyasının TAM DÜZƏLDİLMİŞ VERSİYASI

    saveTaskEdit: async function() {
        console.log('🔍 saveTaskEdit ÇAĞIRILDI!');

        // 🔥 QEYDLƏRİ YOXLA (manual vaxt əlavə olunubsa)
        if (!this.validateNotesBeforeSave()) {
            return;
        }

        try {
            const taskId = document.getElementById('editTaskId')?.value;
            if (!taskId) { alert('Task ID tapılmadı!'); return; }

            const titleEl = document.getElementById('editTaskTitle');
            const descEl = document.getElementById('editTaskDescription');
            const notesEl = document.getElementById('editTaskNotes');
            const companyEl = document.getElementById('editCompany');
            const dueDateEl = document.getElementById('editDueDate');
            const priorityEl = document.getElementById('editPriority');
            const statusEl = document.getElementById('editStatus');
            const progressEl = document.getElementById('editProgress');

            if (!titleEl?.value) { alert('❌ Task başlığı boş ola bilməz!'); return; }

            // ========== 🔥 COMPANY ID - MÜTLƏQ TOKEN-DAN AL! ==========
            let finalCompanyId = null;
            let finalCompanyName = null;

            // 1. TOKEN-dan yoxla (ƏN ETİBARLISI)
            const token = localStorage.getItem('guven_token') || localStorage.getItem('access_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.company_id) {
                        finalCompanyId = payload.company_id;
                        finalCompanyName = payload.company_name || null;
                        console.log('✅ company_id TOKEN-dan alındı:', finalCompanyId);
                    }
                } catch(e) {
                    console.warn('⚠️ Token parse xətası:', e);
                }
            }

            // 2. TaskManager-dan yoxla
            if (!finalCompanyId && window.taskManager?.userData) {
                finalCompanyId = window.taskManager.userData.companyId ||
                                window.taskManager.userData.company_id;
                finalCompanyName = window.taskManager.userData.companyName ||
                                  window.taskManager.userData.company_name;
                console.log('✅ company_id taskManager-dan alındı:', finalCompanyId);
            }

            // 3. Cari task-dan yoxla
            if (!finalCompanyId) {
                const currentTaskCheck = await makeApiRequest(`/tasks/${taskId}`, 'GET');
                const taskCheck = currentTaskCheck.data || currentTaskCheck;
                if (taskCheck && taskCheck.company_id) {
                    finalCompanyId = taskCheck.company_id;
                    finalCompanyName = taskCheck.company_name;
                    console.log('✅ company_id current task-dan alındı:', finalCompanyId);
                }
            }

            if (!finalCompanyId) {
                console.error('❌ Company ID TAPILMADI!');
                alert('❌ Şirkət məlumatları tapılmadı. Səhifəni yeniləyin.');
            }

            // ========== CARİ TASK MƏLUMATLARI ==========
            const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET');
            const currentTask = taskResponse.data || taskResponse;  // ← BU taskDetails əvəzinə istifadə olunacaq
            const oldStatus = currentTask.status;
            const newStatus = statusEl?.value || 'pending';

            // Vaxt məlumatları
            const originalTotalSeconds = currentTask.total_elapsed_seconds || 0;
            const originalActualHours = currentTask.actual_hours || 0;
            const currentManualSeconds = currentTask.manual_added_seconds || 0;
            const currentUITotalSeconds = this.currentTaskElapsedTime;

            console.log('📊 Vaxt məlumatları:', {
                originalTotalSeconds,
                originalActualHours,
                currentManualSeconds,
                currentUITotalSeconds
            });

            // Görünən şirkət
            const selectedViewableId = companyEl?.value || '';
            const finalViewableCompanyId = selectedViewableId ? parseInt(selectedViewableId) : null;
            let finalViewableCompanyName = null;
            if (finalViewableCompanyId) {
                finalViewableCompanyName = this._getCompanyNameById(finalViewableCompanyId);
            }
            const finalIsViewable = !!finalViewableCompanyId;

            // Notes və vaxt dəyişikliyi
            let finalNotes = notesEl?.value || '';
            const timeDifference = currentUITotalSeconds - originalTotalSeconds;
            const userName = window.taskManager?.userData?.name || window.taskManager?.userData?.ceo_name || 'İstifadəçi';
            const userId = window.taskManager?.userData?.id;

            if (Math.abs(timeDifference) > 0) {
                const diffHours = (timeDifference / 3600).toFixed(2);
                const sign = timeDifference > 0 ? '+' : '';
                const action = timeDifference > 0 ? 'əlavə edildi' : 'çıxarıldı';
                const timeChangeNote = `\n[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən vaxt dəyişdirildi: ${this.formatSeconds(originalTotalSeconds)} → ${this.formatSeconds(currentUITotalSeconds)} (${sign}${diffHours} saat ${action})`;
                finalNotes = finalNotes ? finalNotes + timeChangeNote : timeChangeNote;
            }

            if (newStatus === 'rejected') {
                const rejectNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən imtina edildi`;
                finalNotes = finalNotes ? `${finalNotes}\n\n---\n${rejectNote}` : rejectNote;
            }

            let priorityValue = priorityEl?.value || 'medium';
            if (priorityValue === 'critical') priorityValue = 'high';

            // ========== UPDATE DATA ==========
            const updateData = {
                task_title: titleEl?.value || '',
                task_description: descEl?.value || '',
                notes: finalNotes,
                company_id: finalCompanyId,
                viewable_company_id: finalViewableCompanyId,
                is_company_viewable: finalIsViewable,
                due_date: dueDateEl?.value || null,
                priority: priorityValue,
                status: newStatus,
                progress_percentage: parseInt(progressEl?.value) || 0,
                total_elapsed_seconds: currentUITotalSeconds,
                actual_hours: parseFloat((currentUITotalSeconds / 3600).toFixed(2))
            };

            if (currentUITotalSeconds > originalTotalSeconds) {
                const newManualSeconds = currentManualSeconds + (currentUITotalSeconds - originalTotalSeconds);
                updateData.manual_added_seconds = newManualSeconds;
                updateData.manual_added_hours = parseFloat((newManualSeconds / 3600).toFixed(2));
                updateData.last_manual_added_by = userId;
                updateData.last_manual_added_by_name = userName;
                updateData.last_manual_added_at = new Date().toISOString();
            }

            console.log('📦 Update data:', updateData);

            // ========== API SORĞUSU ==========
            const response = await makeApiRequest(`/tasks/${taskId}`, 'PATCH', updateData);
            console.log('📥 Server response:', response);

            if (response && !response.error) {
                const taskTitle = titleEl?.value || `Task ${taskId}`;

                // Telegram bildirişləri
                if (oldStatus !== newStatus) {
                    setTimeout(() => {
                        window.TelegramHelper?.notifyStatusChanged?.(currentTask, oldStatus, newStatus, { name: userName, userId });
                    }, 100);
                }

                if (newStatus === 'completed') {
                    setTimeout(() => {
                        window.TelegramHelper?.notifyTaskCompleted?.(currentTask, { name: userName, userId });
                    }, 200);
                }

                // ========== TASK TAMAMLANDIQDA ARXİVƏ KÖÇÜR ==========
                if (newStatus === 'completed') {
                    console.log('✅ Task tamamlandı, arxivləşdirilir...');

                    // 🔥 currentTask istifadə et (taskDetails əvəzinə)
                    let freshTask = currentTask;
                    try {
                        const freshTaskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET');
                        freshTask = freshTaskResponse.data || freshTaskResponse;
                    } catch (err) {
                        console.warn('⚠️ Təzə task məlumatları alınmadı');
                    }

                    // 🔥 ARCHIVE DATA
                    const archiveData = {
                        original_task_id: parseInt(taskId),
                        task_code: currentTask.task_code || `TASK-${taskId}`,
                        task_title: currentTask.task_title || taskTitle,
                        task_description: currentTask.task_description || '',
                        assigned_to: currentTask.assigned_to || null,
                        assigned_by: currentTask.assigned_by || currentTask.created_by || null,
                        company_id: finalCompanyId,
                        company_name: finalCompanyName || currentTask.company_name || '',
                        department_id: currentTask.department_id || null,
                        priority: currentTask.priority || 'medium',
                        status: 'completed',
                        due_date: currentTask.due_date || null,
                        completed_date: new Date().toISOString().split('T')[0],
                        estimated_hours: parseFloat(currentTask.estimated_hours) || 0,
                        actual_hours: parseFloat(freshTask.actual_hours) || parseFloat(currentUITotalSeconds / 3600) || 0,
                        work_type_id: currentTask.work_type_id || null,
                        progress_percentage: 100,
                        is_billable: currentTask.is_billable === true,
                        billing_rate: parseFloat(currentTask.billing_rate) || 0,
                        tags: currentTask.tags || null,
                        created_by: currentTask.created_by ? parseInt(currentTask.created_by) : null,
                        creator_name: currentTask.creator_name || userName,
                        started_date: currentTask.started_date || null,
                        archive_reason: 'Tamamlandığı üçün arxivləndi',
                        total_elapsed_seconds: parseInt(freshTask.total_elapsed_seconds) || parseInt(currentUITotalSeconds) || 0,
                        total_paused_seconds: parseInt(freshTask.total_paused_seconds) || 0,
                        manual_added_seconds: parseInt(freshTask.manual_added_seconds) || 0,
                        manual_added_hours: parseFloat(freshTask.manual_added_hours) || 0,
                        manual_time_history: freshTask.manual_time_history || '[]',
                        last_manual_added_by: freshTask.last_manual_added_by || null,
                        last_manual_added_by_name: freshTask.last_manual_added_by_name || null,
                        last_manual_added_at: freshTask.last_manual_added_at || null,
                        notes: finalNotes || ''
                    };

                    // NULL dəyərləri sil
                    Object.keys(archiveData).forEach(key => {
                        if (archiveData[key] === null || archiveData[key] === undefined) {
                            delete archiveData[key];
                        }
                    });

                    console.log('📦 ArchiveData company_id:', archiveData.company_id);

                    if (archiveData.company_id) {
                        try {
                            const archiveResponse = await makeApiRequest('/task-archive/archive', 'POST', archiveData);
                            console.log('✅ Task arxivə köçürüldü:', archiveResponse);
                        } catch (archiveError) {
                            console.error('❌ Arxivə köçürmə xətası:', archiveError);
                        }
                    } else {
                        console.error('❌ company_id olmadan arxivləşmə MÜMKÜN DEYİL!');
                    }
                }

                // ========== BAŞARI MESAJI ==========
                const finalHours = (currentUITotalSeconds / 3600).toFixed(2);
                alert(`✅ Task uğurla yeniləndi!\n🕐 İşlənmiş vaxt: ${finalHours} saat`);

                // ========== TƏMİZLƏMƏ VƏ YENİLƏMƏ ==========
                this.closeEditModal();
                this.stopTimeTimer();

                if (window.TaskCache) window.TaskCache.clear();
                if (window.taskManager) {
                    await window.taskManager.loadActiveTasks(1, true);
                    await window.taskManager.loadExternalTasks();
                    if (window.taskManager.loadArchiveTasks) {
                        await window.taskManager.loadArchiveTasks();
                    }
                }

            } else {
                throw new Error(response?.detail || response?.error || 'Task yenilənə bilmədi');
            }

        } catch(error) {
            console.error('❌ saveTaskEdit xətası:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    sendCompletionNotification: async function (taskId, taskTitle, completedBy) {
        try {
            const currentUser = window.taskManager?.userData;
            const userId = currentUser?.id || currentUser?.userId || 79;

            let creatorId = null;
            try {
                const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, {silent: true});
                if (taskResponse && !taskResponse.error) {
                    const task = taskResponse.data || taskResponse;
                    creatorId = task.created_by || task.creator_id;
                }
            } catch (_) {
            }

            const targetUserId = creatorId || userId;

            const completionData = {
                user_id: parseInt(targetUserId),
                task_id: parseInt(taskId),
                task_title: taskTitle || `Task ${taskId}`,
                action: 'completed',
                completed_by: completedBy || currentUser?.name || currentUser?.ceo_name || 'İstifadəçi',
                completed_date: new Date().toISOString().split('T')[0],
                message_type: 'task_completed'
            };

            const response = await makeApiRequest('/telegram/send-notification', 'POST', completionData);
            return response && !response.error ? {success: true} : {success: false};

        } catch (error) {
            console.error('❌ Telegram tamamlanma bildiriş xətası:', error);
            return {success: false, error: error.message};
        }
    },

    sendTelegramNotification: async function (taskId, taskTitle, userId, action) {
        try {
            if (!userId) {
                const u = window.taskManager?.userData;
                userId = u?.id || u?.userId || 79;
            }

            let taskDescription = '', priority = 'medium', dueDate = null;
            try {
                const tr = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, {silent: true});
                if (tr && !tr.error) {
                    const t = tr.data || tr;
                    taskDescription = t.task_description || '';
                    priority = t.priority || 'medium';
                    dueDate = t.due_date || null;
                }
            } catch (_) {
            }

            const notificationData = {
                task_id: parseInt(taskId),
                task_title: taskTitle || `Task ${taskId}`,
                user_id: parseInt(userId),
                action: action || 'updated',
                task_description: taskDescription,
                priority,
                due_date: dueDate
            };

            const response = await makeApiRequest('/telegram/send-notification', 'POST', notificationData);
            return response && !response.error ? {success: true} : {success: false};

        } catch (error) {
            console.error('❌ Telegram bildiriş xətası:', error);
            return {success: false, error: error.message};
        }
    },

    rejectTask: async function (taskId, taskType = 'active') {
        try {
            const reason = prompt('❌ İmtina səbəbini yazın:');
            if (!reason?.trim()) {
                alert('❌ İmtina səbəbi məcburidir!');
                return;
            }
            if (!confirm(`Bu işi imtina etmək istədiyinizə əminsiniz?\nSəbəb: ${reason}`)) return;

            const currentUser = window.taskManager?.userData;
            const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET');
            const task = taskResponse.data || taskResponse;

            const response = await makeApiRequest(`/tasks/${taskId}/reject-and-restore`, 'PUT', {reason});

            if (response && !response.error) {
                await this.sendTelegramNotification(taskId, task.task_title || task.title, currentUser?.id, 'rejected');
                alert('✅ Task imtina edildi və "Gözləyir" statusuna keçdi!');
                if (window.TaskCache) window.TaskCache.clearTasks();
                setTimeout(() => {
                    window.taskManager?.loadActiveTasks();
                    window.taskManager?.loadExternalTasks();
                }, 500);
            } else {
                throw new Error(response?.detail || response?.error || 'Task imtina edilə bilmədi');
            }
        } catch (error) {
            console.error('❌ rejectTask xətası:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    cancelTask: async function (taskId, taskType = 'active') {
        try {
            const reason = prompt('🗑️ Ləğv etmə səbəbini yazın:');
            if (!reason?.trim()) {
                alert('❌ Ləğv etmə səbəbi məcburidir!');
                return;
            }
            if (!confirm(`Bu işi ləğv etmək istədiyinizə əminsiniz?\nSəbəb: ${reason}\n\n⚠️ Ləğv edilən task ARXİVƏ gedəcək!`)) return;

            const currentUser = window.taskManager?.userData;
            const userName = currentUser?.name || currentUser?.ceo_name || 'İstifadəçi';

            const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET');
            const task = taskResponse.data || taskResponse;
            const cancelNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən ləğv edildi. Səbəb: ${reason}`;
            const existingNotes = task.notes || '';

            const response = await makeApiRequest(`/tasks/${taskId}`, 'PATCH', {
                status: 'cancelled',
                notes: existingNotes ? `${existingNotes}\n\n---\n${cancelNote}` : cancelNote,
                completed_date: new Date().toISOString(),
                progress_percentage: 0
            });

            if (response && !response.error) {
                await this.sendTelegramNotification(taskId, task.task_title || task.title, currentUser?.id, 'cancelled');
                alert('✅ Task ləğv edildi!');
                if (window.TaskCache) window.TaskCache.clearTasks();
                setTimeout(() => {
                    window.taskManager?.loadActiveTasks();
                    window.taskManager?.loadExternalTasks();
                    window.taskManager?.loadArchiveTasks();
                }, 500);
            } else {
                throw new Error(response?.detail || 'Task ləğv edilə bilmədi');
            }
        } catch (error) {
            console.error('❌ cancelTask xətası:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    completeTask: async function (taskId, taskType = 'active') {
        try {
            const comment = prompt('✅ Tamamlanma comment-i əlavə edin (isteğe bağlı):', '');
            const currentUser = window.taskManager?.userData;
            const userName = currentUser?.name || currentUser?.ceo_name || 'İstifadəçi';

            let updatedNotes = '';
            if (comment) {
                const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET');
                const task = taskResponse.data || taskResponse;
                const completeNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən tamamlandı. Qeyd: ${comment}`;
                updatedNotes = task.notes ? `${task.notes}\n\n---\n${completeNote}` : completeNote;
            }

            const response = await makeApiRequest(`/tasks/${taskId}`, 'PATCH', {
                status: 'completed',
                completed_date: new Date().toISOString(),
                progress_percentage: 100,
                ...(updatedNotes ? {notes: updatedNotes} : {})
            });

            if (response && !response.error) {
                await this.sendCompletionNotification(taskId, response.data?.task_title || `Task ${taskId}`, userName);
                alert('✅ Task tamamlandı!');
                if (window.TaskCache) window.TaskCache.clearTasks();
                setTimeout(() => {
                    window.taskManager?.loadActiveTasks();
                    window.taskManager?.loadExternalTasks();
                    window.taskManager?.loadArchiveTasks();
                }, 1000);
            } else {
                throw new Error(response?.detail || 'Task tamamlandı edilə bilmədi');
            }
        } catch (error) {
            console.error('❌ completeTask xətası:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    // ==================== HELPER FUNCTIONS ====================
    formatDate: function (d) {
        if (!d) return '-';
        try {
            return new Date(d).toLocaleDateString('az-AZ');
        } catch (_) {
            return d;
        }
    },

    escapeHtml: function (text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    truncateText: function (text, length) {
        if (!text) return '';
        if (text.length <= length) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, length)) + '...';
    },

    calculateSalary: function (hourlyRate, durationMinutes) {
        if (!hourlyRate || !durationMinutes) return '0.00';
        return ((durationMinutes / 60) * parseFloat(hourlyRate)).toFixed(2);
    }
};

if (typeof TableManager !== 'undefined') {
    const origStart = TableManager.startTask;
    const origComplete = TableManager.completeTask;

    TableManager.startTaskWithNotification = async function (taskId, taskTitle) {
        try {
            if (origStart) await origStart.call(this, taskId);
            else await this.apiRequest(`/tasks/${taskId}/status`, 'PUT', {status: 'in_progress'});
            const u = window.taskManager?.userData;
            await TaskEditModule.sendTelegramNotification(taskId, taskTitle, u?.id, 'started');
            window.notificationService?.showSuccess?.(`"${taskTitle}" tapşırığına başlanıldı`);
        } catch (e) {
            if (origStart) await origStart.call(this, taskId);
        }
    };

    TableManager.completeTaskWithNotification = async function (taskId, taskTitle) {
        try {
            if (origComplete) await origComplete.call(this, taskId);
            else await this.apiRequest(`/tasks/${taskId}/status`, 'PUT', {status: 'completed'});
            const u = window.taskManager?.userData;
            await TaskEditModule.sendCompletionNotification(taskId, taskTitle, u?.name || u?.ceo_name || 'İstifadəçi');
            window.notificationService?.showSuccess?.(`"${taskTitle}" tapşırığı tamamlandı`);
            window.SoundManager?.playTaskCompleted?.();
            if (window.TaskCache) window.TaskCache.clearTasks();
            setTimeout(() => {
                window.taskManager?.loadActiveTasks();
                window.taskManager?.loadArchiveTasks?.();
            }, 500);
        } catch (e) {
            if (origComplete) await origComplete.call(this, taskId);
        }
    };
}

window.TaskEditModule = TaskEditModule;
console.log('✅ TaskEditModule yükləndi (SAATı GÖSTƏRƏN VERSİYA)');