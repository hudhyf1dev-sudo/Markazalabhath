// Application State
const state = {
    currentScreen: 'welcome',
    selectedTest: null,
    bookings: JSON.parse(localStorage.getItem('ntrc_bookings')) || []
};

// Telegram Configuration
const TELEGRAM_CONFIG = {
    botToken: '8373148284:AAHTTSTJbyAs-xTyEyEekn_hqyUErP4rA34',
    chatId: '-1003885937352'
};

// Test Options Data
const TEST_OPTIONS = [
    { id: 'rbc', name: 'RBC', icon: 'droplet', desc: 'اختبار كريات الدم الحمراء' },
    { id: 'cbc', name: 'CBC', icon: 'activity', desc: 'تعداد الدم الكامل' },
    { id: 'bp', name: 'Blood Pressure', icon: 'heart', desc: 'قياس ضغط الدم' },
    { id: 'sugar', name: 'Blood Sugar', icon: 'trending-up', desc: 'اختبار سكر الدم' },
    { id: 'cancer', name: 'Cancer Markers', icon: 'shield', desc: 'مؤشرات السرطان' },
    { id: 'other', name: 'Other', icon: 'plus', desc: 'فحص آخر (حدد النوع)' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeTests();
    updateNavState();
    feather.replace();
});

// Navigation Function
function navigateTo(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden', 'opacity-0');
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        // Small delay for animation
        setTimeout(() => {
            targetScreen.classList.remove('opacity-0');
            targetScreen.classList.add('active');
        }, 50);
    }
    
    // Update state
    state.currentScreen = screenName;
    updateNavState();
    
    // Special handling for bookings screen
    if (screenName === 'bookings') {
        renderBookings();
    }
    
    feather.replace();
}

// Update Navigation Active State
function updateNavState() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active', 'text-primary');
        btn.classList.add('text-gray-400');
        
        if (btn.dataset.target === state.currentScreen) {
            btn.classList.add('active', 'text-primary');
            btn.classList.remove('text-gray-400');
        }
    });
}

// Initialize Test Options
function initializeTests() {
    const container = document.getElementById('tests-container');
    
    TEST_OPTIONS.forEach(test => {
        const card = document.createElement('div');
        card.className = 'test-card bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer flex items-center gap-4';
        card.onclick = () => selectTest(test);
        card.dataset.testId = test.id;
        
        card.innerHTML = `
            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <i data-feather="${test.icon}" class="w-6 h-6 text-primary"></i>
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-gray-800">${test.name}</h3>
                <p class="text-xs text-gray-500">${test.desc}</p>
            </div>
            <div class="selection-indicator w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                <div class="w-3 h-3 rounded-full bg-primary opacity-0 transition-opacity"></div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Handle Test Selection
function selectTest(test) {
    // Remove previous selections
    document.querySelectorAll('.test-card').forEach(card => {
        card.classList.remove('selected', 'bg-blue-50', 'border-primary');
        card.querySelector('.selection-indicator').classList.remove('border-primary', 'bg-primary');
        card.querySelector('.selection-indicator div').classList.remove('opacity-100');
        card.querySelector('.selection-indicator div').classList.add('opacity-0');
    });
    
    // Add selection to clicked card
    const selectedCard = document.querySelector(`[data-test-id="${test.id}"]`);
    selectedCard.classList.add('selected');
    selectedCard.querySelector('.selection-indicator').classList.add('border-primary', 'bg-primary');
    selectedCard.querySelector('.selection-indicator div').classList.remove('opacity-0');
    selectedCard.querySelector('.selection-indicator div').classList.add('opacity-100');
    
    state.selectedTest = test;
    
    // Handle "Other" option specially
    if (test.id === 'other') {
        document.getElementById('other-test-container').classList.remove('hidden');
        document.getElementById('other-test-input').focus();
    } else {
        document.getElementById('other-test-container').classList.add('hidden');
        // Auto advance to customer data after short delay for better UX
        setTimeout(() => {
            navigateTo('customer-data');
            document.getElementById('selected-test-display').textContent = test.name;
        }, 400);
    }
}

// Confirm Other Test
function confirmOtherTest() {
    const input = document.getElementById('other-test-input');
    const value = input.value.trim();
    
    if (!value) {
        showToast('الرجاء إدخال اسم الفحص', 'error');
        input.focus();
        return;
    }
    
    state.selectedTest = { ...state.selectedTest, name: `Other: ${value}`, customValue: value };
    navigateTo('customer-data');
    document.getElementById('selected-test-display').textContent = value;
}

// Handle Form Submission
async function handleSubmit(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('full-name').value.trim();
    const phone = document.getElementById('phone-number').value.trim();
    const notes = document.getElementById('notes').value.trim();
    
    // Validation
    if (!fullName || !phone) {
        showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (!/^\d{10,11}$/.test(phone)) {
        showToast('الرجاء إدخال رقم هاتف صحيح', 'error');
        return;
    }
    
    // Show loading
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('loading-overlay').classList.add('flex');
    
    // Prepare Data
    const dateTime = new Date().toLocaleString('ar-IQ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const testName = state.selectedTest?.customValue || state.selectedTest?.name || 'غير محدد';
    
    // Prepare Telegram Message
    const message = formatTelegramMessage({
        fullName,
        phone,
        testName,
        notes: notes || 'لا توجد ملاحظات',
        dateTime
    });
    
    try {
        // Send to Telegram
        await sendToTelegram(message);
        
        // Save to Local Storage
        saveBooking({
            id: Date.now(),
            fullName,
            phone,
            testName,
            notes,
            dateTime,
            status: 'pending'
        });
        
        // Show Success
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('loading-overlay').classList.remove('flex');
        navigateTo('confirmation');
        
        // Reset Form
        document.getElementById('customer-form').reset();
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('loading-overlay').classList.remove('flex');
        showToast('حدث خطأ في الإرسال. الرجاء المحاولة مرة أخرى.', 'error');
    }
}

// Format Telegram Message
function formatTelegramMessage(data) {
    return `
🔬 *طلب فحص جديد - المركز التقني للأبحاث*

👤 *الاسم:* ${data.fullName}
📱 *رقم الهاتف:* ${data.phone}
🔬 *نوع الفحص:* ${data.testName}
📝 *الملاحظات:* ${data.notes}
📅 *تاريخ الطلب:* ${data.dateTime}

⚡️ تم الاستلام عبر تطبيق NTRC
    `.trim();
}

// Send to Telegram API
async function sendToTelegram(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: TELEGRAM_CONFIG.chatId,
            text: message,
            parse_mode: 'Markdown'
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to send message');
    }
    
    return response.json();
}

// Save Booking to LocalStorage
function saveBooking(booking) {
    state.bookings.unshift(booking);
    localStorage.setItem('ntrc_bookings', JSON.stringify(state.bookings));
}

// Render Bookings List
function renderBookings() {
    const list = document.getElementById('bookings-list');
    const emptyState = document.getElementById('empty-bookings');
    
    if (state.bookings.length === 0) {
        list.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    list.innerHTML = '';
    
    state.bookings.forEach((booking, index) => {
        const card = document.createElement('div');
        card.className = 'booking-card p-4 rounded-xl shadow-sm';
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <i data-feather="activity" class="w-5 h-5 text-primary"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-800">${booking.testName}</h3>
                        <span class="text-xs text-gray-500">${booking.dateTime}</span>
                    </div>
                </div>
                <span class="status-badge status-pending">
                    قيد الانتظار
                </span>
            </div>
            
            <div class="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <div class="flex items-center gap-2">
                    <i data-feather="user" class="w-4 h-4 text-primary"></i>
                    <span>${booking.fullName}</span>
                </div>
                <div class="flex items-center gap-2">
                    <i data-feather="phone" class="w-4 h-4 text-primary"></i>
                    <span dir="ltr">${booking.phone}</span>
                </div>
                ${booking.notes ? `
                <div class="flex items-start gap-2 mt-2 pt-2 border-t border-gray-200">
                    <i data-feather="file-text" class="w-4 h-4 text-primary mt-0.5"></i>
                    <span class="text-xs">${booking.notes}</span>
                </div>
                ` : ''}
            </div>
        `;
        
        list.appendChild(card);
    });
    
    feather.replace();
}

// Reset and Go Home
function resetAndGoHome() {
    state.selectedTest = null;
    document.querySelectorAll('.test-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById('other-test-container').classList.add('hidden');
    document.getElementById('customer-form').reset();
    navigateTo('test-selection');
}

// Toast Notification
function showToast(message, type = 'success') {
    // Remove existing toasts
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const icon = type === 'error' ? 'alert-circle' : 'check-circle';
    toast.innerHTML = `
        <i data-feather="${icon}" class="w-5 h-5"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    feather.replace();
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Handle Browser Back Button
window.addEventListener('popstate', (event) => {
    if (state.currentScreen !== 'welcome') {
        event.preventDefault();
        navigateTo('welcome');
        history.pushState(null, null, window.location.href);
    }
});

// Prevent Zoom on Double Tap (Mobile)
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);