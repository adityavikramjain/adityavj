document.addEventListener('DOMContentLoaded', () => {
    // Engagement tracking for contextual nudge
    const engagement = {
        downloads: 0,
        resourceViews: 0,
        threshold: 2, // Show nudge after this many interactions
        nudgeShown: false,
        nudgeDismissed: false
    };

    // Active filters state
    const activeFilters = {
        sessions: { program: 'all', function: 'all' },
        resources: { function: 'all' }
    };

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // Generate dynamic program filters from data
            generateProgramFilters(data.sessions);
            
            // Render content
            renderSessions(data.sessions);
            renderResources(data.resources);
            renderWritings(data.writings);
            
            // Initialize systems
            initializeFilters();
            initializeAccordion('sessions');
            initializeAccordion('resources');
            initializeNudgeSystem();
        })
        .catch(error => console.error('Error loading data:', error));

    // === GENERATE DYNAMIC PROGRAM FILTERS ===
    function generateProgramFilters(sessions) {
        const programs = new Set();
        sessions.forEach(session => {
            if (session.program) programs.add(session.program);
        });

        const container = document.getElementById('program-filters');
        if (!container) return;

        // Keep the "All Programs" button, add others
        programs.forEach(program => {
            const btn = document.createElement('button');
            btn.className = 'filter-button';
            btn.setAttribute('data-filter', program);
            btn.setAttribute('data-filter-type', 'program');
            btn.setAttribute('data-target', 'sessions');
            btn.textContent = program;
            container.appendChild(btn);
        });
    }

    // === RENDER SESSIONS ===
    function renderSessions(sessions) {
        const container = document.getElementById('sessions-grid');
        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<p class="empty-state">No sessions found.</p>';
            return;
        }

        // Sort: featured first, then by cohort (newest first)
        const sorted = [...sessions].sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return compareCohorts(b.cohort, a.cohort);
        });

        let html = '';
        sorted.forEach((session, index) => {
            const tags = session.tags || [];
            const tagsAttr = tags.join(',');
            const featuredClass = session.featured ? 'featured' : '';
            const desc = session.desc || 'Session materials and frameworks.';

            html += `
            <div class="session-card filterable-card ${featuredClass}" 
                 data-tags="${tagsAttr}" 
                 data-program="${session.program || ''}"
                 data-index="${index}">
                <div class="card-meta">
                    <span class="card-badge program">${session.program || 'Program'}</span>
                    <span class="card-cohort">${session.cohort || ''}</span>
                </div>
                <a href="${session.url}" target="_blank" class="card-title" onclick="trackDownload(event)">${session.title}</a>
                <p class="card-desc">${desc}</p>
                <div class="card-footer">
                    <span class="card-institution">${session.institution || ''}</span>
                    <span class="card-action">Open Deck →</span>
                </div>
            </div>`;
        });
        
        container.innerHTML = html;

        // Make entire card clickable
        container.querySelectorAll('.session-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.classList.contains('card-title')) return; // Let link handle it
                const link = this.querySelector('.card-title');
                if (link) {
                    trackDownload(e);
                    window.open(link.href, '_blank');
                }
            });
        });
    }

    // === RENDER RESOURCES ===
    function renderResources(resources) {
        const container = document.getElementById('resources-grid');
        const promptContainer = document.getElementById('prompt-storage-container');
        
        if (!resources || resources.length === 0) {
            container.innerHTML = '<p class="empty-state">No resources found.</p>';
            return;
        }

        // Sort: featured first
        const sorted = [...resources].sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return 0;
        });

        let html = '';
        let promptsHtml = '';

        sorted.forEach((res, index) => {
            const tags = res.tags || [];
            const tagsAttr = tags.join(',');
            const featuredClass = res.featured ? 'featured' : '';

            // Handle Workflow type
            if (res.type === 'Workflow' && res.steps) {
                html += renderWorkflow(res, tagsAttr);
            } else {
                // Regular Resource
                const icon = getResourceIcon(res.type);
                
                let dataAttrs = '';
                if (res.prompt_text && res.prompt_text.trim() !== '') {
                    const promptId = 'prompt-' + index;
                    promptsHtml += `<div id="${promptId}" class="prompt-storage">${escapeHtml(res.prompt_text)}</div>`;
                    dataAttrs = `data-modal="prompt" data-prompt-id="${promptId}" data-title="${escapeHtml(res.title)}" data-type="${res.type}"`;
                } else {
                    dataAttrs = `data-modal="gem" data-gem-link="${res.link}" data-title="${escapeHtml(res.title)}" data-type="${res.type}"`;
                }

                html += `
                <div class="resource-card filterable-card ${featuredClass}" ${dataAttrs} data-tags="${tagsAttr}">
                    <div class="resource-type"><span class="icon">${icon}</span> ${res.type}</div>
                    <div class="resource-title">${res.title}</div>
                    <p class="resource-desc">${res.desc || ''}</p>
                    <div class="resource-footer">View Details →</div>
                </div>`;
            }
        });

        container.innerHTML = html;
        promptContainer.innerHTML = promptsHtml;

        // Attach modal listeners
        attachModalListeners();
    }

    // === RENDER WORKFLOW ===
    function renderWorkflow(res, tagsAttr) {
        let stepsHtml = '';
        res.steps.forEach((step, stepIndex) => {
            stepsHtml += `
                <a href="${step.link}" target="_blank" class="workflow-step" onclick="trackResourceView()">
                    <div class="step-number">${step.step_number}</div>
                    <div class="step-title">${step.title}</div>
                    <div class="step-desc">${step.desc}</div>
                </a>`;
            
            if (stepIndex < res.steps.length - 1) {
                stepsHtml += `<div class="workflow-arrow">→</div>`;
            }
        });

        return `
        <div class="workflow-card filterable-card" data-tags="${tagsAttr}">
            <div class="workflow-header">
                <div class="workflow-type"><span class="icon">🔗</span> Workflow</div>
                <div class="workflow-title">${res.workflow_title}</div>
                <p class="workflow-desc">${res.workflow_desc}</p>
            </div>
            <div class="workflow-steps">${stepsHtml}</div>
        </div>`;
    }

    // === RENDER WRITINGS ===
    function renderWritings(writings) {
        const section = document.getElementById('writings');
        const container = document.getElementById('writings-grid');
        
        if (!writings || writings.length === 0) {
            if (section) section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        
        let html = '';
        writings.forEach(post => {
            html += `
            <div class="session-card">
                <div class="card-meta">
                    <span class="card-badge">${post.date || 'Article'}</span>
                </div>
                <a href="${post.link}" target="_blank" class="card-title">${post.title}</a>
                <p class="card-desc">${post.excerpt || ''}</p>
                <div class="card-footer">
                    <span class="card-institution"></span>
                    <span class="card-action">Read Article →</span>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    }

    // === MODAL SYSTEM ===
    function attachModalListeners() {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalType = document.getElementById('modal-type');
        const modalBody = document.getElementById('modal-body');
        const modalFooter = document.getElementById('modal-footer');
        const modalClose = document.querySelector('.modal-close');
        
        document.querySelectorAll('.resource-card[data-modal]').forEach(card => {
            card.addEventListener('click', function(e) {
                e.preventDefault();
                
                const modalKind = this.getAttribute('data-modal');
                const title = this.getAttribute('data-title');
                const type = this.getAttribute('data-type');

                modalTitle.textContent = title;
                modalType.textContent = type;

                if (modalKind === 'prompt') {
                    const promptId = this.getAttribute('data-prompt-id');
                    const promptDiv = document.getElementById(promptId);
                    const promptText = promptDiv ? promptDiv.textContent : '';
                    
                    modalBody.innerHTML = '<pre>' + escapeHtml(promptText) + '</pre>';

                    modalFooter.innerHTML = `
                        <button class="copy-button" onclick="copyToClipboard(\`${escapeForJs(promptText)}\`)">
                            📋 Copy Prompt
                        </button>`;
                } else if (modalKind === 'gem') {
                    const gemLink = this.getAttribute('data-gem-link');
                    modalBody.innerHTML = '<p class="gem-description">Click below to open this tool in a new tab and start using it right away.</p>';
                    modalFooter.innerHTML = `<a href="${gemLink}" target="_blank" class="btn btn-primary" onclick="trackResourceView()">Open Tool →</a>`;
                }

                modalOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                
                // Track engagement
                trackResourceView();
            });
        });

        // Close Modal
        const closeModal = () => {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => {
                modalBody.innerHTML = '';
                modalFooter.innerHTML = '';
                modalTitle.textContent = '';
                modalType.textContent = '';
            }, 300);
        };

        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeModal();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // === FILTERING SYSTEM ===
    function initializeFilters() {
        document.querySelectorAll('.filter-button').forEach(button => {
            button.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');
                const filterType = this.getAttribute('data-filter-type');
                const target = this.getAttribute('data-target');

                // Update active state within same filter group
                const parent = this.closest('.filter-bar');
                parent.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                // Update filter state
                if (target === 'sessions') {
                    activeFilters.sessions[filterType] = filter;
                } else if (target === 'resources') {
                    activeFilters.resources[filterType] = filter;
                }

                applyFilters(target);
            });
        });
        
        // Initial render
        applyFilters('sessions');
        applyFilters('resources');
    }

    function applyFilters(target) {
        const containerId = target === 'sessions' ? 'sessions-grid' : 'resources-grid';
        const grid = document.getElementById(containerId);
        if (!grid) return;

        const cards = grid.querySelectorAll('.filterable-card');
        let visibleCount = 0;

        const filters = target === 'sessions' ? activeFilters.sessions : activeFilters.resources;

        cards.forEach(card => {
            const cardTags = card.getAttribute('data-tags') ? card.getAttribute('data-tags').split(',') : [];
            const cardProgram = card.getAttribute('data-program') || '';
            
            let matchesFunction = filters.function === 'all' || cardTags.includes(filters.function);
            let matchesProgram = true;
            
            if (target === 'sessions') {
                matchesProgram = filters.program === 'all' || cardProgram === filters.program;
            }

            if (matchesFunction && matchesProgram) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });

        // Update count
        const countEl = document.getElementById(target + '-count');
        if (countEl) {
            countEl.textContent = `${visibleCount} ${visibleCount === 1 ? 'item' : 'items'}`;
        }

        updateAccordionAfterFilter(target);
    }

    // === ACCORDION SYSTEM ===
    const INITIAL_CARDS = 6;
    let accordionState = { sessions: false, resources: false };

    function initializeAccordion(target) {
        const button = document.querySelector(`.show-more-button[data-target="${target}"]`);
        if (!button) return;

        button.addEventListener('click', function() {
            accordionState[target] = !accordionState[target];
            const showMoreText = this.querySelector('.show-more-text');
            const showLessText = this.querySelector('.show-less-text');
            
            showMoreText.style.display = accordionState[target] ? 'none' : '';
            showLessText.style.display = accordionState[target] ? '' : 'none';
            
            updateAccordionAfterFilter(target);
            
            // Scroll to section if collapsing
            if (!accordionState[target]) {
                const section = document.getElementById(target === 'sessions' ? 'sessions' : 'lab');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        updateAccordionAfterFilter(target);
    }

    function updateAccordionAfterFilter(target) {
        const containerId = target === 'sessions' ? 'sessions-grid' : 'resources-grid';
        const grid = document.getElementById(containerId);
        const button = document.querySelector(`.show-more-button[data-target="${target}"]`);
        
        if (!grid || !button) return;

        const visibleCards = Array.from(grid.querySelectorAll('.filterable-card:not(.hidden)'));
        
        if (visibleCards.length <= INITIAL_CARDS) {
            button.classList.add('hidden');
            visibleCards.forEach(c => c.classList.remove('accordion-hidden'));
        } else {
            button.classList.remove('hidden');
            if (accordionState[target]) {
                visibleCards.forEach(c => c.classList.remove('accordion-hidden'));
            } else {
                visibleCards.forEach((c, i) => {
                    if (i >= INITIAL_CARDS) c.classList.add('accordion-hidden');
                    else c.classList.remove('accordion-hidden');
                });
            }
        }
    }

    // === ENGAGEMENT & NUDGE SYSTEM ===
    function initializeNudgeSystem() {
        const nudge = document.getElementById('booking-nudge');
        const dismissBtn = nudge?.querySelector('.nudge-dismiss');
        
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                nudge.classList.add('hidden');
                engagement.nudgeDismissed = true;
                sessionStorage.setItem('nudgeDismissed', 'true');
            });
        }

        // Check if already dismissed this session
        if (sessionStorage.getItem('nudgeDismissed') === 'true') {
            engagement.nudgeDismissed = true;
        }
    }

    // Global functions for tracking
    window.trackDownload = function(e) {
        engagement.downloads++;
        checkNudgeTrigger();
    };

    window.trackResourceView = function() {
        engagement.resourceViews++;
        checkNudgeTrigger();
    };

    function checkNudgeTrigger() {
        const totalEngagement = engagement.downloads + engagement.resourceViews;
        
        if (totalEngagement >= engagement.threshold && 
            !engagement.nudgeShown && 
            !engagement.nudgeDismissed) {
            
            setTimeout(() => {
                const nudge = document.getElementById('booking-nudge');
                if (nudge) {
                    nudge.classList.remove('hidden');
                    engagement.nudgeShown = true;
                }
            }, 1000); // Slight delay for better UX
        }
    }

    // === UTILITY FUNCTIONS ===
    window.escapeHtml = function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    function escapeForJs(text) {
        return text.replace(/\\/g, '\\\\')
                   .replace(/`/g, '\\`')
                   .replace(/\$/g, '\\$');
    }

    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Copied to clipboard ✓'))
            .catch(err => {
                console.error('Copy failed', err);
                showToast('Failed to copy');
            });
    };

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function getResourceIcon(type) {
        const icons = {
            'Gemini Gem': '💎',
            'Custom GPT': '🤖',
            'Prompt': '⚡',
            'Workflow': '🔗',
            'Template': '📄'
        };
        return icons[type] || '✨';
    }

    function compareCohorts(a, b) {
        // Parse cohort strings like "Nov 2025" for sorting
        const parseDate = (str) => {
            if (!str) return new Date(0);
            const months = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            const parts = str.split(' ');
            if (parts.length === 2) {
                const month = months[parts[0]] || 0;
                const year = parseInt(parts[1]) || 2000;
                return new Date(year, month);
            }
            return new Date(0);
        };
        return parseDate(a) - parseDate(b);
    }

    // === SMOOTH SCROLL FOR ANCHOR LINKS ===
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
