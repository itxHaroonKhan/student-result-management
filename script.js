'use strict';

/* ============================================================
   STATE
   ============================================================ */

let students = [];          // Master array of student objects
let currentFilter = 'all'; // 'all' | 'pass' | 'fail'
let currentSort   = 'default';
let searchQuery   = '';

/* ============================================================
   GRADE / SCORE UTILITIES
   ============================================================ */

function calcTotal(math, physics, prog) {
    return math + physics + prog;
}

function calcPercentage(total) {
    return parseFloat(((total / 300) * 100).toFixed(2));
}

function calcGrade(pct) {
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
}

function calcStatus(grade) {
    return grade === 'F' ? 'Fail' : 'Pass';
}

// Returns the CSS class to colour-code a grade badge
function gradeClass(grade) {
    return { A: 'grade-a', B: 'grade-b', C: 'grade-c', D: 'grade-d', F: 'grade-f' }[grade] || '';
}

/* ============================================================
   LOCAL STORAGE
   ============================================================ */

function saveToStorage() {
    localStorage.setItem('srms_v2_students', JSON.stringify(students));
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem('srms_v2_students');
        students = raw ? JSON.parse(raw) : [];
    } catch {
        students = [];
    }
}

/* ============================================================
   ALERT NOTIFICATIONS
   ============================================================ */

function showAlert(message, type = 'success') {
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const container = document.getElementById('alertContainer');

    const el = document.createElement('div');
    el.className = `alert alert-${type}`;
    el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(el);

    // Auto-remove after 3.2 s
    setTimeout(() => {
        el.classList.add('fade-out');
        el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 3200);
}

/* ============================================================
   FORM VALIDATION
   ============================================================ */

function clearFieldState() {
    ['studentName','rollNumber','mathMarks','physicsMarks','programmingMarks'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('field-error', 'field-ok');
    });
    ['nameError','rollError','mathError','physicsError','programmingError'].forEach(id => {
        document.getElementById(id).textContent = '';
    });
}

function setFieldError(inputId, errId, msg) {
    const input = document.getElementById(inputId);
    input.classList.add('field-error');
    input.classList.remove('field-ok');
    document.getElementById(errId).textContent = msg;
}

function setFieldOk(inputId) {
    const input = document.getElementById(inputId);
    input.classList.remove('field-error');
    input.classList.add('field-ok');
}

// Returns a parsed form data object if valid, otherwise null
function validateForm() {
    clearFieldState();
    let ok = true;
    const editIndex = parseInt(document.getElementById('editIndex').value, 10);

    const name = document.getElementById('studentName').value.trim();
    const roll = document.getElementById('rollNumber').value.trim();

    // — Name —
    if (!name) {
        setFieldError('studentName', 'nameError', 'Student name is required.');
        ok = false;
    } else if (name.length < 2) {
        setFieldError('studentName', 'nameError', 'Name must be at least 2 characters.');
        ok = false;
    } else {
        setFieldOk('studentName');
    }

    // — Roll Number (must be unique, skip self when editing) —
    if (!roll) {
        setFieldError('rollNumber', 'rollError', 'Roll number is required.');
        ok = false;
    } else {
        const duplicate = students.some((s, i) => s.roll.toLowerCase() === roll.toLowerCase() && i !== editIndex);
        if (duplicate) {
            setFieldError('rollNumber', 'rollError', 'This roll number already exists.');
            ok = false;
        } else {
            setFieldOk('rollNumber');
        }
    }

    // — Marks validator helper —
    function validateMarks(inputId, errId, label) {
        const raw = document.getElementById(inputId).value.trim();
        if (raw === '') {
            setFieldError(inputId, errId, `${label} marks are required.`);
            return null;
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
            setFieldError(inputId, errId, `${label} must be between 0 and 100.`);
            return null;
        }
        setFieldOk(inputId);
        return n;
    }

    const math = validateMarks('mathMarks',       'mathError',        'Math');
    const phys = validateMarks('physicsMarks',     'physicsError',     'Physics');
    const prog = validateMarks('programmingMarks', 'programmingError', 'Programming');

    if (math === null || phys === null || prog === null) ok = false;

    if (!ok) return null;
    return { name, roll, math, physics: phys, programming: prog };
}

/* ============================================================
   CRUD — ADD, UPDATE, DELETE
   ============================================================ */

function buildStudentObject(base, data) {
    const total      = calcTotal(data.math, data.physics, data.programming);
    const percentage = calcPercentage(total);
    const grade      = calcGrade(percentage);
    const status     = calcStatus(grade);
    return { ...base, name: data.name, roll: data.roll, math: data.math,
             physics: data.physics, programming: data.programming,
             total, percentage, grade, status };
}

function addStudent(data) {
    const student = buildStudentObject({ id: Date.now() }, data);
    students.push(student);
    saveToStorage();
    showAlert(`"${data.name}" has been added successfully!`, 'success');
}

function updateStudent(index, data) {
    students[index] = buildStudentObject(students[index], data);
    saveToStorage();
    showAlert(`"${data.name}" has been updated!`, 'success');
}

function deleteStudent(index) {
    const { name } = students[index];
    students.splice(index, 1);
    saveToStorage();
    showAlert(`"${name}" has been removed.`, 'info');
    refreshUI();
}

/* ============================================================
   FORM — RESET AND EDIT MODE
   ============================================================ */

function resetForm() {
    document.getElementById('studentForm').reset();
    document.getElementById('editIndex').value = '-1';
    document.getElementById('formTitle').innerHTML  = '<i class="fas fa-user-plus"></i> Add New Student';
    document.getElementById('submitBtn').innerHTML  = '<i class="fas fa-plus"></i> Add Student';
    document.getElementById('cancelBtn').style.display = 'none';
    clearFieldState();
}

// Called from table row's edit button
function startEdit(index) {
    const s = students[index];
    document.getElementById('editIndex').value       = index;
    document.getElementById('studentName').value     = s.name;
    document.getElementById('rollNumber').value      = s.roll;
    document.getElementById('mathMarks').value       = s.math;
    document.getElementById('physicsMarks').value    = s.physics;
    document.getElementById('programmingMarks').value = s.programming;

    document.getElementById('formTitle').innerHTML  = '<i class="fas fa-user-edit"></i> Edit Student Record';
    document.getElementById('submitBtn').innerHTML  = '<i class="fas fa-save"></i> Save Changes';
    document.getElementById('cancelBtn').style.display = 'inline-flex';

    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Called from table row's delete button — opens custom modal
function confirmDelete(index) {
    openDeleteModal(index);
}

// Make edit/delete accessible from inline onclick attributes
window.startEdit     = startEdit;
window.confirmDelete = confirmDelete;

/* ============================================================
   CUSTOM DELETE MODAL
   ============================================================ */

let pendingDeleteIndex = -1;  // stores which student is about to be deleted

function openDeleteModal(index) {
    const s = students[index];
    pendingDeleteIndex = index;

    document.getElementById('modalStudentName').textContent = s.name;
    document.getElementById('modalStudentRoll').textContent = `Roll No: ${s.roll}`;

    document.getElementById('deleteModal').classList.add('open');
    // Focus the "No" button by default so pressing Enter doesn't accidentally delete
    setTimeout(() => document.getElementById('modalNoBtn').focus(), 50);
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('open');
    pendingDeleteIndex = -1;
}

function handleModalYes() {
    if (pendingDeleteIndex >= 0) {
        deleteStudent(pendingDeleteIndex);
    }
    closeDeleteModal();
}

/* ============================================================
   STATISTICS & TOPPER
   ============================================================ */

function getTopper() {
    if (!students.length) return null;
    return students.reduce((best, s) => (s.percentage > best.percentage ? s : best), students[0]);
}

function updateStats() {
    const total  = students.length;
    const passed = students.filter(s => s.status === 'Pass').length;
    const failed = total - passed;
    const topper = getTopper();

    document.getElementById('totalStudents').textContent  = total;
    document.getElementById('passedStudents').textContent = passed;
    document.getElementById('failedStudents').textContent = failed;
    document.getElementById('topperStatName').textContent = topper ? topper.name.split(' ')[0] : '—';

    // Topper detail card
    const card = document.getElementById('topperCard');
    if (topper) {
        card.style.display = 'block';
        document.getElementById('topperAvatar').textContent     = topper.name.charAt(0).toUpperCase();
        document.getElementById('topperDetailName').textContent = topper.name;
        document.getElementById('topperRoll').textContent       = `Roll No: ${topper.roll}`;

        const gradeEl = document.getElementById('topperGrade');
        gradeEl.textContent = `Grade ${topper.grade}`;
        gradeEl.className   = `badge ${gradeClass(topper.grade)}`;

        document.getElementById('topperPercentage').textContent = `${topper.percentage}%`;

        const statusEl = document.getElementById('topperStatus');
        statusEl.textContent = topper.status;
        statusEl.className   = `badge ${topper.status === 'Pass' ? 'badge-status-pass' : 'badge-status-fail'}`;

        document.getElementById('topperSubjects').innerHTML = `
            <span class="subject-chip">Math: ${topper.math}</span>
            <span class="subject-chip">Physics: ${topper.physics}</span>
            <span class="subject-chip">Prog: ${topper.programming}</span>
            <span class="subject-chip">Total: ${topper.total}/300</span>
        `;
    } else {
        card.style.display = 'none';
    }
}

/* ============================================================
   TABLE — FILTER, SORT, RENDER
   ============================================================ */

function getVisibleStudents() {
    let list = [...students];

    // 1. Search by roll number (case-insensitive)
    if (searchQuery) {
        list = list.filter(s => s.roll.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // 2. Pass / Fail filter
    if (currentFilter === 'pass') list = list.filter(s => s.status === 'Pass');
    if (currentFilter === 'fail') list = list.filter(s => s.status === 'Fail');

    // 3. Sort
    switch (currentSort) {
        case 'name-asc':          list.sort((a,b) => a.name.localeCompare(b.name)); break;
        case 'name-desc':         list.sort((a,b) => b.name.localeCompare(a.name)); break;
        case 'percentage-desc':   list.sort((a,b) => b.percentage - a.percentage); break;
        case 'percentage-asc':    list.sort((a,b) => a.percentage - b.percentage); break;
        case 'roll-asc':
            list.sort((a,b) => a.roll.localeCompare(b.roll, undefined, { numeric: true })); break;
    }

    return list;
}

function renderTable() {
    const tbody      = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    const recordCount = document.getElementById('recordCount');
    const list    = getVisibleStudents();
    const topper  = getTopper();

    if (list.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        recordCount.textContent  = 'No records match the current filters';
        return;
    }

    emptyState.style.display = 'none';
    recordCount.textContent  =
        `Showing ${list.length} of ${students.length} student${students.length !== 1 ? 's' : ''}`;

    tbody.innerHTML = list.map((s, idx) => {
        const actualIndex = students.indexOf(s);   // index in master array for edit/delete
        const isTopper    = topper && s.id === topper.id;
        const pctClass    = s.status === 'Pass' ? 'pct-pass' : 'pct-fail';

        return `
        <tr class="${isTopper ? 'topper-row' : ''}">
            <td data-label="#">
                <span class="rank-badge ${isTopper ? 'rank-gold' : ''}">
                    ${isTopper ? '<i class="fas fa-crown"></i>' : idx + 1}
                </span>
            </td>
            <td data-label="Name" class="name-cell">
                ${s.name}
                ${isTopper ? '<i class="fas fa-star name-star"></i>' : ''}
            </td>
            <td data-label="Roll No"><span class="roll-code">${s.roll}</span></td>
            <td data-label="Math" class="marks-val">${s.math}</td>
            <td data-label="Physics" class="marks-val">${s.physics}</td>
            <td data-label="Prog." class="marks-val">${s.programming}</td>
            <td data-label="Total" class="total-val">${s.total} / 300</td>
            <td data-label="Percentage" class="${pctClass}">${s.percentage}%</td>
            <td data-label="Grade"><span class="badge ${gradeClass(s.grade)}">${s.grade}</span></td>
            <td data-label="Status">
                <span class="badge ${s.status === 'Pass' ? 'badge-status-pass' : 'badge-status-fail'}">
                    ${s.status}
                </span>
            </td>
            <td data-label="Actions">
                <div class="action-btns">
                    <button class="tbl-btn tbl-btn-edit" onclick="startEdit(${actualIndex})" title="Edit record">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="tbl-btn tbl-btn-del" onclick="confirmDelete(${actualIndex})" title="Delete record">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

/* ============================================================
   MASTER REFRESH
   ============================================================ */

function refreshUI() {
    updateStats();
    renderTable();
}

/* ============================================================
   EXPORT — CSV
   ============================================================ */

function exportCSV() {
    if (!students.length) { showAlert('No student data to export.', 'error'); return; }

    const headers = ['Name','Roll No','Math','Physics','Programming','Total','Percentage','Grade','Status'];
    const rows = students.map(s => [
        `"${s.name}"`, s.roll, s.math, s.physics, s.programming,
        s.total, `${s.percentage}%`, s.grade, s.status
    ].join(','));

    const csv  = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href     = url;
    a.download = `student_results_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showAlert('Exported to CSV successfully!', 'success');
}

/* ============================================================
   EXPORT — PDF (via jsPDF + AutoTable)
   ============================================================ */

function exportPDF() {
    if (!students.length) { showAlert('No student data to export.', 'error'); return; }

    if (!window.jspdf) { showAlert('PDF library not loaded. Check your internet connection.', 'error'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text('Student Result Management System', 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
        `Report Date: ${new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'})}` +
        `   |   Total Students: ${students.length}` +
        `   |   Passed: ${students.filter(s=>s.status==='Pass').length}` +
        `   |   Failed: ${students.filter(s=>s.status==='Fail').length}`,
        14, 26
    );

    // Topper note
    const topper = getTopper();
    if (topper) {
        doc.setFontSize(9);
        doc.setTextColor(245, 158, 11);
        doc.text(`Class Topper: ${topper.name}  (${topper.percentage}%  Grade ${topper.grade})`, 14, 32);
    }

    doc.autoTable({
        startY: 37,
        head: [['#','Name','Roll No','Math','Physics','Prog.','Total','Percentage','Grade','Status']],
        body: students.map((s, i) => [
            i + 1, s.name, s.roll, s.math, s.physics, s.programming,
            `${s.total}/300`, `${s.percentage}%`, s.grade, s.status
        ]),
        styles: {
            fontSize: 9,
            cellPadding: 4,
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8.5,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: function (data) {
            // Colour the Status column text
            if (data.section === 'body' && data.column.index === 9) {
                data.cell.styles.textColor = data.cell.raw === 'Pass' ? [16, 185, 129] : [239, 68, 68];
                data.cell.styles.fontStyle = 'bold';
            }
            // Colour Grade column
            if (data.section === 'body' && data.column.index === 8) {
                const colours = { A:[16,185,129], B:[59,130,246], C:[245,158,11], D:[249,115,22], F:[239,68,68] };
                data.cell.styles.textColor = colours[data.cell.raw] || [0,0,0];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        foot: [[
            '', 'TOTAL', '', '', '', '',
            students.reduce((a,s)=>a+s.total,0)+'/'+students.length*300,
            (students.reduce((a,s)=>a+s.percentage,0)/students.length).toFixed(2)+'%',
            '', students.filter(s=>s.status==='Pass').length+' Pass'
        ]],
        footStyles: { fillColor: [241,245,249], textColor: [15,23,42], fontStyle: 'bold', fontSize: 8 },
    });

    doc.save(`student_results_${today()}.pdf`);
    showAlert('Exported to PDF successfully!', 'success');
}

/* ============================================================
   DARK MODE
   ============================================================ */

function initDarkMode() {
    const saved = localStorage.getItem('srms_theme') || 'light';
    applyTheme(saved);
}

function toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('srms_theme', theme);
    const icon = document.querySelector('#darkModeToggle i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

/* ============================================================
   HELPERS
   ============================================================ */

function today() {
    return new Date().toISOString().slice(0, 10);
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function attachListeners() {
    // Form submit — add or update
    document.getElementById('studentForm').addEventListener('submit', e => {
        e.preventDefault();
        const data = validateForm();
        if (!data) {
            showAlert('Please fix the errors highlighted above.', 'error');
            return;
        }
        const idx = parseInt(document.getElementById('editIndex').value, 10);
        if (idx >= 0) {
            updateStudent(idx, data);
        } else {
            addStudent(data);
        }
        resetForm();
        refreshUI();
    });

    // Cancel edit mode
    document.getElementById('cancelBtn').addEventListener('click', resetForm);

    // Clear form button
    document.getElementById('clearBtn').addEventListener('click', () => {
        resetForm();
    });

    // Live search by roll number
    document.getElementById('searchInput').addEventListener('input', e => {
        searchQuery = e.target.value.trim();
        renderTable();
    });

    // Clear search
    document.getElementById('clearSearch').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        searchQuery = '';
        renderTable();
    });

    // Filter buttons (All / Passed / Failed)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTable();
        });
    });

    // Sort dropdown
    document.getElementById('sortSelect').addEventListener('change', e => {
        currentSort = e.target.value;
        renderTable();
    });

    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // Export buttons
    document.getElementById('exportCSV').addEventListener('click', exportCSV);
    document.getElementById('exportPDF').addEventListener('click', exportPDF);

    // Delete modal — Yes button
    document.getElementById('modalYesBtn').addEventListener('click', handleModalYes);

    // Delete modal — No button
    document.getElementById('modalNoBtn').addEventListener('click', closeDeleteModal);

    // Delete modal — click outside the box to close
    document.getElementById('deleteModal').addEventListener('click', e => {
        if (e.target === document.getElementById('deleteModal')) closeDeleteModal();
    });

    // Delete modal — Escape key to close
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDeleteModal();
    });
}

/* ============================================================
   INIT
   ============================================================ */

function init() {
    loadFromStorage();
    initDarkMode();
    attachListeners();
    refreshUI();
}

document.addEventListener('DOMContentLoaded', init);
