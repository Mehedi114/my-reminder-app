// ===== গ্লোবাল ভেরিয়েবল =====
let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
let currentFilter = 'all';
let alarmAudio = null;
let alarmInterval = null;

// ===== অ্যালার্ম সাউন্ড সেটআপ (জোরে এবং লম্বা সময় বাজবে) =====
function createAlarmSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    
    const audioCtx = new AudioContext();
    return audioCtx;
}

function playLoudAlarm() {
    stopAlarm(); // আগেরটা বন্ধ করো
    
    let playCount = 0;
    const maxPlays = 30; // ৩০ বার বাজবে (প্রায় ৩০ সেকেন্ড)
    
    function playBeep() {
        if (playCount >= maxPlays) {
            stopAlarm();
            return;
        }
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            
            // বিপ ১ - উঁচু শব্দ
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.frequency.value = 880; // উঁচু সুর
            osc1.type = 'square';
            gain1.gain.value = 1.0; // ফুল ভলিউম
            osc1.start();
            osc1.stop(audioCtx.currentTime + 0.15);
            
            // বিপ ২ - আরও উঁচু শব্দ (০.২ সেকেন্ড পরে)
            setTimeout(() => {
                try {
                    const audioCtx2 = new AudioContext();
                    const osc2 = audioCtx2.createOscillator();
                    const gain2 = audioCtx2.createGain();
                    osc2.connect(gain2);
                    gain2.connect(audioCtx2.destination);
                    osc2.frequency.value = 1100;
                    osc2.type = 'square';
                    gain2.gain.value = 1.0;
                    osc2.start();
                    osc2.stop(audioCtx2.currentTime + 0.15);
                } catch(e) {}
            }, 200);
            
            // বিপ ৩ - সবচেয়ে উঁচু (০.৪ সেকেন্ড পরে)
            setTimeout(() => {
                try {
                    const audioCtx3 = new AudioContext();
                    const osc3 = audioCtx3.createOscillator();
                    const gain3 = audioCtx3.createGain();
                    osc3.connect(gain3);
                    gain3.connect(audioCtx3.destination);
                    osc3.frequency.value = 1320;
                    osc3.type = 'square';
                    gain3.gain.value = 1.0;
                    osc3.start();
                    osc3.stop(audioCtx3.currentTime + 0.2);
                } catch(e) {}
            }, 400);
            
        } catch(e) {
            console.log('Audio error:', e);
        }
        
        playCount++;
    }
    
    playBeep(); // এখনই বাজাও
    alarmInterval = setInterval(playBeep, 1000); // প্রতি ১ সেকেন্ড পর পর বাজতে থাকবে
}

function stopAlarm() {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
}

// ===== টেস্ট অ্যালার্ম =====
function testAlarm() {
    playLoudAlarm();
    showQuickAlert('🔊 অ্যালার্ম বাজছে! ৫ সেকেন্ড পর বন্ধ হবে...');
    setTimeout(stopAlarm, 5000);
}

// ===== পেজ লোড =====
window.onload = function() {
    updateClock();
    setInterval(updateClock, 1000);
    renderTasks();
    checkNotificationPermission();
    startReminderChecker();
    registerServiceWorker();
};

// ===== Service Worker রেজিস্টার (ব্যাকগ্রাউন্ডে কাজ করবে) =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('Service Worker registered!');
            })
            .catch(function(error) {
                console.log('SW registration failed:', error);
            });
    }
}

// ===== ঘড়ি আপডেট =====
function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    const timeStr = 
        String(hours).padStart(2, '0') + ':' + 
        String(minutes).padStart(2, '0') + ':' + 
        String(seconds).padStart(2, '0') + ' ' + ampm;
    
    document.getElementById('currentTime').textContent = timeStr;
}

// ===== নোটিফিকেশন পারমিশন =====
function checkNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
        document.getElementById('notifBanner').style.display = 'block';
    }
}

function requestNotifPermission() {
    Notification.requestPermission().then(function(permission) {
        if (permission === "granted") {
            document.getElementById('notifBanner').style.display = 'none';
            new Notification("🎉 নোটিফিকেশন চালু হয়েছে!", {
                body: "এখন থেকে আপনি সময়মতো রিমাইন্ডার পাবেন।",
                icon: "https://cdn-icons-png.flaticon.com/512/2387/2387635.png"
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

    if (!name) { alert('দয়া করে কাজের নাম লিখুন!'); return; }
    if (!time) { alert('দয়া করে সময় সেট করুন!'); return; }

    const task = {
        id: Date.now(),
        name: name,
        time: time,
        repeat: repeat,
        priority: priority,
        done: false,
        reminded: false,
        snoozed: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    saveTasks();
    renderTasks();

    document.getElementById('taskName').value = '';
    document.getElementById('taskTime').value = '';
    document.getElementById('repeatInterval').value = '0';

    showQuickAlert('✅ কাজ যোগ হয়েছে!');
    
    // Service Worker কে জানাও
    scheduleBackgroundReminder(task);
}

// ===== ব্যাকগ্রাউন্ড রিমাইন্ডার সেটআপ =====
function scheduleBackgroundReminder(task) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_REMINDER',
            task: task
        });
    }
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
            const repeatText = task.repeat > 0 ? '🔁 প্রতি ' + task.repeat + ' মিনিটে' : '⏰ একবার';
            
            return '<div class="task-item ' + (task.done ? 'done' : '') + ' priority-' + task.priority + '">' +
                '<div class="task-header">' +
                    '<span class="task-name">' + task.name + '</span>' +
                    '<span class="task-time">' + formatTime(task.time) + '</span>' +
                '</div>' +
                '<div class="task-meta">' + priorityLabels[task.priority] + ' | ' + repeatText + '</div>' +
                '<div class="task-actions">' +
                    (!task.done ? 
                        '<button class="btn-done" onclick="markDone(' + task.id + ')">✅ সম্পন্ন</button>' +
                        '<button class="btn-snooze" onclick="snoozeTask(' + task.id + ')">😴 ৫মিনিট পরে</button>'
                    :
                        '<button class="btn-done" onclick="markUndone(' + task.id + ')">↩️ আনডু</button>'
                    ) +
                    '<button class="btn-delete" onclick="deleteTask(' + task.id + ')">🗑️ মুছুন</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    updateStats();
}

// ===== সময় ফরম্যাট =====
function formatTime(timeStr) {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0]);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 || 12;
    return formattedHour + ':' + m + ' ' + ampm;
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

// ===== স্নুজ =====
function snoozeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        task.time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        task.reminded = false;
        task.snoozed = true;
        saveTasks();
        renderTasks();
        scheduleBackgroundReminder(task);
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

// ===== পরিসংখ্যান =====
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

// ===== রিমাইন্ডার চেকার (প্রতি ৫ সেকেন্ডে) =====
function startReminderChecker() {
    setInterval(checkReminders, 5000);
    checkReminders();
}

function checkReminders() {
    const now = new Date();
    const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    tasks.forEach(task => {
        if (task.done) return;

        if (task.time === currentTime && !task.reminded) {
            triggerReminder(task);
            task.reminded = true;

            if (task.repeat > 0) {
                setTimeout(() => {
                    task.reminded = false;
                    const nextTime = new Date();
                    nextTime.setMinutes(nextTime.getMinutes() + task.repeat);
                    task.time = String(nextTime.getHours()).padStart(2, '0') + ':' + String(nextTime.getMinutes()).padStart(2, '0');
                    saveTasks();
                    renderTasks();
                    scheduleBackgroundReminder(task);
                }, 60000);
            }
            saveTasks();
        }
    });
}

// ===== রিমাইন্ডার ট্রিগার =====
function triggerReminder(task) {
    // ১. জোরে অ্যালার্ম বাজাও
    playLoudAlarm();

    // ২. ব্রাউজার নোটিফিকেশন
    if (Notification.permission === "granted") {
        const notif = new Notification("⏰ কাজের সময় হয়েছে!", {
            body: task.name,
            icon: "https://cdn-icons-png.flaticon.com/512/2387/2387635.png",
            tag: 'task-' + task.id,
            requireInteraction: true,
            vibrate: [500, 200, 500, 200, 500, 200, 500]
        });

        notif.onclick = function() {
            window.focus();
            notif.close();
            stopAlarm();
        };
    }

    // ৩. পেজে পপআপ
    showReminderPopup(task.name);

    // ৪. ভাইব্রেশন
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500, 200, 500, 200, 500]);
    }
}

// ===== পপআপ =====
function showReminderPopup(taskName) {
    document.getElementById('reminderTaskName').textContent = taskName;
    document.getElementById('reminderPopup').style.display = 'flex';
}

function dismissReminder() {
    document.getElementById('reminderPopup').style.display = 'none';
    stopAlarm();
}

// ===== কুইক অ্যালার্ট =====
function showQuickAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:12px 24px;border-radius:25px;font-size:14px;z-index:10000;font-weight:600;';
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.3s';
        setTimeout(() => alertDiv.remove(), 300);
    }, 2000);
}

// ===== সেভ =====
function saveTasks() {
    localStorage.setItem('myTasks', JSON.stringify(tasks));
}
