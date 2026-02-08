// ==================== STATE ====================
const state = {
    user: null,
    token: localStorage.getItem('token'),
    projects: [],
    currentProject: null,
    cards: [],
    categories: [],
    currentCard: null,
    currentAttachment: null,
    socket: null,
    isLogin: true
};

// ==================== API HELPERS ====================
const API_BASE = '/api';

async function api(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || '请求失败');
    }

    return data;
}

async function apiFormData(endpoint, formData) {
    const headers = {};
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || '请求失败');
    }

    return data;
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        </span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== MODAL HELPERS ====================
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Close modals on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// Close buttons
document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
        closeModal(btn.dataset.close);
    });
});

// ==================== VIEW MANAGEMENT ====================
function showView(viewId) {
    ['authView', 'dashboardView', 'kanbanView'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');

    // Update header visibility
    const userMenu = document.getElementById('userMenu');
    const globalSearch = document.getElementById('globalSearch');

    if (viewId === 'authView') {
        userMenu.style.display = 'none';
        globalSearch.style.display = 'none';
    } else {
        userMenu.style.display = 'flex';
        globalSearch.style.display = viewId === 'dashboardView' ? 'block' : 'none';
    }
}

// ==================== AUTH ====================
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSwitchText = document.getElementById('authSwitchText');
const authSwitchLink = document.getElementById('authSwitchLink');
const emailGroup = document.getElementById('emailGroup');

authSwitchLink.addEventListener('click', (e) => {
    e.preventDefault();
    state.isLogin = !state.isLogin;
    updateAuthUI();
});

function updateAuthUI() {
    if (state.isLogin) {
        authTitle.textContent = '登录';
        authSubtitle.textContent = '欢迎回来，请登录您的账户';
        authSubmitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>登录</span>';
        authSwitchText.textContent = '还没有账户？';
        authSwitchLink.textContent = '立即注册';
        emailGroup.classList.add('hidden');
    } else {
        authTitle.textContent = '注册';
        authSubtitle.textContent = '创建新账户开始协作';
        authSubmitBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>注册</span>';
        authSwitchText.textContent = '已有账户？';
        authSwitchLink.textContent = '立即登录';
        emailGroup.classList.remove('hidden');
    }
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;

    try {
        const endpoint = state.isLogin ? '/auth/login' : '/auth/register';
        const payload = state.isLogin
            ? { username, password }
            : { username, email, password };

        const data = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        state.token = data.access_token;
        state.user = data.user;
        localStorage.setItem('token', state.token);

        updateUserUI();
        showToast(state.isLogin ? '登录成功' : '注册成功', 'success');
        loadDashboard();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    showView('authView');
    showToast('已退出登录', 'success');
});

function updateUserUI() {
    if (state.user) {
        document.getElementById('userInitial').textContent = state.user.username[0].toUpperCase();
        document.getElementById('userAvatar').style.background = state.user.avatar_color;
    }
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
    showView('dashboardView');

    try {
        state.projects = await api('/projects');
        renderProjects();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = state.projects.map(project => `
        <div class="project-card card" data-id="${project.id}">
            <div class="project-card-content">
                <h3>
                    <i class="fas fa-clipboard-list" style="color: var(--accent-primary);"></i>
                    ${escapeHtml(project.name)}
                    ${project.unread_count > 0 ? `<span class="badge badge-danger" style="margin-left: 10px;">${project.unread_count}</span>` : ''}
                </h3>
                <p>${escapeHtml(project.description || '暂无描述')}</p>
                <div class="project-meta">
                    <span>
                        <i class="fas fa-users"></i>
                        ${project.members?.length || 0} 成员
                    </span>
                    <span>
                        <i class="fas fa-clock"></i>
                        ${formatDate(project.updated_at)}
                    </span>
                </div>
            </div>
        </div>
    `).join('') + `
        <div class="add-project-card card" id="addProjectCard">
            <div class="add-project-content">
                <div class="icon">
                    <i class="fas fa-plus-circle"></i>
                </div>
                <p>创建新项目</p>
            </div>
        </div>
    `;

    // Bind click events
    grid.querySelectorAll('.project-card[data-id]').forEach(card => {
        card.addEventListener('click', () => loadProject(parseInt(card.dataset.id)));
    });

    document.getElementById('addProjectCard').addEventListener('click', () => {
        openModal('newProjectModal');
    });
}

document.getElementById('newProjectBtn').addEventListener('click', () => {
    openModal('newProjectModal');
});

document.getElementById('createProjectBtn').addEventListener('click', async () => {
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDesc').value.trim();

    if (!name) {
        showToast('请输入项目名称', 'error');
        return;
    }

    try {
        const project = await api('/projects', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });

        state.projects.unshift(project);
        renderProjects();
        closeModal('newProjectModal');
        document.getElementById('newProjectForm').reset();
        showToast('项目创建成功', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ==================== KANBAN BOARD ====================
async function loadProject(projectId) {
    try {
        state.currentProject = await api(`/projects/${projectId}`);
        state.cards = state.currentProject.cards || [];
        state.categories = state.currentProject.categories || [];

        showView('kanbanView');
        renderKanban();
        updateFilters();
        initSocket();

        // Mark as read
        if (state.currentProject && state.currentProject.unread_count > 0) {
            api(`/projects/${projectId}/read`, { method: 'POST' }).then(() => {
                // Update local state
                state.currentProject.unread_count = 0;
                // Loop projects to update badge in list
                const pIndex = state.projects.findIndex(p => p.id === projectId);
                if (pIndex !== -1) state.projects[pIndex].unread_count = 0;
            }).catch(console.error);
        }

        // Update AI panel card list
        updateCardSelectList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderKanban() {
    const project = state.currentProject;

    document.getElementById('projectTitle').innerHTML = `
        ${escapeHtml(project.name)}
        <button onclick="openColumnManager()" class="btn btn-ghost btn-sm" title="管理看板列" style="margin-left: 10px;">
            <i class="fas fa-columns"></i>
        </button>
    `;
    document.getElementById('projectDescription').textContent = project.description || '';

    const board = document.getElementById('kanbanBoard');
    const columns = project.columns || ['待办', '进行中', '已完成'];

    board.innerHTML = columns.map(column => {
        const columnCards = state.cards.filter(c => c.column === column);
        return `
            <div class="kanban-column" data-column="${column}">
                <div class="column-header">
                    <div class="column-title">
                        <span>${column}</span>
                        <span class="column-count">${columnCards.length}</span>
                    </div>
                </div>
                <div class="column-cards" data-column="${column}">
                    ${columnCards.sort((a, b) => a.position - b.position).map(card => renderCard(card)).join('')}
                </div>
                <button class="add-card-btn" data-column="${column}">
                    <i class="fas fa-plus"></i>
                    添加卡片
                </button>
            </div>
        `;
    }).join('') + `
        <div class="kanban-column add-column-container">
            <button class="add-column-btn" onclick="addNewColumn()">
                <i class="fas fa-plus"></i>
                添加列
            </button>
        </div>
    `;

    // Bind events
    initDragAndDrop();

    board.querySelectorAll('.kanban-card').forEach(el => {
        el.addEventListener('click', () => openCardDetail(parseInt(el.dataset.id)));
    });

    board.querySelectorAll('.add-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const column = btn.dataset.column;
            document.getElementById('newCardColumn').innerHTML =
                state.currentProject.columns.map(c =>
                    `<option value="${c}" ${c === column ? 'selected' : ''}>${c}</option>`
                ).join('');
            openModal('newCardModal');
        });
    });
}

function renderCard(card) {
    const categoryTags = card.categories?.map(cat =>
        `<span class="category-tag" style="background: ${cat.color}20; color: ${cat.color};">${escapeHtml(cat.name)}</span>`
    ).join('') || '';

    const assigneeAvatars = card.assignees?.slice(0, 3).map(u =>
        `<div class="card-assignee" style="background: ${u.avatar_color};" title="${escapeHtml(u.username)}">${u.username[0].toUpperCase()}</div>`
    ).join('') || '';

    const dueClass = card.due_date ? getDueDateClass(card.due_date) : '';
    const dueText = card.due_date ? formatDueDate(card.due_date) : '';

    return `
        <div class="kanban-card ${card.completed ? 'completed' : ''}" data-id="${card.id}" draggable="true">
            ${categoryTags ? `<div class="card-categories">${categoryTags}</div>` : ''}
            <div class="card-title">${escapeHtml(card.title)}</div>
            ${card.content ? `<div class="card-preview">${escapeHtml(card.content.substring(0, 100))}</div>` : ''}
            <div class="card-footer">
                <div class="card-assignees">${assigneeAvatars}</div>
                <div class="card-meta">
                    ${card.attachments?.length ? `<span><i class="fas fa-paperclip"></i>${card.attachments.length}</span>` : ''}
                    ${dueText ? `<span class="due-date ${dueClass}"><i class="fas fa-clock"></i>${dueText}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// ==================== DRAG AND DROP ====================
function initDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.column-cards');

    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', card.dataset.id);
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
    });

    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');

            const dragging = document.querySelector('.dragging');
            const afterElement = getDragAfterElement(column, e.clientY);

            if (afterElement) {
                column.insertBefore(dragging, afterElement);
            } else {
                column.appendChild(dragging);
            }
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            const cardId = parseInt(e.dataTransfer.getData('text/plain'));
            const newColumn = column.dataset.column;

            // Get new positions
            const cardsInColumn = Array.from(column.querySelectorAll('.kanban-card'));
            const updates = cardsInColumn.map((el, idx) => ({
                id: parseInt(el.dataset.id),
                column: newColumn,
                position: idx
            }));

            try {
                await api('/cards/reorder', {
                    method: 'POST',
                    body: JSON.stringify({ cards: updates })
                });

                // Update local state
                updates.forEach(upd => {
                    const card = state.cards.find(c => c.id === upd.id);
                    if (card) {
                        card.column = upd.column;
                        card.position = upd.position;
                    }
                });

                // Re-render to update counts
                renderKanban();
            } catch (err) {
                showToast(err.message, 'error');
                renderKanban();
            }
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ==================== CARD CRUD ====================
document.getElementById('createCardBtn').addEventListener('click', async () => {
    const title = document.getElementById('newCardTitle').value.trim();
    const column = document.getElementById('newCardColumn').value;

    if (!title) {
        showToast('请输入卡片标题', 'error');
        return;
    }

    try {
        const card = await api(`/projects/${state.currentProject.id}/cards`, {
            method: 'POST',
            body: JSON.stringify({ title, column })
        });

        state.cards.push(card);
        renderKanban();
        closeModal('newCardModal');
        document.getElementById('newCardForm').reset();
        showToast('卡片创建成功', 'success');
        updateCardSelectList();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ================== COLUMN MANAGEMENT ==================

async function addNewColumn() {
    const columnName = prompt('请输入新列的名称:', '');
    if (!columnName || !columnName.trim()) {
        return;
    }

    const trimmedName = columnName.trim();
    const currentColumns = state.currentProject.columns || ['待办', '进行中', '已完成'];

    // Check if column already exists
    if (currentColumns.includes(trimmedName)) {
        showToast('此列名称已存在', 'error');
        return;
    }

    try {
        const newColumns = [...currentColumns, trimmedName];
        const result = await api(`/projects/${state.currentProject.id}`, {
            method: 'PUT',
            body: JSON.stringify({ columns: newColumns })
        });

        state.currentProject = result;
        renderKanban();
        showToast('列添加成功', 'success');
    } catch (err) {
        showToast('添加列失败: ' + err.message, 'error');
    }
}

async function deleteColumn(columnName) {
    const currentColumns = state.currentProject.columns || ['待办', '进行中', '已完成'];

    // Check if column has cards
    const cardsInColumn = state.cards.filter(c => c.column === columnName);
    if (cardsInColumn.length > 0) {
        showToast(`无法删除此列，还有 ${cardsInColumn.length} 张卡片在此列中`, 'error');
        return;
    }

    if (!confirm(`确定要删除列 "${columnName}" 吗？`)) {
        return;
    }

    try {
        const newColumns = currentColumns.filter(c => c !== columnName);
        const result = await api(`/projects/${state.currentProject.id}`, {
            method: 'PUT',
            body: JSON.stringify({ columns: newColumns })
        });

        state.currentProject = result;
        renderKanban();
        showToast('列已删除', 'success');
    } catch (err) {
        showToast('删除列失败: ' + err.message, 'error');
    }
}

async function renameColumn(oldName) {
    const newName = prompt('请输入新的列名称:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) {
        return;
    }

    const trimmedName = newName.trim();
    const currentColumns = state.currentProject.columns || ['待办', '进行中', '已完成'];

    if (currentColumns.includes(trimmedName)) {
        showToast('此列名称已存在', 'error');
        return;
    }

    try {
        // Update column name in project
        const newColumns = currentColumns.map(c => c === oldName ? trimmedName : c);

        // Update cards that were in the old column
        const cardsToUpdate = state.cards.filter(c => c.column === oldName);
        for (const card of cardsToUpdate) {
            await api(`/cards/${card.id}`, {
                method: 'PUT',
                body: JSON.stringify({ column: trimmedName })
            });
        }

        // Update project columns
        const result = await api(`/projects/${state.currentProject.id}`, {
            method: 'PUT',
            body: JSON.stringify({ columns: newColumns })
        });

        state.currentProject = result;
        await loadProjectBoard(state.currentProject.id);
        showToast('列已重命名', 'success');
    } catch (err) {
        showToast('重命名列失败: ' + err.message, 'error');
    }
}

async function openCardDetail(cardId) {
    const card = state.cards.find(c => c.id === cardId);
    if (!card) return;

    state.currentCard = card;

    // Populate form
    document.getElementById('cardTitleInput').value = card.title;
    document.getElementById('cardContentInput').value = card.content || '';
    document.getElementById('cardContentType').value = card.content_type || 'markdown';
    document.getElementById('cardDueDate').value = card.due_date ? card.due_date.slice(0, 16) : '';

    // Update complete button
    const completeBtn = document.getElementById('toggleCompleteBtn');
    completeBtn.innerHTML = card.completed
        ? '<i class="fas fa-check-circle" style="color: var(--accent-secondary);"></i>'
        : '<i class="far fa-check-circle"></i>';

    // Populate assignees
    const assigneeSelect = document.getElementById('cardAssignees');
    assigneeSelect.innerHTML = state.currentProject.members.map(m =>
        `<option value="${m.id}" ${card.assignees?.some(a => a.id === m.id) ? 'selected' : ''}>${escapeHtml(m.username)}</option>`
    ).join('');

    // Populate categories
    const catContainer = document.getElementById('cardCategoriesSelect');
    catContainer.innerHTML = state.categories.map(cat => `
        <label class="card-select-item">
            <input type="checkbox" value="${cat.id}" ${card.categories?.some(c => c.id === cat.id) ? 'checked' : ''}>
            <span class="category-tag" style="background: ${cat.color}20; color: ${cat.color};">${escapeHtml(cat.name)}</span>
        </label>
    `).join('');

    // Render attachments
    renderAttachments(card.attachments || []);

    // Reset editor
    document.querySelector('.editor-tab[data-tab="edit"]').click();

    openModal('cardDetailModal');
}

function renderAttachments(attachments) {
    const list = document.getElementById('attachmentsList');

    if (!attachments.length) {
        list.innerHTML = '<p class="text-muted" style="text-align: center; padding: var(--space-md);">暂无附件</p>';
        return;
    }

    list.innerHTML = attachments.map(att => `
        <div class="attachment-item" data-id="${att.id}">
            <div class="attachment-icon">
                <i class="fas fa-${getFileIcon(att.file_type)}"></i>
            </div>
            <div class="attachment-info">
                <div class="attachment-name">${escapeHtml(att.original_filename)}</div>
                <div class="attachment-size">${formatFileSize(att.file_size)}</div>
            </div>
            <div class="attachment-actions">
                <button class="btn btn-ghost btn-sm open-file-btn" title="打开">
                    <i class="fas fa-external-link-alt"></i>
                </button>
                <button class="btn btn-ghost btn-sm download-file-btn" title="下载">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn-ghost btn-sm delete-file-btn" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Bind events
    list.querySelectorAll('.attachment-item').forEach(item => {
        const attId = parseInt(item.dataset.id);
        const att = attachments.find(a => a.id === attId);

        item.querySelector('.open-file-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openFileEditor(att);
        });

        item.querySelector('.download-file-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            downloadAttachment(attId);
        });

        item.querySelector('.delete-file-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAttachment(attId);
        });
    });
}

document.getElementById('saveCardBtn').addEventListener('click', async () => {
    if (!state.currentCard) return;

    const title = document.getElementById('cardTitleInput').value.trim();
    const content = document.getElementById('cardContentInput').value;
    const content_type = document.getElementById('cardContentType').value;
    const due_date = document.getElementById('cardDueDate').value || null;

    const assigneeSelect = document.getElementById('cardAssignees');
    const assignee_ids = Array.from(assigneeSelect.selectedOptions).map(o => parseInt(o.value));

    const category_ids = Array.from(document.querySelectorAll('#cardCategoriesSelect input:checked'))
        .map(cb => parseInt(cb.value));

    if (!title) {
        showToast('请输入卡片标题', 'error');
        return;
    }

    try {
        const updated = await api(`/cards/${state.currentCard.id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, content, content_type, due_date, assignee_ids, category_ids })
        });

        // Update local state
        const idx = state.cards.findIndex(c => c.id === state.currentCard.id);
        if (idx !== -1) {
            state.cards[idx] = updated;
        }

        renderKanban();
        closeModal('cardDetailModal');
        showToast('卡片已保存', 'success');
        updateCardSelectList();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

document.getElementById('toggleCompleteBtn').addEventListener('click', async () => {
    if (!state.currentCard) return;

    try {
        const updated = await api(`/cards/${state.currentCard.id}`, {
            method: 'PUT',
            body: JSON.stringify({ completed: !state.currentCard.completed })
        });

        state.currentCard = updated;
        const idx = state.cards.findIndex(c => c.id === updated.id);
        if (idx !== -1) state.cards[idx] = updated;

        const completeBtn = document.getElementById('toggleCompleteBtn');
        completeBtn.innerHTML = updated.completed
            ? '<i class="fas fa-check-circle" style="color: var(--accent-secondary);"></i>'
            : '<i class="far fa-check-circle"></i>';

        renderKanban();
        showToast(updated.completed ? '已标记完成' : '已取消完成', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

document.getElementById('deleteCardBtn').addEventListener('click', async () => {
    if (!state.currentCard) return;
    if (!confirm('确定要删除这张卡片吗？')) return;

    try {
        await api(`/cards/${state.currentCard.id}`, { method: 'DELETE' });

        state.cards = state.cards.filter(c => c.id !== state.currentCard.id);
        renderKanban();
        closeModal('cardDetailModal');
        showToast('卡片已删除', 'success');
        updateCardSelectList();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ==================== EDITOR TABS ====================
document.querySelectorAll('.editor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const mode = tab.dataset.tab;
        const editArea = document.getElementById('editorContent');
        const preview = document.getElementById('editorPreview');

        if (mode === 'preview') {
            const content = document.getElementById('cardContentInput').value;
            const contentType = document.getElementById('cardContentType').value;

            if (contentType === 'markdown') {
                preview.innerHTML = marked.parse(content);
            } else {
                preview.innerHTML = content;
            }

            editArea.classList.add('hidden');
            preview.classList.remove('hidden');
        } else {
            editArea.classList.remove('hidden');
            preview.classList.add('hidden');
        }
    });
});

// ==================== ATTACHMENTS ====================
document.getElementById('uploadAttachmentBtn').addEventListener('click', () => {
    document.getElementById('attachmentInput').click();
});

document.getElementById('attachmentInput').addEventListener('change', async (e) => {
    if (!state.currentCard || !e.target.files.length) return;

    const formData = new FormData();
    for (const file of e.target.files) {
        formData.append('files', file);
    }

    try {
        const attachments = await apiFormData(`/cards/${state.currentCard.id}/attachments`, formData);

        state.currentCard.attachments = [...(state.currentCard.attachments || []), ...attachments];
        renderAttachments(state.currentCard.attachments);

        const idx = state.cards.findIndex(c => c.id === state.currentCard.id);
        if (idx !== -1) state.cards[idx] = state.currentCard;

        renderKanban();
        showToast('文件上传成功', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }

    e.target.value = '';
});

async function downloadAttachment(attId) {
    window.open(`${API_BASE}/attachments/${attId}`, '_blank');
}

async function deleteAttachment(attId) {
    if (!confirm('确定要删除此附件吗？')) return;

    try {
        await api(`/attachments/${attId}`, { method: 'DELETE' });

        state.currentCard.attachments = state.currentCard.attachments.filter(a => a.id !== attId);
        renderAttachments(state.currentCard.attachments);

        const idx = state.cards.findIndex(c => c.id === state.currentCard.id);
        if (idx !== -1) state.cards[idx] = state.currentCard;

        renderKanban();
        showToast('附件已删除', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ==================== FILE EDITOR ====================
// Check if file should use OnlyOffice
function shouldUseOnlyOffice(fileType) {
    const onlyOfficeTypes = ['word', 'excel', 'powerpoint'];
    return onlyOfficeTypes.includes(fileType);
}

async function openFileEditor(attachment) {
    state.currentAttachment = attachment;

    // Route Word, Excel, PPT to OnlyOffice editor
    if (shouldUseOnlyOffice(attachment.file_type)) {
        await openOnlyOfficeEditor(attachment);
        return;
    }

    // Use built-in editor for text, markdown, and PDF
    document.getElementById('fileEditorTitle').textContent = attachment.original_filename;
    document.getElementById('fileTypeBadge').textContent = attachment.file_type.toUpperCase();

    const contentArea = document.getElementById('fileEditorContent');
    contentArea.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    openModal('fileEditorModal');

    try {
        const data = await api(`/attachments/${attachment.id}/content`);

        switch (data.type) {
            case 'text':
                contentArea.innerHTML = `<textarea class="text-editor-area" id="textEditorArea">${escapeHtml(data.content)}</textarea>`;
                break;

            case 'pdf':
                contentArea.innerHTML = `<div class="pdf-viewer">${data.content.map((page, i) =>
                    `<div class="pdf-page"><strong>第 ${i + 1} 页</strong><br>${escapeHtml(page)}</div>`
                ).join('')
                    }</div>`;
                break;

            default:
                contentArea.innerHTML = '<p class="text-center text-muted">此文件类型不支持预览</p>';
        }
    } catch (err) {
        contentArea.innerHTML = `<p class="text-center" style="color: var(--accent-danger);">${err.message}</p>`;
    }
}

// ==================== ONLYOFFICE INTEGRATION ====================
let onlyOfficeDocEditor = null;
let onlyOfficeApiLoaded = false;

async function loadOnlyOfficeApi(onlyofficeUrl) {
    if (onlyOfficeApiLoaded) return true;

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = `${onlyofficeUrl}/web-apps/apps/api/documents/api.js`;
        script.onload = () => {
            onlyOfficeApiLoaded = true;
            resolve(true);
        };
        script.onerror = () => {
            console.error('Failed to load OnlyOffice API');
            resolve(false);
        };
        document.head.appendChild(script);
    });
}

async function openOnlyOfficeEditor(attachment) {
    state.currentAttachment = attachment;

    document.getElementById('onlyofficeTitle').textContent = attachment.original_filename;
    document.getElementById('onlyofficeEditor').innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    openModal('onlyofficeModal');

    try {
        // Get OnlyOffice configuration from server
        const result = await api(`/attachments/${attachment.id}/onlyoffice-config`);
        const { config, onlyoffice_url } = result;

        // Load OnlyOffice API if not already loaded
        const apiLoaded = await loadOnlyOfficeApi(onlyoffice_url);

        if (!apiLoaded) {
            // Fall back to built-in editor
            closeModal('onlyofficeModal');
            await openBuiltInOfficeEditor(attachment);
            return;
        }

        // Destroy previous editor if exists
        if (onlyOfficeDocEditor) {
            onlyOfficeDocEditor.destroyEditor();
            onlyOfficeDocEditor = null;
        }

        // Clear container
        document.getElementById('onlyofficeEditor').innerHTML = '';

        // Initialize OnlyOffice editor
        onlyOfficeDocEditor = new DocsAPI.DocEditor('onlyofficeEditor', config);

    } catch (err) {
        // Fall back to built-in editor when OnlyOffice fails
        closeModal('onlyofficeModal');
        await openBuiltInOfficeEditor(attachment);
    }
}

// Fallback editor for Word/Excel/PPT when OnlyOffice is unavailable
async function openBuiltInOfficeEditor(attachment) {
    state.currentAttachment = attachment;

    document.getElementById('fileEditorTitle').textContent = attachment.original_filename;
    document.getElementById('fileTypeBadge').textContent = attachment.file_type.toUpperCase();

    const contentArea = document.getElementById('fileEditorContent');
    contentArea.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    openModal('fileEditorModal');

    try {
        const data = await api(`/attachments/${attachment.id}/content`);

        switch (data.type) {
            case 'word':
                contentArea.innerHTML = `<textarea class="text-editor-area" id="textEditorArea">${escapeHtml(data.content)}</textarea>`;
                break;

            case 'excel':
                renderSpreadsheet(contentArea, data.content);
                break;

            case 'powerpoint':
                contentArea.innerHTML = data.content.map((slide, i) =>
                    `<div class="pdf-page"><h3>幻灯片 ${i + 1}</h3><pre>${escapeHtml(slide)}</pre></div>`
                ).join('');
                break;

            default:
                contentArea.innerHTML = '<p class="text-center text-muted">此文件类型不支持预览</p>';
        }
    } catch (err) {
        contentArea.innerHTML = `<p class="text-center" style="color: var(--accent-danger);">${err.message}</p>`;
    }
}

// Save Version functionality (manual version creation independent of OnlyOffice)
document.getElementById('saveVersionBtn')?.addEventListener('click', async () => {
    if (!state.currentAttachment) {
        showToast('没有选中的附件', 'error');
        return;
    }

    const summary = prompt('请输入版本备注 (可选):') || '手动保存版本';

    try {
        const result = await api(`/attachments/${state.currentAttachment.id}/save-version`, {
            method: 'POST',
            body: JSON.stringify({ summary })
        });
        showToast(result.message || '版本已保存', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Version History functionality
document.getElementById('versionHistoryBtn')?.addEventListener('click', async () => {
    if (!state.currentAttachment) return;

    openModal('versionHistoryModal');
    const listEl = document.getElementById('versionHistoryList');
    listEl.innerHTML = '<p class="text-center"><div class="spinner"></div></p>';

    try {
        const result = await api(`/attachments/${state.currentAttachment.id}/versions`);
        const versions = result.versions;

        if (!versions.length) {
            listEl.innerHTML = '<p class="text-center text-muted">暂无版本历史</p>';
            return;
        }

        listEl.innerHTML = versions.map(v => `
            <div class="version-item" data-version-id="${v.id}">
                <div class="version-info">
                    <strong>版本 ${v.version_number}</strong>
                    <span class="text-muted">${formatFileSize(v.file_size)}</span>
                </div>
                <div class="version-meta">
                    <span><i class="fas fa-user"></i> ${v.edited_by?.username || '未知'}</span>
                    <span><i class="fas fa-clock"></i> ${new Date(v.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <div class="version-actions">
                    <button class="btn btn-secondary btn-sm restore-version-btn" data-version-id="${v.id}" data-attachment-id="${state.currentAttachment.id}">
                        <i class="fas fa-undo"></i> 恢复此版本
                    </button>
                </div>
            </div>
        `).join('');

        // Bind restore buttons
        listEl.querySelectorAll('.restore-version-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const versionId = btn.dataset.versionId;
                const attachmentId = btn.dataset.attachmentId;

                if (!confirm('确定要恢复到此版本吗？当前版本将被保存为新版本。')) return;

                try {
                    const result = await api(`/attachments/${attachmentId}/restore/${versionId}`, {
                        method: 'POST'
                    });
                    showToast('版本已恢复，请重新打开文件查看', 'success');
                    closeModal('versionHistoryModal');

                    // Close OnlyOffice modal - user needs to reopen to see restored content
                    const onlyOfficeModal = document.getElementById('onlyofficeModal');
                    if (onlyOfficeModal && onlyOfficeModal.classList.contains('show')) {
                        closeModal('onlyofficeModal');
                        // Destroy any existing editor instance
                        if (window.docEditor) {
                            try { window.docEditor.destroyEditor(); } catch (e) { }
                            window.docEditor = null;
                        }
                    }

                    // Reload the current card to refresh attachments
                    if (state.currentCard) {
                        const card = await api(`/cards/${state.currentCard.id}`);
                        state.currentCard = card;
                        renderAttachments(card.attachments);
                    }
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

    } catch (err) {
        listEl.innerHTML = `<p class="text-center" style="color: var(--accent-danger);">${err.message}</p>`;
    }
});

// Cleanup OnlyOffice editor when modal closes
document.querySelector('[data-close="onlyofficeModal"]')?.addEventListener('click', () => {
    if (onlyOfficeDocEditor) {
        onlyOfficeDocEditor.destroyEditor();
        onlyOfficeDocEditor = null;
    }
});

function renderSpreadsheet(container, sheets) {
    const sheetNames = Object.keys(sheets);

    container.innerHTML = `
        <div class="spreadsheet-container">
            <div class="spreadsheet-tabs">
                ${sheetNames.map((name, i) =>
        `<button class="sheet-tab ${i === 0 ? 'active' : ''}" data-sheet="${name}">${escapeHtml(name)}</button>`
    ).join('')}
            </div>
            <div class="spreadsheet-table-container" id="spreadsheetTableContainer">
            </div>
        </div>
    `;

    const tableContainer = document.getElementById('spreadsheetTableContainer');

    function renderSheet(sheetName) {
        const data = sheets[sheetName];
        if (!data || !data.length) {
            tableContainer.innerHTML = '<p class="text-muted">空工作表</p>';
            return;
        }

        tableContainer.innerHTML = `
            <table class="spreadsheet-table" id="spreadsheetTable">
                <thead>
                    <tr>
                        ${data[0].map((_, i) => `<th>${String.fromCharCode(65 + i)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map((row, ri) => `
                        <tr>
                            ${row.map((cell, ci) =>
            `<td contenteditable="true" data-row="${ri}" data-col="${ci}">${escapeHtml(cell)}</td>`
        ).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderSheet(sheetNames[0]);

    container.querySelectorAll('.sheet-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.sheet-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderSheet(tab.dataset.sheet);
        });
    });
}

document.getElementById('saveFileBtn').addEventListener('click', async () => {
    if (!state.currentAttachment) return;

    let content;
    const type = state.currentAttachment.file_type;

    if (type === 'text' || type === 'word') {
        content = document.getElementById('textEditorArea')?.value;
    } else if (type === 'excel') {
        // Collect spreadsheet data
        const table = document.getElementById('spreadsheetTable');
        if (table) {
            const rows = [];
            table.querySelectorAll('tbody tr').forEach(tr => {
                const row = [];
                tr.querySelectorAll('td').forEach(td => {
                    row.push(td.textContent);
                });
                rows.push(row);
            });

            const activeSheet = document.querySelector('.sheet-tab.active')?.dataset.sheet || 'Sheet1';
            content = { [activeSheet]: rows };
        }
    } else {
        showToast('此文件类型不支持保存', 'error');
        return;
    }

    try {
        await api(`/attachments/${state.currentAttachment.id}/content`, {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
        showToast('文件已保存', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

document.getElementById('downloadFileBtn').addEventListener('click', () => {
    if (state.currentAttachment) {
        downloadAttachment(state.currentAttachment.id);
    }
});

// ==================== CATEGORIES ====================
document.getElementById('manageCategoriesBtn').addEventListener('click', () => {
    renderCategoriesList();
    openModal('categoryModal');
});

function renderCategoriesList() {
    const list = document.getElementById('categoriesList');
    list.innerHTML = state.categories.map(cat => `
        <div class="attachment-item" data-id="${cat.id}">
            <div class="attachment-icon" style="background: ${cat.color};">
                <i class="fas fa-tag" style="color: white;"></i>
            </div>
            <div class="attachment-info">
                <div class="attachment-name">${escapeHtml(cat.name)}</div>
            </div>
            <div class="attachment-actions">
                <button class="btn btn-ghost btn-sm delete-cat-btn" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('') || '<p class="text-muted text-center">暂无类别</p>';

    list.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const catId = parseInt(btn.closest('.attachment-item').dataset.id);
            if (!confirm('确定要删除此类别吗？')) return;

            try {
                await api(`/categories/${catId}`, { method: 'DELETE' });
                state.categories = state.categories.filter(c => c.id !== catId);
                renderCategoriesList();
                updateFilters();
                showToast('类别已删除', 'success');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });
}

document.getElementById('addCategoryBtn').addEventListener('click', async () => {
    const name = document.getElementById('newCategoryName').value.trim();
    const color = document.getElementById('newCategoryColor').value;

    if (!name) {
        showToast('请输入类别名称', 'error');
        return;
    }

    try {
        const category = await api(`/projects/${state.currentProject.id}/categories`, {
            method: 'POST',
            body: JSON.stringify({ name, color })
        });

        state.categories.push(category);
        renderCategoriesList();
        updateFilters();
        document.getElementById('newCategoryName').value = '';
        showToast('类别创建成功', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ==================== FILTERS ====================
function updateFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="">全部</option>' +
        state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    const assigneeFilter = document.getElementById('assigneeFilter');
    assigneeFilter.innerHTML = '<option value="">全部</option>' +
        state.currentProject.members.map(m => `<option value="${m.id}">${escapeHtml(m.username)}</option>`).join('');
}

async function applyFilters() {
    const q = document.getElementById('cardSearchInput').value;
    const status = document.getElementById('statusFilter').value;
    const category = document.getElementById('categoryFilter').value;
    const assignee = document.getElementById('assigneeFilter').value;
    const includeAttachments = document.getElementById('includeAttachments').checked;

    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (status) params.append('status', status);
    if (category) params.append('category', category);
    if (assignee) params.append('assignee', assignee);
    if (includeAttachments) params.append('include_attachments', 'true');

    try {
        state.cards = await api(`/projects/${state.currentProject.id}/cards/search?${params}`);
        renderKanban();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

document.getElementById('cardSearchInput').addEventListener('input', debounce(applyFilters, 300));
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);
document.getElementById('includeAttachments').addEventListener('change', applyFilters);
document.getElementById('assigneeFilter').addEventListener('change', applyFilters);

// ==================== MEMBERS ====================
document.getElementById('inviteMemberBtn').addEventListener('click', () => {
    renderMembersList();
    openModal('inviteMemberModal');
});

function renderMembersList() {
    const container = document.getElementById('currentMembers');
    container.innerHTML = state.currentProject.members.map(m => `
        <div class="attachment-item">
            <div class="user-avatar" style="background: ${m.avatar_color}; width: 32px; height: 32px; font-size: 0.8rem;">
                ${m.username[0].toUpperCase()}
            </div>
            <div class="attachment-info">
                <div class="attachment-name">${escapeHtml(m.username)}</div>
                <div class="attachment-size">${m.id === state.currentProject.owner_id ? '所有者' : '成员'}</div>
            </div>
        </div>
    `).join('');
}

document.getElementById('sendInviteBtn').addEventListener('click', async () => {
    const username = document.getElementById('inviteUsername').value.trim();

    if (!username) {
        showToast('请输入用户名', 'error');
        return;
    }

    try {
        const data = await api(`/projects/${state.currentProject.id}/invite`, {
            method: 'POST',
            body: JSON.stringify({ username })
        });

        state.currentProject.members.push(data.user);
        renderMembersList();
        updateFilters();
        document.getElementById('inviteUsername').value = '';
        showToast(data.message, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ==================== CHAT ====================
function initSocket() {
    if (state.socket) {
        state.socket.disconnect();
    }

    state.socket = io();

    state.socket.on('connect', () => {
        state.socket.emit('join', {
            project_id: state.currentProject.id,
            user_id: state.user.id
        });
    });

    state.socket.on('new_message', (message) => {
        appendChatMessage(message);
    });

    state.socket.on('user_typing', (data) => {
        const indicator = document.getElementById('typingIndicator');
        indicator.textContent = `${data.username} 正在输入...`;
        indicator.classList.remove('hidden');

        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            indicator.classList.add('hidden');
        }, 2000);
    });

    loadChatMessages();
}

async function loadChatMessages() {
    try {
        const data = await api(`/projects/${state.currentProject.id}/messages`);
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';

        data.messages.forEach(msg => appendChatMessage(msg, false));
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

function appendChatMessage(msg, scroll = true) {
    const container = document.getElementById('chatMessages');
    const isOwn = msg.user_id === state.user?.id;

    const div = document.createElement('div');
    div.className = `chat-message ${isOwn ? 'own' : ''}`;
    div.innerHTML = `
        <div class="message-avatar" style="background: ${msg.user?.avatar_color || '#00d4ff'};">
            ${msg.user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div class="message-content">
            ${!isOwn ? `<div class="message-sender">${escapeHtml(msg.user?.username || '未知')}</div>` : ''}
            ${msg.content ? `<div class="message-text">${escapeHtml(msg.content)}</div>` : ''}
            ${msg.file_path ? `
                <div class="message-file" onclick="window.open('${API_BASE}/chat/files/${msg.file_path}', '_blank')">
                    <i class="fas fa-file"></i>
                    <span>${escapeHtml(msg.file_name || '文件')}</span>
                </div>
            ` : ''}
            <div class="message-time">${formatTime(msg.created_at)}</div>
        </div>
    `;

    container.appendChild(div);
    if (scroll) container.scrollTop = container.scrollHeight;
}

document.getElementById('chatToggleBtn').addEventListener('click', () => {
    document.getElementById('chatPanel').classList.toggle('open');
});

document.getElementById('closeChatBtn').addEventListener('click', () => {
    document.getElementById('chatPanel').classList.remove('open');
});

document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

document.getElementById('chatInput').addEventListener('input', () => {
    if (state.socket && state.currentProject) {
        state.socket.emit('typing', {
            project_id: state.currentProject.id,
            user_id: state.user.id,
            username: state.user.username
        });
    }
});

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const content = input.value.trim();

    if (!content) return;

    const formData = new FormData();
    formData.append('content', content);

    try {
        await apiFormData(`/projects/${state.currentProject.id}/messages`, formData);
        input.value = '';
    } catch (err) {
        showToast(err.message, 'error');
    }
}

document.getElementById('chatFileBtn').addEventListener('click', () => {
    document.getElementById('chatFileInput').click();
});

document.getElementById('chatFileInput').addEventListener('change', async (e) => {
    if (!e.target.files.length) return;

    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('content', '');

    try {
        await apiFormData(`/projects/${state.currentProject.id}/messages`, formData);
    } catch (err) {
        showToast(err.message, 'error');
    }

    e.target.value = '';
});

// ==================== AI ASSISTANT ====================
document.getElementById('aiToggleBtn').addEventListener('click', () => {
    document.getElementById('aiPanel').classList.toggle('open');
});

document.getElementById('closeAiBtn').addEventListener('click', () => {
    document.getElementById('aiPanel').classList.remove('open');
});

document.getElementById('saveAiConfigBtn').addEventListener('click', async () => {
    const api_base = document.getElementById('openaiApiBase').value;
    const api_key = document.getElementById('openaiApiKey').value;
    const model = document.getElementById('openaiModel').value;

    try {
        await api('/ai/config', {
            method: 'PUT',
            body: JSON.stringify({ api_base, api_key, model })
        });
        showToast('AI配置已保存', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

document.getElementById('aiAskBtn').addEventListener('click', askAI);
document.getElementById('aiQuestionInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') askAI();
});

async function askAI() {
    const input = document.getElementById('aiQuestionInput');
    const question = input.value.trim();

    if (!question || !state.currentProject) return;

    const container = document.getElementById('aiChatMessages');

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-message user';
    userMsg.innerHTML = `<p>${escapeHtml(question)}</p>`;
    container.appendChild(userMsg);

    input.value = '';

    // Add loading
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-message assistant';
    loadingMsg.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> 思考中...</p>';
    container.appendChild(loadingMsg);
    container.scrollTop = container.scrollHeight;

    try {
        const data = await api(`/projects/${state.currentProject.id}/ai/ask`, {
            method: 'POST',
            body: JSON.stringify({ question })
        });

        loadingMsg.innerHTML = `<p>${marked.parse(data.answer)}</p>`;
    } catch (err) {
        loadingMsg.innerHTML = `<p style="color: var(--accent-danger);">${err.message}</p>`;
    }

    container.scrollTop = container.scrollHeight;
}

function updateCardSelectList() {
    const container = document.getElementById('cardSelectList');
    container.innerHTML = state.cards.map(card => `
        <label class="card-select-item">
            <input type="checkbox" value="${card.id}">
            <span>${escapeHtml(card.title)}</span>
        </label>
    `).join('') || '<p class="text-muted">暂无卡片</p>';
}

document.getElementById('summarizeBtn').addEventListener('click', async () => {
    const selectedIds = Array.from(document.querySelectorAll('#cardSelectList input:checked'))
        .map(cb => parseInt(cb.value));

    if (!selectedIds.length) {
        showToast('请选择要总结的卡片', 'error');
        return;
    }

    const summaryContent = document.getElementById('summaryContent');
    summaryContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    openModal('summaryModal');

    try {
        const data = await api(`/projects/${state.currentProject.id}/ai/summarize`, {
            method: 'POST',
            body: JSON.stringify({ card_ids: selectedIds })
        });

        summaryContent.innerHTML = marked.parse(data.summary);
    } catch (err) {
        summaryContent.innerHTML = `<p style="color: var(--accent-danger);">${err.message}</p>`;
    }
});

document.getElementById('copySummaryBtn').addEventListener('click', () => {
    const content = document.getElementById('summaryContent').innerText;
    navigator.clipboard.writeText(content);
    showToast('已复制到剪贴板', 'success');
});

// ==================== NAVIGATION ====================
document.getElementById('backToProjects').addEventListener('click', () => {
    if (state.socket) {
        state.socket.emit('leave', { project_id: state.currentProject.id });
        state.socket.disconnect();
    }
    state.currentProject = null;
    document.getElementById('chatPanel').classList.remove('open');
    document.getElementById('aiPanel').classList.remove('open');
    loadDashboard();
});

// ==================== UTILITIES ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

    return date.toLocaleDateString('zh-CN');
}

function formatTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return '已过期';
    if (diff < 86400000) return '今天';
    if (diff < 172800000) return '明天';

    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function getDueDateClass(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return 'overdue';
    if (diff < 86400000) return 'soon';
    return '';
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(type) {
    const icons = {
        'text': 'file-alt',
        'word': 'file-word',
        'excel': 'file-excel',
        'powerpoint': 'file-powerpoint',
        'pdf': 'file-pdf',
        'image': 'file-image',
        'other': 'file'
    };
    return icons[type] || 'file';
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ==================== FONT SIZE SETTINGS ====================
function initFontSizeSettings() {
    const savedSize = localStorage.getItem('fontSize') || 'medium';
    setFontSize(savedSize);

    const fontSizeSelect = document.getElementById('fontSizeSelect');
    if (fontSizeSelect) {
        fontSizeSelect.value = savedSize;
        fontSizeSelect.addEventListener('change', (e) => {
            setFontSize(e.target.value);
        });
    }
}

function setFontSize(size) {
    // Remove all font size classes
    document.documentElement.classList.remove(
        'font-size-small',
        'font-size-medium',
        'font-size-large',
        'font-size-xlarge'
    );

    // Add the selected font size class
    document.documentElement.classList.add(`font-size-${size}`);

    // Save to localStorage
    localStorage.setItem('fontSize', size);
}

// ==================== THEME SETTINGS ====================
function initThemeSettings() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = savedTheme;
        themeSelect.addEventListener('change', (e) => {
            setTheme(e.target.value);
        });
    }
}

function setTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
}

// ==================== INIT ====================
async function init() {
    // Initialize theme and font size immediately
    initThemeSettings();
    initFontSizeSettings();

    if (state.token) {
        try {
            state.user = await api('/auth/me');
            updateUserUI();
            loadDashboard();
        } catch (err) {
            localStorage.removeItem('token');
            state.token = null;
            showView('authView');
        }
    } else {
        showView('authView');
    }
}

init();


// ==================== KANBAN MANAGER ====================
let tempColumns = [];

function openColumnManager() {
    if (!state.currentProject) return;
    // ensure columns exists
    if (!state.currentProject.columns || state.currentProject.columns.length === 0) {
        state.currentProject.columns = ['待办', '进行中', '已完成'];
    }
    tempColumns = [...state.currentProject.columns];
    renderColumnList();
    openModal('columnManagerModal');
}

function renderColumnList() {
    const listEl = document.getElementById('columnList');
    listEl.innerHTML = tempColumns.map((col, index) => `
        <div class="column-item" draggable="true" data-index="${index}">
            <div class="column-handle"><i class="fas fa-grip-vertical"></i></div>
            <input type="text" value="${escapeHtml(col)}" oninput="updateColumnName(${index}, this.value)" placeholder="列名称">
            <div class="column-actions">
                <div class="column-btn" onclick="moveColumn(${index}, -1)" title="上移"><i class="fas fa-arrow-up"></i></div>
                <div class="column-btn" onclick="moveColumn(${index}, 1)" title="下移"><i class="fas fa-arrow-down"></i></div>
                <div class="column-btn delete" onclick="deleteColumn(${index})" title="删除"><i class="fas fa-trash"></i></div>
            </div>
        </div>
    `).join('');

    // Init Drag and Drop
    initColumnDrag();
}

function addColumnItem() {
    const input = document.getElementById('newColumnName');
    const name = input.value.trim();
    if (name) {
        tempColumns.push(name);
        input.value = '';
        renderColumnList();
        // Scroll to bottom
        setTimeout(() => {
            const list = document.getElementById('columnList');
            list.scrollTop = list.scrollHeight;
        }, 50);
    }
}

function updateColumnName(index, value) {
    if (value.trim()) {
        tempColumns[index] = value.trim();
    }
}

function deleteColumn(index) {
    if (tempColumns.length <= 1) {
        showToast('至少保留一列', 'warning');
        return;
    }
    const colName = tempColumns[index];
    if (confirm(`确定删除"${colName}"吗？如果要删除的列中包含卡片，保存时会失败。`)) {
        tempColumns.splice(index, 1);
        renderColumnList();
    }
}

function moveColumn(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < tempColumns.length) {
        const item = tempColumns.splice(index, 1)[0];
        tempColumns.splice(newIndex, 0, item);
        renderColumnList();
    }
}

async function saveColumns() {
    try {
        if (!state.currentProject) return;

        // Validate names
        if (tempColumns.some(c => !c.trim())) {
            showToast('列名称不能为空', 'warning');
            return;
        }
        // Unique check
        const unique = new Set(tempColumns);
        if (unique.size !== tempColumns.length) {
            showToast('列名称不能重复', 'warning');
            return;
        }

        const project = await api(`/projects/${state.currentProject.id}/columns`, {
            method: 'PUT',
            body: JSON.stringify({ columns: tempColumns })
        });

        state.currentProject = project;
        closeModal('columnManagerModal');
        renderKanban();
        showToast('看板列已更新', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function initColumnDrag() {
    const list = document.getElementById('columnList');
    let draggedItem = null;

    list.querySelectorAll('.column-item').forEach(item => {
        item.addEventListener('dragstart', e => {
            draggedItem = item;
            setTimeout(() => item.classList.add('dragging'), 0);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedItem = null;
            updateColumnsFromDOM();
        });
    });

    list.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(list, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (afterElement == null) {
            list.appendChild(dragging);
        } else {
            list.insertBefore(dragging, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.column-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateColumnsFromDOM() {
    const newOrder = [];
    document.querySelectorAll('#columnList .column-item input').forEach(input => {
        newOrder.push(input.value);
    });
    tempColumns = newOrder;
    renderColumnList();
}

// ==================== UNREAD HELPER ====================
function markProjectRead(projectId) {
    if (!projectId) return;
    api(`/projects/${projectId}/read`, { method: 'POST' }).then(() => {
        if (state.currentProject && state.currentProject.id === projectId) {
            state.currentProject.unread_count = 0;
        }
        const pIndex = state.projects.findIndex(p => p.id === projectId);
        if (pIndex !== -1) state.projects[pIndex].unread_count = 0;
    }).catch(console.error);
}

// ==================== CHAT FILE HELPER ====================
async function openChatFile(filename, type) {
    // Determine if we should use OnlyOffice
    if (shouldUseOnlyOffice(type)) {
        await openChatFileOnlyOffice(filename);
    } else {
        window.open(`${API_BASE}/chat/files/${filename}`, '_blank');
    }
}

async function openChatFileOnlyOffice(filename) {
    try {
        const result = await api(`/chat/files/${filename}/onlyoffice-config`);
        const { config, onlyoffice_url } = result;

        const apiLoaded = await loadOnlyOfficeApi(onlyoffice_url);
        if (!apiLoaded) {
            window.open(`${API_BASE}/chat/files/${filename}`, '_blank');
            return;
        }

        openModal('onlyofficeModal');

        if (onlyOfficeDocEditor) {
            onlyOfficeDocEditor.destroyEditor();
            onlyOfficeDocEditor = null;
        }
        document.getElementById('onlyofficeEditor').innerHTML = '';
        onlyOfficeDocEditor = new DocsAPI.DocEditor('onlyofficeEditor', config);

    } catch (err) {
        showToast('无法打开 OnlyOffice: ' + err.message, 'error');
        window.open(`${API_BASE}/chat/files/${filename}`, '_blank');
    }
}
