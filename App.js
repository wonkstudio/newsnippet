import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Linking, Alert, Share, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, NotoSansKR_400Regular, NotoSansKR_600SemiBold, NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr';

// 모든 Text 컴포넌트에 Noto Sans KR 기본 적용
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: 'NotoSansKR_400Regular' }];
const SUPABASE_URL = 'https://xglszfrjbcsmypxxjegq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbHN6ZnJqYmNzbXlweHhqZWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODI0OTUsImV4cCI6MjA5NDk1ODQ5NX0.q2yzXfKCui_g2eBuBWeitbh5Lrp_WMcbl7KEjryowXE';

// ── 🎨 Premium Paper-White Light Theme (어르신 가독성 최적화 & 온화한 종이빛 테마) ──
const C = {
  bg:          '#F8FAFC', // 전체 화면 배경: 눈이 편안한 소프트 그레이 백색 (Slate 50)
  bgDark:      '#FFFFFF', // 탭바 및 탑바용 밝고 정갈한 백색
  bgLight:     '#FFFFFF', // 카드 및 활성 영역용 순백색
  surface:     '#FFFFFF', // 뉴스 및 설정 카드 배경: 깨끗한 순백색 (#FFFFFF)
  surfaceHigh: '#F1F5F9', // 카드 내부 요약 박스 또는 칩 선택된 배경 (차분한 연회색)
  surfaceTop:  '#F1F5F9',
  gold:        '#B58A3C', // 고대비 앤티크 올리브 골드 (밝은 백색 배경에서도 선명하게 보이는 고급 골드)
  goldLight:   '#B58A3C',
  goldFaint:   'rgba(181, 138, 60, 0.06)', // 카드 외곽 은은한 골드 박스 데코
  text:        '#0F172A', // 스크린 전체 메인 폰트: 고대비 숯색 슬레이트 (Slate 900)
  textDark:    '#0F172A', // 화이트 배경 위 짙은 폰트 (Slate 900)
  textSub:     '#475569', // 라이트 배경 위 서브 텍스트 (Slate 600)
  textSubDark: '#475569',
  textFaint:   '#94A3B8', // 비활성 아이콘 및 옅은 그레이 (Slate 400)
  outline:     'rgba(181, 138, 60, 0.15)', // 고대비 앤티크 골드 보더
  white:       '#FFFFFF',
  // 신호별 뱃지 컬러 (라이트 테마에 맞추어 텍스트와 배경 대비 최적화)
  greenBadge:  '#E6F4EA', // 연녹색 배경
  greenText:   '#137333', // 짙은 녹색 텍스트
  redBadge:    '#FCE8E6', // 연적색 배경
  redText:     '#C5221F', // 짙은 적색 텍스트
  blueBadge:   '#E8F0FE', // 연청색 배경
  blueText:    '#1A73E8', // 짙은 청색 텍스트
  borderDark:  'rgba(15, 23, 42, 0.08)',
};

// ── Supabase 뉴스 로더 ────────────────────────
async function fetchNews() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/news?select=*&order=created_at.desc', {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return data.map((item, i) => ({
        ...item,
        impactScore: ['💰💰💰 높음','💰💰 보통','💰 낮음'][i % 3],
        investmentSignal: ['📈 긍정','⚖️ 중립','📉 주의'][i % 3],
        signalClass: ['pos','neu','neg'][i % 3],
      }));
    }
    return [];
  } catch(e) { return []; }
}

function shareNews(item) {
  const d = new Date();
  const ds = `${d.getMonth()+1}월 ${d.getDate()}일`;
  Share.share({
    message: `📰 [뉴스니핏] 프리미엄 자산 브리핑 (${ds})\n\n제목: ${item.title}\n\n[핵심 3대 포인트]\n1. ${item.point1}\n2. ${item.point2}\n3. ${item.point3}\n\n👉 자산 영향 분석: ${item.impact}\n\n출처: ${item.source}\n──────────────\n매일 아침 5분, 나를 위한 자산관리 AI 브리핑`
  });
}

function Badge({ category }) {
  let bg = '#2563EB';
  let tx = '#FFFFFF';
  if (category === '경제') {
    bg = '#F5D06E'; // 따뜻한 골드
    tx = '#0F172A'; // 어두운 텍스트
  } else if (category === '주식') {
    bg = '#3B82F6';
    tx = '#FFFFFF';
  } else if (category === '건강') {
    bg = '#10B981';
    tx = '#FFFFFF';
  }
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: tx }]}>{category}</Text>
    </View>
  );
}

// ── 🎙️ AI 오디오 브리핑 플레이어 바 (screen_detail_v2.png 완벽 매칭) ─────
function AudioPlayerBar({ fontSize }) {
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <TouchableOpacity
      style={s.audioBar}
      activeOpacity={0.95}
      onPress={() => setIsPlaying(!isPlaying)}
    >
      <View style={s.audioPlayBtn}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="#1C2A4A" style={{ marginLeft: isPlaying ? 0 : 2 }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.audioTitle, { fontSize: fontSize - 2, fontWeight: '850', color: C.text }]}>
          AI 음성으로 듣기
        </Text>
        
        {/* 진행 바 + 시간 표시 행 (시안의 섬세한 디테일 반영) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
          {/* 가로 타임라인 트랙 */}
          <View style={{ flex: 1, height: 3, backgroundColor: 'rgba(15, 23, 42, 0.1)', borderRadius: 1.5, position: 'relative', justifyContent: 'center' }}>
            {/* 진행률 채우기 (재생 중이면 60%, 멈춤이면 30% 골드 바 채움) */}
            <View style={{ width: isPlaying ? '60%' : '30%', height: 3, backgroundColor: C.gold, borderRadius: 1.5 }} />
            {/* 둥근 핸들 조절 마커 (Thumb) 장착 */}
            <View style={{ position: 'absolute', left: isPlaying ? '60%' : '30%', marginLeft: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold }} />
          </View>
          {/* 타임 정보 텍스트 */}
          <Text style={{ fontSize: fontSize - 6, color: C.gold, fontWeight: '800', minWidth: 70, textAlign: 'right' }}>
            {isPlaying ? '01:24 / 02:40' : '00:00 / 02:40'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── 🏠 오늘의 브리핑 (홈 화면 - 100% screen_home.png 시안 매칭) ──
function HomeScreen({ news, onPressNews, readIds, onRead, fontSize, loading, interests = [] }) {
  const today = new Date();
  const days = ['일','월','화','수','목','금','토'];
  const dateStr = `${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일 ${days[today.getDay()]}요일`;
  
  // 브리핑 5개 제한 및 관심분야 매칭 우선 정렬
  const prioritizedNews = [...news].sort((a, b) => {
    const aMatch = interests.includes(a.category);
    const bMatch = interests.includes(b.category);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });
  const briefingNews = prioritizedNews.slice(0, 5);
  const readCount = readIds.filter(id => briefingNews.find(n => n.id === id)).length;
  const pct = briefingNews.length > 0 ? Math.round((readCount / briefingNews.length) * 100) : 0;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* 탑 헤더 영역 (딥 네이비 배경 + 골드 데코 100% 매칭) */}
      <View style={s.header}>
        <View style={s.headerRow}>
          {/* 왼쪽: 오리지널 크롭본 공식 브랜드 로고 이미지 탑재 (시안과 100% 피지컬 일치!) */}
          <View style={s.logoRow}>
            <Image 
              source={require('./assets/user_logo_512.png')} 
              style={{ width: 48, height: 48, resizeMode: 'contain', marginRight: 4 }} 
            />
            <Text style={[s.appName, { fontSize: fontSize + 4 }]}>NEWSNIPPET</Text>
          </View>
          
          {/* 오른쪽: PREMIUM 뱃지 + 골드 🔔 아이콘 */}
          <View style={s.headerRightAction}>
            <View style={s.premiumBadge}>
              <Text style={[s.premiumBadgeText, { fontSize: fontSize - 7 }]}>PREMIUM</Text>
            </View>
            <TouchableOpacity style={s.headerIcon} onPress={() => Alert.alert('알림', '오늘의 핵심 브리핑 소식 5개가 배달 완료되었습니다.')}>
              <Ionicons name="notifications-outline" size={24} color={C.gold} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 1. Date & Title Section (골드 키워드 강조 및 극대화된 가독성 폰트) */}
        <View style={s.titleSection}>
          <Text style={[s.headerDateText, { fontSize: fontSize - 3 }]}>{dateStr}</Text>
          <View style={s.mainTitleWrap}>
            <Text style={[s.mainTitleText, { fontSize: fontSize + 14, lineHeight: (fontSize + 14) * 1.25 }]}>
              오늘의 <Text style={{ color: '#0F172A' }}>핵심 인사이트</Text>{'\n'}
              <Text style={{ color: C.gold }}>챙겨야 할 뉴스 {briefingNews.length}개</Text>
            </Text>
          </View>
        </View>

        {/* 2. Intro Section (오늘의 브리핑 딥네이비 전용 카드) */}
        <View style={s.introCard}>
          <View style={s.introHeaderRow}>
            <Text style={[s.introTitle, { fontSize: fontSize }]}>오늘의 브리핑</Text>
            <Text style={[s.introProgressText, { fontSize: fontSize - 2 }]}>{readCount}/{briefingNews.length} 완료</Text>
          </View>
          <View style={s.introProgressBg}>
            <View style={[s.introProgressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={[s.introSubtext, { fontSize: fontSize - 5 }]}>
            선별 상황에 따라 핵심 정보만 요약해 드립니다.
          </Text>
        </View>

        {/* 3. News Card List (선명한 골드 테두리 + 내부 딥 네이비 카드 구성!) */}
        <View style={{ paddingHorizontal: 16 }}>
          {loading ? (
            <View style={s.centerLoading}>
              <Text style={{ fontSize: fontSize, color: C.textSub }}>오늘의 브리핑 뉴스를 선정 중입니다...</Text>
            </View>
          ) : briefingNews.length === 0 ? (
            <View style={s.centerLoading}>
              <Text style={{ fontSize: 44, marginBottom: 16 }}>📰</Text>
              <Text style={{ fontSize: fontSize, color: C.textSub, textAlign: 'center', lineHeight: fontSize * 1.6 }}>
                뉴스를 불러오는 데 실패했습니다.{'\n'}잠시 후 다시 새로고침해 보세요.
              </Text>
            </View>
          ) : (
            briefingNews.map((item, i) => {
              // 카테고리별 자산 영향도 및 파장 텍스트/아이콘 설정 (screen_home.png 동일)
              let influenceText = '자산 영향 보통';
              let influenceIcon = 'trending-up-outline';
              let impactArea = '시장 변화';
              if (item.category === '경제') {
                influenceText = '자산 영향 높음';
                influenceIcon = 'trending-up-outline';
                impactArea = '부동산·예금';
              } else if (item.category === '주식') {
                influenceText = '자산 영향 보통';
                influenceIcon = 'trending-up-outline';
                impactArea = '은퇴연금';
              } else if (item.category === '건강') {
                influenceText = '생활 밀착 정보';
                influenceIcon = 'shield-checkmark-outline';
                impactArea = '보험료 인하';
              }

              // 시간 전 계산
              const timeAgo = i === 0 ? '2시간 전' : i === 1 ? '4시간 전' : i === 2 ? '8시간 전' : `${(i+1)*3}시간 전`;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.card, readIds.includes(item.id) && s.cardRead]}
                  onPress={() => { onRead(item.id); onPressNews(item); }}
                  activeOpacity={0.95}
                >
                  {/* 상단 라인: 카테고리 뱃지 + 자산 영향 */}
                  <View style={s.cardTop}>
                    <Badge category={item.category} />
                    {interests.includes(item.category) && (
                      <View style={{ backgroundColor: 'rgba(197, 168, 92, 0.15)', borderWidth: 1, borderColor: C.gold, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: C.gold, fontWeight: '900', fontSize: fontSize - 6 }}>★ 추천</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                      <Ionicons name={influenceIcon} size={15} color="#94A3B8" />
                      <Text style={[s.cardInfluenceText, { fontSize: fontSize - 4 }]}>
                        {influenceText}
                      </Text>
                    </View>
                  </View>

                  {/* 제목: 딥네이비 카드 내부이므로 화이트 텍스트 사용 */}
                  <Text style={[s.cardTitle, { fontSize: fontSize + 1 }]}>{item.title}</Text>

                  {/* 3줄 요약 (중첩 박스를 제거하고 가로 폭을 확보하여 가독성 극대화) */}
                  <View style={{ marginTop: 14, gap: 10 }}>
                    {[item.point1, item.point2, item.point3].map((p, j) => (
                      <View key={j} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: fontSize - 2, fontWeight: '900', color: C.gold, marginRight: 8, marginTop: 1 }}>
                          {j+1}.
                        </Text>
                        <Text style={{ fontSize: fontSize - 2, color: C.text, lineHeight: (fontSize - 2) * 1.5, flex: 1, fontWeight: '600' }}>
                          {p}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* 구분선 */}
                  <View style={s.cardDivider} />

                  {/* 시간 전 & 파장 */}
                  <View style={s.cardFooterInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="time-outline" size={15} color="#94A3B8" />
                      <Text style={[s.cardFooterText, { fontSize: fontSize - 4 }]}>
                        {timeAgo}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 16 }}>
                      <Ionicons name="thermometer-outline" size={15} color={C.gold} />
                      <Text style={[s.cardFooterImpactText, { fontSize: fontSize - 4 }]}>
                        파장: {impactArea}
                      </Text>
                    </View>
                  </View>

                  {/* 상세보기 버튼 */}
                  <View style={s.detailButtonOutlineFull}>
                    <Text style={[s.detailButtonTextFull, { fontSize: fontSize - 2 }]}>상세보기 ➔</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 📰 뉴스 상세 화면 (AI 비평 반영 및 딥 네이비 배경) ──────
function DetailScreen({ item, onBack, savedIds, onToggleSave, fontSize }) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'critic'
  const [showTerm, setShowTerm] = useState(false);
  const isSaved = savedIds.includes(item.id);

  const richAnalysis = `본 건("${item.title}")에 대하여, AI 예측 모델 분석 결과 무리한 대출을 동반한 추가 공격적 투자보다는 자산 유동성이 보장되고 금리 안정을 활용한 보수적 포트폴리오 유지가 대단히 권장됩니다.

특히 자산 영향도 분석 결과 "${item.impactScore}" 수준의 변동 민감도를 보이고 있어, 향후 시장의 변동성을 면밀히 추적하며 신중한 "${item.investmentSignal}" 대응 포지셔닝을 유지하는 것이 유용합니다.`;

  const createdDate = item.created_at ? new Date(item.created_at) : new Date();
  const dateStr = `${createdDate.getFullYear()}.${createdDate.getMonth()+1}.${createdDate.getDate()} 오전 08:30`;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* 1. 상단 액션 헤더 (시안과 100% 매칭 - 대단히 정갈한 구성) */}
      <View style={[s.header, { borderBottomWidth: 1, borderBottomColor: 'rgba(15, 23, 42, 0.08)', paddingBottom: 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
            <Text style={{ fontSize: fontSize + 2, color: C.text, fontWeight: '900' }}>뉴스 상세</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <TouchableOpacity onPress={() => shareNews(item)} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={24} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onToggleSave(item.id)} activeOpacity={0.7}>
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={24} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. 🎙️ AI 오디오 브리핑 플레이어 탑재 (풀 너비 배치) */}
      <AudioPlayerBar fontSize={fontSize} />

      {/* 3. 본문 콘텐츠 (딥네이비 전용 스크롤뷰 배경화) */}
      <ScrollView style={[s.scroll, { backgroundColor: C.bg }]} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        
        {/* 카테고리 뱃지 + 날짜 정보 행 (시안 매칭) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Badge category={item.category} />
          <Text style={{ fontSize: fontSize - 5, color: C.textSub, fontWeight: '700' }}>
            {dateStr}
          </Text>
        </View>

        {/* 상세 뉴스 제목 */}
        <Text style={{ fontSize: fontSize + 6, color: C.text, fontWeight: '900', lineHeight: (fontSize + 6) * 1.35, marginBottom: 20 }}>
          {item.title}
        </Text>

        {/* 📌 요약 vs 전문가 비평 2단 탭 디자인 (시안 매칭 - 이모지 제거) */}
        <View style={s.tabHeader}>
          <TouchableOpacity
            onPress={() => setActiveTab('summary')}
            style={[s.tabBtn, activeTab === 'summary' && s.tabBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[s.tabBtnText, { fontSize: fontSize - 1 }, activeTab === 'summary' && s.tabBtnTextActive]}>요약</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('critic')}
            style={[s.tabBtn, activeTab === 'critic' && s.tabBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[s.tabBtnText, { fontSize: fontSize - 1 }, activeTab === 'critic' && s.tabBtnTextActive]}>전문가 비평</Text>
          </TouchableOpacity>
        </View>
        {activeTab === 'summary' ? (
          // === 📌 [요약 탭] ===
          <View>
            {/* 핵심 요약 딥네이비 카드 (왼쪽 골드 세로 띠) */}
            <View style={[s.detailCard, { borderLeftWidth: 4, borderLeftColor: C.gold }]}>
              <Text style={[s.detailLbl, { fontSize: fontSize - 1 }]}>핵심 3대 포인트 정리</Text>
              {[item.point1, item.point2, item.point3].map((p, i) => (
                <View key={i} style={[s.summaryLine, { marginBottom: 12 }]}>
                  <View style={s.dotWrap}><Text style={[s.dot, { fontSize: fontSize - 2 }]}>{i+1}</Text></View>
                  <Text style={[s.summaryText, { fontSize: fontSize, color: C.text }]}>{p}</Text>
                </View>
              ))}
            </View>

            {/* 내 지갑에 미치는 영향 (Gold 바탕 카드) */}
            <View style={[s.detailCard, { backgroundColor: C.goldFaint, borderColor: 'rgba(181, 138, 60, 0.3)', borderLeftWidth: 4, borderLeftColor: C.gold }]}>
              <Text style={[s.detailLbl, { fontSize: fontSize - 1, color: C.gold }]}>💰 내 자산 및 지갑에 미치는 영향</Text>
              <Text style={{ fontSize: fontSize, color: C.gold, lineHeight: fontSize * 1.6, fontWeight: '700' }}>
                👉 {item.impact}
              </Text>
            </View>

            {/* 경제 용어 사전 박스 */}
            {item.term ? (
              <TouchableOpacity
                style={s.detailCard}
                onPress={() => setShowTerm(!showTerm)}
                activeOpacity={0.9}
              >
                <Text style={[s.detailLbl, { fontSize: fontSize - 1 }]}>📖 이 뉴스 속 필수 용어 해설</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: fontSize, color: C.gold, fontWeight: '700' }}>{item.term}</Text>
                  <Text style={{ fontSize: fontSize - 2, color: C.gold }}>{showTerm ? '▲ 닫기' : '▼ 터치하여 해설 보기'}</Text>
                </View>
                {showTerm && (
                  <View style={[s.termDescWrap, { backgroundColor: C.surfaceHigh }]}>
                    <Text style={{ fontSize: fontSize - 1, color: C.text, lineHeight: fontSize * 1.6 }}>{item.term_desc}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : null}

            {/* 원문 링크 */}
            {item.url ? (
              <TouchableOpacity
                style={[s.detailCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => Linking.openURL(item.url)}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={[s.detailLbl, { fontSize: fontSize - 1 }]}>원문 기사 전체보기</Text>
                  <Text style={{ fontSize: fontSize, color: C.gold, fontWeight: '700' }}>{item.source} 보러가기 →</Text>
                </View>
                <Text style={{ fontSize: 24 }}>🔗</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          // === 🤖 [AI 비평 탭] ===
          <View>
            <View style={s.detailCard}>
              {/* AI 종합 분석가 헤더 (로봇 아이콘 적용) */}
              <View style={[s.expertProfileHeader, { borderBottomColor: C.borderDark }]}>
                <View style={s.expertAvatar}>
                  <Text style={{ fontSize: 28 }}>🤖</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.expertName, { fontSize: fontSize, color: C.text }]}>뉴스니핏 AI 비평 엔진</Text>
                  <Text style={[s.expertTitle, { fontSize: fontSize - 3, color: C.textSub }]}>실시간 금융 변수 예측 및 시장 가치 판단 모델</Text>
                </View>
                <View style={s.expertRating}>
                  <Text style={{ fontSize: fontSize - 4, color: C.gold }}>⭐️ 신뢰도 99%</Text>
                </View>
              </View>

              <Text style={[s.detailLbl, { fontSize: fontSize - 1, marginTop: 12 }]}>뉴스니핏 AI 종합 분석 비평</Text>
              <Text style={[s.expertContentText, { fontSize: fontSize, lineHeight: fontSize * 1.8, color: C.text }]}>
                {richAnalysis}
              </Text>

              {/* AI 비평 관련 버튼 */}
              <TouchableOpacity
                style={[s.otherExpertBtn, { borderColor: C.outline }]}
                onPress={() => Alert.alert('안내', '프리미엄 회원은 시장 변동성을 정밀 추적하는 거시경제 예측 AI 모델의 주간 리포트를 추가로 구독하실 수 있습니다.')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: fontSize - 2, color: C.gold, fontWeight: '700' }}>AI 분석 예측 모델 주간 리포트 읽기 💬</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <Text style={{ fontSize: fontSize - 3, color: C.textSub, marginTop: 6, textAlign: 'center' }}>정보 제공 출처: {item.source}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 📁 나의 보관함 (Personal Archive) ─────────────────
function SavedScreen({ savedIds, onPressNews, news, fontSize, onBackToHome, onDeleteSaved, pinnedIds, onTogglePin }) {
  const [activeChip, setActiveChip] = useState('전체');
  const [sortOrder, setSortOrder] = useState('latest'); // 'latest' | 'oldest'
  const [itemLimit, setItemLimit] = useState(3);
  
  const chips = ['전체', '경제', '부동산', '주식', '건강'];

  const savedList = news.filter(n => savedIds.includes(n.id));
  const filteredList = savedList.filter(item => {
    if (activeChip === '전체') return true;
    return item.category === activeChip;
  });

  const sortedList = [...filteredList].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    
    return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
  });

  const visibleList = sortedList.slice(0, itemLimit);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* 헤더 */}
      <View style={[s.header, { borderBottomColor: 'rgba(15, 23, 42, 0.08)' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={onBackToHome} activeOpacity={0.7} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={C.text} />
            </TouchableOpacity>
            <Text style={[s.appName, { fontSize: fontSize + 6, color: C.text, fontWeight: '900' }]}>나의 보관함</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('검색', '보관된 뉴스 검색 기능은 다음 업데이트에 준비됩니다.')} activeOpacity={0.7} style={{ padding: 4 }}>
            <Ionicons name="search-outline" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
        
        {/* 가로 스크롤 관심 필터 칩 바 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {chips.map(cat => {
            const isActive = activeChip === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setActiveChip(cat);
                  setItemLimit(3); // Reset limit when filter changes
                }}
                style={[
                  s.chip, 
                  isActive && s.chipActive, 
                  { 
                    backgroundColor: isActive ? C.gold : '#E2E8F0', 
                    borderColor: isActive ? C.gold : 'rgba(15, 23, 42, 0.08)' 
                  }
                ]}
                activeOpacity={0.8}
              >
                <Text style={[
                  s.chipText, 
                  { fontSize: fontSize - 2 }, 
                  isActive && s.chipTextActive, 
                  { color: isActive ? '#FFFFFF' : C.textSub }
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={[s.scroll, { backgroundColor: C.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {sortedList.length === 0 ? (
          <View style={s.centerLoading}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>🔖</Text>
            <Text style={{ fontSize: fontSize, color: C.textSub, textAlign: 'center', lineHeight: fontSize * 1.6 }}>
              {activeChip === '전체' ? '보관함에 저장해둔 뉴스가 아직 없어요.\n뉴스 피드 카드에서 북마크 아이콘을 눌러 저장해 보세요!' : `'${activeChip}' 카테고리에 저장된 뉴스가 없습니다.`}
            </Text>
          </View>
        ) : (
          <>
            <View style={s.archiveListHeader}>
              <Text style={[s.sectionLbl, { fontSize: fontSize - 1, color: C.text, marginBottom: 0 }]}>저장한 뉴스 리스트</Text>
              <TouchableOpacity onPress={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')} activeOpacity={0.7}>
                <Text style={{ fontSize: fontSize - 3, color: C.gold, fontWeight: '700' }}>
                  {sortOrder === 'latest' ? '최신순 ▾' : '과거순 ▾'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {visibleList.map(item => {
              const savedDate = item.created_at ? new Date(item.created_at) : new Date();
              const formattedDate = `${savedDate.getFullYear()}.${String(savedDate.getMonth() + 1).padStart(2, '0')}.${String(savedDate.getDate()).padStart(2, '0')} 저장`;
              const isPinned = pinnedIds.includes(item.id);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.card, { backgroundColor: C.surface, borderColor: isPinned ? C.gold : 'rgba(15, 23, 42, 0.08)', borderWidth: isPinned ? 1.5 : 1, borderRadius: 16, padding: fontSize * 0.8, marginBottom: 12 }]}
                  onPress={() => onPressNews(item)}
                  activeOpacity={0.9}
                >
                  {/* Top: Category Badge + Pin Toggle icon */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Badge category={item.category} />
                      <Text style={{ fontSize: fontSize - 4, color: C.textSub, fontWeight: '600' }}>{item.source}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => onTogglePin(item.id)} 
                      activeOpacity={0.7} 
                      style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 20, 
                        backgroundColor: isPinned ? 'rgba(181, 138, 60, 0.15)' : 'rgba(15, 23, 42, 0.05)', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: isPinned ? C.gold : 'rgba(15, 23, 42, 0.08)'
                      }}
                    >
                      <Ionicons 
                        name={isPinned ? "pin" : "pin-outline"} 
                        size={22} 
                        color={isPinned ? C.gold : "#94A3B8"} 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Center: Clean bold title */}
                  <Text style={{ fontSize: fontSize, color: C.text, fontWeight: '800', lineHeight: fontSize * 1.4, marginBottom: 14 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  
                  {/* Bottom: Saved date + direct circular delete button */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(15, 23, 42, 0.05)', paddingTop: 10 }}>
                    <Text style={{ fontSize: fontSize - 4, color: C.textSub, fontWeight: '600' }}>
                      {formattedDate}
                    </Text>
                    
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          '보관함 해제',
                          '이 뉴스를 보관함에서 삭제하시겠습니까?',
                          [
                            { text: '취소', style: 'cancel' },
                            { text: '삭제', style: 'destructive', onPress: () => onDeleteSaved(item.id) }
                          ]
                        );
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(239, 68, 68, 0.2)'
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}

            {sortedList.length > itemLimit && (
              <TouchableOpacity
                onPress={() => setItemLimit(prev => prev + 5)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 14,
                  borderWidth: 1.5,
                  borderColor: C.gold,
                  borderRadius: 12,
                  marginTop: 8,
                  gap: 6
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: fontSize - 2, color: C.gold, fontWeight: '800' }}>더보기</Text>
                <Ionicons name="chevron-down" size={16} color={C.gold} />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── ⚙️ 설정 화면 (screen_settings.png 완벽 매핑 및 100% 최적화) ──
function SettingScreen({ fontSize, onChangeFontSize, onLogout, onBackToHome, alarmTime, onChangeAlarmTime, interests, onChangeInterests }) {
  const [alarmOn, setAlarmOn] = useState(true);
  const allInterests = [
    { label: '경제', icon: '📈' },
    { label: '부동산',      icon: '🏠' },
    { label: '주식',   icon: '📊' },
    { label: '건강',   icon: '🏥' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* 헤더 */}
      <View style={[s.header, { borderBottomColor: 'rgba(15, 23, 42, 0.08)' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={onBackToHome} activeOpacity={0.7} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[s.appName, { fontSize: fontSize + 8, color: C.text, fontWeight: '900' }]}>설정</Text>
        </View>
      </View>
      
      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* 0. 프리미엄 멤버십 카드 (최상단 100% 매치) */}
        <View style={[s.settingCard, { borderColor: 'rgba(15, 23, 42, 0.08)', borderWidth: 1, backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 18, color: C.gold }}>👑</Text>
                <Text style={{ fontSize: fontSize + 1, fontWeight: '900', color: C.gold }}>뉴스니핏 PREMIUM</Text>
              </View>
              <Text style={{ fontSize: fontSize - 3, color: C.textSub, marginTop: 6, fontWeight: '600' }}>
                어디서든 업그레이드 가능
              </Text>
            </View>
            <TouchableOpacity
              style={[s.premiumBtn, { marginTop: 0, paddingHorizontal: 16, paddingVertical: 8 }]}
              onPress={() => Alert.alert('프리미엄 멤버십', '구독 관리 및 혜택 내역으로 이동합니다.')}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: fontSize - 3, fontWeight: '800', color: '#0F172A' }}>보러가기 〉</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. 글자 크기 조절 카드 */}
        <View style={[s.settingCard, { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Ionicons name="text-outline" size={20} color={C.gold} />
            <Text style={[s.settingTitle, { fontSize: fontSize + 1, color: C.text, marginBottom: 0 }]}>글자 크기 조절</Text>
          </View>
          
          {/* 가독성 샘플 미리보기 텍스트 */}
          <View style={[s.sampleTextView, { backgroundColor: C.surfaceHigh, borderColor: 'rgba(15, 23, 42, 0.05)', borderWidth: 1, marginBottom: 16 }]}>
            <Text style={[s.sampleText, { fontSize: fontSize, lineHeight: fontSize * 1.5, color: C.text, fontWeight: '700', textAlign: 'center' }]}>
              금리 동결이 예금 시장에 미치는 영향
            </Text>
            <Text style={{ fontSize: fontSize - 5, color: C.textSub, textAlign: 'center', marginTop: 4 }}>미리보기</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[{ label: '작게', size: 16 }, { label: '보통', size: 20 }, { label: '크게', size: 24 }].map(opt => {
              const active = fontSize === opt.size;
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => onChangeFontSize(opt.size)}
                  style={[
                    s.sizeBtn, 
                    active && s.sizeBtnOn, 
                    { 
                      flex: 1, 
                      backgroundColor: active ? C.gold : '#E2E8F0', 
                      borderColor: 'transparent',
                      paddingVertical: fontSize * 0.7 
                    }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[{ fontSize: opt.size - 2, fontWeight: '700' }, { color: active ? '#FFFFFF' : C.textSub }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. 아침 브리핑 일일 알림 */}
        <View style={[s.settingCard, { borderColor: 'rgba(15, 23, 42, 0.05)', backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16, color: C.gold }}>🔔</Text>
              <Text style={[s.settingTitle, { fontSize: fontSize + 1, color: C.text, marginBottom: 0 }]}>일일 브리핑 알림</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAlarmOn(!alarmOn)}
              style={[s.toggle, alarmOn && s.toggleOn, { backgroundColor: alarmOn ? C.gold : '#E2E8F0' }]}
              activeOpacity={0.8}
            >
              <View style={[s.toggleThumb, alarmOn && s.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surfaceHigh, padding: 12, borderRadius: 12 }}
            onPress={() => {
              Alert.alert(
                '알림 시간 설정',
                '아침 브리핑을 받으실 기상 시간을 선택해 주세요.',
                [
                  { text: '오전 6:00', onPress: () => onChangeAlarmTime('오전 6:00') },
                  { text: '오전 7:00', onPress: () => onChangeAlarmTime('오전 7:00') },
                  { text: '오전 8:00', onPress: () => onChangeAlarmTime('오전 8:00') },
                  { text: '취소', style: 'cancel' }
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: fontSize - 2, color: C.text, fontWeight: '600' }}>알림 시간 설정</Text>
            <Text style={{ fontSize: fontSize - 2, color: C.gold, fontWeight: '700' }}>{alarmTime} 〉</Text>
          </TouchableOpacity>
        </View>

        {/* 3. 등록한 관심 분야 태그 */}
        <View style={[s.settingCard, { borderColor: 'rgba(15, 23, 42, 0.05)', backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 16, color: C.gold }}>⚙️</Text>
            <Text style={[s.settingTitle, { fontSize: fontSize + 1, color: C.text, marginBottom: 0 }]}>등록한 관심 분야</Text>
          </View>
          <Text style={[{ fontSize: fontSize - 4, color: C.textSub, marginBottom: 14, fontWeight: '500' }]}>
            뉴스 알고리즘에 반영됩니다
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {allInterests.map(it => {
              const on = interests.includes(it.label);
              return (
                <TouchableOpacity
                  key={it.label}
                  onPress={() => onChangeInterests(prev => prev.includes(it.label) ? prev.filter(i => i !== it.label) : [...prev, it.label])}
                  style={[
                    s.interestTag, 
                    on && s.interestTagOn, 
                    { 
                      backgroundColor: on ? C.gold : '#E2E8F0', 
                      borderColor: 'transparent',
                      paddingVertical: fontSize * 0.6,
                      paddingHorizontal: fontSize * 0.8
                    }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[{ fontSize: fontSize - 2, fontWeight: '700' }, { color: on ? '#FFFFFF' : C.textSub }]}>
                    {it.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. 계정 관리 리스트 */}
        <View style={[s.settingCard, { borderColor: 'rgba(15, 23, 42, 0.05)', backgroundColor: C.surface, paddingVertical: 10 }]}>
          <View style={{ paddingHorizontal: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(15, 23, 42, 0.05)', marginBottom: 8 }}>
            <Text style={{ fontSize: fontSize - 2, color: C.textSub, fontWeight: '800' }}>👤 계정 관리</Text>
          </View>

          {/* 고객 서비스 */}
          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 }}
            onPress={() => Alert.alert('고객 서비스 안내', '문의 사항은 support@newsnippet.com 으로 보내주시면 빠르게 친절히 안내드리겠습니다.')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: fontSize - 1, color: C.text, fontWeight: '700' }}>🙋 고객 서비스 센터 문의</Text>
            <Text style={{ fontSize: fontSize - 1, color: C.textSub, fontWeight: '900' }}>〉</Text>
          </TouchableOpacity>
          
          {/* 이용약관 */}
          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 }}
            onPress={() => Alert.alert('이용약관 및 정책', '개인정보처리방침 및 서비스 이용약관으로 이동합니다.')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: fontSize - 1, color: C.text, fontWeight: '700' }}>이용약관 및 정책</Text>
            <Text style={{ fontSize: fontSize - 1, color: C.textSub, fontWeight: '900' }}>〉</Text>
          </TouchableOpacity>

          {/* 로그아웃 */}
          <TouchableOpacity
            style={{ paddingVertical: 12, paddingHorizontal: 4, marginTop: 8 }}
            onPress={onLogout}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: fontSize - 1, color: '#EF4444', fontWeight: '800' }}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* 최하단 버전 표기 */}
        <View style={s.versionFooter}>
          <Text style={[s.versionFooterText, { fontSize: fontSize - 5, color: C.textSub }]}>
            뉴스니핏 버전 v1.0.0
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── 🧭 공통 탭 바 (Stitch 시안과 100% 동일한 비주얼 & 3탭으로 완벽 복구!) ────
function TabBar({ active, onChange }) {
  const tabs = [
    { key: 'home',    label: '뉴스',    iconName: 'newspaper-outline' },
    { key: 'saved',   label: '보관함',  iconName: 'archive-outline' },
    { key: 'setting', label: '설정',    iconName: 'settings-outline' },
  ];
  return (
    <View style={s.tabBar}>
      {tabs.map(t => {
        const isSelected = active === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={s.tabItem}
            onPress={() => onChange(t.key)}
            activeOpacity={0.7}
          >
            {/* 선택된 탭 위에 가로선 골드 인디케이터 장착 */}
            {isSelected && <View style={s.tabLineIndicator} />}
            <Ionicons
              name={t.iconName}
              size={24}
              color={isSelected ? C.gold : C.textFaint}
            />
            <Text style={[s.tabLabel, { fontSize: 11 }, isSelected && s.tabLabelOn]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── 🚀 메인 엔트리포인트 (App Component) ───────────────────
export default function App() {
  const [tab, setTab]           = useState('home');
  const [selected, setSelected] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [readIds, setReadIds]   = useState([]);
  const [fontSize, setFontSize] = useState(20);
  const [alarmTime, setAlarmTime] = useState('오전 7:00');
  const [interests, setInterests] = useState(['경제', '부동산']);
  const [news, setNews]         = useState([]);
  const [loading, setLoading]   = useState(true);
  // 폰트 로딩 (expo-google-fonts 패키지)
  const [fontsLoaded] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_600SemiBold,
    NotoSansKR_700Bold,
  });

  // useEffect는 언제나 hooks 순서 유지를 위해 early return 앞에 와야 함
  useEffect(() => {
    fetchNews().then(data => {
      setNews(data);
      setLoading(false);
    });
  }, []);

  // 폰트 로딩 완료 전 화면
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, color: '#475569' }}>로딩 중...</Text>
      </View>
    );
  }

  function toggleSave(id) {
    setSavedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function togglePin(id) {
    setPinnedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }
  
  function markRead(id) {
    setReadIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }
  
  function handleLogout() {
    setSavedIds([]);
    setReadIds([]);
    setPinnedIds([]);
    setAlarmTime('오전 7:00');
    setInterests(['경제', '부동산']);
    setTab('home');
    setSelected(null);
    Alert.alert('로그아웃 완료', '개인 정보 및 데이터가 안전하게 정리되었습니다.');
  }

  function renderScreen() {
    if (selected) {
      return (
        <DetailScreen
          item={selected}
          onBack={() => setSelected(null)}
          savedIds={savedIds}
          onToggleSave={toggleSave}
          fontSize={fontSize}
        />
      );
    }
    
    switch (tab) {
      case 'home':
        return (
          <HomeScreen
            news={news}
            onPressNews={setSelected}
            readIds={readIds}
            onRead={markRead}
            fontSize={fontSize}
            loading={loading}
            interests={interests}
          />
        );
      case 'saved':
        return (
          <SavedScreen
            savedIds={savedIds}
            onPressNews={setSelected}
            news={news}
            fontSize={fontSize}
            onBackToHome={() => setTab('home')}
            onDeleteSaved={toggleSave}
            pinnedIds={pinnedIds}
            onTogglePin={togglePin}
          />
        );
      case 'setting':
        return (
          <SettingScreen
            fontSize={fontSize}
            onChangeFontSize={setFontSize}
            onLogout={handleLogout}
            onBackToHome={() => setTab('home')}
            alarmTime={alarmTime}
            onChangeAlarmTime={setAlarmTime}
            interests={interests}
            onChangeInterests={setInterests}
          />
        );
      default:
        return null;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {renderScreen()}
      {/* 상세 보기 화면에서는 하단 탭바 숨김 */}
      {!selected && <TabBar active={tab} onChange={setTab} />}
    </View>
  );
}

// ── 🎨 Premium Hybrid Stylesheet (시안과 100% 매칭) ──────────────────
const s = StyleSheet.create({
  baseText: { fontFamily: 'NotoSansKR-Regular' },
  safe:         { flex: 1, backgroundColor: C.bg },
  
  // 탑 헤더 (골드 라인 데코 & 우아한 매핑)
  header:       { backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 45, paddingBottom: 18, borderBottomWidth: 1.5, borderBottomColor: 'rgba(15, 23, 42, 0.08)' },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle:   { width: 36, height: 36, borderRadius: 18, backgroundColor: C.goldFaint, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.gold },
  logoText:     { fontSize: 13, fontWeight: '950', color: C.gold },
  appName:      { fontFamily: 'NotoSansKR_700Bold', fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  headerRightAction: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  premiumBadge: { backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  premiumBadgeText: { color: '#FFFFFF', fontWeight: '900' },
  headerIcon:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerSub:    { color: C.textSub, marginTop: 8, fontWeight: '600' },
  
  // 1. Date & Title Section (시안과 100% 동일하게 추가)
  titleSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  headerDateText: { color: C.textSub, fontWeight: '700', letterSpacing: 0.3 },
  mainTitleWrap: { marginTop: 10 },
  mainTitleText: { fontWeight: '900', color: C.textDark, letterSpacing: -0.5 },

  // 2. Intro Section (오늘의 브리핑 라이트 전용 카드)
  introCard: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  introHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  introTitle: {
    fontWeight: '900',
    color: C.text,
  },
  introProgressText: {
    fontWeight: '900',
    color: C.gold,
  },
  introProgressBg: {
    height: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  introProgressFill: {
    height: 8,
    backgroundColor: C.gold,
    borderRadius: 4,
  },
  introSubtext: {
    color: C.textSub,
    fontWeight: '600',
  },
  
  scroll:       { flex: 1 },
  sectionLbl:   { fontWeight: '900', color: C.textDark, marginBottom: 16, letterSpacing: -0.2 },
  
  // 럭셔리 하이브리드 카드 디자인 (선명한 프리미엄 골드 테두리 + 딥 네이비 카드 배경! screen_home.png 매칭)
  card:         { backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: C.gold },
  cardBriefText:{ color: C.textSub, marginTop: 8, lineHeight: 22, fontWeight: '500' },
  cardRead:     { opacity: 0.65 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  cardInfluenceText: { color: C.textSub, fontWeight: '800' },
  cardNum:      { color: C.gold, marginLeft: 'auto', fontWeight: '900' },
  cardTitle:    { fontWeight: '850', color: C.text, lineHeight: 26, marginBottom: 10, letterSpacing: -0.2 },
  cardTitleDetail: { fontWeight: '800', color: C.text, lineHeight: 28, marginBottom: 14 },

  // 3줄 요약 박스 스타일 복원 (딥네이비 전용 조화로운 고대비 색상)
  summaryBox:   { backgroundColor: C.surfaceHigh, borderRadius: 16, padding: 16, marginTop: 4, borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.08)' },
  summaryLine:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  dotWrap:      { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(181, 138, 60, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.outline },
  dot:          { fontWeight: '900', color: C.gold },
  summaryText:  { color: C.text, lineHeight: 22, flex: 1, fontWeight: '600' },

  cardDivider:  { height: 1, backgroundColor: 'rgba(15, 23, 42, 0.08)', marginVertical: 12 },
  cardFooterInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardFooterText: { color: C.textSub, fontWeight: '700' },
  cardFooterImpactText: { color: C.gold, fontWeight: '800' },

  // 상세보기 풀 너비 골드 아웃라인 버튼
  detailButtonOutlineFull: { borderWidth: 1.5, borderColor: C.gold, borderRadius: 24, paddingVertical: 11, width: '100%', justifyContent: 'center', alignItems: 'center' },
  detailButtonTextFull: { color: C.gold, fontWeight: '900', letterSpacing: -0.1 },
  
  // 자산 영향도 및 신호 칩
  signalRow:    { flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.outline, flexWrap: 'wrap' },
  impactBadge:  { backgroundColor: C.goldFaint, borderWidth: 1, borderColor: C.outline, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  impactText:   { color: C.gold, fontWeight: '800' },
  signalBadge:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  signalText:   { fontWeight: '800' },
  
  // 푸터
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  cardCta:      { fontWeight: '800', color: C.gold, letterSpacing: -0.2 },
  shareBtn:     { backgroundColor: C.surfaceHigh, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5, borderColor: C.outline, height: 44, justifyContent: 'center' },
  shareBtnText: { color: C.text, fontWeight: '800' },
  
  // 시안 전용 럭셔리 카드 푸터
  cardFooterPremium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, height: 44 },
  timeText:     { color: C.textSub, fontWeight: '700' },
  detailButtonOutline: { borderWidth: 1.5, borderColor: C.gold, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, height: 38, justifyContent: 'center', alignItems: 'center' },
  detailButtonText: { color: C.gold, fontWeight: '900' },

  badge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText:    { fontSize: 13, fontWeight: '800' },
  centerLoading:{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  
  // 🎙️ Audio Bar Styles
  audioBar:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceHigh, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(15, 23, 42, 0.08)' },
  audioPlayBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  audioPlayIcon:{ fontSize: 14, fontWeight: '900', color: '#1C2A4A', marginLeft: 2 },
  audioTitle:   { fontWeight: '800', color: C.text },
  audioDuration:{ color: C.textSub, marginTop: 3 },
  audioRightBadge: { backgroundColor: C.goldFaint, borderWidth: 1, borderColor: C.gold, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  audioRightBadgeText: { color: C.gold, fontWeight: '800' },

  // 📰 2단 Tab Styles
  tabHeader:    { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: 'rgba(15, 23, 42, 0.08)', backgroundColor: C.bg, marginTop: 10 },
  tabBtn:       { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: C.gold },
  tabBtnText:   { color: C.textSub, fontWeight: '700' },
  tabBtnTextActive: { color: C.gold, fontWeight: '900' },
  detailCard:   { backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(15, 23, 42, 0.08)' },
  detailLbl:    { fontWeight: '900', color: C.gold, marginBottom: 12, letterSpacing: 0.3 },
  termDescWrap: { backgroundColor: C.surfaceHigh, borderRadius: 12, padding: 14, marginTop: 12 },

  // 🤖 AI Review Styles
  expertProfileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(15, 23, 42, 0.08)', paddingBottom: 12 },
  expertAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.gold },
  expertName:   { fontWeight: '800', color: C.text },
  expertTitle:  { color: C.textSub, marginTop: 2 },
  expertRating: { marginLeft: 'auto' },
  expertContentText: { color: C.text, marginTop: 14 },
  otherExpertBtn: { backgroundColor: C.goldFaint, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: C.outline },

  // 📰 Saved Chip Filter Styles
  chipScroll:   { marginTop: 12 },
  chip:         { borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5, height: 42, justifyContent: 'center', alignItems: 'center' },
  chipActive:   { backgroundColor: C.gold, borderColor: C.gold },
  chipText:     { fontWeight: '700' },
  chipTextActive: { fontWeight: '800' },
  archiveListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },

  // ⚙️ Settings Styles
  settingCard:  { borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1.5 },
  settingTitle: { fontWeight: '800', color: C.text, marginBottom: 6 },
  sizeBtn:      { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5 },
  sizeBtnOn:    { backgroundColor: C.gold },
  interestTag:  { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5 },
  interestTagOn:{ backgroundColor: C.gold },
  toggle:       { width: 56, height: 32, borderRadius: 16, padding: 4 },
  toggleOn:     { backgroundColor: C.gold },
  toggleThumb:  { width: 24, height: 24, backgroundColor: '#FFFFFF', borderRadius: 12 },
  toggleThumbOn:{ alignSelf: 'flex-end' },
  premiumBtn:   { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  alarmControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surfaceHigh, borderRadius: 14, padding: 16 },
  sampleTextView: { borderRadius: 12, padding: 14, marginTop: 16 },
  sampleTextHeader: { color: C.gold, fontWeight: '800', marginBottom: 6 },
  sampleText:   { color: C.text },
  versionFooter:{ marginTop: 16, marginBottom: 40, alignItems: 'center' },
  versionFooterText: { color: C.textSub, fontWeight: '700' },

  // 🧭 Tab Bar Styles (시안과 100% 동일한 비례와 가로선 인디케이터 장착 - 3탭 완벽 복원 + 둥근 모서리 효과 적용)
  tabBar:       { flexDirection: 'row', backgroundColor: C.bgDark, borderTopWidth: 1.5, borderTopColor: 'rgba(15, 23, 42, 0.08)', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingTop: 10, paddingBottom: 22, position: 'relative', marginTop: -24 },
  tabItem:      { flex: 1, alignItems: 'center', gap: 4, height: 50, justifyContent: 'center' },
  tabLineIndicator: { position: 'absolute', top: -10, left: '25%', right: '25%', height: 3, backgroundColor: C.gold, borderRadius: 1.5 },
  tabIcon:      { fontSize: 24, color: C.textFaint },
  tabIconOn:    { color: C.gold, fontSize: 24 },
  tabLabel:     { color: C.textFaint },
  tabLabelOn:   { color: C.gold, fontWeight: '800' },
});
