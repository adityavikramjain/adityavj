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

    // Store prompt texts for copy functionality
    const promptStorage = {};

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
            initializeShareButton();

            // Handle Deep Linking (Must run after filters are initialized)
            handleDeepLinks();
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

        const sorted = [...sessions].sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return compareCohorts(b.cohort, a.cohort);
        });

        // Standard Share Icon SVG Path
        const shareIconSvg = `<svg class="share-icon-svg" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>`;

        let html = '';
        sorted.forEach((session, index) => {
            const tags = session.tags || [];
            const tagsAttr = tags.join(',');
            const featuredClass = session.featured ? 'featured' : '';
            const desc = session.desc || 'Session materials and frameworks.';
            
            // Smart Routing Logic
            const isGoogleLink = session.url && (
                session.url.includes('docs.google.com/presentation') || 
                session.url.includes('drive.google.com/file')
            );
            const hasViewer = (session.viewerUrl && session.viewerUrl.trim() !== '') || isGoogleLink;
            const linkUrl = hasViewer ? `viewer.html?id=${session.id}` : session.url;
            const linkTarget = hasViewer ? '_self' : '_blank';

            // Handout Logic
            let handoutHtml = '';
            let handoutUrlAbsolute = '';
            
            if (session.handout) {
                handoutUrlAbsolute = session.handout.startsWith('http') 
                    ? session.handout 
                    : window.location.origin + '/' + session.handout;
                    
                handoutHtml = `<a href="${session.handout}" target="_blank" class="handout-btn" onclick="event.stopPropagation()">📄 Notes</a>`;
            }

            const shareUrlAbsolute = linkUrl.startsWith('http') 
                ? linkUrl 
                : window.location.origin + '/' + linkUrl;

            html += `
            <div class="session-card filterable-card ${featuredClass}"
                 data-tags="${tagsAttr}"
                 data-program="${session.program || ''}"
                 data-index="${index}"
                 data-viewer="${hasViewer ? 'true' : 'false'}"
                 data-link="${linkUrl}">
                 
                <button class="card-share-btn" 
                        title="Share Session"
                        data-title="${escapeHtml(session.title)}"
                        data-link="${shareUrlAbsolute}"
                        data-handout="${handoutUrlAbsolute}">
                    ${shareIconSvg}
                </button>

                <div class="card-meta">
                    <span class="card-institution">${session.institution || ''}</span>
                    <span class="card-cohort">${session.cohort || ''}</span>
                </div>
                <a href="${linkUrl}" target="${linkTarget}" class="card-title" onclick="trackDownload(event)">${session.title}</a>
                <p class="card-desc">${desc}</p>
                <div class="card-footer">
                    <span class="card-badge program">${session.program || 'Program'}</span>
                    <div class="card-actions-group">
                        ${handoutHtml}
                        <span class="card-action">${hasViewer ? 'View Deck →' : 'Open Deck →'}</span>
                    </div>
                </div>
            </div>`;
        });
        container.innerHTML = html;

        // Attach Card Click Listeners (Navigation)
        container.querySelectorAll('.session-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.card-share-btn') || e.target.closest('.handout-btn')) return;
                if (e.target.classList.contains('card-title')) return;
                
                const link = this.querySelector('.card-title');
                const hasViewer = this.getAttribute('data-viewer') === 'true';
                if (link) {
                    trackDownload(e);
                    if (hasViewer) window.location.href = link.href;
                    else window.open(link.href, '_blank');
                }
            });
        });

        // Attach Share Button Listeners -> OPEN MODAL
        container.querySelectorAll('.card-share-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                
                const title = this.getAttribute('data-title');
                const link = this.getAttribute('data-link');
                const handout = this.getAttribute('data-handout');
                
                openShareModal(title, link, handout);
            });
        });
    }
    // === HELPER: GENERATE BADGES ===
    function generatePlatformBadges(platforms) {
        if (!platforms || platforms.length === 0) return '';

        let html = '<div class="platform-badges">';
        platforms.forEach(platform => {
            if (platform === 'gemini') {
                html += '<span class="platform-badge gemini" title="Works with Gemini Deep Research">Gemini</span>';
            } else if (platform === 'perplexity') {
                html += '<span class="platform-badge perplexity" title="Works with Perplexity Pro">Perplexity</span>';
            } else if (platform === 'universal') {
                html += '<span class="platform-badge universal" title="Works on all major AI platforms (ChatGPT, Claude, Gemini)">Universal</span>';
            }
        });
        html += '</div>';
        return html;
    }

    // === RENDER WORKFLOW ===
    function renderWorkflow(res, tagsAttr, cardClasses = '', badgesHtml = '') {
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
        <div class="workflow-card filterable-card ${cardClasses}" data-tags="${tagsAttr}">
            <div class="workflow-header">
                <div class="workflow-type"><span class="icon">🔗</span> Workflow</div>
                <div class="workflow-title">${res.workflow_title}</div>
                <p class="workflow-desc">${res.workflow_desc}</p>
                ${badgesHtml}
            </div>
            <div class="workflow-steps">${stepsHtml}</div>
        </div>`;
    }

    // === ATTACH RESOURCE LISTENERS ===
    function attachResourceListeners() {
        document.querySelectorAll('.card-copy-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation(); 
                const promptId = this.getAttribute('data-prompt-id');
                const promptText = promptStorage[promptId];
                if (promptText) {
                    copyWithDelight(promptText, this);
                }
            });
        });

        document.querySelectorAll('.resource-card.prompt-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.closest('.card-copy-btn')) return;
                
                const promptId = this.getAttribute('data-prompt-id');
                const title = this.getAttribute('data-title');
                const type = this.getAttribute('data-type');
                const promptText = promptStorage[promptId];
                
                openPromptModal(title, type, promptText);
                trackResourceView();
            });
        });

        document.querySelectorAll('.resource-card.gem-card').forEach(card => {
            card.addEventListener('click', function(e) {
                const gemLink = this.getAttribute('data-gem-link');
                if (gemLink) {
                    trackResourceView();
                    window.open(gemLink, '_blank');
                }
            });
        });

        document.querySelectorAll('.resource-card[data-link]').forEach(card => {
            card.addEventListener('click', function(e) {
                const link = this.getAttribute('data-link');
                if (link && link !== '#') {
                    trackResourceView();
                    window.open(link, '_blank');
                }
            });
        });
    }

    // === OPEN PROMPT MODAL ===
    function openPromptModal(title, type, promptText) {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalType = document.getElementById('modal-type');
        const modalBody = document.getElementById('modal-body');
        const modalFooter = document.getElementById('modal-footer');

        modalTitle.textContent = title;
        modalType.textContent = type;

        modalBody.innerHTML = `
            <div class="prompt-container">
                <pre>${escapeHtml(promptText)}</pre>
            </div>`;

        modalFooter.innerHTML = `
            <button class="copy-button" id="modal-copy-btn">
                <span class="copy-icon">📋</span>
                <span class="copy-text">Copy Prompt</span>
            </button>`;

        document.getElementById('modal-copy-btn').addEventListener('click', function() {
            copyWithDelight(promptText, this);
        });

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // === COPY WITH DELIGHT ===
    function copyWithDelight(text, buttonElement) {
       navigator.clipboard.writeText(text)
            .then(() => {
                const rect = buttonElement.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                fireConfetti(centerX, centerY);

                buttonElement.classList.add('copied');
                
                const iconEl = buttonElement.querySelector('.copy-icon');
                const textEl = buttonElement.querySelector('.copy-text');
                
                if (iconEl) iconEl.textContent = '✓';
                if (textEl) textEl.textContent = 'Copied!';
                
                showToast('Prompt copied — go build something great! ✨', 'success');
                
                setTimeout(() => {
                    buttonElement.classList.remove('copied');
                    if (iconEl) iconEl.textContent = '📋';
                    if (textEl) textEl.textContent = 'Copy Prompt';
                }, 2500);
            })
            .catch(err => {
                console.error('Copy failed', err);
                showToast('Failed to copy — try again', 'error');
            });
    }

    // === CONFETTI FUNCTIONALITY ===
    function fireConfetti(x, y) {
        const count = 20;
        const defaults = {
            origin: { x: x / window.innerWidth, y: y / window.innerHeight },
            spread: 40,
            startVelocity: 15,
            ticks: 50,
            zIndex: 10000,
            colors: ['#FF4500', '#FFA500', '#FFD700', '#ffffff']
        };

        function particle(ratio, opts) {
            if (typeof confetti !== 'undefined') {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * ratio)
                });
            }
        }
        
        if (typeof confetti !== 'undefined') {
            particle(1, { spread: 30, startVelocity: 15 });
            particle(1, { spread: 50, startVelocity: 20 });
        }
    }

    // === CLOSE MODAL ===
    function initializeModalClose() {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalClose = document.querySelector('.modal-close');
        
        const closeModal = () => {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => {
                document.getElementById('modal-body').innerHTML = '';
                document.getElementById('modal-footer').innerHTML = '';
                document.getElementById('modal-title').textContent = '';
                document.getElementById('modal-type').textContent = '';
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
    
    initializeModalClose();

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

    // === FILTERING SYSTEM ===
    function initializeFilters() {
        document.querySelectorAll('.filter-button').forEach(button => {
            button.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');
                const filterType = this.getAttribute('data-filter-type');
                const target = this.getAttribute('data-target');

                // Visual Reset of "Other" Section (Smart Sync)
                if (target === 'resources' && filterType === 'function') {
                    resetFilterVisuals('sessions');
                    activeFilters.sessions.function = 'all'; 
                } else if (target === 'sessions' && filterType === 'function') {
                    resetFilterVisuals('resources');
                    activeFilters.resources.function = 'all'; 
                }

                const parent = this.closest('.filter-bar');
                parent.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                if (target === 'sessions') {
                    activeFilters.sessions[filterType] = filter;
                } else if (target === 'resources') {
                    activeFilters.resources[filterType] = filter;
                }

                applyFilters('sessions');
                applyFilters('resources');
                updateUrlState();
            });
        });
        
        applyFilters('sessions');
        applyFilters('resources');
    }

    function resetFilterVisuals(targetId) {
        const bar = document.getElementById(`function-filters-${targetId}`);
        if (!bar) return;
        bar.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-filter') === 'all') btn.classList.add('active');
        });
    }

    function applyFilters(target) {
       const containerId = target === 'sessions' ? 'sessions-grid' : 'resources-grid';
        const grid = document.getElementById(containerId);
        if (!grid) return;

        const cards = Array.from(grid.querySelectorAll('.filterable-card'));
        const filters = target === 'sessions' ? activeFilters.sessions : activeFilters.resources;
        
        cards.forEach(card => {
            const cardTags = card.getAttribute('data-tags') ? card.getAttribute('data-tags').split(',') : [];
            const cardProgram = card.getAttribute('data-program') || '';
            
            let matchesFunction = filters.function === 'all' || cardTags.includes(filters.function);
            let matchesProgram = true;
            
            if (target === 'sessions') {
                matchesProgram = filters.program === 'all' || cardProgram === filters.program;
            }

            const shouldShow = matchesFunction && matchesProgram;
            const isCurrentlyHidden = card.classList.contains('hidden');

            if (shouldShow) {
                if (isCurrentlyHidden) {
                    card.classList.remove('hidden');
                    card.classList.add('filtering-in');
                    setTimeout(() => card.classList.remove('filtering-in'), 500);
                } else {
                    card.classList.remove('filtering-out');
                }
            } else {
                if (!isCurrentlyHidden) {
                    card.classList.add('filtering-out');
                    setTimeout(() => {
                        if (card.classList.contains('filtering-out')) {
                            card.classList.add('hidden');
                            card.classList.remove('filtering-out');
                        }
                    }, 350); 
                }
            }
        });

        const visibleCount = cards.filter(c => {
            const cardTags = c.getAttribute('data-tags') ? c.getAttribute('data-tags').split(',') : [];
            const cardProgram = c.getAttribute('data-program') || '';
            let matchesFunction = filters.function === 'all' || cardTags.includes(filters.function);
            let matchesProgram = target !== 'sessions' || filters.program === 'all' || cardProgram === filters.program;
            return matchesFunction && matchesProgram;
        }).length;

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

    // === URL STATE MANAGEMENT ===
    function updateUrlState() {
        const params = new URLSearchParams();
        
        const activeFunc = activeFilters.resources.function !== 'all' 
            ? activeFilters.resources.function 
            : activeFilters.sessions.function;
            
        const activeProg = activeFilters.sessions.program;

        if (activeFunc !== 'all') params.set('filter', activeFunc);
        if (activeProg !== 'all') params.set('program', activeProg);

        const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    // === DEEP LINKING HANDLER ===
    function handleDeepLinks() {
        const urlParams = new URLSearchParams(window.location.search);
        const filterParam = urlParams.get('filter') || urlParams.get('function');
        const programParam = urlParams.get('program');

        const clickFilterButton = (value, type) => {
            if (!value) return;
            const buttons = document.querySelectorAll(`.filter-button[data-filter-type="${type}"]`);
            for (const btn of buttons) {
                if (btn.getAttribute('data-filter').toLowerCase() === value.toLowerCase()) {
                    btn.click();
                }
            }
        };

        if (filterParam) clickFilterButton(filterParam, 'function');
        if (programParam) clickFilterButton(programParam, 'program');
    }

    // === SHARE BUTTON HANDLER ===
    function initializeShareButton() {
        const shareBtn = document.getElementById('share-view-btn');
        if (!shareBtn) return;

        shareBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href)
                .then(() => {
                    const originalText = shareBtn.innerHTML;
                    shareBtn.classList.add('copied');
                    shareBtn.innerHTML = '<span class="icon">✓</span> Copied Link!';
                    
                    showToast('Link copied to clipboard!', 'success');
                    fireConfetti(shareBtn.getBoundingClientRect().left, shareBtn.getBoundingClientRect().top);

                    setTimeout(() => {
                        shareBtn.classList.remove('copied');
                        shareBtn.innerHTML = originalText;
                    }, 2500);
                })
                .catch(err => console.error('Failed to copy:', err));
        });
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

        if (sessionStorage.getItem('nudgeDismissed') === 'true') {
            engagement.nudgeDismissed = true;
        }
    }

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
            }, 1000); 
        }
    }

    // === UTILITY FUNCTIONS ===
    window.escapeHtml = function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    function showToast(message, type = 'default') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'toast';
        if (type === 'success') toast.classList.add('success');
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

    // === STICKY BOOKING BUTTON & ANALYTICS ===
    
    // 1. Sticky Button Logic
    const stickyBtn = document.getElementById('sticky-book-btn');
    if (stickyBtn) {
        let hasScrolled = false;
        
        window.addEventListener('scroll', function() {
            const scrollPosition = window.scrollY;
            const heroHeight = document.querySelector('.lab-hero')?.offsetHeight || 600;
            
            if (scrollPosition > heroHeight && !hasScrolled) {
                hasScrolled = true;
                setTimeout(() => {
                    stickyBtn.classList.add('visible');
                }, 300);
            } else if (scrollPosition <= heroHeight && hasScrolled) {
                hasScrolled = false;
                stickyBtn.classList.remove('visible');
            }
        });
        
        const bookingSection = document.getElementById('book');
        if (bookingSection) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        stickyBtn.style.opacity = '0';
                        stickyBtn.style.pointerEvents = 'none';
                    } else if (hasScrolled) {
                        stickyBtn.style.opacity = '1';
                        stickyBtn.style.pointerEvents = 'all';
                    }
                });
            }, { threshold: 0.2 });
            
            observer.observe(bookingSection);
        }
    }
    
    // 2. Analytics Helper
    function trackBookingClick(source) {
        console.log('Booking CTA clicked from:', source);
        if (typeof gtag !== 'undefined') {
            gtag('event', 'booking_cta_click', {
                'event_category': 'engagement',
                'event_label': source
            });
        }
    }

    // 3. Attach Listeners
    document.querySelectorAll('a[href="#book"], a[href*="calendly"]').forEach(link => {
        link.addEventListener('click', function() {
            const source = this.closest('.stats-bar') ? 'stats_bar' :
                          this.closest('.bridge-card') ? 'bridge_section' :
                          this.closest('.sticky-book-btn') ? 'sticky_button' :
                          this.closest('.booking-section') ? 'main_booking' :
                          'other';
            trackBookingClick(source);
        });
    });
    // === SHARE MODAL LOGIC ===
    function openShareModal(title, link, handout) {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalType = document.getElementById('modal-type');
        const modalBody = document.getElementById('modal-body');
        const modalFooter = document.getElementById('modal-footer');

        modalTitle.textContent = "Share Session";
        modalType.textContent = "Presentation";
        modalFooter.innerHTML = ''; // Clear footer

        // Construct Text
        let shareText = `Check out this session by Aditya V Jain: "${title}"\n\n🔗 Presentation: ${link}`;
        if (handout) {
            shareText += `\n📄 Notes: ${handout}`;
        }

        // WhatsApp URL
        const waText = encodeURIComponent(shareText);
        const waLink = `https://wa.me/?text=${waText}`;

        // Gmail URL
        const mailSubject = encodeURIComponent(`Session Materials: ${title}`);
        const mailBody = encodeURIComponent(shareText);
        const mailLink = `mailto:?subject=${mailSubject}&body=${mailBody}`;

        // Build Modal HTML
        modalBody.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <p style="color: var(--soft-grey); font-size: 0.95rem;">Choose how you want to share <strong>${title}</strong></p>
            </div>
            <div class="share-options-grid">
                <a href="${waLink}" target="_blank" class="share-option-btn whatsapp">
                    <span class="share-option-icon">💬</span>
                    <span class="share-option-label">WhatsApp</span>
                </a>
                <a href="${mailLink}" class="share-option-btn gmail">
                    <span class="share-option-icon">📧</span>
                    <span class="share-option-label">Email</span>
                </a>
                <button class="share-option-btn copy" id="share-copy-trigger">
                    <span class="share-option-icon">📋</span>
                    <span class="share-option-label">Copy Link</span>
                </button>
            </div>
        `;

        // Attach Copy Listener
        setTimeout(() => {
            const copyBtn = document.getElementById('share-copy-trigger');
            if(copyBtn) {
                copyBtn.addEventListener('click', function() {
                    copyWithDelight(shareText, this);
                });
            }
        }, 100);

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
});