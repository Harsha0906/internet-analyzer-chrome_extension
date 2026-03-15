// ─── State ───────────────────────────────────────────────────────────────────
let activeTab     = null;
let startTime     = Date.now();
let isIdle        = false;
let blockedSites  = new Set();
let notifiedToday = new Set(); // domains already notified today

const NOTIFY_THRESHOLD = 60 * 60 * 1000; // 1 hour

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getToday() {
    return new Date().toISOString().split('T')[0];
}

function saveTime(domain, duration) {
    if (!domain || duration < 1000) return;
    const today = getToday();
    chrome.storage.local.get([today], (result) => {
        const dayData = result[today] || {};
        dayData[domain] = (dayData[domain] || 0) + duration;
        chrome.storage.local.set({ [today]: dayData }, () => {
            checkNotification(domain, dayData[domain]);
        });
    });
}

function flushCurrent() {
    if (activeTab && !isIdle) {
        const now = Date.now();
        saveTime(activeTab, now - startTime);
        startTime = now;
    }
}

// ─── Notifications ────────────────────────────────────────────────────────────
function checkNotification(domain, totalMs) {
    if (totalMs >= NOTIFY_THRESHOLD && !notifiedToday.has(domain)) {
        notifiedToday.add(domain);
        const h = Math.floor(totalMs / 3600000);
        const m = Math.floor((totalMs % 3600000) / 60000);
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        chrome.notifications.create(`usage_${domain}`, {
            type:     'basic',
            iconUrl:  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            title:    '⏰ Screen Time Alert',
            message:  `You've spent ${timeStr} on ${domain} today.`,
            priority: 1
        });
    }
}

// Reset notified list at midnight
function scheduleMidnightReset() {
    const now      = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    chrome.alarms.create('midnightReset', {
        delayInMinutes: (midnight - now) / 60000
    });
}

// ─── Blocking ─────────────────────────────────────────────────────────────────
function loadBlockedSites() {
    chrome.storage.local.get(['blockedSites'], (result) => {
        blockedSites = new Set(result.blockedSites || []);
    });
}

function getBlockedDomain(url) {
    if (!url || !url.startsWith('http')) return null;
    try {
        const domain = new URL(url).hostname;
        for (const b of blockedSites) {
            if (domain === b || domain.endsWith('.' + b)) return b;
        }
    } catch (_) {}
    return null;
}

function redirectIfBlocked(tabId, url) {
    const domain = getBlockedDomain(url);
    if (domain) {
        chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}`)
        });
        return true;
    }
    return false;
}

// ─── Tab Change Handler ───────────────────────────────────────────────────────
function handleTabChange(tab) {
    flushCurrent();

    if (tab && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        if (redirectIfBlocked(tab.id, tab.url)) {
            activeTab = null;
            return;
        }
        try {
            activeTab = new URL(tab.url).hostname;
            startTime = Date.now();
        } catch (_) {
            activeTab = null;
        }
    } else {
        activeTab = null;
    }
}

// ─── Startup ─────────────────────────────────────────────────────────────────
loadBlockedSites();
scheduleMidnightReset();

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) handleTabChange(tabs[0]);
});

// ─── Tab Events ──────────────────────────────────────────────────────────────
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => handleTabChange(tab));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        if (tab.url && redirectIfBlocked(tabId, tab.url)) return;
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
            if (activeTabs[0] && activeTabs[0].id === tabId) handleTabChange(tab);
        });
    }
});

// ─── Window Focus ─────────────────────────────────────────────────────────────
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        flushCurrent();
        activeTab = null;
    } else {
        startTime = Date.now();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) handleTabChange(tabs[0]);
        });
    }
});

// ─── Idle Detection ───────────────────────────────────────────────────────────
chrome.idle.setDetectionInterval(60);

chrome.idle.onStateChanged.addListener((state) => {
    if (state === 'idle' || state === 'locked') {
        flushCurrent();
        isIdle = true;
    } else if (state === 'active') {
        isIdle    = false;
        startTime = Date.now();
    }
});

// ─── Alarms ───────────────────────────────────────────────────────────────────
chrome.alarms.create('autoSave', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoSave')      flushCurrent();
    if (alarm.name === 'midnightReset') { notifiedToday.clear(); scheduleMidnightReset(); }
});

// ─── Storage Changes (sync block list in real-time) ───────────────────────────
chrome.storage.onChanged.addListener((changes) => {
    if (changes.blockedSites) {
        blockedSites = new Set(changes.blockedSites.newValue || []);
    }
});