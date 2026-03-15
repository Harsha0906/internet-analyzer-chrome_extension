// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = {
    '🎬 Entertainment': {
        color: '#f97316',
        sites: ['youtube.com','netflix.com','twitch.tv','hotstar.com','primevideo.com',
                'disneyplus.com','hulu.com','crunchyroll.com','jiocinema.com']
    },
    '📱 Social Media': {
        color: '#ec4899',
        sites: ['facebook.com','twitter.com','instagram.com','linkedin.com','reddit.com',
                'x.com','tiktok.com','snapchat.com','pinterest.com','threads.net']
    },
    '💼 Work & Dev': {
        color: '#22c55e',
        sites: ['github.com','gitlab.com','stackoverflow.com','notion.so','trello.com',
                'slack.com','figma.com','docs.google.com','drive.google.com',
                'sheets.google.com','meet.google.com','zoom.us','linear.app',
                'vercel.com','netlify.com','codepen.io','replit.com']
    },
    '📧 Email': {
        color: '#38bdf8',
        sites: ['mail.google.com','outlook.com','yahoo.com','protonmail.com']
    },
    '📰 News': {
        color: '#a78bfa',
        sites: ['bbc.com','cnn.com','nytimes.com','theguardian.com','ndtv.com',
                'timesofindia.com','hindustantimes.com','thehindu.com','reuters.com']
    },
    '🛒 Shopping': {
        color: '#fbbf24',
        sites: ['amazon.com','amazon.in','flipkart.com','myntra.com','ebay.com','meesho.com']
    },
    '📚 Education': {
        color: '#34d399',
        sites: ['coursera.org','udemy.com','khanacademy.org','edx.org','leetcode.com',
                'geeksforgeeks.org','w3schools.com','freecodecamp.org','brilliant.org']
    }
};

function getCategory(domain) {
    for (const [name, info] of Object.entries(CATEGORIES)) {
        if (info.sites.some(s => domain.includes(s))) return { name, color: info.color };
    }
    return { name: '🌐 Other', color: '#999' };
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60)  return s + 's';
    const m = Math.floor(s / 60);
    if (m < 60)  return m + 'm ' + (s % 60) + 's';
    const h = Math.floor(m / 60);
    return h + 'h ' + (m % 60) + 'm';
}

function fmtShort(ms) {
    const m = Math.floor(ms / 60000);
    if (m < 1)  return Math.floor(ms / 1000) + 's';
    if (m < 60) return m + 'm';
    return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}

function getToday() { return new Date().toISOString().split('T')[0]; }
function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}
function friendlyDate() {
    return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function faviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// ─── State ────────────────────────────────────────────────────────────────────
let currentTab     = 'today';
let allStorageData = {};
let blockedSet     = new Set();

function reloadAndRender() {
    chrome.storage.local.get(null, (data) => {
        allStorageData = data || {};
        blockedSet     = new Set(allStorageData.blockedSites || []);
        renderContent();
    });
}

// ─── Block / Unblock ─────────────────────────────────────────────────────────
function toggleBlock(domain) {
    let list = [...blockedSet];
    if (blockedSet.has(domain)) {
        list = list.filter(d => d !== domain);
    } else {
        list.push(domain);
    }
    chrome.storage.local.set({ blockedSites: list }, reloadAndRender);
}

// ─── Build site card ──────────────────────────────────────────────────────────
function buildSiteCard(domain, time, maxTime, yesterdayData) {
    const pct    = Math.round((time / maxTime) * 100);
    const yTime  = yesterdayData ? (yesterdayData[domain] || 0) : -1;
    const blocked = blockedSet.has(domain);

    // Compare tag
    let cmpHtml = '';
    if (yTime === 0) {
        cmpHtml = `<span class="cmp cmp-new">✦ new</span>`;
    } else if (yTime > 0) {
        const diff = time - yTime;
        if (diff > 60000)       cmpHtml = `<span class="cmp cmp-more">↑ ${fmtShort(diff)}</span>`;
        else if (diff < -60000) cmpHtml = `<span class="cmp cmp-less">↓ ${fmtShort(-diff)}</span>`;
    }

    const card = document.createElement('div');
    card.className = 'site-card';
    card.innerHTML = `
      <div class="favicon-wrap">
        <img class="site-favicon" src="${faviconUrl(domain)}" alt="" onerror="this.style.display='none'">
      </div>
      <div class="site-info">
        <div class="site-top">
          <span class="site-name" title="${domain}">${domain}</span>
          <div class="site-right">
            ${cmpHtml}
            <span class="site-time">${fmt(time)}</span>
          </div>
        </div>
        <div class="site-bar-wrap">
          <div class="site-bar-track"></div>
          <div class="site-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <button class="block-btn ${blocked ? 'is-blocked' : ''}" title="${blocked ? 'Unblock' : 'Block'} ${domain}" data-domain="${domain}">
        ${blocked ? '🔓' : '🚫'}
      </button>`;

    card.querySelector('.block-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBlock(domain);
    });

    return card;
}

// ─── Tab Switcher ─────────────────────────────────────────────────────────────
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    renderContent();
}

// ─── Render: TODAY ────────────────────────────────────────────────────────────
function renderToday() {
    const content  = document.getElementById('content');
    const today    = getToday();
    const data     = allStorageData[today] || {};
    const yData    = allStorageData[getYesterday()] || {};
    const entries  = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
        content.innerHTML = `<div class="empty"><strong>No data yet</strong>Browse some websites and switch tabs!</div>`;
        return;
    }

    const total = entries.reduce((s, [, v]) => s + v, 0);
    const maxT  = entries[0][1];
    document.getElementById('totalTime').textContent = fmt(total);
    document.getElementById('siteCount').textContent = entries.length;

    const frag = document.createDocumentFragment();
    entries.forEach(([domain, time]) => frag.appendChild(buildSiteCard(domain, time, maxT, yData)));
    content.innerHTML = '';
    content.appendChild(frag);
}

// ─── Render: ALL TIME ─────────────────────────────────────────────────────────
function renderAllTime() {
    const content = document.getElementById('content');
    const merged  = {};
    for (const [key, dayData] of Object.entries(allStorageData)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
        for (const [domain, time] of Object.entries(dayData)) {
            merged[domain] = (merged[domain] || 0) + time;
        }
    }
    const entries = Object.entries(merged).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
        content.innerHTML = `<div class="empty"><strong>No history yet</strong>Keep browsing to build history.</div>`;
        return;
    }

    const total = entries.reduce((s, [, v]) => s + v, 0);
    const maxT  = entries[0][1];
    document.getElementById('totalTime').textContent = fmt(total);
    document.getElementById('siteCount').textContent = entries.length;
    document.getElementById('dateBadge').textContent = 'All Time';

    const frag = document.createDocumentFragment();
    entries.forEach(([domain, time]) => frag.appendChild(buildSiteCard(domain, time, maxT, null)));
    content.innerHTML = '';
    content.appendChild(frag);
}

// ─── Render: CATEGORIES ───────────────────────────────────────────────────────
function renderCategories() {
    const content = document.getElementById('content');
    const merged  = {};
    for (const [key, dayData] of Object.entries(allStorageData)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
        for (const [domain, time] of Object.entries(dayData)) {
            merged[domain] = (merged[domain] || 0) + time;
        }
    }

    const cats = {};
    for (const [domain, time] of Object.entries(merged)) {
        const { name, color } = getCategory(domain);
        if (!cats[name]) cats[name] = { time: 0, sites: 0, color };
        cats[name].time  += time;
        cats[name].sites += 1;
    }

    const entries = Object.entries(cats).sort((a, b) => b[1].time - a[1].time);
    if (entries.length === 0) {
        content.innerHTML = `<div class="empty"><strong>No data yet</strong>Browse the web to see categories.</div>`;
        return;
    }

    const total = entries.reduce((s, [, v]) => s + v.time, 0);
    const maxT  = entries[0][1].time;
    document.getElementById('totalTime').textContent = fmt(total);
    document.getElementById('siteCount').textContent = entries.length + ' cats';
    document.getElementById('dateBadge').textContent = 'All Time';

    let html = '';
    entries.forEach(([name, info]) => {
        const pct = Math.round((info.time / maxT) * 100);
        html += `
          <div class="cat-card">
            <div class="cat-top">
              <span class="cat-name">${name}</span>
              <div class="cat-right">
                <span class="cat-sites">${info.sites} site${info.sites > 1 ? 's' : ''}</span>
                <span class="cat-time">${fmt(info.time)}</span>
              </div>
            </div>
            <div class="cat-bar-wrap">
              <div class="cat-bar-track"></div>
              <div class="cat-bar-fill" style="width:${pct}%;background:${info.color};opacity:0.7"></div>
            </div>
          </div>`;
    });
    content.innerHTML = html;
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV() {
    const rows = [['Date', 'Domain', 'Duration (ms)', 'Duration (min)']];
    for (const [key, dayData] of Object.entries(allStorageData)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
        for (const [domain, time] of Object.entries(dayData)) {
            rows.push([key, domain, time, Math.round(time / 60000)]);
        }
    }
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a    = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob), download: `usage_${getToday()}.csv`
    });
    a.click();
    URL.revokeObjectURL(a.href);
}

// ─── Main Render ──────────────────────────────────────────────────────────────
function renderContent() {
    document.getElementById('dateBadge').textContent = friendlyDate();
    document.getElementById('totalTime').textContent = '--';
    document.getElementById('siteCount').textContent = '--';
    if      (currentTab === 'today')      renderToday();
    else if (currentTab === 'alltime')    renderAllTime();
    else                                   renderCategories();
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    reloadAndRender();

    document.getElementById('tab-today').addEventListener('click',      () => switchTab('today'));
    document.getElementById('tab-alltime').addEventListener('click',    () => switchTab('alltime'));
    document.getElementById('tab-categories').addEventListener('click', () => switchTab('categories'));

    document.getElementById('dashBtn').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') });
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        const key = getToday();
        chrome.storage.local.remove(key, () => {
            allStorageData[key] = {};
            renderContent();
        });
    });

    document.getElementById('exportBtn').addEventListener('click', exportCSV);
});
