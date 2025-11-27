document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            renderSessions(data.courses);
            renderResources(data.resources);
            renderWritings(data.writings); // New: Handle writings via JSON
            
            // Initialize filters and accordions after content is loaded
            initializeFilters();
            initializeAccordion('sessions');
            initializeAccordion('resources');
        })
        .catch(error => console.error('Error loading data:', error));
});

// === RENDER SESSIONS ===
function renderSessions(courses) {
    const container = document.getElementById('sessions-grid');
    if (!courses || courses.length === 0) {
        container.innerHTML = '<p>No sessions found.</p>';
        return;
    }

    let html = '';
    courses.forEach(course => {
        const topics = course.tags || [];
        const tagsAttr = topics.join(',');

        html += `
        <div class="course-card filterable-card" data-tags="${tagsAttr}">
            <span class="course-tag">SESSION</span>
            <a href="${course.url}" target="_blank" class="course-link">${course.title}</a>
            <p class="course-meta">${course.program} • ${course.institution}</p>
            <div class="course-footer">Open Deck →</div>
        </div>`;
    });
    container.innerHTML = html;
}

// === RENDER RESOURCES ===
function renderResources(resources) {
    const container = document.getElementById('resources-grid');
    const promptContainer = document.getElementById('prompt-storage-container');
    
    if (!resources || resources.length === 0) {
        container.innerHTML = '<p>No resources found.</p>';
        return;
    }

    let html = '';
    let promptsHtml = '';

    resources.forEach((res, index) => {
        const topics = res.tags || [];
        const tagsAttr = topics.join(',');

        // Check if Workflow
        if (res.type === 'Workflow' && res.steps) {
            html += `
            <div class="course-card workflow-card filterable-card" data-tags="${tagsAttr}">
                <span class="course-tag">🔗 WORKFLOW</span>
                <div class="workflow-title">${res.workflow_title}</div>
                <p class="workflow-desc">${res.workflow_desc}</p>
                <div class="workflow-steps">`;

            res.steps.forEach((step, stepIndex) => {
                const stepClass = stepIndex > 0 ? 'workflow-step-right' : 'workflow-step-left';
                html += `
                    <a href="${step.link}" target="_blank" class="workflow-step ${stepClass}">
                        <div class="step-number">${step.step_number}</div>
                        <div class="step-title">${step.title}</div>
                        <div class="step-desc">${step.desc}</div>
                    </a>`;
                
                if (stepIndex < res.steps.length - 1) {
                    html += `<div class="workflow-arrow">→</div>`;
                }
            });
            html += `</div></div>`;
        } else {
            // Regular Resource
            let icon = '💎';
            if (res.type === 'Gemini Gem') icon = '💎';
            else if (res.type === 'Custom GPT') icon = '🤖';
            else if (res.type && res.type.includes('Prompt')) icon = '⚡';

            let dataAttrs = '';
            if (res.prompt_text) {
                const promptId = 'prompt-' + index;
                promptsHtml += `<div id="${promptId}" class="prompt-storage">${escapeHtml(res.prompt_text)}</div>`;
                dataAttrs = `data-modal="prompt" data-prompt-id="${promptId}" data-title="${res.title}"`;
            } else {
                dataAttrs = `data-modal="gem" data-gem-link="${res.link}" data-title="${res.title}"`;
            }

            html += `
            <div class="course-card filterable-card" ${dataAttrs} data-tags="${tagsAttr}">
                <span class="course-tag">${icon} ${res.type}</span>
                <div class="course-link">${res.title}</div>
                <p class="course-desc">${res.desc || ''}</p>
                <div class="course-footer">View Details →</div>
            </div>`;
        }
    });

    container.innerHTML = html;
    promptContainer.innerHTML = promptsHtml;

    // Attach click listeners for modals after rendering
    attachModalListeners();
}

// === RENDER WRITINGS ===
function renderWritings(writings) {
    const container = document.getElementById('writings-grid');
    if (!writings || writings.length === 0) {
        // Optional: Hide section if no writings
        return;
    }
    
    let html = '';
    writings.forEach(post => {
        html += `
        <div class="course-card">
            <span class="course-tag">${post.date}</span>
            <a href="${post.link}" class="course-link">${post.title}</a>
            <p class="course-desc">${post.excerpt}</p>
            <div class="course-footer">Read Article →</div>
        </div>`;
    });
    container.innerHTML = html;
}

// === MODAL SYSTEM ===
function attachModalListeners() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');
    const modalClose = document.querySelector('.modal-close');
    
    document.querySelectorAll('.course-card[data-modal]').forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            const modalType = this.getAttribute('data-modal');
            const title = this.getAttribute('data-title');

            modalTitle.textContent = title;

            if (modalType === 'prompt') {
                const promptId = this.getAttribute('data-prompt-id');
                const promptDiv = document.getElementById(promptId);
                const promptText = promptDiv ? promptDiv.textContent : '';
                
                modalBody.innerHTML = '<pre>' + escapeHtml(promptText) + '</pre>';

                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-button';
                copyBtn.textContent = '📋 Copy Prompt';
                copyBtn.onclick = () => copyToClipboard(promptText);
                
                modalFooter.innerHTML = '';
                modalFooter.appendChild(copyBtn);
            } else if (modalType === 'gem') {
                const gemLink = this.getAttribute('data-gem-link');
                modalBody.innerHTML = '<div class="gem-description">Click below to open this tool in a new tab and start using it right away.</div>';
                modalFooter.innerHTML = `<a href="${gemLink}" target="_blank" class="btn btn-primary">Open Tool →</a>`;
            }

            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    // Close Modal Logic
    const closeModal = () => {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            modalBody.innerHTML = ''; modalFooter.innerHTML = ''; modalTitle.textContent = '';
        }, 300);
    };

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });
}

// === UTILS ===
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard! ✅'))
        .catch(err => console.error('Copy failed', err));
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// === FILTERING SYSTEM ===
function initializeFilters() {
    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            const target = this.getAttribute('data-target');

            document.querySelectorAll(`.filter-button[data-target="${target}"]`).forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            applyFilter(target, filter);
        });
    });
    
    // Initial stats
    applyFilter('sessions', 'all');
    applyFilter('resources', 'all');
}

function applyFilter(target, filter) {
    const containerId = target === 'sessions' ? 'sessions-grid' : 'resources-grid';
    const grid = document.getElementById(containerId);
    if(!grid) return;

    const cards = grid.querySelectorAll('.filterable-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const cardTags = card.getAttribute('data-tags') ? card.getAttribute('data-tags').split(',') : [];
        if (filter === 'all' || cardTags.includes(filter)) {
            card.classList.remove('hidden');
            visibleCount++;
        } else {
            card.classList.add('hidden');
        }
    });

    const countEl = document.getElementById(target + '-count');
    if(countEl) countEl.textContent = `Showing ${visibleCount} of ${cards.length}`;

    updateAccordionAfterFilter(target);
}

// === ACCORDION SYSTEM ===
const CARDS_PER_ROW = 3; 
const INITIAL_ROWS = 2; 
const INITIAL_CARDS = 6;
let accordionState = { sessions: false, resources: false };

function initializeAccordion(target) {
    const button = document.querySelector(`.show-more-button[data-target="${target}"]`);
    if(!button) return;

    button.addEventListener('click', function() {
        accordionState[target] = !accordionState[target];
        const showMoreText = this.querySelector('.show-more-text');
        const showLessText = this.querySelector('.show-less-text');
        
        showMoreText.style.display = accordionState[target] ? 'none' : '';
        showLessText.style.display = accordionState[target] ? '' : 'none';
        
        updateAccordionAfterFilter(target);
        
        if (!accordionState[target]) {
            const header = target === 'sessions' 
                ? document.querySelector('.lab-title') // First title
                : document.getElementById('resources');
            if(header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

function updateAccordionAfterFilter(target) {
    const containerId = target === 'sessions' ? 'sessions-grid' : 'resources-grid';
    const grid = document.getElementById(containerId);
    const button = document.querySelector(`.show-more-button[data-target="${target}"]`);
    
    if(!grid || !button) return;

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
