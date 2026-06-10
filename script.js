// ══════════════════════════════════════════
//  VOICEHELPER – script.js (refactored)
// ══════════════════════════════════════════

const API_KEY = "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";

// ── Timer ──
let seconds = 0;
let timerInterval = null;
const timerDisplay = document.getElementById("timer");
function updateTimer() {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    timerDisplay.innerText = `${mins}:${secs}`;
}

// ── Language & Recording ──
let currentLanguage = "vi";
let currentMode = null; // "study" | "work" | null
let isRecording = false;
const transcriptBox = document.getElementById("transcript");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "vi-VN";

function getTodayStr() {
    return new Date().toISOString().split("T")[0];
}

// ══════════════════════════════════════════
//  MULTI-NOTE STORAGE PER DAY
//  Format: localStorage key = "notes_YYYY-MM-DD"
//  Value = JSON array of note objects:
//  [{id, title, transcript, analysis: {tomtat, ychinhs, flashcards}, createdAt}]
// ══════════════════════════════════════════

function getNotesForDate(dateStr) {
    try {
        const raw = localStorage.getItem("notes_" + dateStr);
        return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
}

function saveNotesForDate(dateStr, notes) {
    localStorage.setItem("notes_" + dateStr, JSON.stringify(notes));
    renderCalendar(calendarViewYear, calendarViewMonth);
}

function addNoteToDate(dateStr, noteObj) {
    const notes = getNotesForDate(dateStr);
    notes.push(noteObj);
    saveNotesForDate(dateStr, notes);
}

function deleteNoteById(dateStr, noteId) {
    let notes = getNotesForDate(dateStr);
    notes = notes.filter(n => n.id !== noteId);
    if (notes.length === 0) {
        localStorage.removeItem("notes_" + dateStr);
    } else {
        saveNotesForDate(dateStr, notes);
    }
    renderCalendar(calendarViewYear, calendarViewMonth);
}

function getAllDatesWithNotes() {
    const dates = [];
    for (let k in localStorage) {
        if (k.startsWith("notes_")) {
            const dateStr = k.replace("notes_", "");
            const notes = getNotesForDate(dateStr);
            if (notes.length > 0) dates.push(dateStr);
        }
    }
    return dates.sort((a, b) => b.localeCompare(a));
}

function getAllNotes() {
    // Returns flat array [{date, noteObj}] sorted newest first
    const all = [];
    for (let k in localStorage) {
        if (k.startsWith("notes_")) {
            const dateStr = k.replace("notes_", "");
            const notes = getNotesForDate(dateStr);
            notes.forEach(n => all.push({ date: dateStr, note: n }));
        }
    }
    return all.sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.note.createdAt || "").localeCompare(a.note.createdAt || "");
    });
}

// ── Save Note UI ──
function saveNote() {
    const isVI = currentLanguage === "vi";
    let date = document.getElementById("studyDate").value;
    const transcript = transcriptBox.value.trim();
    const title = document.getElementById("noteTitle")?.value.trim() || "";

    if (!transcript) {
        showToast(isVI ? "⚠️ Chưa có nội dung để lưu!" : "⚠️ No content to save!", "#c62828");
        return;
    }
    if (!date) date = getTodayStr();

    // Gather analysis if available
    const analysis = lastParsedResult ? { ...lastParsedResult } : null;

    const noteObj = {
        id: Date.now().toString(),
        title: title || (isVI ? `Ghi chú ${new Date().toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit"})}` : `Note ${new Date().toLocaleTimeString("en-US", {hour:"2-digit",minute:"2-digit"})}`),
        transcript,
        analysis,
        duration: seconds || 0,
        createdAt: new Date().toISOString()
    };

    addNoteToDate(date, noteObj);

    const d = new Date(date + "T00:00:00");
    const formatted = d.toLocaleDateString(isVI ? "vi-VN" : "en-US", { year:"numeric", month:"short", day:"numeric" });
    showToast(isVI ? `✅ Đã lưu ghi chú vào ${formatted}!` : `✅ Note saved to ${formatted}!`, "#2e7d32");

    // Clear title input after save
    const titleEl = document.getElementById("noteTitle");
    if (titleEl) titleEl.value = "";
}

document.getElementById("saveNoteBtn").addEventListener("click", saveNote);

// Set default date to today on load
window.addEventListener("load", () => {
    const dateEl = document.getElementById("studyDate");
    if (dateEl && !dateEl.value) dateEl.value = getTodayStr();
    // Đảm bảo giao diện tiếng Việt khi mở lần đầu
    setLanguage("vi");
    document.getElementById("btnVI")?.classList.add("active");
    document.getElementById("btnEN")?.classList.remove("active");
    updateExportBtns();
});

// ── Record Button ──
document.getElementById("recordBtn").addEventListener("click", () => {
    if (isRecording) return;
    _recognitionAccumulated = ""; // reset tích lũy cho phiên mới
    try { recognition.start(); } catch(e) { return; }
    isRecording = true;
    seconds = 0;
    updateTimer();
    timerInterval = setInterval(() => { seconds++; updateTimer(); }, 1000);
    document.getElementById("recordBtn").classList.add("recording");
    // Xóa nội dung cũ trước khi ghi âm mới
    transcriptBox.value = "";
    document.getElementById("result").innerHTML = "";
    lastParsedResult = null;
    // Xóa bubble Meeting Mode nếu còn
    const meetingEl = document.getElementById("meetingDisplay");
    if (meetingEl) { meetingEl.innerHTML = ""; meetingEl.style.display = "none"; }
    transcriptBox.style.display = "block";
    updateExportBtns();
    transcriptBox.setAttribute("readonly", true);
});

function setLanguage(lang) {
    currentLanguage = lang;
    try { recognition.stop(); } catch(e) {}
    const isVI = lang === "vi";
    recognition.lang = isVI ? "vi-VN" : "en-US";

    const _s = (id, vi, en) => { const el = document.getElementById(id); if(el) el.innerText = isVI ? vi : en; };
    _s("reminderModalTitle", "Nhắc nhở sự kiện", "Event Reminder");
    _s("calendarTitle",   "📅 Lịch học",           "📅 Study Calendar");
    _s("historyLabel",    "Lịch sử",                "History");
    _s("appTitle",        "🐱 Trợ lý Ghi chú AI",  "🐱 VoiceHelper");
    _s("recordLabel",     "Ghi âm",                 "Record");
    _s("stopLabel",       "Dừng",                   "Stop");
    _s("analyzeLabel",    "Phân tích AI",            "Analyze");
    _s("transcriptTitle", "NỘI DUNG",               "TRANSCRIPT");
    _s("meetingLabel",    "Chế độ Họp",             "Meeting Mode");
    _s("saveLabel",       "Lưu ghi chú",            "Save Note");
    _s("saveDateLabel",   "📅 Lưu vào ngày:",       "📅 Save to date:");

    const noteTitle = document.getElementById("noteTitle");
    if (noteTitle) noteTitle.placeholder = isVI ? "Tiêu đề ghi chú (tuỳ chọn)" : "Note title (optional)";

    if (meetingBadge && meetingBadge.style.display !== "none")
        meetingBadge.innerText = isVI ? "🔴 MEETING MODE – Phân biệt người nói" : "🔴 MEETING MODE – Speaker Detection Active";

    const ta = document.getElementById("transcript");
    if (ta) ta.placeholder = isVI ? "Nội dung ghi âm sẽ hiện ở đây..." : "Recording content will appear here...";

    renderCalendar();
    if (transcriptBox.value.trim()) translateAndAnalyze(lang);
}

async function translateAndAnalyze(lang) {
    const text = transcriptBox.value.trim();
    if (!text) return;
    const isVI = lang === "vi";
    const resultEl = document.getElementById("result");
    resultEl.innerHTML = `<div class="loading-box">${isVI ? "⏳ Đang dịch..." : "⏳ Translating..."}</div>`;

    const translatePrompt = isVI
        ? `Dịch đoạn văn sau sang tiếng Việt. Chỉ trả lời bản dịch, không thêm gì khác:\n\n${text}`
        : `Translate the following text to English. Reply with ONLY the translation, nothing else:\n\n${text}`;

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: isVI ? "Bạn là dịch giả. Chỉ trả lời bản dịch tiếng Việt, không thêm gì khác." : "You are a translator. Reply with ONLY the English translation, nothing else." },
                    { role: "user", content: translatePrompt }
                ]
            })
        });
        const data = await res.json();
        const translated = data.choices?.[0]?.message?.content || text;
        transcriptBox.value = translated;
    } catch(e) { console.log("Lỗi dịch:", e); }

    analyze();
}

document.getElementById("analyzeBtn").addEventListener("click", analyze);

let lastParsedResult = null;

async function analyze() {
    const text = transcriptBox.value.trim();
    if (!text) {
        alert(currentLanguage === "vi" ? "Chưa có nội dung để phân tích!" : "No content to analyze!");
        return;
    }

    const resultEl = document.getElementById("result");
    const isVI = currentLanguage === "vi";
    const mode = currentMode; // "study" | "work" | null

    resultEl.innerHTML = isVI
        ? `<div class="loading-box">⏳ Đang phân tích ${mode === "work" ? "công việc" : "học tập"}...</div>`
        : `<div class="loading-box">⏳ Analyzing (${mode === "work" ? "work" : "study"} mode)...</div>`;

    let prompt, systemMsg;

    if (mode === "work") {
        // ── WORK MODE ──
        systemMsg = isVI
            ? "Bạn là trợ lý phân tích công việc. Luôn trả lời bằng tiếng Việt. Chỉ trả về JSON hợp lệ, không thêm bất kỳ văn bản nào khác."
            : "You are a work analysis assistant. Always respond in English. Return only valid JSON, no other text.";
        prompt = isVI
            ? `Phân tích nội dung công việc/cuộc họp sau:\n\n${text}\n\nYÊU CẦU: Toàn bộ trả lời bằng tiếng Việt. Trả về ĐÚNG JSON (không thêm gì khác):\n{\n  "tomtat": "tóm tắt nội dung chính",\n  "action_items": [\n    {"task": "tên công việc", "deadline": "deadline nếu có (để trống nếu không rõ)", "owner": "người chịu trách nhiệm nếu có (để trống nếu không rõ)", "priority": "high|medium|low"}\n  ],\n  "rui_ro": [\n    {"van_de": "vấn đề/rủi ro", "muc_do": "cao|trung bình|thấp", "giai_phap": "đề xuất giải pháp"}\n  ]\n}`
            : `Analyze the following work/meeting content:\n\n${text}\n\nReturn ONLY valid JSON (nothing else). ALL values in English:\n{\n  "tomtat": "main content summary",\n  "action_items": [\n    {"task": "task name", "deadline": "deadline if any (empty if unclear)", "owner": "person responsible if any (empty if unclear)", "priority": "high|medium|low"}\n  ],\n  "rui_ro": [\n    {"van_de": "issue/risk", "muc_do": "high|medium|low", "giai_phap": "proposed solution"}\n  ]\n}`;
    } else {
        // ── STUDY MODE (default) ──
        systemMsg = isVI
            ? "Bạn là trợ lý học tập. Luôn trả lời bằng tiếng Việt. Chỉ trả về JSON, không thêm bất kỳ văn bản nào khác."
            : "You are a study assistant. You MUST always respond in English only. Return only JSON, no other text.";
        prompt = isVI
            ? `Phân tích nội dung bài giảng/học tập sau:\n\n${text}\n\nYÊU CẦU: Toàn bộ trả lời bằng tiếng Việt. Trả về ĐÚNG JSON (không thêm gì khác):\n{\n  "tomtat": "tóm tắt bài giảng/lý thuyết",\n  "ychinhs": ["khái niệm cốt lõi 1", "khái niệm cốt lõi 2", "khái niệm cốt lõi 3", "khái niệm cốt lõi 4", "khái niệm cốt lõi 5"],\n  "flashcards": [\n    {"mat_truoc": "câu hỏi", "mat_sau": "đáp án"},\n    {"mat_truoc": "câu hỏi 2", "mat_sau": "đáp án 2"},\n    {"mat_truoc": "câu hỏi 3", "mat_sau": "đáp án 3"},\n    {"mat_truoc": "câu hỏi 4", "mat_sau": "đáp án 4"},\n    {"mat_truoc": "câu hỏi 5", "mat_sau": "đáp án 5"}\n  ]\n}`
            : `Analyze the following lecture/study content:\n\n${text}\n\nReturn ONLY valid JSON (nothing else). ALL values in English:\n{\n  "tomtat": "lecture/theory summary",\n  "ychinhs": ["core concept 1", "core concept 2", "core concept 3", "core concept 4", "core concept 5"],\n  "flashcards": [\n    {"mat_truoc": "question", "mat_sau": "answer"},\n    {"mat_truoc": "question 2", "mat_sau": "answer 2"},\n    {"mat_truoc": "question 3", "mat_sau": "answer 3"},\n    {"mat_truoc": "question 4", "mat_sau": "answer 4"},\n    {"mat_truoc": "question 5", "mat_sau": "answer 5"}\n  ]\n}`;
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemMsg },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        if (data.error) { resultEl.innerHTML = `<div class="error-box">❌ Lỗi: ${data.error.message || JSON.stringify(data.error)}</div>`; return; }

        let raw = data.choices?.[0]?.message?.content || "";
        raw = raw.replace(/```json|```/g, "").trim();

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) raw = jsonMatch[0];

        let parsed;
        try { parsed = JSON.parse(raw); }
        catch(e) { resultEl.innerHTML = `<div class="error-box">❌ Lỗi parse JSON: ${escapeHtml(raw)}</div>`; return; }

        lastParsedResult = parsed;
        if (mode === "work") {
            renderWorkResult(parsed, isVI);
        } else {
            renderResult(parsed, isVI);
        }

    } catch(err) {
        resultEl.innerHTML = `<div class="error-box">❌ Lỗi kết nối: ${err.message}</div>`;
    }
}

// ── WORK MODE RENDER ──
function renderWorkResult(data, isVI) {
    const resultEl = document.getElementById("result");

    // 1. Tóm tắt
    const tomtatHTML = `
        <div class="section-card section-blue">
            <div class="section-header">📋 ${isVI ? "Tóm tắt nội dung chính" : "Main Summary"}</div>
            <div class="section-body">${escapeHtml(data.tomtat || "")}</div>
        </div>`;

    // 2. Action Items table
    const items = data.action_items || [];
    const priorityColor = { high: "#c62828", medium: "#e65100", low: "#2e7d32", cao: "#c62828", "trung bình": "#e65100", thấp: "#2e7d32" };
    const priorityLabel = { high: isVI?"Cao":"High", medium: isVI?"TB":"Med", low: isVI?"Thấp":"Low", cao:"Cao", "trung bình":"TB", thấp:"Thấp" };
    let tableRows = items.map((a, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(a.task || "")}</td>
            <td>${escapeHtml(a.deadline || (isVI ? "—" : "—"))}</td>
            <td>${escapeHtml(a.owner || (isVI ? "—" : "—"))}</td>
            <td><span class="priority-badge" style="background:${priorityColor[a.priority?.toLowerCase()] || "#888"}">${priorityLabel[a.priority?.toLowerCase()] || (a.priority || "—")}</span></td>
        </tr>`).join("");
    if (!tableRows) tableRows = `<tr><td colspan="5" style="text-align:center;color:#aaa">${isVI ? "Không tìm thấy việc cần làm." : "No action items found."}</td></tr>`;
    const actionHTML = `
        <div class="section-card section-work-action">
            <div class="section-header">✅ ${isVI ? "Việc cần làm" : "Action Items"}</div>
            <div class="action-table-wrap">
            <table class="action-table">
                <thead><tr>
                    <th>#</th>
                    <th>${isVI ? "Nội dung công việc" : "Task"}</th>
                    <th>📅 ${isVI ? "Deadline" : "Deadline"}</th>
                    <th>👤 ${isVI ? "Người phụ trách" : "Owner"}</th>
                    <th>${isVI ? "Ưu tiên" : "Priority"}</th>
                </tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
            </div>
        </div>`;

    // 3. Phân tích rủi ro
    const risks = data.rui_ro || [];
    const riskColorMap = { cao: "#c62828", high: "#c62828", "trung bình": "#e65100", medium: "#e65100", thấp: "#2e7d32", low: "#2e7d32" };
    const riskItems = risks.map(r => `
        <div class="risk-item">
            <div class="risk-header">
                <span class="risk-badge" style="background:${riskColorMap[r.muc_do?.toLowerCase()] || "#888"}">
                    ${r.muc_do || (isVI ? "?" : "?")}
                </span>
                <span class="risk-title">${escapeHtml(r.van_de || "")}</span>
            </div>
            <div class="risk-solution">💡 ${escapeHtml(r.giai_phap || "")}</div>
        </div>`).join("");
    const riskHTML = `
        <div class="section-card section-risk">
            <div class="section-header">⚠️ ${isVI ? "Phân tích rủi ro" : "Risk Analysis"}</div>
            <div class="section-body">${riskItems || `<div style="color:#aaa">${isVI ? "Không phát hiện rủi ro đáng kể." : "No significant risks detected."}</div>`}</div>
        </div>`;

    resultEl.innerHTML = tomtatHTML + actionHTML + riskHTML;
    updateExportBtns();
}

function renderResult(data, isVI) {
    const resultEl = document.getElementById("result");

    const tomtatHTML = `
        <div class="section-card section-blue">
            <div class="section-header">📘 ${isVI ? "Tóm tắt bài giảng / Lý thuyết" : "Lecture Summary"}</div>
            <div class="section-body">${escapeHtml(data.tomtat || "")}</div>
        </div>`;

    const ychinhItems = (data.ychinhs || []).map((y, i) =>
        `<div class="ychinhs-item"><span class="ychinhs-num">${i + 1}</span>${escapeHtml(y)}</div>`
    ).join("");
    const ychinhHTML = `
        <div class="section-card section-yellow">
            <div class="section-header">🔑 ${isVI ? "Key Points – Khái niệm cốt lõi" : "Key Points – Core Concepts"}</div>
            <div class="section-body">${ychinhItems}</div>
        </div>`;

    const cards = (data.flashcards || []).map((fc, i) => `
        <div class="flashcard" onclick="this.classList.toggle('flipped')">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <span class="card-num">${i + 1}</span>
                    <div>${escapeHtml(fc.mat_truoc)}</div>
                    <div class="card-hint">${isVI ? "👆 Nhấn để xem đáp án" : "👆 Tap to reveal"}</div>
                </div>
                <div class="flashcard-back">
                    <div>${escapeHtml(fc.mat_sau)}</div>
                </div>
            </div>
        </div>`).join("");
    const flashHTML = `
        <div class="section-card section-green">
            <div class="section-header">🃏 ${isVI ? "Flashcard ôn tập" : "Flashcards"}</div>
            <div class="flashcard-grid">${cards}</div>
        </div>`;

    resultEl.innerHTML = tomtatHTML + ychinhHTML + flashHTML;
    updateExportBtns();
}

// ══════════════════════════════════════════
//   CALENDAR
// ══════════════════════════════════════════
const TIMEZONE_VN = 7;
function INT(d) { return Math.floor(d); }

function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// ── Mini Calendar ──
let calendarViewYear = null;
let calendarViewMonth = null;

function renderCalendar(viewYear, viewMonth) {
    const calEl = document.getElementById("miniCalendar");
    if (!calEl) return;

    const today = new Date();
    if (viewYear === undefined || viewYear === null) viewYear = today.getFullYear();
    if (viewMonth === undefined || viewMonth === null) viewMonth = today.getMonth();
    calendarViewYear = viewYear;
    calendarViewMonth = viewMonth;

    const year = viewYear;
    const month = viewMonth;
    const monthStr = `${year}-${String(month+1).padStart(2,"0")}`;

    // Get note dates for this month
    const noteDates = [];
    for (let i = 1; i <= 31; i++) {
        const d = `${monthStr}-${String(i).padStart(2,"0")}`;
        const notes = getNotesForDate(d);
        if (notes.length > 0) noteDates.push({ day: i, count: notes.length });
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const todayDate = today.getDate();
    const isCurrentMonth = (year === today.getFullYear() && month === today.getMonth());
    const isVI = currentLanguage === "vi";

    const dayNames = isVI
        ? ["CN","T2","T3","T4","T5","T6","T7"]
        : ["Su","Mo","Tu","We","Th","Fr","Sa"];
    const monthNames = isVI
        ? ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"]
        : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    let html = `<div class="cal-header">
        <button class="cal-nav" onclick="renderCalendar(${month===0?year-1:year},${month===0?11:month-1})">◀</button>
        <span>${monthNames[month]} ${year}</span>
        <button class="cal-nav" onclick="renderCalendar(${month===11?year+1:year},${month===11?0:month+1})">▶</button>
    </div>`;
    html += `<div class="cal-grid">`;
    dayNames.forEach(d => html += `<div class="cal-dayname">${d}</div>`);
    for (let i = 0; i < firstDay; i++) html += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthStr}-${String(d).padStart(2,"0")}`;
        const noteInfo = noteDates.find(n => n.day === d);
        const hasNote = !!noteInfo;
        const noteCount = noteInfo ? noteInfo.count : 0;
        const isToday = isCurrentMonth && d === todayDate;

        let cls = "cal-day";
        if (isToday) cls += " cal-today";
        if (hasNote) cls += " cal-has-note";

        const title = hasNote ? (isVI ? `📝 ${noteCount} ghi chú` : `📝 ${noteCount} note${noteCount>1?"s":""}`) : "";

        html += `<div class="${cls}" onclick="loadNoteFromCalendar('${dateStr}')" title="${title}">
            <div class="cal-solar">${d}</div>
            ${hasNote ? `<span class="cal-note-badge">${noteCount}</span>` : ""}
        </div>`;
    }
    html += `</div>`;
    calEl.innerHTML = html;
}

// ── Load note from calendar click ──
function loadNoteFromCalendar(dateStr) {
    const isVI = currentLanguage === "vi";
    const notes = getNotesForDate(dateStr);

    // Always set date picker to clicked date
    const dateEl = document.getElementById("studyDate");
    if (dateEl) dateEl.value = dateStr;

    if (notes.length === 0) {
        // No notes – just close viewer if open
        closeNoteViewer();
        return;
    }

    showNoteViewer(dateStr, notes);
}

// ── Note Viewer (sidebar) ──
function showNoteViewer(dateStr, notes) {
    const isVI = currentLanguage === "vi";
    const d = new Date(dateStr + "T00:00:00");
    const formatted = d.toLocaleDateString(isVI ? "vi-VN" : "en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    document.getElementById("noteViewerDate").innerText = "📅 " + formatted;

    const bodyEl = document.getElementById("noteViewerBody");
    bodyEl.innerHTML = "";

    notes.forEach((note, idx) => {
        const card = document.createElement("div");
        card.className = "nv-card";
        card.id = `nvcard_${note.id}`;

        const createdTime = note.createdAt
            ? new Date(note.createdAt).toLocaleTimeString(isVI ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit" })
            : "";

        card.innerHTML = `
            <div class="nv-card-header" onclick="toggleNvCard('${note.id}')">
                <div class="nv-card-title">
                    <span class="nv-card-num">${idx + 1}</span>
                    <span class="nv-card-name">${escapeHtml(note.title)}</span>
                    ${createdTime ? `<span class="nv-card-time">⏰ ${createdTime}</span>` : ""}
                    ${note.duration ? `<span class="nv-card-time" style="color:#2e7d32">🎙 ${String(Math.floor(note.duration/60)).padStart(2,"0")}:${String(note.duration%60).padStart(2,"0")}</span>` : ""}
                </div>
                <div class="nv-card-actions">
                    <button class="nv-delete-btn" onclick="event.stopPropagation(); deleteNoteFromViewer('${dateStr}','${note.id}')" title="${isVI ? 'Xóa ghi chú này' : 'Delete this note'}">🗑️</button>
                    <span class="nv-toggle" id="nvtog_${note.id}">▼</span>
                </div>
            </div>
            <div class="nv-card-body" id="nvbody_${note.id}" style="display:none">
                ${buildNoteBodyHTML(note, isVI)}
            </div>
        `;
        bodyEl.appendChild(card);
    });

    document.getElementById("noteViewer").style.display = "block";
    document.getElementById("noteViewer").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function buildNoteBodyHTML(note, isVI) {
    let html = "";

    // Transcript section
    if (note.transcript) {
        html += `<div class="nv-section nv-transcript">
            <div class="nv-section-label">📝 ${isVI ? "Nội dung" : "Transcript"}</div>
            <div class="nv-section-text">${escapeHtml(note.transcript)}</div>
        </div>`;
    }

    // Analysis sections
    if (note.analysis) {
        const a = note.analysis;

        if (a.tomtat) {
            html += `<div class="nv-section nv-blue">
                <div class="nv-section-label">📘 ${isVI ? "Tóm tắt" : "Summary"}</div>
                <div class="nv-section-text">${escapeHtml(a.tomtat)}</div>
            </div>`;
        }

        // WORK MODE: action_items
        if (a.action_items && a.action_items.length > 0) {
            const pColor = { high:"#c62828", medium:"#e65100", low:"#2e7d32", cao:"#c62828", "trung bình":"#e65100", thấp:"#2e7d32" };
            const rows = a.action_items.map((item, i) =>
                `<tr><td style="padding:6px 10px;font-weight:800;text-align:center">${i+1}</td>
                <td style="padding:6px 10px">${escapeHtml(item.task||"")}</td>
                <td style="padding:6px 10px">${escapeHtml(item.deadline||"—")}</td>
                <td style="padding:6px 10px">${escapeHtml(item.owner||"—")}</td>
                <td style="padding:6px 10px"><span style="background:${pColor[item.priority?.toLowerCase()]||"#888"};color:#fff;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:800">${item.priority||"—"}</span></td></tr>`
            ).join("");
            html += `<div class="nv-section" style="background:#e8eaf6;border-left:3px solid #3949ab">
                <div class="nv-section-label" style="color:#1a237e">✅ ${isVI ? "Việc cần làm" : "Action Items"}</div>
                <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem">
                    <thead><tr style="background:#3949ab;color:#fff">
                        <th style="padding:6px 10px">#</th>
                        <th style="padding:6px 10px;text-align:left">${isVI?"Công việc":"Task"}</th>
                        <th style="padding:6px 10px;text-align:left">📅</th>
                        <th style="padding:6px 10px;text-align:left">👤</th>
                        <th style="padding:6px 10px;text-align:left">${isVI?"Ưu tiên":"Priority"}</th>
                    </tr></thead><tbody>${rows}</tbody>
                </table></div>
            </div>`;
        }

        // WORK MODE: rui_ro
        if (a.rui_ro && a.rui_ro.length > 0) {
            const rColor = { cao:"#c62828", high:"#c62828", "trung bình":"#e65100", medium:"#e65100", thấp:"#2e7d32", low:"#2e7d32" };
            const riskItems = a.rui_ro.map(r =>
                `<div style="border:1px solid #ffcc80;background:#fff8f0;border-radius:8px;padding:8px 12px;margin-bottom:6px">
                    <span style="background:${rColor[r.muc_do?.toLowerCase()]||"#888"};color:#fff;padding:1px 8px;border-radius:10px;font-size:.72rem;font-weight:800;margin-right:8px">${r.muc_do||"?"}</span>
                    <strong>${escapeHtml(r.van_de||"")}</strong>
                    <div style="font-size:.8rem;color:#666;margin-top:4px;border-left:3px solid #ffa726;padding-left:8px">💡 ${escapeHtml(r.giai_phap||"")}</div>
                </div>`
            ).join("");
            html += `<div class="nv-section" style="background:#fff3e0;border-left:3px solid #e65100">
                <div class="nv-section-label" style="color:#bf360c">⚠️ ${isVI?"Phân tích rủi ro":"Risk Analysis"}</div>
                ${riskItems}
            </div>`;
        }

        // STUDY MODE: ychinhs
        if (a.ychinhs && a.ychinhs.length > 0) {
            const items = a.ychinhs.map((y, i) =>
                `<div class="nv-point"><span class="nv-point-num">${i+1}</span>${escapeHtml(y)}</div>`
            ).join("");
            html += `<div class="nv-section nv-yellow">
                <div class="nv-section-label">🔑 ${isVI ? "Key Points" : "Key Points"}</div>
                <div>${items}</div>
            </div>`;
        }

        // STUDY MODE: flashcards
        if (a.flashcards && a.flashcards.length > 0) {
            const cards = a.flashcards.map((fc, i) => `
                <div class="nv-flashcard" onclick="this.classList.toggle('flipped')">
                    <div class="nv-fc-inner">
                        <div class="nv-fc-front">
                            <span class="nv-fc-num">${i+1}</span>
                            <div>${escapeHtml(fc.mat_truoc)}</div>
                            <div class="nv-fc-hint">${isVI ? "👆 Nhấn để xem đáp án" : "👆 Tap to reveal"}</div>
                        </div>
                        <div class="nv-fc-back"><div>${escapeHtml(fc.mat_sau)}</div></div>
                    </div>
                </div>`).join("");
            html += `<div class="nv-section nv-green">
                <div class="nv-section-label">🃏 ${isVI ? "Flashcards" : "Flashcards"}</div>
                <div class="nv-fc-grid">${cards}</div>
            </div>`;
        }
    }

    return html || `<div style="color:#aaa;font-size:.85rem;padding:8px 0">${isVI ? "Không có nội dung." : "No content."}</div>`;
}

function toggleNvCard(noteId) {
    const body = document.getElementById("nvbody_" + noteId);
    const tog  = document.getElementById("nvtog_"  + noteId);
    if (!body) return;
    const open = body.style.display !== "none";
    body.style.display = open ? "none" : "block";
    tog.innerText = open ? "▼" : "▲";
}

function deleteNoteFromViewer(dateStr, noteId) {
    const isVI = currentLanguage === "vi";
    if (!confirm(isVI ? "Xóa ghi chú này?" : "Delete this note?")) return;
    deleteNoteById(dateStr, noteId);

    // Remove card from DOM
    const card = document.getElementById("nvcard_" + noteId);
    if (card) card.remove();

    // Check if any notes remain for this date
    const remaining = getNotesForDate(dateStr);
    if (remaining.length === 0) {
        closeNoteViewer();
    } else {
        // Re-number remaining cards
        const bodyEl = document.getElementById("noteViewerBody");
        bodyEl.querySelectorAll(".nv-card-num").forEach((el, i) => { el.innerText = i + 1; });
    }

    showToast(isVI ? "🗑️ Đã xóa ghi chú" : "🗑️ Note deleted", "#7f1d1d");
}

function closeNoteViewer() {
    document.getElementById("noteViewer").style.display = "none";
}

// ── Stop button ──
document.getElementById("stopBtn").addEventListener("click", () => {
    if (!isRecording) return;
    isRecording = false;
    try { recognition.stop(); } catch(e) {}
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById("recordBtn").classList.remove("recording");
    transcriptBox.setAttribute("readonly", true);
    setTimeout(() => { if (transcriptBox.value.trim()) analyze(); }, 500);
});

// ── Tích lũy text qua nhiều session để không mất khi browser reset ──
let _recognitionAccumulated = "";

recognition.onend = () => {
    if (!isRecording) return;
    // Đợi 150ms rồi restart để tránh lỗi "already started"
    setTimeout(() => {
        if (!isRecording) return;
        try { recognition.start(); }
        catch(e) {
            // Nếu vẫn lỗi, thử lại sau 500ms
            setTimeout(() => {
                if (!isRecording) return;
                try { recognition.start(); } catch(e2) {
                    isRecording = false;
                    document.getElementById("recordBtn").classList.remove("recording");
                    showToast("⚠️ Mic bị ngắt, vui lòng bấm Ghi âm lại", "#c62828");
                }
            }, 500);
        }
    }, 150);
};

recognition.onerror = (event) => {
    // "no-speech": im lặng quá lâu → bình thường, không cần báo lỗi
    if (event.error === "no-speech") return;
    // "aborted": do chính ta gọi stop() → bình thường
    if (event.error === "aborted") return;
    // Các lỗi thực sự cần thông báo
    const msgs = {
        "audio-capture"  : "❌ Không tìm thấy microphone!",
        "not-allowed"    : "❌ Chưa cấp quyền mic – vào Settings > cho phép Microphone",
        "network"        : "⚠️ Lỗi mạng, đang thử lại...",
        "service-not-allowed": "❌ Trình duyệt không cho phép nhận diện giọng nói",
    };
    const msg = msgs[event.error] || ("⚠️ Lỗi mic: " + event.error);
    showToast(msg, "#c62828");
};

// ══════════════════════════════════════════
//  MEETING MODE
// ══════════════════════════════════════════
let meetingModeActive = false;

const SPEAKER_COLORS = [
    { bg: "#e3f2fd", border: "#1565c0", label: "#1565c0", name: "Người A" },
    { bg: "#fce4ec", border: "#c62828", label: "#c62828", name: "Người B" },
    { bg: "#e8f5e9", border: "#2e7d32", label: "#2e7d32", name: "Người C" },
    { bg: "#fff8e1", border: "#e65100", label: "#e65100", name: "Người D" },
    { bg: "#f3e5f5", border: "#6a1b9a", label: "#6a1b9a", name: "Người E" },
    { bg: "#e0f7fa", border: "#006064", label: "#006064", name: "Người F" },
];
const SPEAKER_COLORS_EN = ["Speaker A","Speaker B","Speaker C","Speaker D","Speaker E","Speaker F"];

function getSpeakerName(idx) {
    const isVI = currentLanguage === "vi";
    if (isVI) return SPEAKER_COLORS[idx % SPEAKER_COLORS.length].name;
    return SPEAKER_COLORS_EN[idx % SPEAKER_COLORS_EN.length];
}

let mediaRecorder  = null;
let audioChunks    = [];
let meetingStream  = null;
let speakerBlocks  = [];

function getMeetingDisplay() {
    let el = document.getElementById("meetingDisplay");
    if (!el) {
        el = document.createElement("div");
        el.id = "meetingDisplay";
        el.className = "meeting-display";
        transcriptBox.parentNode.insertBefore(el, transcriptBox);
    }
    return el;
}

function renderMeetingBubbles(blocks) {
    const display = getMeetingDisplay();
    transcriptBox.style.display = "none";
    display.style.display = "block";
    if (!blocks || blocks.length === 0) {
        display.innerHTML = `<div class="meeting-waiting">${currentLanguage === "vi" ? "🎤 Đang lắng nghe cuộc họp..." : "🎤 Listening to meeting..."}</div>`;
        return;
    }
    let html = "";
    let lastSpeaker = -1;
    blocks.forEach(blk => {
        const c    = SPEAKER_COLORS[blk.speakerIdx % SPEAKER_COLORS.length];
        const mins = String(Math.floor((blk.timestamp || 0) / 60)).padStart(2, "0");
        const secs = String((blk.timestamp || 0) % 60).padStart(2, "0");
        const name = getSpeakerName(blk.speakerIdx);
        const initial = name.slice(-1); // lấy chữ cuối: A, B, C...
        const showHeader = blk.speakerIdx !== lastSpeaker;
        lastSpeaker = blk.speakerIdx;

        html += `<div class="meeting-bubble" style="border-left:4px solid ${c.border};background:${c.bg};box-shadow:0 1px 6px rgba(0,0,0,.07)">
            ${showHeader ? `<div class="meeting-speaker" style="color:${c.label}">
                <span class="meeting-avatar" style="background:${c.border}">${initial}</span>
                <span style="font-weight:800">${name}</span>
                <span class="meeting-time">⏱ ${mins}:${secs}</span>
            </div>` : `<div class="meeting-time" style="margin-bottom:4px;margin-left:32px">⏱ ${mins}:${secs}</div>`}
            <div class="meeting-text" style="margin-left:32px">${blk.text}</div>
        </div>`;
    });
    display.innerHTML = html;
    display.scrollTop = display.scrollHeight;
    transcriptBox.value = blocks.map(b => `[${getSpeakerName(b.speakerIdx)}]: ${b.text}`).join("\n");
    updateExportBtns();
}

function hideMeetingDisplay() {
    const el = document.getElementById("meetingDisplay");
    if (el) el.style.display = "none";
    transcriptBox.style.display = "block";
}

function showMeetingRecordingUI() {
    const display = getMeetingDisplay();
    transcriptBox.style.display = "none";
    display.style.display = "block";
    display.innerHTML = `<div class="meeting-waiting">🔴 ${currentLanguage === "vi" ? "Đang ghi âm cuộc họp... Nhấn Dừng để phân tích." : "Recording meeting... Press Stop to analyze."}</div>`;
}

const meetingModeBtn = document.getElementById("meetingModeBtn");
const meetingBadge   = document.getElementById("meetingBadge");

meetingModeBtn.addEventListener("click", async () => {
    meetingModeActive = !meetingModeActive;
    meetingModeBtn.classList.toggle("active", meetingModeActive);
    meetingBadge.style.display = meetingModeActive ? "block" : "none";

    if (meetingModeActive) {
        speakerBlocks = [];
        audioChunks   = [];
        // Xóa nội dung bubble cũ từ lần ghi âm trước
        const oldDisplay = document.getElementById("meetingDisplay");
        if (oldDisplay) oldDisplay.innerHTML = "";
        transcriptBox.value = "";
        document.getElementById("result").innerHTML = "";
        lastParsedResult = null;
        updateExportBtns();
        const isVI = currentLanguage === "vi";
        meetingBadge.innerHTML = isVI
            ? "🔴 CHẾ ĐỘ HỌP – Groq Whisper đang ghi âm"
            : "🔴 MEETING MODE – Recording with Groq Whisper";
        try {
            meetingStream  = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder  = new MediaRecorder(meetingStream, { mimeType: getSupportedMimeType() });
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.start(500);
            showMeetingRecordingUI();
        } catch(err) {
            alert(currentLanguage === "vi"
                ? "❌ Không thể truy cập microphone: " + err.message
                : "❌ Cannot access microphone: " + err.message);
            meetingModeActive = false;
            meetingModeBtn.classList.remove("active");
            meetingBadge.style.display = "none";
        }
    } else {
        stopMediaRecorder();
        hideMeetingDisplay();
    }
});

function getSupportedMimeType() {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return t; }
    return "";
}

function stopMediaRecorder() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (meetingStream) { meetingStream.getTracks().forEach(t => t.stop()); meetingStream = null; }
}

recognition.onstart = () => {
    // Khi restart session (onend → start lại), accumulated đã có sẵn
    // Khi bắt đầu ghi âm mới (recordBtn click), accumulated đã reset ở recordBtn
};

recognition.onresult = (event) => {
    if (meetingModeActive) return;
    let finalInSession = "";
    let interimInSession = "";
    for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalInSession += t + " ";
        } else {
            interimInSession += t;
        }
    }
    // Cập nhật accumulated với các kết quả final của session này
    if (finalInSession.trim()) {
        _recognitionAccumulated = (_recognitionAccumulated + " " + finalInSession).trim();
    }
    // Hiển thị: accumulated + interim đang nói dở
    const display = (_recognitionAccumulated + " " + interimInSession).trim();
    transcriptBox.value = display;
    updateExportBtns();
};

document.getElementById("stopBtn").addEventListener("click", async () => {
    if (!meetingModeActive || !mediaRecorder) return;
    const isVI = currentLanguage === "vi";
    meetingModeActive = false;
    meetingModeBtn.classList.remove("active");
    const display = getMeetingDisplay();
    display.innerHTML = `<div class="meeting-waiting">⏳ ${isVI ? "Đang xử lý giọng nói... (~10-20 giây)" : "Processing audio... (~10-20 seconds)"}</div>`;
    await new Promise(resolve => { mediaRecorder.onstop = resolve; stopMediaRecorder(); });
    if (audioChunks.length === 0) {
        display.innerHTML = `<div class="meeting-waiting">⚠️ ${isVI ? "Không có audio để xử lý." : "No audio to process."}</div>`;
        return;
    }
    const mimeType  = mediaRecorder.mimeType || "audio/webm";
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    audioChunks = [];
    await transcribeAndDiarize(audioBlob, mimeType, isVI);
}, true);

async function transcribeAndDiarize(audioBlob, mimeType, isVI) {
    const display  = getMeetingDisplay();
    const resultEl = document.getElementById("result");
    try {
        const ext      = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
        const formData = new FormData();
        formData.append("file", audioBlob, `recording.${ext}`);
        formData.append("model", "whisper-large-v3");
        formData.append("response_format", "verbose_json");
        formData.append("language", currentLanguage === "vi" ? "vi" : "en");
        formData.append("timestamp_granularities[]", "segment");
        display.innerHTML = `<div class="meeting-waiting">⏳ ${isVI ? "Groq Whisper đang nhận diện giọng nói..." : "Groq Whisper transcribing..."}</div>`;
        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}` },
            body: formData
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || res.statusText); }
        const data = await res.json();
        const segments = data.segments || [];
        if (segments.length === 0 && data.text) segments.push({ start: 0, end: 0, text: data.text });
        display.innerHTML = `<div class="meeting-waiting">🧠 ${isVI ? "AI đang phân tích người nói..." : "AI analyzing speakers..."}</div>`;
        await assignSpeakers(segments, isVI);
    } catch(e) {
        display.innerHTML = `<div class="meeting-waiting" style="color:#f87171">❌ ${isVI ? "Lỗi Whisper: " : "Whisper error: "}${e.message}</div>`;
        resultEl.innerHTML = `<div class="error-box">❌ ${e.message}</div>`;
    }
}

async function assignSpeakers(segments, isVI) {
    const display  = getMeetingDisplay();
    const resultEl = document.getElementById("result");
    const segText  = segments.map((s, i) =>
        `[${i}] ${String(Math.floor(s.start/60)).padStart(2,"0")}:${String(Math.floor(s.start%60)).padStart(2,"0")} → ${s.text.trim()}`
    ).join("\n");

    const prompt = isVI
        ? `Đây là bản ghi âm cuộc họp được phân đoạn theo thời gian bằng Whisper:\n\n${segText}\n\nNhiệm vụ:\n1. Phân tích nội dung và phân biệt các người nói khác nhau. Đặt tên: "Người A", "Người B", v.v.\n2. Gán mỗi đoạn cho một người nói\n3. Tóm tắt nội dung cuộc họp\n4. Liệt kê action items\n\nTrả về ĐÚNG JSON này (không thêm gì khác):\n{\n  "speakers": ["Người A", "Người B"],\n  "segments": [{"idx": 0, "speaker": "Người A", "text": "..."}],\n  "tomtat": "...",\n  "action_items": ["..."]\n}`
        : `This is a timestamped meeting transcript transcribed by Whisper:\n\n${segText}\n\nTasks:\n1. Analyze content and distinguish different speakers. Name them: "Speaker A", "Speaker B", etc.\n2. Assign each segment to a speaker\n3. Summarize the meeting\n4. List action items\n\nReturn ONLY this JSON (nothing else):\n{\n  "speakers": ["Speaker A", "Speaker B"],\n  "segments": [{"idx": 0, "speaker": "Speaker A", "text": "..."}],\n  "tomtat": "...",\n  "action_items": ["..."]\n}`;

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a meeting transcript analyzer. Return ONLY valid JSON, no extra text." },
                    { role: "user", content: prompt }
                ]
            })
        });
        const data = await res.json();
        let raw = data.choices?.[0]?.message?.content || "{}";
        raw = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(raw);
        speakerBlocks = (parsed.segments || []).map(seg => {
            const spIdx = (parsed.speakers || []).indexOf(seg.speaker);
            const origSeg = segments[seg.idx] || segments[0] || {};
            return { speakerIdx: Math.max(0, spIdx), text: seg.text, timestamp: Math.floor(origSeg.start || 0) };
        });
        renderMeetingBubbles(speakerBlocks);
        renderMeetingResult(parsed, isVI);
        meetingBadge.style.display = "none";
    } catch(e) {
        display.innerHTML = `<div class="meeting-waiting" style="color:#f87171">❌ ${isVI ? "Lỗi phân tích AI: " : "AI analysis error: "}${e.message}</div>`;
        resultEl.innerHTML = `<div class="error-box">❌ ${e.message}</div>`;
    }
}

function renderMeetingResult(data, isVI) {
    const resultEl = document.getElementById("result");
    const colors = ["#38bdf8","#f472b6","#34d399","#fbbf24","#f87171","#a78bfa"];
    const speakerColorMap = {};
    (data.speakers || []).forEach((s, i) => { speakerColorMap[s] = colors[i % colors.length]; });
    const segmentsHTML = (data.segments || []).map(seg => {
        const col = speakerColorMap[seg.speaker] || "#7ab4f5";
        return `<div class="speaker-block" style="border-color:${col}">
            <div class="speaker-label" style="color:${col}">🎙 ${seg.speaker}</div>
            <div class="speaker-text">${seg.text}</div>
        </div>`;
    }).join("");
    const actionHTML = (data.action_items || []).length > 0
        ? `<div class="section-card section-yellow">
            <div class="section-header">✅ ${isVI ? "Việc cần làm" : "Action Items"}</div>
            <div class="section-body">${(data.action_items || []).map((a, i) =>
                `<div class="ychinhs-item"><span class="ychinhs-num">${i+1}</span>${a}</div>`
            ).join("")}</div></div>`
        : "";
    resultEl.innerHTML = `
        <div class="section-card section-blue">
            <div class="section-header">📋 ${isVI ? "Tóm tắt cuộc họp" : "Meeting Summary"}</div>
            <div class="section-body">${data.tomtat || ""}</div>
        </div>
        <div class="section-card" style="background:#1e2f44;border-left:5px solid #7c3aed;margin-bottom:18px;padding:18px 20px;border-radius:14px">
            <div class="section-header" style="color:#a78bfa;font-weight:700;margin-bottom:12px">👥 ${isVI ? "Nội dung từng người" : "Per-Speaker Transcript"}</div>
            <div>${segmentsHTML}</div>
        </div>
        ${actionHTML}`;
}

// ══════════════════════════════════════════
//  HISTORY MODAL
// ══════════════════════════════════════════
document.getElementById("historyBtn").addEventListener("click", openHistoryModal);

let _allHistoryNotes = [];

function openHistoryModal() {
    const isVI = currentLanguage === "vi";
    document.getElementById("historyModalTitle").innerText = isVI ? "Lịch sử ghi chú" : "Note History";
    const deleteAllBtn = document.getElementById("deleteAllNotesBtn");
    if (deleteAllBtn) deleteAllBtn.querySelector("#deleteAllLabel").innerText = isVI ? "Xóa tất cả" : "Delete all";

    // Reset search khi mở
    const searchInput = document.getElementById("historySearchInput");
    if (searchInput) { searchInput.value = ""; searchInput.placeholder = isVI ? "Tìm kiếm ghi chú..." : "Search notes..."; }
    const clearBtn = document.getElementById("historySearchClear");
    if (clearBtn) clearBtn.style.display = "none";

    _allHistoryNotes = getAllNotes();
    renderHistoryList(_allHistoryNotes, "");
    document.getElementById("historyModal").style.display = "flex";
}

function onHistorySearch(q) {
    const clearBtn = document.getElementById("historySearchClear");
    if (clearBtn) clearBtn.style.display = q ? "inline-block" : "none";
    const filtered = q.trim()
        ? _allHistoryNotes.filter(item =>
            item.note.title.toLowerCase().includes(q.toLowerCase()) ||
            item.note.transcript.toLowerCase().includes(q.toLowerCase()) ||
            item.date.includes(q)
          )
        : _allHistoryNotes;
    renderHistoryList(filtered, q.trim());
}

function clearHistorySearch() {
    const input = document.getElementById("historySearchInput");
    if (input) { input.value = ""; input.focus(); }
    const clearBtn = document.getElementById("historySearchClear");
    if (clearBtn) clearBtn.style.display = "none";
    renderHistoryList(_allHistoryNotes, "");
}

function renderHistoryList(notes, query) {
    const isVI = currentLanguage === "vi";
    const listEl  = document.getElementById("historyList");
    const countEl = document.getElementById("historyCount");
    const deleteAllBtn = document.getElementById("deleteAllNotesBtn");

    if (notes.length === 0) {
        listEl.innerHTML = `<div class="history-empty">${query
            ? (isVI ? "Không tìm thấy ghi chú nào." : "No notes found.")
            : (isVI ? "Chưa có ghi chú nào." : "No notes yet.")}</div>`;
        if (countEl) countEl.innerText = "";
        if (deleteAllBtn) deleteAllBtn.style.display = "none";
        return;
    }

    if (deleteAllBtn) deleteAllBtn.style.display = "flex";
    if (countEl) countEl.innerText = isVI
        ? `${notes.length} ghi chú`
        : `${notes.length} note${notes.length !== 1 ? "s" : ""}`;

    const q = query.toLowerCase();

    function highlight(text, q) {
        if (!q) return escapeHtml(text);
        const escaped = escapeHtml(text);
        const escapedQ = escapeHtml(q);
        return escaped.replace(new RegExp(escapedQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
            m => `<mark class="search-highlight">${m}</mark>`);
    }

    listEl.innerHTML = notes.map((item, i) => {
        const { date, note } = item;
        const d = new Date(date + "T00:00:00");
        const formatted = d.toLocaleDateString(isVI ? "vi-VN" : "en-US", {
            weekday: "short", year: "numeric", month: "short", day: "numeric"
        });
        const preview = note.transcript.slice(0, 80).replace(/\n/g, " ");
        const hasAnalysis = !!note.analysis;
        const expanded = q && (note.transcript.toLowerCase().includes(q) || formatted.toLowerCase().includes(q));
        return `<div class="history-item" id="hitem_${note.id}">
            <div class="history-item-content">
                <div class="history-item-header" onclick="toggleHistory(${i})">
                    <div>
                        <span class="history-date">📅 ${highlight(formatted, q)}</span>
                        <span class="history-note-title"> · ${highlight(escapeHtml(note.title), q)}</span>
                        ${hasAnalysis ? `<span class="history-has-analysis">✨</span>` : ""}
                        ${note.duration ? `<span style="font-size:.75rem;color:#2e7d32;font-weight:600;margin-left:4px">🎙 ${String(Math.floor(note.duration/60)).padStart(2,"0")}:${String(note.duration%60).padStart(2,"0")}</span>` : ""}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px">
                        <button class="history-delete-btn" onclick="event.stopPropagation();deleteHistoryNote('${date}','${note.id}')" title="${isVI ? 'Xóa' : 'Delete'}">🗑️</button>
                        <span class="history-toggle" id="htoggle_${i}">${expanded ? "▲" : "▼"}</span>
                    </div>
                </div>
                <div class="history-preview-text">${highlight(preview, q)}…</div>
                <div class="history-item-body" id="hbody_${i}" style="display:${expanded ? "block" : "none"}">
                    ${buildNoteBodyHTML(note, isVI)}
                </div>
            </div>
        </div>`;
    }).join("");
}

function toggleHistory(i) {
    const body = document.getElementById("hbody_" + i);
    const tog  = document.getElementById("htoggle_" + i);
    if (!body) return;
    const open = body.style.display !== "none";
    body.style.display = open ? "none" : "block";
    tog.innerText = open ? "▼" : "▲";
}

function deleteHistoryNote(dateStr, noteId) {
    const isVI = currentLanguage === "vi";
    if (!confirm(isVI ? "Xóa ghi chú này?" : "Delete this note?")) return;
    deleteNoteById(dateStr, noteId);
    _allHistoryNotes = _allHistoryNotes.filter(item => item.note.id !== noteId);
    const el = document.getElementById("hitem_" + noteId);
    if (el) el.remove();

    const countEl = document.getElementById("historyCount");
    if (_allHistoryNotes.length === 0) {
        document.getElementById("historyList").innerHTML = `<div class="history-empty">${isVI ? "Chưa có ghi chú nào." : "No notes yet."}</div>`;
        if (countEl) countEl.innerText = "";
        const deleteAllBtn = document.getElementById("deleteAllNotesBtn");
        if (deleteAllBtn) deleteAllBtn.style.display = "none";
    } else {
        if (countEl) countEl.innerText = isVI
            ? `${_allHistoryNotes.length} ghi chú`
            : `${_allHistoryNotes.length} note${_allHistoryNotes.length !== 1 ? "s" : ""}`;
    }
    showToast(isVI ? "🗑️ Đã xóa ghi chú" : "🗑️ Note deleted", "#7f1d1d");
}

function closeHistoryModal() {
    document.getElementById("historyModal").style.display = "none";
}

function deleteAllNotes() {
    const isVI = currentLanguage === "vi";
    const count = _allHistoryNotes.length;
    if (count === 0) return;
    const msg = isVI ? `Xóa tất cả ${count} ghi chú? Không thể hoàn tác!` : `Delete all ${count} notes? This cannot be undone!`;
    if (!confirm(msg)) return;

    // Remove all note keys from localStorage
    const keysToRemove = [];
    for (let k in localStorage) { if (k.startsWith("notes_")) keysToRemove.push(k); }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    _allHistoryNotes = [];
    renderCalendar(calendarViewYear, calendarViewMonth);
    renderHistoryList([], "");
    showToast(isVI ? `🗑️ Đã xóa tất cả ${count} ghi chú` : `🗑️ Deleted all ${count} notes`, "#7f1d1d");
}

// ── Export ──
function updateExportBtns() {
    const hasTranscript = !!transcriptBox.value.trim();
    const hasResult = !!document.getElementById("result").innerText.trim();
    const txtBtn = document.getElementById("exportTxtBtn");
    const mdBtn  = document.getElementById("exportMdBtn");
    if (txtBtn) { txtBtn.disabled = !hasTranscript; txtBtn.style.opacity = hasTranscript ? "1" : "0.4"; txtBtn.style.cursor = hasTranscript ? "pointer" : "not-allowed"; }
    if (mdBtn)  { mdBtn.disabled  = !hasResult;     mdBtn.style.opacity  = hasResult     ? "1" : "0.4"; mdBtn.style.cursor  = hasResult     ? "pointer" : "not-allowed"; }
}

function exportTXT() {
    const text = transcriptBox.value.trim();
    if (!text) { alert(currentLanguage === "vi" ? "Chưa có nội dung để tải!" : "No content to export!"); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], {type:"text/plain"}));
    a.download = "notes.txt";
    a.click();
}

function exportMD() {
    const content = document.getElementById("result").innerText.trim();
    if (!content) { alert(currentLanguage === "vi" ? "Chưa có kết quả phân tích để tải!" : "No analysis result to export!"); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], {type:"text/markdown"}));
    a.download = "notes.md";
    a.click();
}

document.getElementById("exportTxtBtn") && document.getElementById("exportTxtBtn").addEventListener("click", exportTXT);
document.getElementById("exportMdBtn")  && document.getElementById("exportMdBtn").addEventListener("click", exportMD);
document.getElementById("btnVI") && document.getElementById("btnVI").addEventListener("click", () => setLanguage("vi"));
document.getElementById("btnEN") && document.getElementById("btnEN").addEventListener("click", () => setLanguage("en"));

// ── Utilities ──
function escapeHtml(str) {
    if (typeof str !== "string") return String(str || "");
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function showToast(msg, bg = "#2e7d32") {
    const toast = document.createElement("div");
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:${bg};color:#fff;padding:12px 18px;border-radius:10px;z-index:99999;font-size:.9rem;box-shadow:0 4px 12px rgba(0,0,0,.3);max-width:300px`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ══════════════════════════════════════════
//  MODE SELECTOR (Học tập / Công việc)
// ══════════════════════════════════════════
// Mode selector luôn hiện khi load, không phụ thuộc meeting mode
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("modeSelectorRow").style.display = "flex";
});
// Fallback nếu DOMContentLoaded đã qua
if (document.readyState !== "loading") {
    document.getElementById("modeSelectorRow").style.display = "flex";
}

document.getElementById("modeStudyBtn").addEventListener("click", () => setMode("study"));
document.getElementById("modeWorkBtn").addEventListener("click",  () => setMode("work"));

function setMode(mode) {
    const studyRow = document.getElementById("studyToolsRow");
    const workRow  = document.getElementById("workToolsRow");
    const studyBtn = document.getElementById("modeStudyBtn");
    const workBtn  = document.getElementById("modeWorkBtn");

    // Bấm lại mode đang bật → tắt
    if (currentMode === mode) {
        currentMode = null;
        studyRow.style.display = "none";
        workRow.style.display  = "none";
        studyBtn.classList.remove("active");
        workBtn.classList.remove("active");
        return;
    }

    currentMode = mode;
    studyRow.style.display = mode === "study" ? "flex" : "none";
    workRow.style.display  = mode === "work"  ? "flex" : "none";
    studyBtn.classList.toggle("active", mode === "study");
    workBtn.classList.toggle("active",  mode === "work");
}

document.getElementById("reminderBtn")     && document.getElementById("reminderBtn").addEventListener("click", openReminderModal);
document.getElementById("chatNoteBtn")     && document.getElementById("chatNoteBtn").addEventListener("click", openChatModal);
document.getElementById("actionItemBtn")   && document.getElementById("actionItemBtn").addEventListener("click", openActionModal);
document.getElementById("exportMinutesBtn")&& document.getElementById("exportMinutesBtn").addEventListener("click", openMinutesModal);

function closeModal(id) {
    document.getElementById(id).style.display = "none";
}


// ══════════════════════════════════════════
//  💬 HỎI ĐÁP VỚI GHI CHÚ
// ══════════════════════════════════════════
let chatHistory = [];

function openChatModal() {
    const isVI = currentLanguage === "vi";
    const transcript = transcriptBox.value.trim();
    if (!transcript) {
        showToast(isVI ? "⚠️ Chưa có nội dung ghi chú để hỏi đáp!" : "⚠️ No note content to chat about!", "#c62828");
        return;
    }
    document.getElementById("chatModalTitle").innerText = isVI ? "Hỏi đáp với ghi chú" : "Chat with Note";
    document.getElementById("chatInput").placeholder = isVI ? "Hỏi về nội dung ghi chú..." : "Ask about the note...";
    chatHistory = [];
    const chatEl = document.getElementById("chatMessages");
    chatEl.innerHTML = `<div class="chat-bubble chat-bubble-ai">🤖 ${isVI ? "Xin chào! Tôi đã đọc ghi chú của bạn. Hãy hỏi bất cứ điều gì về nội dung đó." : "Hi! I've read your note. Ask me anything about it."}</div>`;
    document.getElementById("chatNoteModal").style.display = "flex";
    document.getElementById("chatInput").focus();
}

async function sendChat() {
    const isVI = currentLanguage === "vi";
    const input = document.getElementById("chatInput");
    const q = input.value.trim();
    if (!q) return;
    input.value = "";

    const chatEl = document.getElementById("chatMessages");
    chatEl.innerHTML += `<div class="chat-bubble chat-bubble-user">${escapeHtml(q)}</div>`;
    chatEl.innerHTML += `<div class="chat-bubble chat-bubble-ai chat-thinking" id="chatThinking">⏳ ${isVI ? "Đang suy nghĩ..." : "Thinking..."}</div>`;
    chatEl.scrollTop = chatEl.scrollHeight;

    const transcript = transcriptBox.value.trim();
    chatHistory.push({ role: "user", content: q });

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: isVI
                        ? `Bạn là trợ lý học tập. Người dùng có ghi chú sau:\n\n---\n${transcript}\n---\n\nHãy trả lời các câu hỏi dựa trên nội dung ghi chú này. Trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu.`
                        : `You are a study assistant. The user has the following note:\n\n---\n${transcript}\n---\n\nAnswer questions based on this note content. Be concise and clear.`
                    },
                    ...chatHistory
                ]
            })
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || (isVI ? "Xin lỗi, không trả lời được." : "Sorry, couldn't respond.");
        chatHistory.push({ role: "assistant", content: reply });
        document.getElementById("chatThinking")?.remove();
        chatEl.innerHTML += `<div class="chat-bubble chat-bubble-ai">${escapeHtml(reply)}</div>`;
        chatEl.scrollTop = chatEl.scrollHeight;
    } catch(e) {
        document.getElementById("chatThinking")?.remove();
        chatEl.innerHTML += `<div class="chat-bubble chat-bubble-ai" style="color:#f87171">❌ ${e.message}</div>`;
    }
}

// ══════════════════════════════════════════
//  ✅ ACTION ITEMS TỰ ĐỘNG
// ══════════════════════════════════════════
let actionItems = [];

async function openActionModal() {
    const isVI = currentLanguage === "vi";
    const transcript = transcriptBox.value.trim();
    if (!transcript) {
        showToast(isVI ? "⚠️ Chưa có nội dung họp!" : "⚠️ No meeting content!", "#c62828");
        return;
    }
    document.getElementById("actionModalTitle").innerText = isVI ? "Việc cần làm" : "Action Items";
    const body = document.getElementById("actionModalBody");
    body.innerHTML = `<div style="text-align:center;padding:30px;color:#aaa">⏳ ${isVI ? "AI đang phân tích việc cần làm..." : "AI analyzing action items..."}</div>`;
    document.getElementById("actionModal").style.display = "flex";

    const prompt = isVI
        ? `Phân tích nội dung cuộc họp sau và trích xuất các action items:\n\n${transcript}\n\nTrả về ĐÚNG JSON (không thêm gì khác):\n{"action_items":[{"task":"tên việc","owner":"người phụ trách (nếu có, để trống nếu không rõ)","deadline":"deadline (nếu có, để trống nếu không rõ)","priority":"high|medium|low"}]}`
        : `Analyze this meeting content and extract action items:\n\n${transcript}\n\nReturn ONLY JSON:\n{"action_items":[{"task":"task name","owner":"person responsible (empty if unclear)","deadline":"deadline (empty if unclear)","priority":"high|medium|low"}]}`;

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Extract action items from meeting transcripts. Return only valid JSON." },
                    { role: "user", content: prompt }
                ]
            })
        });
        const data = await res.json();
        let raw = data.choices?.[0]?.message?.content || "{}";
        raw = raw.replace(/```json|```/g,"").trim();
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) raw = match[0];
        const parsed = JSON.parse(raw);
        actionItems = (parsed.action_items || []).map((a,i) => ({ ...a, id: i, done: false }));
        renderActionItems(isVI);
    } catch(e) {
        body.innerHTML = `<div style="color:#f87171;padding:20px">❌ ${e.message}</div>`;
    }
}

function renderActionItems(isVI) {
    const body = document.getElementById("actionModalBody");
    const priorityColor = { high: "#c62828", medium: "#e65100", low: "#2e7d32" };
    const priorityLabel = { high: isVI?"Cao":"High", medium: isVI?"Trung bình":"Medium", low: isVI?"Thấp":"Low" };
    if (actionItems.length === 0) {
        body.innerHTML = `<div style="text-align:center;padding:30px;color:#aaa">${isVI ? "Không tìm thấy việc cần làm." : "No action items found."}</div>`;
        return;
    }
    body.innerHTML = actionItems.map(a => `
        <div class="action-card ${a.done?"done":""}" id="acard_${a.id}">
            <input type="checkbox" class="action-card-check" ${a.done?"checked":""} onchange="toggleAction(${a.id})">
            <div class="action-card-body">
                <div class="action-card-task">${escapeHtml(a.task)}</div>
                <div class="action-card-meta">
                    ${a.owner ? `👤 ${escapeHtml(a.owner)}` : ""}
                    ${a.deadline ? ` · 📅 ${escapeHtml(a.deadline)}` : ""}
                    ${a.priority ? ` · <span style="color:${priorityColor[a.priority]||"#888"};font-weight:700">${priorityLabel[a.priority]||a.priority}</span>` : ""}
                </div>
            </div>
        </div>`).join("");
}

function toggleAction(id) {
    const item = actionItems.find(a => a.id === id);
    if (item) { item.done = !item.done; renderActionItems(currentLanguage === "vi"); }
}

// ══════════════════════════════════════════
//  📄 XUẤT BIÊN BẢN HỌP
// ══════════════════════════════════════════
let generatedMinutes = "";

function openMinutesModal() {
    const isVI = currentLanguage === "vi";
    document.getElementById("minutesModalTitle").innerText = isVI ? "Xuất biên bản họp" : "Export Meeting Minutes";
    document.getElementById("minutesDate").value = getTodayStr();
    document.getElementById("minutesTitle").value = "";
    document.getElementById("minutesLocation").value = "";
    document.getElementById("minutesAttendees").value = "";
    document.getElementById("minutesPreview").innerText = isVI ? "Điền thông tin và nhấn \"Tạo biên bản AI\"..." : "Fill in info and click \"Generate AI Minutes\"...";
    document.getElementById("downloadMinutesBtn").style.display = "none";
    generatedMinutes = "";
    document.getElementById("minutesModal").style.display = "flex";
}

async function generateMinutes() {
    const isVI = currentLanguage === "vi";
    const transcript = transcriptBox.value.trim();
    if (!transcript) { showToast(isVI ? "⚠️ Chưa có nội dung họp!" : "⚠️ No meeting content!", "#c62828"); return; }

    const title     = document.getElementById("minutesTitle").value.trim() || (isVI ? "Cuộc họp" : "Meeting");
    const date      = document.getElementById("minutesDate").value || getTodayStr();
    const location  = document.getElementById("minutesLocation").value.trim() || (isVI ? "Không xác định" : "N/A");
    const attendees = document.getElementById("minutesAttendees").value.trim() || (isVI ? "Không xác định" : "N/A");

    const preview = document.getElementById("minutesPreview");
    preview.innerText = isVI ? "⏳ AI đang soạn biên bản..." : "⏳ AI generating minutes...";

    const prompt = isVI
        ? `Soạn biên bản họp chính thức từ nội dung sau:\n\nTiêu đề: ${title}\nNgày: ${date}\nĐịa điểm: ${location}\nThành phần: ${attendees}\n\nNội dung cuộc họp:\n${transcript}\n\nYêu cầu: Viết biên bản họp đầy đủ, chuyên nghiệp, có các mục: I. Thông tin chung, II. Nội dung thảo luận, III. Kết luận & Quyết định, IV. Phân công nhiệm vụ, V. Thời gian họp tiếp theo (nếu có). Dùng định dạng văn bản thuần, không dùng markdown.`
        : `Write a formal meeting minutes document from the following:\n\nTitle: ${title}\nDate: ${date}\nLocation: ${location}\nAttendees: ${attendees}\n\nMeeting content:\n${transcript}\n\nRequirements: Write complete, professional minutes with sections: I. General Info, II. Discussion, III. Conclusions & Decisions, IV. Task Assignments, V. Next Meeting (if any). Use plain text format, no markdown.`;

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: isVI ? "Bạn là thư ký soạn biên bản họp chuyên nghiệp. Viết văn phong trang trọng, rõ ràng." : "You are a professional meeting secretary. Write in formal, clear language." },
                    { role: "user", content: prompt }
                ]
            })
        });
        const data = await res.json();
        generatedMinutes = data.choices?.[0]?.message?.content || "";
        preview.innerText = generatedMinutes;
        document.getElementById("downloadMinutesBtn").style.display = "block";
    } catch(e) {
        preview.innerText = `❌ ${e.message}`;
    }
}

function downloadMinutesTxt() {
    if (!generatedMinutes) return;
    const title = document.getElementById("minutesTitle").value.trim() || "bien-ban-hop";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([generatedMinutes], { type: "text/plain;charset=utf-8" }));
    a.download = `${title.replace(/\s+/g,"-")}.txt`;
    a.click();
    showToast(currentLanguage === "vi" ? "✅ Đã tải biên bản họp!" : "✅ Minutes downloaded!", "#2e7d32");
}
