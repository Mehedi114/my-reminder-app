// ===== Service Worker - ব্যাকগ্রাউন্ডে কাজ করবে =====

const CACHE_NAME = 'reminder-app-v2';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js'
];

// ইনস্টল
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// অ্যাক্টিভেট
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// ফেচ - অফলাইনেও কাজ করবে
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        }).catch(function() {
            return caches.match('./index.html');
        })
    );
});

// মেসেজ রিসিভ - রিমাইন্ডার সেটআপ
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
        const task = event.data.task;
        scheduleNotification(task);
    }
});

// ব্যাকগ্রাউন্ড নোটিফিকেশন শিডিউল
function scheduleNotification(task) {
    const now = new Date();
    const timeParts = task.time.split(':');
    const taskDate = new Date();
    taskDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
    
    let delay = taskDate.getTime() - now.getTime();
    
    if (delay < 0) return; // সময় পার হয়ে গেলে স্কিপ
    
    setTimeout(function() {
        self.registration.showNotification('⏰ কাজের সময় হয়েছে!', {
            body: task.name,
            icon: 'https://cdn-icons-png.flaticon.com/512/2387/2387635.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/2387/2387635.png',
            tag: 'task-' + task.id,
            requireInteraction: true,
            vibrate: [500, 200, 500, 200, 500, 200, 500],
            actions: [
                { action: 'open', title: '📋 অ্যাপ খুলুন' },
                { action: 'snooze', title: '😴 ৫ মিনিট পরে' }
            ],
            data: {
                taskId: task.id,
                taskName: task.name
            }
        });
        
        // সব ক্লায়েন্টকে জানাও (অ্যাপ ওপেন থাকলে)
        self.clients.matchAll().then(function(clients) {
            clients.forEach(function(client) {
                client.postMessage({
                    type: 'REMINDER_TRIGGERED',
                    task: task
                });
            });
        });
        
    }, delay);
}

// নোটিফিকেশনে ক্লিক
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'snooze') {
        // ৫ মিনিট পরে আবার নোটিফিকেশন
        setTimeout(function() {
            self.registration.showNotification('⏰ আবার মনে করাচ্ছি!', {
                body: event.notification.data.taskName,
                icon: 'https://cdn-icons-png.flaticon.com/512/2387/2387635.png',
                requireInteraction: true,
                vibrate: [500, 200, 500, 200, 500]
            });
        }, 5 * 60 * 1000);
    } else {
        // অ্যাপ খোলো
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(function(clients) {
                if (clients.length > 0) {
                    return clients[0].focus();
                }
                return self.clients.openWindow('./');
            })
        );
    }
});
