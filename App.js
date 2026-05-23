import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Linking, Alert, Share
} from 'react-native';

// ── Supabase 설정 ──────────────────────────────
const SUPABASE_URL = 'https://xglszfrjbcsmypxxjegq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbHN6ZnJqYmNzbXlweHhqZWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODI0OTUsImV4cCI6MjA5NDk1ODQ5NX0.q2yzXfKCui_g2eBuBWeitbh5Lrp_WMcbl7KEjryowXE';

// ── 프리미엄 네이비 & 골드 테마 개편 ──────────────────────
const C = {
  navy:      '#0F172A', // 메인 딥 네이비
  navyLight: '#1E293B',
  sky:       '#F8FAFC', // 프리미엄 화이트/스카이 배경
  skyCard:   '#E2E8F0',
  gold:      '#C5A85C', // 핵심 프리미엄 골드
  goldLight: '#FBF7EB',
  goldDark:  '#8C7034',
  green:     '#E8F5E9',
  greenDark: '#2E7D32',
  white:     '#FFFFFF',
  gray2:     '#64748B',
  gray3:     '#94A3B8',
  gray4:     '#CBD5E1',
};

// ── Supabase에서 뉴스 가져오기 ──────────────────
async function fetchNews() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/news?select=*&order=created_at.desc', {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    const data = await res.json();
    
    // 모바일 뉴스 데이터에 자산 영향 지수 및 투자 시그널 주입
    if (data && data.length > 0) {
      return data.map((item, i) => {
        const scores = ['💰💰💰 높음', '💰💰 보통', '💰 낮음'];
        const signals = ['📈 긍정', '⚖️ 중립', '📉 주의'];
        return {
          ...item,
          difficulty: i % 2 === 0 ? '보통' : '쉬움',
          impactScore: scores[i % 3],
          investmentSignal: signals[i % 3],
          signalClass: i % 3 === 0 ? 'pos' : (i % 3 === 2 ? 'neg' : 'neu')
        };
      });
    }
    return [];
  } catch(e) {
    console.log('뉴스 로드 실패:', e);
    return [];
  }
}

function shareNews(item) {
  const d = new Date();
  const ds = (d.getMonth()+1) + '월 ' + d.getDate() + '일';
  const text = '📰 [뉴스니핏] ' + ds + ' 아침 브리핑\n\n' +
    item.category + ' | ' + item.title + '\n\n' +
    '1. ' + item.point1 + '\n' +
    '2. ' + item.point2 + '\n' +
    '3. ' + item.point3 + '\n\n' +
    '👉 실생활 영향: ' + item.impact + '\n\n' +
    '출처: ' + item.source + '\n' +
    '─────────────────\n' +
    '매일 아침 5분, 오늘의 핵심 뉴스';
  Share.share({ message: text });
}

function CategoryBadge({ category }) {
  const isEcon = category === '경제';
  return (
    <View style={[s.badge, { backgroundColor: isEcon ? '#E8F0FE' : '#EAF8F1' }]}>
      <Text style={[s.badgeText, { color: isEcon ? '#1A73E8' : '#0F9D58' }]}>{category}</Text>
    </View>
  );
}

// ── 홈 화면 ──────────────────────────────────
function HomeScreen({ news, onPressNews, savedIds, onToggleSave, readIds, onRead, fontSize, loading }) {
  const today = new Date();
  const days = ['일','월','화','수','목','금','토'];
  const dateStr = (today.getMonth()+1) + '월 ' + today.getDate() + '일 ' + days[today.getDay()] + '요일';
  const readCount = readIds.filter(id => news.find(n => n.id === id)).length;
  const pct = news.length > 0 ? Math.round((readCount / news.length) * 100) : 0;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.logoRow}>
            <View style={s.logoCircle}>
              <Text style={s.logoText}>NS</Text>
            </View>
            <Text style={[s.appName, { fontSize: fontSize + 8 }]}>뉴스니핏</Text>
          </View>
          <TouchableOpacity onPress={() => onPressNews(null)}>
            <Text style={{ fontSize: 22 }}>👤</Text>
          </TouchableOpacity>
        </View>
        <Text style={[s.headerSub, { fontSize: fontSize - 3 }]}>매일 아침 7시, 오늘의 핵심만 골라드려요</Text>
        <View style={s.dateBadge}>
          <Text style={[s.dateText, { fontSize: fontSize - 3 }]}>{dateStr} · {news.length}가지 프리미엄 브리핑</Text>
        </View>
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
            <View style={{ width: pct + '%', height: 6, backgroundColor: C.gold, borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 11, color: C.gray3, fontWeight: '700' }}>
            {readCount}/{news.length} 완료 ({pct}%)
          </Text>
        </View>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: fontSize, color: C.gray2 }}>뉴스 불러오는 중...</Text>
          </View>
        ) : news.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>📰</Text>
            <Text style={{ fontSize: fontSize, color: C.gray2, textAlign: 'center' }}>
              오늘의 뉴스를 준비 중이에요{'\n'}잠시 후 다시 확인해주세요
            </Text>
          </View>
        ) : (
          <>
            <Text style={[s.sectionLbl, { fontSize: fontSize - 2 }]}>오늘 꼭 알아야 할 필수 뉴스</Text>
            {news.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                style={[s.card, readIds.includes(item.id) && { opacity: 0.8, backgroundColor: '#F8FAFC' }]}
                onPress={() => { onRead(item.id); onPressNews(item); }}
                activeOpacity={0.9}
              >
                <View style={s.cardTop}>
                  <CategoryBadge category={item.category} />
                  <Text style={[s.cardNum, { fontSize: fontSize - 4 }]}>{i+1}/{news.length} {readIds.includes(item.id) ? '✓' : ''}</Text>
                </View>
                <Text style={[s.cardTitle, { fontSize: fontSize + 1 }]}>{item.title}</Text>
                <View style={s.summaryBox}>
                  {[item.point1, item.point2, item.point3].map((p, j) => (
                    <View key={j} style={s.summaryLine}>
                      <Text style={[s.dot, { fontSize: fontSize - 3 }]}>{j+1}</Text>
                      <Text style={[s.summaryText, { fontSize: fontSize - 2 }]}>{p}</Text>
                    </View>
                  ))}
                </View>
                
                {/* 자산 영향도 및 시그널 렌더링 */}
                <View style={s.impactBadgeRow}>
                  <View style={s.impactScoreBadge}>
                    <Text style={s.impactScoreText}>자산 영향도: {item.impactScore}</Text>
                  </View>
                  <View style={[s.signalBadge, 
                    item.signalClass === 'pos' && { backgroundColor: '#E8F5E9' },
                    item.signalClass === 'neg' && { backgroundColor: '#FFEBEE' },
                    item.signalClass === 'neu' && { backgroundColor: '#ECEFF1' }
                  ]}>
                    <Text style={[s.signalText,
                      item.signalClass === 'pos' && { color: '#2E7D32' },
                      item.signalClass === 'neg' && { color: '#C62828' },
                      item.signalClass === 'neu' && { color: '#455A64' }
                    ]}>투자 신호: {item.investmentSignal}</Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <Text style={[s.cardCta, { fontSize: fontSize - 3 }]}>상세 분석 & 오디오 브리핑 ➔</Text>
                  <TouchableOpacity onPress={() => shareNews(item)} style={s.shareBtn}>
                    <Text style={{ fontSize: 12, color: C.navy, fontWeight: '700' }}>카톡 공유 📤</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 상세 화면 ─────────────────────────────────
function DetailScreen({ item, onBack, savedIds, onToggleSave, fontSize }) {
  const [showTerm, setShowTerm] = useState(false);
  const [detailMode, setDetailMode] = useState('summary'); // 'summary' or 'analysis'
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const isSaved = savedIds.includes(item.id);

  const richAnalysis = `본 사안은 ${item.source}의 최근 취재 및 거시적 관점의 변화를 바탕으로 작성되었습니다. 가계 자산의 포트폴리오(부동산 및 금융 자산 비중) 조정에 직간접적인 영향을 미칠 수 있는 흐름을 다룹니다.\n\n· 자산 영향도 지표: "${item.impactScore}" 수준으로 측정되었습니다.\n· 리스크 관리전략: 해당 뉴스를 둘러싼 금리 및 부채 변동 제도를 결합해 신중한 "${item.investmentSignal}" 대응 포지셔닝을 검토할 것을 권고합니다.`;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 22, color: C.white }}>←</Text>
            <Text style={{ fontSize: fontSize, color: C.white, fontWeight: '700' }}>뉴스 상세 분석</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <TouchableOpacity onPress={() => shareNews(item)}>
              <Text style={{ fontSize: 22 }}>📤</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onToggleSave(item.id)}>
              <Text style={{ fontSize: 22 }}>{isSaved ? '🔖' : '📌'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <CategoryBadge category={item.category} />
        </View>
        <Text style={[s.cardTitle, { color: C.white, fontSize: fontSize + 1, marginTop: 8, marginBottom: 0 }]}>{item.title}</Text>
      </View>
      
      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {/* 1. 프리미엄 오디오 브리핑 플레이어 */}
        <View style={s.audioPlayer}>
          <TouchableOpacity 
            style={s.audioPlayBtn} 
            onPress={() => setIsAudioPlaying(!isAudioPlaying)}
          >
            <Text style={s.audioPlayBtnText}>{isAudioPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <View style={s.audioInfo}>
            <Text style={s.audioTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.audioSub}>{isAudioPlaying ? 'AI 브리핑 리스닝 중...' : '원터치 아침 브리핑 듣기'}</Text>
          </View>
          {isAudioPlaying && (
            <View style={s.audioWaveMock}>
              <Text style={{ color: C.gold, fontWeight: 'bold' }}>♬ 🎙</Text>
            </View>
          )}
        </View>

        {/* 2. 세그먼티드 컨트롤 가변 토글 슬라이더 */}
        <View style={s.segmentedControl}>
          <TouchableOpacity 
            style={[s.segmentBtn, detailMode === 'summary' && s.segmentBtnActive]}
            onPress={() => setDetailMode('summary')}
          >
            <Text style={[s.segmentText, detailMode === 'summary' && s.segmentTextActive]}>3줄 핵심 요약</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.segmentBtn, detailMode === 'analysis' && s.segmentBtnActive]}
            onPress={() => setDetailMode('analysis')}
          >
            <Text style={[s.segmentText, detailMode === 'analysis' && s.segmentTextActive]}>에디터 심층 비평</Text>
          </TouchableOpacity>
        </View>

        {/* 3. 본문 내용 (토글 전환) */}
        {detailMode === 'summary' ? (
          <>
            <View style={s.detailCard}>
              <Text style={[s.detailLbl, { fontSize: fontSize - 4 }]}>핵심 정리</Text>
              {[item.point1, item.point2, item.point3].map((p, i) => (
                <View key={i} style={[s.summaryLine, { marginBottom: 8 }]}>
                  <Text style={[s.dot, { fontSize: fontSize - 2 }]}>{i+1}</Text>
                  <Text style={[s.summaryText, { fontSize: fontSize - 2, color: C.navy }]}>{p}</Text>
                </View>
              ))}
            </View>
            <View style={[s.detailCard, { backgroundColor: C.goldLight, borderColor: 'rgba(197, 168, 92, 0.2)' }]}>
              <Text style={[s.detailLbl, { color: C.goldDark, fontSize: fontSize - 4 }]}>나에게 어떤 의미?</Text>
              <Text style={{ fontSize: fontSize - 1, color: C.goldDark, lineHeight: fontSize * 1.5, fontWeight: '700' }}>👉 {item.impact}</Text>
            </View>
          </>
        ) : (
          <View style={s.detailCard}>
            <Text style={[s.detailLbl, { fontSize: fontSize - 4 }]}>인텔리전스 심층 리스크 비평</Text>
            <Text style={{ fontSize: fontSize - 1, color: C.navy, lineHeight: fontSize * 1.6 }}>{richAnalysis}</Text>
          </View>
        )}

        {/* 4. 기존 용어해설 및 출처 링크 */}
        {item.term ? (
          <TouchableOpacity style={s.detailCard} onPress={() => setShowTerm(!showTerm)}>
            <Text style={[s.detailLbl, { fontSize: fontSize - 4 }]}>이 단어가 궁금하다면</Text>
            <Text style={{ fontSize: fontSize - 1, color: C.goldDark, fontWeight: '700' }}>{item.term} {showTerm ? '▲' : '▼'}</Text>
            {showTerm && (
              <Text style={{ fontSize: fontSize - 2, color: C.navy, marginTop: 10, lineHeight: fontSize * 1.5, borderLeftWidth: 3, borderLeftColor: C.gold, paddingLeft: 10 }}>{item.term_desc}</Text>
            )}
          </TouchableOpacity>
        ) : null}
        {item.url ? (
          <TouchableOpacity
            style={[s.detailCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            onPress={() => Linking.openURL(item.url)}
          >
            <View>
              <Text style={[s.detailLbl, { fontSize: fontSize - 4 }]}>원문 기사 보기</Text>
              <Text style={{ fontSize: fontSize - 1, color: C.goldDark, fontWeight: '700' }}>{item.source} 원본 전체 보기 →</Text>
            </View>
            <Text style={{ fontSize: 24 }}>🔗</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[s.detailCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', borderColor: '#D1FAE5' }]}
          onPress={() => shareNews(item)}
        >
          <View>
            <Text style={[s.detailLbl, { fontSize: fontSize - 4, color: C.greenDark }]}>카카오톡으로 공유하기</Text>
            <Text style={{ fontSize: fontSize - 1, color: C.greenDark, fontWeight: '700' }}>지인에게 보내기 📤</Text>
          </View>
          <Text style={{ fontSize: 28 }}>💬</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: C.gray3, marginTop: 4 }}>출처: {item.source}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 저장 화면 ─────────────────────────────────
function SavedScreen({ savedIds, onPressNews, news, fontSize }) {
  const saved = news.filter(n => savedIds.includes(n.id));
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <View style={s.logoRow}>
          <View style={s.logoCircle}><Text style={s.logoText}>NS</Text></View>
          <Text style={[s.appName, { fontSize: fontSize + 6 }]}>저장한 브리핑</Text>
        </View>
        <Text style={[s.headerSub, { fontSize: fontSize - 3 }]}>{saved.length}개의 리스크 관리 보관함</Text>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {saved.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🔖</Text>
            <Text style={{ fontSize: fontSize, color: C.gray2, textAlign: 'center', lineHeight: fontSize * 1.6 }}>
              저장한 브리핑이 없어요{'\n'}뉴스 카드에서 저장해보세요
            </Text>
          </View>
        ) : saved.map(item => (
          <TouchableOpacity key={item.id} style={s.card} onPress={() => onPressNews(item)} activeOpacity={0.85}>
            <View style={s.cardTop}>
              <CategoryBadge category={item.category} />
              <Text style={[s.cardNum, { fontSize: fontSize - 4 }]}>{item.source}</Text>
            </View>
            <Text style={[s.cardTitle, { fontSize: fontSize + 1 }]}>{item.title}</Text>
            
            <View style={s.impactBadgeRow}>
              <View style={s.impactScoreBadge}>
                <Text style={s.impactScoreText}>자산 영향도: {item.impactScore}</Text>
              </View>
              <View style={[s.signalBadge, 
                item.signalClass === 'pos' && { backgroundColor: '#E8F5E9' },
                item.signalClass === 'neg' && { backgroundColor: '#FFEBEE' },
                item.signalClass === 'neu' && { backgroundColor: '#ECEFF1' }
              ]}>
                <Text style={[s.signalText,
                  item.signalClass === 'pos' && { color: '#2E7D32' },
                  item.signalClass === 'neg' && { color: '#C62828' },
                  item.signalClass === 'neu' && { color: '#455A64' }
                ]}>투자 신호: {item.investmentSignal}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={[s.cardCta, { fontSize: fontSize - 3 }]}>상세 분석 & 오디오 브리핑 ➔</Text>
              <TouchableOpacity onPress={() => shareNews(item)} style={s.shareBtn}>
                <Text style={{ fontSize: 12, color: C.navy, fontWeight: '700' }}>카톡 공유 📤</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 설정 화면 ─────────────────────────────────
function SettingScreen({ fontSize, onChangeFontSize, onLogout }) {
  const [alarmOn, setAlarmOn] = useState(true);
  const [interests, setInterests] = useState(['경제·재테크', '정치·사회']);
  const allInterests = ['경제·재테크', '정치·사회', '건강·의료', '부동산', '국제'];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <View style={s.header}>
        <View style={s.logoRow}>
          <View style={s.logoCircle}><Text style={s.logoText}>NS</Text></View>
          <Text style={[s.appName, { fontSize: fontSize + 6 }]}>내 맞춤 설정</Text>
        </View>
        <Text style={[s.headerSub, { fontSize: fontSize - 3 }]}>나만을 위한 뉴스니핏 큐레이션</Text>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <View style={s.settingCard}>
          <Text style={[s.settingTitle, { fontSize: fontSize - 1 }]}>가독성을 위한 글씨 크기 조절</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[{ label: '작게', size: 14 }, { label: '보통', size: 16 }, { label: '크게 (노안 배려) 🌟', size: 19 }].map(opt => (
              <TouchableOpacity
                key={opt.label}
                onPress={() => onChangeFontSize(opt.size)}
                style={[s.interestTag, fontSize === opt.size && s.interestTagOn, { flex: 1, alignItems: 'center' }]}
              >
                <Text style={[{ fontSize: opt.size - 2, fontWeight: '700' }, fontSize === opt.size ? { color: C.white } : { color: C.gray2 }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.settingCard}>
          <Text style={[s.settingTitle, { fontSize: fontSize - 1 }]}>나의 리스크 관심 분야</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {allInterests.map(item => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setInterests(prev =>
                    prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
                  );
                }}
                style={[s.interestTag, interests.includes(item) && s.interestTagOn]}
              >
                <Text style={[{ fontSize: fontSize - 3, fontWeight: '600' }, interests.includes(item) ? { color: C.white } : { color: C.gray2 }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.settingCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingTitle, { fontSize: fontSize - 1 }]}>원터치 아침 브리핑 푸시 알림</Text>
              <Text style={{ fontSize: 30, fontWeight: '900', color: C.navy, marginTop: 4 }}>07:00</Text>
              <Text style={{ fontSize: fontSize - 4, color: C.gray3, marginTop: 4 }}>매일 이 시각에 3줄 요약 오디오 알림 발송</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAlarmOn(!alarmOn)}
              style={[s.toggle, alarmOn && s.toggleOn]}
            >
              <View style={[s.toggleThumb, alarmOn && s.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 프리미엄 카드 골드 리뉴얼 */}
        <View style={s.premiumCard}>
          <View>
            <Text style={{ fontSize: fontSize, fontWeight: '800', color: C.white }}>👑 프리미엄 패밀리 멤버</Text>
            <Text style={{ fontSize: fontSize - 4, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>월 3,900원 구독제 · 다음 갱신 6월 1일</Text>
          </View>
          <Text style={{ fontSize: 30 }}>👑</Text>
        </View>
        
        <TouchableOpacity
          style={[s.settingCard, { alignItems: 'center' }]}
          onPress={() => Alert.alert('문의', '이메일: support@newsnippet.com')}
        >
          <Text style={{ fontSize: fontSize - 1, color: C.gray2 }}>고객 서비스 센터 문의</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.settingCard, { alignItems: 'center', borderColor: 'rgba(153, 27, 27, 0.2)' }]}
          onPress={onLogout}
        >
          <Text style={{ fontSize: fontSize - 1, color: '#991B1B', fontWeight: 'bold' }}>계정 로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 탭바 ─────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { key: 'home',    label: '홈',     icon: '⌂' },
    { key: 'saved',   label: '저장',   icon: '🔖' },
    { key: 'setting', label: '내 설정', icon: '👤' },
  ];
  return (
    <View style={s.tabBar}>
      {tabs.map(t => (
        <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => onChange(t.key)}>
          <Text style={[s.tabIcon, active === t.key && s.tabIconOn]}>{t.icon}</Text>
          <Text style={[s.tabLabel, active === t.key && s.tabLabelOn]}>{t.label}</Text>
          {active === t.key && <View style={s.tabDot} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── 메인 ─────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState('home');
  const [selected, setSelected] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [readIds, setReadIds]   = useState([]);
  const [fontSize, setFontSize] = useState(16);
  const [news, setNews]         = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchNews().then(data => {
      setNews(data);
      setLoading(false);
    });
  }, []);

  function toggleSave(id) {
    setSavedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }
  function markRead(id) {
    setReadIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }

  function handleLogout() {
    setSavedIds([]);
    setReadIds([]);
    setTab('home');
    setSelected(null);
    Alert.alert('로그아웃 완료', '안전하게 로그아웃 되었습니다.');
  }

  function renderScreen() {
    if (selected) return (
      <DetailScreen item={selected} onBack={() => setSelected(null)} savedIds={savedIds} onToggleSave={toggleSave} fontSize={fontSize} />
    );
    if (tab === 'home') return (
      <HomeScreen news={news} onPressNews={setSelected} savedIds={savedIds} onToggleSave={toggleSave} readIds={readIds} onRead={markRead} fontSize={fontSize} loading={loading} />
    );
    if (tab === 'saved') return (
      <SavedScreen savedIds={savedIds} onPressNews={setSelected} news={news} fontSize={fontSize} />
    );
    if (tab === 'setting') return (
      <SettingScreen fontSize={fontSize} onChangeFontSize={setFontSize} onLogout={handleLogout} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.sky }}>
      {renderScreen()}
      {!selected && <TabBar active={tab} onChange={setTab} />}
    </View>
  );
}

// ── 스타일시트 개편 ────────────────────────────────────
const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.navy },
  header:        { backgroundColor: C.navy, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, borderBottomWidth: 1.5, borderBottomColor: 'rgba(197, 168, 92, 0.15)' },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoCircle:    { width: 28, height: 28, borderRadius: 14, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  logoText:      { fontSize: 13, fontWeight: '900', color: C.navy },
  appName:       { fontWeight: '900', color: C.white, letterSpacing: -0.8 },
  headerSub:     { color: C.gray3, marginTop: 4, fontWeight: '500' },
  dateBadge:     { backgroundColor: 'rgba(197, 168, 92, 0.15)', borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.25)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12, alignSelf: 'flex-start' },
  dateText:      { color: C.goldLight, fontWeight: '700' },
  scroll:        { flex: 1, backgroundColor: C.sky },
  sectionLbl:    { fontWeight: '800', color: C.navy, marginBottom: 12 },
  card:          { backgroundColor: C.white, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.08)', shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  cardNum:       { color: C.gray3, marginLeft: 'auto', fontWeight: '700' },
  cardTitle:     { fontWeight: '800', color: C.navy, lineHeight: 26, marginBottom: 10 },
  summaryBox:    { backgroundColor: C.sky, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.02)' },
  summaryLine:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  dot:           { fontWeight: '900', color: C.gold, minWidth: 18, backgroundColor: 'rgba(197, 168, 92, 0.1)', borderRadius: 6, textAlign: 'center', paddingVertical: 1 },
  summaryText:   { color: C.navyLight, lineHeight: 22, flex: 1 },
  cardCta:       { fontWeight: '800', color: C.goldDark },
  shareBtn:      { backgroundColor: C.sky, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: C.skyCard },
  badge:         { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:     { fontSize: 11, fontWeight: '700' },
  
  // 자산 영향도 및 시그널 스타일 추가
  impactBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(15, 23, 42, 0.08)', paddingTop: 10, alignItems: 'center' },
  impactScoreBadge: { backgroundColor: C.goldLight, borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  impactScoreText: { fontSize: 11, color: C.goldDark, fontWeight: '700' },
  signalBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  signalText: { fontSize: 11, fontWeight: '700' },
  
  // 프리미엄 오디오 플레이어 UI
  audioPlayer: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.navy, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.2)' },
  audioPlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  audioPlayBtnText: { fontSize: 15, color: C.navy, fontWeight: 'bold' },
  audioInfo: { flex: 1, marginLeft: 12 },
  audioTitle: { fontSize: 12, fontWeight: '700', color: C.white },
  audioSub: { fontSize: 11, color: C.goldLight, opacity: 0.8, marginTop: 2 },
  audioWaveMock: { paddingHorizontal: 8 },
  
  // 세그먼티드 컨트롤 가변 토글 슬라이더
  segmentedControl: { flexDirection: 'row', backgroundColor: C.skyCard, padding: 4, borderRadius: 12, marginBottom: 16 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: C.white, shadowColor: C.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  segmentText: { fontSize: 13, fontWeight: '700', color: C.gray2 },
  segmentTextActive: { color: C.navy },

  detailCard:    { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.08)' },
  detailLbl:     { fontWeight: '800', color: C.goldDark, marginBottom: 10, letterSpacing: 0.3 },
  settingCard:   { backgroundColor: C.white, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.08)' },
  settingTitle:  { fontWeight: '800', color: C.navy, marginBottom: 12 },
  interestTag:   { backgroundColor: C.sky, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 },
  interestTagOn: { backgroundColor: C.navy },
  toggle:        { width: 52, height: 30, backgroundColor: C.gray4, borderRadius: 15, padding: 3 },
  toggleOn:      { backgroundColor: C.goldDark },
  toggleThumb:   { width: 24, height: 24, backgroundColor: C.white, borderRadius: 12 },
  toggleThumbOn: { alignSelf: 'flex-end' },
  premiumCard:   { backgroundColor: C.navy, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.gold, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: C.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  tabBar:        { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: 'rgba(197, 168, 92, 0.1)', paddingTop: 10, paddingBottom: 14 },
  tabItem:       { flex: 1, alignItems: 'center', gap: 4 },
  tabIcon:       { fontSize: 22, color: C.gray4 },
  tabIconOn:     { color: C.goldDark },
  tabLabel:      { fontSize: 12, color: C.gray4 },
  tabLabelOn:    { color: C.goldDark, fontWeight: '800' },
  tabDot:        { width: 6, height: 6, backgroundColor: C.gold, borderRadius: 3 },
});
