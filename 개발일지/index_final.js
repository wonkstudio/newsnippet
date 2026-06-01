const https = require('https');

const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  KAKAO_ACCESS_TOKEN: process.env.KAKAO_ACCESS_TOKEN,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  NEWS_COUNT: 5,
  MAX_RETRY: 5,
  RETRY_DELAY: 30000,
};

const RSS_FEEDS = [
  { name: '연합뉴스_주요', url: 'https://www.yna.co.kr/rss/top-news.xml', category: '주요' },
  { name: '연합뉴스_경제', url: 'https://www.yna.co.kr/rss/economy.xml', category: '경제' },
  { name: '연합뉴스_정치', url: 'https://www.yna.co.kr/rss/politics.xml', category: '정치' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function sanitizeText(text) {
  if (!text) return '';
  return text.replace(/\\/g, '').replace(/"/g, "'").replace(/\n/g, ' ').trim();
}



function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 NewsNFit/1.0' }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchRSS(res.headers.location).then(resolve).catch(reject);
        return;
      }
      res.setEncoding('utf8');
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseRSS(xml, category) {
  const items = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const item = match[1];
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   item.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
    const desc  = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                   item.match(/<description>(.*?)<\/description>/))?.[1]?.trim();
    const link  = (item.match(/<link>(.*?)<\/link>/) ||
                   item.match(/<guid>(.*?)<\/guid>/))?.[1]?.trim();
    if (title && title.length > 5 && !title.includes('이 시각 헤드라인') && !title.includes('[표]') && !title.includes('[속보]')) {
      items.push({
        title,
        desc: desc?.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim().slice(0, 300) || '',
        category,
        url: link || 'https://www.yna.co.kr'
      });
    }
    if (items.length >= 5) break;
  }
  return items;
}

async function collectNews() {
  console.log('📡 뉴스 수집 시작...');
  const allNews = [];
  for (const feed of RSS_FEEDS) {
    try {
      const xml = await fetchRSS(feed.url);
      const items = parseRSS(xml, feed.category);
      allNews.push(...items);
      console.log('  ✓ ' + feed.name + ': ' + items.length + '건');
    } catch (e) {
      console.log('  ✗ ' + feed.name + ': 실패');
    }
  }
  const unique = allNews.filter(function(v, i, a) {
    return a.findIndex(function(t) { return t.title === v.title; }) === i;
  });
  console.log('\n  총 ' + unique.length + '건 수집 — Gemini 필터링 시작...');
  return unique;
}

async function filterImportantNews(newsItems) {
  const titles = newsItems.map(function(n, i) { return (i+1) + '. ' + n.title; }).join('\n');
  const prompt = 'You are a news curator for Korean people aged 40-60 (middle-aged workers and self-employed).\n' +
    'From the news list below, select the 5 most important and relevant news for this age group.\n' +
    'Focus on: economy, real estate, stocks, tax, politics affecting daily life, health, retirement, education costs.\n' +
    'Exclude: trivial local news, celebrity news, sports, minor events.\n\n' +
    'News list:\n' + titles + '\n\n' +
    'Output ONLY a JSON array of selected numbers. Example: [1,3,5,7,9]';
  try {
    const raw = await callGeminiWithRetry(prompt);
    const match = raw.match(/\[[\d,\s]+\]/);
    if (match) {
      const selected = JSON.parse(match[0]);
      console.log('  ✓ 선별된 뉴스: ' + selected.join(', ') + '번');
      return selected.map(function(i) { return newsItems[i-1]; }).filter(Boolean).slice(0, CONFIG.NEWS_COUNT);
    }
  } catch(e) {
    console.log('  ⚠ 필터링 실패, 상위 5개 사용');
  }
  return newsItems.slice(0, CONFIG.NEWS_COUNT);
}

async function callGeminiWithRetry(prompt, attempt) {
  attempt = attempt || 1;
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.1 }
    });
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1/models/gemini-2.5-flash:generateContent?key=' + CONFIG.GEMINI_API_KEY,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, function(res) {
      res.setEncoding('utf8');
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', async function() {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 503 || res.statusCode === 429) {
            if (attempt <= CONFIG.MAX_RETRY) {
              console.log('  ⏳ 서버 혼잡. 30초 후 재시도... (' + attempt + '/' + CONFIG.MAX_RETRY + ')');
              await sleep(CONFIG.RETRY_DELAY);
              callGeminiWithRetry(prompt, attempt + 1).then(resolve).catch(reject);
            } else {
              reject(new Error('최대 재시도 초과'));
            }
            return;
          }
          if (json.error) { reject(new Error(json.error.message)); return; }
          const text = json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
          if (!text) { reject(new Error('응답 없음')); return; }
          resolve(text);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', async function(e) {
      if (attempt <= CONFIG.MAX_RETRY) {
        await sleep(CONFIG.RETRY_DELAY);
        callGeminiWithRetry(prompt, attempt + 1).then(resolve).catch(reject);
      } else { reject(e); }
    });
    req.write(body);
    req.end();
  });
}

function extractJSON(raw) {
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch(e) {}
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch(e) {}
  try {
    function get(key) {
      const m = raw.match(new RegExp('"' + key + '"\\s*:\\s*"([^"]*)"'));
      return m ? m[1] : '-';
    }
    return {
      headline: get('headline'),
      point1: get('point1'),
      point2: get('point2'),
      point3: get('point3'),
      impact: get('impact'),
      term: get('term'),
      term_desc: get('term_desc')
    };
  } catch(e) {}
  return null;
}

async function summarizeNews(newsItems) {
  console.log('\n🤖 Gemini 요약 시작...');
  const summarized = [];
  for (let i = 0; i < newsItems.length; i++) {
    const news = newsItems[i];
    console.log('\n  → 요약 중: ' + news.title.slice(0, 30));
    const safeTitle = sanitizeText(news.title);
    const safeDesc = sanitizeText(news.desc);
    const prompt = 'You are a Korean news summarizer for people aged 40-60.\n' +
      'Analyze this news and output ONLY a JSON object. No explanation.\n\n' +
      'Title: ' + safeTitle + '\n' +
      'Content: ' + safeDesc + '\n\n' +
      'Rules:\n' +
      '- headline: 20자 이내 핵심 제목\n' +
      '- point1,2,3: 각각 완전한 문장으로 핵심 내용 서술. 40대가 읽었을 때 바로 이해되도록. 30자 이내\n' +
      '- impact: 40-60대 직장인/자영업자 입장에서 실생활에 구체적으로 어떤 영향인지 (예: 대출이자 월 X만원 증가, 물가 X% 상승 등) 40자 이내\n' +
      '- term: 이 뉴스에서 가장 어려운 단어 1개 (예: 기준금리, 본회의 등)\n' +
      '- term_desc: 그 단어를 50대가 이해할 수 있게 쉽게 설명 30자 이내\n\n' +
      '- critic: 이 뉴스를 40-50대 직장인·자영업자 관점에서 심층 분석. 경제·금융 뉴스라면 구체적 행동 지침과 향후 전망을 포함하고, 정치·사회 뉴스라면 실생활 영향과 주목해야 할 이유를 중심으로. 특수문자·이모티콘 사용금지. 3-4문장으로 자연스럽게 작성.\n' +      
      'Output format:\n' +
      '{"headline":"...","point1":"...","point2":"...","point3":"...","impact":"...","term":"...","term_desc":"...","critic":"..."}';
    try {
      const raw = await callGeminiWithRetry(prompt);
      const parsed = extractJSON(raw);
      if (parsed && parsed.headline && parsed.headline !== '-') {
        summarized.push(Object.assign({}, news, parsed));
        console.log('  ✓ 완료: ' + parsed.headline);
      } else {
        throw new Error('파싱 실패');
      }
    } catch (e) {
      console.log('  ⚠ 실패: ' + e.message);
      summarized.push(Object.assign({}, news, {
        headline: news.title.slice(0, 20),
        point1: '내용 확인 중',
        point2: '-',
        point3: '-',
        impact: '상세 내용을 확인해주세요',
        term: '',
        term_desc: ''
      }));
    }
    await sleep(2000);
  }
  return summarized;
}

// ── 기존 뉴스 아카이브로 이동 ──────────────────
async function archiveOldNews() {
  console.log('\n📦 기존 뉴스 아카이브 이동 중...');
  const today = new Date().toISOString().slice(0, 10);

  // 1. 기존 뉴스 가져오기
  const existing = await new Promise((resolve) => {
    const url = new URL(CONFIG.SUPABASE_URL + '/rest/v1/news');
    const options = {
      hostname: url.hostname,
      path: url.pathname + '?select=*',
      method: 'GET',
      headers: {
        'apikey': CONFIG.SUPABASE_KEY,
        'Authorization': 'Bearer ' + CONFIG.SUPABASE_KEY
      }
    };
    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });

  if (!existing || existing.length === 0) {
    console.log('  아카이브할 뉴스 없음');
    return;
  }

  // 2. 아카이브 테이블에 저장
  const archiveItems = existing.map(function(n) {
    return {
      category: n.category,
      title: n.title,
      headline: n.headline,
      point1: n.point1,
      point2: n.point2,
      point3: n.point3,
      impact: n.impact,
      source: n.source,
      url: n.url,
      term: n.term,
      term_desc: n.term_desc,
      briefing_date: n.created_at ? n.created_at.slice(0, 10) : today
    };
  });

  const archiveBody = JSON.stringify(archiveItems);
  await new Promise((resolve) => {
    const url = new URL(CONFIG.SUPABASE_URL + '/rest/v1/news_archive');
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.SUPABASE_KEY,
        'Authorization': 'Bearer ' + CONFIG.SUPABASE_KEY,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(archiveBody)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log('  ✓ ' + archiveItems.length + '건 아카이브 완료');
        } else {
          console.log('  ✗ 아카이브 실패: ' + data);
        }
        resolve();
      });
    });
    req.on('error', resolve);
    req.write(archiveBody);
    req.end();
  });

  // 3. 기존 뉴스 삭제
  await new Promise((resolve) => {
    const url = new URL(CONFIG.SUPABASE_URL + '/rest/v1/news');
    const options = {
      hostname: url.hostname,
      path: url.pathname + '?id=gte.0',
      method: 'DELETE',
      headers: {
        'apikey': CONFIG.SUPABASE_KEY,
        'Authorization': 'Bearer ' + CONFIG.SUPABASE_KEY
      }
    };
    const req = https.request(options, (res) => {
      res.on('data', function() {});
      res.on('end', () => {
        console.log('  ✓ 기존 뉴스 삭제 완료');
        resolve();
      });
    });
    req.on('error', resolve);
    req.end();
  });
}

// ── 새 뉴스 저장 ──────────────────
async function saveToSupabase(newsItems) {
  console.log('\n💾 Supabase 저장 중...');

  for (const news of newsItems) {
    const body = JSON.stringify({
      category: (news.category === '주요' || news.category === '경제') ? '경제' : '정치',
      title: news.title,
      headline: news.headline,
      point1: news.point1,
      point2: news.point2,
      point3: news.point3,
      impact: news.impact,
      source: '연합뉴스',
      url: news.url || 'https://www.yna.co.kr',
      term: news.term || '',
      term_desc: news.term_desc || '',
      critic: news.critic || ''
    });
    await new Promise((resolve, reject) => {
      const url = new URL(CONFIG.SUPABASE_URL + '/rest/v1/news');
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.SUPABASE_KEY,
          'Authorization': 'Bearer ' + CONFIG.SUPABASE_KEY,
          'Prefer': 'return=minimal',
          'Content-Length': Buffer.byteLength(body)
        }
      };
      const req = https.request(options, (res) => {
        res.setEncoding('utf8');
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 201) {
            console.log('  ✓ 저장: ' + news.headline);
          } else {
            console.log('  ✗ 실패 (' + res.statusCode + '): ' + data);
          }
          resolve();
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
  console.log('✅ Supabase 저장 완료!');
}

function buildMessage(newsItems) {
  const today = new Date();
  const days = ['일','월','화','수','목','금','토'];
  const dateStr = (today.getMonth()+1) + '월 ' + today.getDate() + '일 ' + days[today.getDay()] + '요일';
  const catEmoji = { '경제': '💰', '정치': '🏛️', '주요': '📌' };
  let msg = '📰 [뉴스니핏] ' + dateStr + ' 아침 브리핑\n━━━━━━━━━━━━━━━\n\n';
  newsItems.forEach(function(news, i) {
    const emoji = catEmoji[news.category] || '📌';
    msg += emoji + ' ' + (i+1) + '. ' + news.headline + '\n';
    msg += '  · ' + news.point1 + '\n';
    msg += '  · ' + news.point2 + '\n';
    msg += '  · ' + news.point3 + '\n';
    msg += '  👉 ' + news.impact + '\n\n';
  });
  msg += '━━━━━━━━━━━━━━━\n뉴스니핏 | 매일 아침 7시 ☀️';
  return msg;
}

async function runBriefing() {
  console.log('🚀 뉴스니핏 브리핑 시작\n');
  try {
    const allNews = await collectNews();
    if (allNews.length === 0) { console.log('❌ 뉴스 없음'); return; }
    const filtered = await filterImportantNews(allNews);
    console.log('\n✅ 총 ' + filtered.length + '건 선별 완료');
    const summary = await summarizeNews(filtered);
    const message = buildMessage(summary);
    console.log('\n📋 최종 메시지:');
    console.log('----------------------------------------');
    console.log(message);
    console.log('----------------------------------------');
    await archiveOldNews();
    await saveToSupabase(summary);
    console.log('\n✅ 완료!');
  } catch (e) {
    console.error('❌ 오류:', e.message);
  }
}

runBriefing();
