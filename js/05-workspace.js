import { lsGet, lsSet, esc, normalizeTaskList, normalizeNoteList } from './storage.js';

/* WORKSPACE — Living Pixel Diorama
   Native ES module. Cross-file dependencies are declared with imports and exports. */
/* ============================================================================
           7. EDITORIAL GLASS JOURNAL (TASKS & NOTES)
           ============================================================================ */
        const DEFAULT_TASKS = [
            { text: 'Arka plandaki habitata tıklayarak canlıları besle', done: false, priority: 'high' },
            { text: 'Cam barın altından geçen canlıların kırılmasını izle', done: false, priority: 'normal' }
        ];
        const DEFAULT_NOTES = [
            { title: 'Habitat Etkileşimi', body: 'Her canlı kendi doğasına uygun yeme tepki verir ve tadına baktıktan sonra zarifçe uzaklaşır.', date: 'Bugün' }
        ];
        // ============================================================================
// BÖLÜM BAŞI: GÖREV VE NOT VERİLERİ / YEREL KAYIT
// ============================================================================

export let tasks = normalizeTaskList(lsGet('diorama_tasks', null), DEFAULT_TASKS);
        export let notes = normalizeNoteList(lsGet('diorama_notes', null), DEFAULT_NOTES);

        const priorities = ['normal', 'high', 'low'];
        let currentPriorityIdx = 0;
        const priorityColors = { high: 'bg-rose-400', normal: 'bg-sky-400', low: 'bg-emerald-400' };

        document.getElementById('priorityCycleBtn').addEventListener('click', () => {
            currentPriorityIdx = (currentPriorityIdx + 1) % priorities.length;
            const p = priorities[currentPriorityIdx];
            document.getElementById('priorityDotIndicator').className = `w-2 h-2 rounded-full ${priorityColors[p]}`;
        });

        const tasksListContainer = document.getElementById('tasksListContainer');
        const taskCountBadge = document.getElementById('taskCountBadge');
        const taskProgressBar = document.getElementById('taskProgressBar');
        const remainingTasksLabel = document.getElementById('remainingTasksLabel');
        const stickyNotesGrid = document.getElementById('stickyNotesGrid');

        // ============================================================================
// BÖLÜM SONU: GÖREV VE NOT VERİLERİ
// BÖLÜM BAŞI: GÖREV LİSTESİNİN OLUŞTURULMASI VE ETKİLEŞİMİ
// ============================================================================

export function renderTasks() {
            lsSet('diorama_tasks', tasks);
            tasksListContainer.innerHTML = '';
            const activeCount = tasks.filter(t => !t.done).length;
            const doneCount = tasks.filter(t => t.done).length;
            taskCountBadge.textContent = activeCount;
            remainingTasksLabel.textContent = `${activeCount} aktif satır`;
            const completion = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
            taskProgressBar.style.width = `${completion}%`;
            taskProgressBar.setAttribute('aria-valuenow', String(completion));

            tasks.forEach((t, idx) => {
                const row = document.createElement('div');
                row.className = `flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition ${t.done ? 'bg-white/[0.02] border-white/5 opacity-45' : 'bg-white/[0.05] border-white/10 hover:border-white/20'}`;
                row.innerHTML = `
                    <button type="button" class="toggle-task-btn flex items-center gap-2.5 flex-1 min-w-0 text-left" aria-pressed="${t.done ? 'true' : 'false'}" aria-label="${t.done ? 'Görevi yeniden aç' : 'Görevi tamamla'}: ${esc(t.text)}">
                        <span class="w-4 h-4 rounded-full border ${t.done ? 'bg-white border-white' : 'border-white/40'} flex items-center justify-center shrink-0">${t.done ? '<svg class="w-2.5 h-2.5 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="5 12 10 17 19 7"/></svg>' : ''}</span>
                        <span class="text-xs truncate ${t.done ? 'line-through text-white/55' : 'text-white/90'}">${esc(t.text)}</span>
                    </button>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="w-1.5 h-1.5 rounded-full ${priorityColors[priorityColors[t.priority] ? t.priority : 'normal']}"></span>
                        <button type="button" aria-label="Görevi sil: ${esc(t.text)}" class="del-task-btn text-white/50 hover:text-white text-xs p-1">✕</button>
                    </div>
                `;
                row.querySelector('.toggle-task-btn').addEventListener('click', () => {
                    tasks[idx].done = !tasks[idx].done;
                    renderTasks();
                });
                row.querySelector('.del-task-btn').addEventListener('click', () => {
                    tasks.splice(idx, 1);
                    renderTasks();
                });
                tasksListContainer.appendChild(row);
            });
        }
        renderTasks();

        document.getElementById('addTaskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const inp = document.getElementById('newTaskInput');
            const val = inp.value.trim();
            if (!val) return;
            tasks.unshift({ text: val, done: false, priority: priorities[currentPriorityIdx] });
            inp.value = '';
            renderTasks();
        });

        document.getElementById('clearDoneTasksBtn').addEventListener('click', () => {
            tasks = tasks.filter(t => !t.done);
            renderTasks();
        });

        // ============================================================================
// BÖLÜM SONU: GÖREV LİSTESİ
// BÖLÜM BAŞI: NOT LİSTESİNİN OLUŞTURULMASI VE ETKİLEŞİMİ
// ============================================================================

export function renderNotes() {
            lsSet('diorama_notes', notes);
            stickyNotesGrid.innerHTML = '';
            notes.forEach((n, idx) => {
                const card = document.createElement('div');
                card.className = 'p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition flex flex-col gap-1.5 group';
                card.innerHTML = `
                    <div class="flex items-center justify-between gap-2">
                        <h4 class="text-xs font-medium text-white/90 truncate">${esc(n.title)}</h4>
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] font-mono text-white/55">${esc(n.date)}</span>
                            <button type="button" aria-label="Notu sil: ${esc(n.title || 'başlıksız not')}" class="opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 text-[11px] text-white/60 hover:text-white transition p-1">✕</button>
                        </div>
                    </div>
                    <p class="text-xs text-white/70 leading-relaxed break-words">${esc(n.body)}</p>
                `;
                card.querySelector('button').addEventListener('click', () => {
                    notes.splice(idx, 1);
                    renderNotes();
                });
                stickyNotesGrid.appendChild(card);
            });
        }
        renderNotes();

        document.getElementById('addNoteCardForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const tEl = document.getElementById('noteTitleInput');
            const bEl = document.getElementById('noteBodyInput');
            const body = bEl.value.trim();
            if (!body) return;
            const title = tEl.value.trim() || 'Not';
            const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            notes.unshift({ title, body, date: nowStr });
            tEl.value = '';
            bEl.value = '';
            renderNotes();
        });

        // ============================================================================
// BÖLÜM SONU: NOT LİSTESİ
// BÖLÜM BAŞI: GÖREV/NOT SEKME GEÇİŞİ VE DIŞARIYA AÇILAN DURUM GÜNCELLEYİCİLERİ
// ============================================================================

function activateWorkspaceTab(btn, moveFocus = false) {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.workspace-tab-btn').forEach(b => {
                const selected = b === btn;
                b.setAttribute('aria-selected', selected ? 'true' : 'false');
                b.tabIndex = selected ? 0 : -1;
                b.className = selected
                    ? 'workspace-tab-btn px-3 py-1 rounded-lg text-xs font-medium bg-white/15 text-white transition'
                    : 'workspace-tab-btn px-3 py-1 rounded-lg text-xs font-medium text-white/55 hover:text-white transition';
            });
            document.getElementById('tasksTabView').classList.toggle('hidden', tab !== 'tasks');
            document.getElementById('notesTabView').classList.toggle('hidden', tab !== 'notes');
            if (moveFocus) btn.focus();
        }

        const workspaceTabs = Array.from(document.querySelectorAll('.workspace-tab-btn'));
        workspaceTabs.forEach(btn => {
            btn.addEventListener('click', () => activateWorkspaceTab(btn));
            btn.addEventListener('keydown', (e) => {
                const current = workspaceTabs.indexOf(btn);
                let next = current;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % workspaceTabs.length;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (current - 1 + workspaceTabs.length) % workspaceTabs.length;
                else if (e.key === 'Home') next = 0;
                else if (e.key === 'End') next = workspaceTabs.length - 1;
                else return;
                e.preventDefault();
                activateWorkspaceTab(workspaceTabs[next], true);
            });
        });

        
export function setTasks(next) { tasks = Array.isArray(next) ? next : []; }
export function setNotes(next) { notes = Array.isArray(next) ? next : []; }

// ============================================================================
// BÖLÜM SONU: GÖREV/NOT SEKME GEÇİŞİ VE DURUM GÜNCELLEYİCİLERİ
// ============================================================================
