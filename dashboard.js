// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = {
  '🎬 Entertainment': { color: '#f97316', sites: ['youtube.com','netflix.com','twitch.tv','hotstar.com','primevideo.com','disneyplus.com','hulu.com','crunchyroll.com'] },
  '📱 Social Media':  { color: '#ec4899', sites: ['facebook.com','twitter.com','instagram.com','linkedin.com','reddit.com','x.com','tiktok.com','snapchat.com','threads.net'] },
  '💼 Work & Dev':    { color: '#22c55e', sites: ['github.com','gitlab.com','stackoverflow.com','notion.so','trello.com','slack.com','figma.com','docs.google.com','drive.google.com','meet.google.com','zoom.us','linear.app','vercel.com','netlify.com','codepen.io','replit.com'] },
  '📧 Email':         { color: '#38bdf8', sites: ['mail.google.com','outlook.com','yahoo.com','protonmail.com'] },
  '📰 News':          { color: '#a78bfa', sites: ['bbc.com','cnn.com','nytimes.com','theguardian.com','ndtv.com','timesofindia.com','hindustantimes.com','thehindu.com','reuters.com'] },
  '🛒 Shopping':      { color: '#fbbf24', sites: ['amazon.com','amazon.in','flipkart.com','myntra.com','ebay.com','meesho.com'] },
  '📚 Education':     { color: '#34d399', sites: ['coursera.org','udemy.com','khanacademy.org','edx.org','leetcode.com','geeksforgeeks.org','w3schools.com','freecodecamp.org'] }
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
  return Math.floor(m / 60) + 'h' + (m % 60 > 0 ? ' ' + (m % 60) + 'm' : '');
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────
function getDateKey(d) { return d.toISOString().split('T')[0]; }
function getDayOffset(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset); return d;
}

// ─── Data Helpers ─────────────────────────────────────────────────────────────
function dayTotal(storage, key) {
  return Object.values(storage[key] || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
}
function mergedAllTime(storage) {
  const merged = {};
  for (const [key, dayData] of Object.entries(storage)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    for (const [domain, time] of Object.entries(dayData)) {
      if (typeof time === 'number') merged[domain] = (merged[domain] || 0) + time;
    }
  }
  return merged;
}

// ─── Build Weekly Chart ───────────────────────────────────────────────────────
function buildWeeklyChart(storage) {
  const days = [];
  const today = getDateKey(new Date());
  for (let i = 6; i >= 0; i--) {
    const d   = getDayOffset(-i);
    const key = getDateKey(d);
    const tot = dayTotal(storage, key);
    days.push({
      key, tot, isToday: key === today,
      label: i === 0 ? 'Today' : d.toLocaleDateString('en', { weekday: 'short' })
    });
  }
  const maxVal = Math.max(...days.map(d => d.tot), 1);
  const chartDiv = document.getElementById('weeklyChart');
  const barsHtml = days.map(d => {
    const pct   = Math.round((d.tot / maxVal) * 100);
    const color = d.isToday ? '#1a1a1a' : '#ccc';
    return `<div class="bar-item">
      <div class="bar-time-label">${d.tot > 0 ? fmtShort(d.tot) : ''}</div>
      <div class="bar-body" style="height:${Math.max(pct, d.tot > 0 ? 4 : 0)}%;background:${color};border-radius:5px 5px 0 0"></div>
    </div>`;
  }).join('');
  const labelsHtml = days.map(d =>
    `<div class="day-label ${d.isToday ? 'today-label' : ''}">${d.label}</div>`
  ).join('');
  chartDiv.innerHTML = `
    <div style="height:110px;display:flex;align-items:flex-end;gap:8px">${barsHtml}</div>
    <div class="day-labels">${labelsHtml}</div>`;
}

// ─── Build Category Bars ──────────────────────────────────────────────────────
function buildCategoryBars(merged) {
  const cats = {};
  for (const [domain, time] of Object.entries(merged)) {
    const { name, color } = getCategory(domain);
    if (!cats[name]) cats[name] = { time: 0, color };
    cats[name].time += time;
  }
  const entries = Object.entries(cats).sort((a, b) => b[1].time - a[1].time).slice(0, 7);
  if (entries.length === 0) {
    document.getElementById('categoryBars').innerHTML = '<div class="empty-state">No data yet</div>';
    return;
  }
  const maxT = entries[0][1].time;
  document.getElementById('categoryBars').innerHTML = entries.map(([name, info]) => {
    const pct   = Math.round((info.time / maxT) * 100);
    const emoji = name.split(' ')[0];
    const label = name.split(' ').slice(1).join(' ');
    return `<div class="cat-row">
      <div class="cat-emoji">${emoji}</div>
      <div class="cat-info">
        <div class="cat-name">${label}</div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${pct}%;background:${info.color}"></div>
        </div>
      </div>
      <div class="cat-time">${fmtShort(info.time)}</div>
    </div>`;
  }).join('');
}

// ─── Build Top Sites Table ────────────────────────────────────────────────────
function buildSitesTable(merged) {
  const entries = Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const tbody   = document.getElementById('sitesBody');
  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No data yet</td></tr>';
    return;
  }
  const maxT = entries[0][1];
  tbody.innerHTML = entries.map(([domain, time], i) => {
    const pct   = Math.round((time / maxT) * 100);
    const { name } = getCategory(domain);
    const emoji = name.split(' ')[0];
    return `<tr>
      <td class="td-rank">${i + 1}</td>
      <td><div class="td-site">
        <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" onerror="this.style.display='none'">
        <span>${domain}</span>
      </div></td>
      <td class="td-bar"><div class="inline-bar-wrap"><div class="inline-bar" style="width:${pct}%"></div></div></td>
      <td class="td-cat"><span class="cat-tag">${emoji} ${name.split(' ').slice(1).join(' ')}</span></td>
      <td class="td-time">${fmtShort(time)}</td>
    </tr>`;
  }).join('');
}

// ─── Build Heatmap ────────────────────────────────────────────────────────────
function buildHeatmap(storage) {
  const today    = new Date();
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - 83);
  startDay.setDate(startDay.getDate() - startDay.getDay()); // align to Sunday

  const totals = [];
  const d = new Date(startDay);
  while (d <= today) {
    totals.push(dayTotal(storage, getDateKey(d)));
    d.setDate(d.getDate() + 1);
  }
  const maxT = Math.max(...totals, 1);

  function level(ms) {
    if (ms === 0) return 0;
    const p = ms / maxT;
    if (p < 0.1) return 1;
    if (p < 0.3) return 2;
    if (p < 0.6) return 3;
    return 4;
  }

  // Month labels
  const months = [];
  let lastMonth = -1, col = 0;
  const dd = new Date(startDay);
  while (dd <= today) {
    const m = dd.getMonth();
    if (m !== lastMonth) { months.push({ col, label: dd.toLocaleDateString('en', { month: 'short' }) }); lastMonth = m; }
    if (dd.getDay() === 6) col++;
    dd.setDate(dd.getDate() + 1);
  }
  const totalCols = col + 1;
  document.getElementById('heatmapMonths').innerHTML = months.map(({ col: c, label }) =>
    `<div class="heatmap-month-label" style="flex:0 0 ${(c / totalCols) * 100}%">${label}</div>`
  ).join('');

  // Day labels
  document.getElementById('heatmapDayLabels').innerHTML =
    ['Sun','','Tue','','Thu','','Sat'].map(n => `<div class="heatmap-day-label">${n}</div>`).join('');

  // Grid
  document.getElementById('heatmapGrid').innerHTML = totals.map((ms, i) => {
    const dayD = new Date(startDay);
    dayD.setDate(startDay.getDate() + i);
    const title = `${getDateKey(dayD)}: ${ms > 0 ? fmtShort(ms) : 'no activity'}`;
    return `<div class="heatmap-cell" data-level="${level(ms)}" title="${title}"></div>`;
  }).join('');
}

// ─── Build Stat Cards ─────────────────────────────────────────────────────────
function buildStats(storage, merged) {
  const today      = getDateKey(new Date());
  const todayMs    = dayTotal(storage, today);
  const todaySites = Object.keys(storage[today] || {}).length;

  let weekMs = 0, activeDays = 0;
  for (let i = 0; i < 7; i++) {
    const t = dayTotal(storage, getDateKey(getDayOffset(-i)));
    if (t > 0) { weekMs += t; activeDays++; }
  }

  const topSite = Object.entries(merged).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('statToday').textContent      = fmt(todayMs);
  document.getElementById('statTodaySites').textContent = `${todaySites} site${todaySites !== 1 ? 's' : ''}`;
  document.getElementById('statWeek').textContent       = fmt(weekMs);
  document.getElementById('statWeekDays').textContent   = `${activeDays} active day${activeDays !== 1 ? 's' : ''}`;
  document.getElementById('statTopSite').textContent    = topSite ? topSite[0] : '—';
  document.getElementById('statTopTime').textContent    = topSite ? fmtShort(topSite[1]) + ' total' : '';
  document.getElementById('statAvg').textContent        = activeDays > 0 ? fmt(Math.round(weekMs / activeDays)) : '--';
}

// ─── Build Blocked List ───────────────────────────────────────────────────────
function buildBlockedList(blockedSites) {
  const el = document.getElementById('blockedList');
  if (!blockedSites || blockedSites.length === 0) {
    el.innerHTML = '<div class="empty-state">No blocked sites.<br>Block sites from the popup.</div>';
    return;
  }
  el.innerHTML = blockedSites.map(domain => `
    <div class="blocked-row">
      <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" style="width:16px;height:16px;border-radius:50%" alt="" onerror="this.style.display='none'">
      <span class="blocked-domain">${domain}</span>
      <button class="unblock-btn" data-domain="${domain}">Unblock</button>
    </div>`).join('');

  el.querySelectorAll('.unblock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.storage.local.get(['blockedSites'], (result) => {
        const list = (result.blockedSites || []).filter(d => d !== btn.dataset.domain);
        chrome.storage.local.set({ blockedSites: list }, loadAndRender);
      });
    });
  });
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV(storage) {
  const rows = [['Date', 'Domain', 'Duration (ms)', 'Duration (min)']];
  for (const [key, dayData] of Object.entries(storage)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    for (const [domain, time] of Object.entries(dayData)) {
      rows.push([key, domain, time, Math.round(time / 60000)]);
    }
  }
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `usage_${getDateKey(new Date())}.csv`
  });
  a.click(); URL.revokeObjectURL(a.href);
}

// ─── Load & Render All ────────────────────────────────────────────────────────
function loadAndRender() {
  chrome.storage.local.get(null, (storage) => {
    const merged = mergedAllTime(storage);
    buildStats(storage, merged);
    buildWeeklyChart(storage);
    buildCategoryBars(merged);
    buildSitesTable(merged);
    buildHeatmap(storage);
    buildBlockedList(storage.blockedSites || []);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dateChip').textContent =
    new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  document.getElementById('exportBtn').addEventListener('click', () => {
    chrome.storage.local.get(null, exportCSV);
  });

  document.getElementById('closeBtn').addEventListener('click', () => window.close());

  loadAndRender();
});
