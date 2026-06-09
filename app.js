// ===== গ্লোবাল ভেরিয়েবল =====
let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
let activeTimers = {};
let currentFilter = 'all';

// ===== পেজ লোড হওয়ার পর =====
window.onload = function() {
    updateClock();
    setInterval(updateClock, 1000);
    renderTasks();
    checkNotificationPermission();
    startReminderChecker();
};

// ===== ঘড়ি আপডেট =====
function updateClock() {
    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('bn-BD', options);
}

// ===== নোটিফিকেশন পারমিশন =====
function checkNotificationPermission() {
    if (!("Notification" in window)) {
        return;
    }
    if (Notification.permission === "default") {
        document.getElementById('notifBanner').style.display = 'block';
    }
}

function requestNotifPermission() {
    Notification.requestPermission().then(function(permission) {
        if (permission === "granted") {
            document.getElementById('notifBanner').style.display = 'none';
            new Notification("🎉 নোটিফিকেশন চালু হয়েছে!", {
                body: "এখন থেকে আপনি সময়মতো রিমাইন্ডার পাবেন।"
            });
        }
    });
}

// ===== কাজ যোগ করা =====
function addTask() {
    const name = document.getElementById('taskName').value.trim();
    const time = document.getElementById('taskTime').value;
    const repeat = parseInt(document.getElementById('repeatInterval').value);
    const priority = document.getElementById('taskPriority').value;

    if (!name) {
        alert('দয়া করে কাজের নাম লিখুন!');
        return;
    }
    if (!time) {
        alert('দয়া করে সময় সেট করুন!');
        return;
    }

    const task = {
        id: Date.now(),
        name: name,
        time: time,
        repeat: repeat,
        priority: priority,
        done: false,
        reminded: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    saveTasks();
    renderTasks();

    // ফর্ম রিসেট
    document.getElementById('taskName').value = '';
    document.getElementById('taskTime').value = '';
    document.getElementById('repeatInterval').value = '0';

    // কনফার্মেশন
    showQuickAlert('✅ কাজ যোগ হয়েছে!');
}

// ===== কাজের তালিকা দেখানো =====
function renderTasks() {
    const taskList = document.getElementById('taskList');
    
    let filteredTasks = tasks;
    if (currentFilter === 'done') {
        filteredTasks = tasks.filter(t => t.done);
    } else if (currentFilter === 'pending') {
        filteredTasks = tasks.filter(t => !t.done);
    }

    // সময় অনুযায়ী সর্ট
    filteredTasks.sort((a, b) => a.time.localeCompare(b.time));

    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<p class="empty-message">কোনো কাজ নেই! 📭</p>';
    } else {
        taskList.innerHTML = filteredTasks.map(task => {
            const priorityLabels = {
                high: '🔴 খুব জরুরি',
                medium: '🟡 মাঝারি',
                low: '🟢 কম জরুরি'
            };
            const repeatText = task.repeat > 0 ? `🔁 প্রতি ${task.repeat} মিনিটে` : '⏰ একবার';
            
            return `
                <div class="task-item ${task.done ? 'done' : ''} priority-${task.priority}">
                    <div class="task-header">
                        <span class="task-name">${task.name}</span>
                        <span class="task-time">${formatTime(task.time)}</span>
                    </div>
                    <div class="task-meta">
                        ${priorityLabels[task.priority]} | ${repeatText}
                    </div>
                    <div class="task-actions">
                        ${!task.done ? `
                            <button class="btn-done" onclick="markDone(${task.id})">✅ সম্পন্ন</button>
                            <button class="btn-snooze" onclick="snoozeTask(${task.id})">😴 ৫মিনিট পরে</button>
                        ` : `
                            <button class="btn-done" onclick="markUndone(${task.id})">↩️ আনডু</button>
                        `}
                        <button class="btn-delete" onclick="deleteTask(${task.id})">🗑️ মুছুন</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStats();
}

// ===== সময় ফরম্যাট =====
function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
}

// ===== কাজ সম্পন্ন =====
function markDone(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.done = true;
        task.reminded = true;
        saveTasks();
        renderTasks();
        showQuickAlert('🎉 দারুণ! কাজ সম্পন্ন!');
    }
}

function markUndone(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.done = false;
        task.reminded = false;
        saveTasks();
        renderTasks();
    }
}

// ===== কাজ মুছে ফেলা =====
function deleteTask(id) {
    if (confirm('এই কাজটি মুছে ফেলবেন?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
    }
}

// ===== স্নুজ (৫ মিনিট পরে আবার মনে করানো) =====
function snoozeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        const newHours = String(now.getHours()).padStart(2, '0');
        const newMins = String(now.getMinutes()).padStart(2, '0');
        task.time = `${newHours}:${newMins}`;
        task.reminded = false;
        saveTasks();
        renderTasks();
        showQuickAlert('😴 ৫ মিনিট পরে আবার মনে করাবে!');
    }
}

// ===== সব কাজ মুছে ফেলা =====
function clearAllTasks() {
    if (confirm('সব কাজ মুছে ফেলবেন? এটি ফিরিয়ে আনা যাবে না!')) {
        tasks = [];
        saveTasks();
        renderTasks();
    }
}

// ===== ফিল্টার =====
function filterTasks(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTasks();
}

// ===== পরিসংখ্যান আপডেট =====
function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pending = total - done;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    document.getElementById('totalTasks').textContent = total;
    document.getElementById('doneTasks').textContent = done;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressText').textContent = progress + '% কাজ সম্পন্ন';
}

// ===== রিমাইন্ডার চেকার (প্রতি ১০ সেকেন্ডে চেক করে) =====
function startReminderChecker() {
    setInterval(checkReminders, 10000); // প্রতি ১০ সেকেন্ড
    checkReminders(); // এখনই একবার চেক করো
}

function checkReminders() {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMins}`;

    tasks.forEach(task => {
        if (task.done) return;

        // সময় হয়েছে কিনা চেক
        if (task.time === currentTime && !task.reminded) {
            triggerReminder(task);
            task.reminded = true;

            // রিপিট সেট করা থাকলে পরবর্তী সময় সেট করো
            if (task.repeat > 0) {
                setTimeout(() => {
                    task.reminded = false;
                    const nextTime = new Date();
                    nextTime.setMinutes(nextTime.getMinutes() + task.repeat);
                    task.time = `${String(nextTime.getHours()).padStart(2, '0')}:${String(nextTime.getMinutes()).padStart(2, '0')}`;
                    saveTasks();
                    renderTasks();
                }, 60000); // ১ মিনিট পর রিসেট
            }

            saveTasks();
        }
    });
}

// ===== রিমাইন্ডার ট্রিগার =====
function triggerReminder(task) {
    // ১. ব্রাউজার নোটিফিকেশন
    if (Notification.permission === "granted") {
        const notif = new Notification("⏰ কাজের সময় হয়েছে!", {
            body: task.name,
            icon: "📋",
            tag: 'task-' + task.id,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
        });

        notif.onclick = function() {
            window.focus();
            notif.close();
        };
    }

    // ২. পেজে পপআপ দেখাও
    showReminderPopup(task.name);

    // ৩. সাউন্ড বাজাও
    try {
        const audio = document.getElementById('alarmSound');
        audio.currentTime = 0;
        audio.play();
    } catch(e) {
        console.log('Sound could not play');
    }

    // ৪. ভাইব্রেশন
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
    }
}

// ===== রিমাইন্ডার পপআপ =====
function showReminderPopup(taskName) {
    document.getElementById('reminderTaskName').textContent = taskName;
    document.getElementById('reminderPopup').style.display = 'flex';
}

function dismissReminder() {
    document.getElementById('reminderPopup').style.display = 'none';
}

// ===== দ্রুত অ্যালার্ট =====
function showQuickAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        z-index: 10000;
        animation: fadeIn 0.3s;
        font-weight: 600;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.3s';
        setTimeout(() => alertDiv.remove(), 300);
    }, 2000);
}

// ===== লোকাল স্টোরেজে সেভ =====
function saveTasks() {
    localStorage.setItem('myTasks', JSON.stringify(tasks));
}
