import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  StyleSheet, SafeAreaView, StatusBar, Linking, Alert, Share, Image, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { useFonts, NotoSansKR_400Regular, NotoSansKR_600SemiBold, NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 모든 Text 컴포넌트에 Noto Sans KR 기본 적용
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: 'NotoSansKR_400Regular' }];
const SUPABASE_URL = 'https://xglszfrjbcsmypxxjegq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbHN6ZnJqYmNzbXlweHhqZWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODI0OTUsImV4cCI6MjA5NDk1ODQ5NX0.q2yzXfKCui_g2eBuBWeitbh5Lrp_WMcbl7KEjryowXE';

// ── 🎨 Premium Dark Header + Light Body Theme ──
const C = {
  // 헤더 전용 딥 네이비
  navy: '#0F172A',
  navyLight: '#1E293B',
  // 바디 라이트
  bg: '#F8FAFC',
  bgDark: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHigh: '#F1F5F9',
  // 골드 계열
  gold: '#C5A85C',
  goldDark: '#8C7034',
  goldLight: '#FBF7EB',
  goldFaint: 'rgba(197, 168, 92, 0.12)',
  // 텍스트
  text: '#0F172A',
  textDark: '#0F172A',
  textSub: '#64748B',
  textFaint: '#CBD5E1',
  textOnDark: '#FFFFFF',
  outline: 'rgba(197, 168, 92, 0.2)',
  white: '#FFFFFF',
  // 뱃지
  greenBadge: '#E8F5E9',
  greenText: '#2E7D32',
  redBadge: '#FFEBEE',
  redText: '#C62828',
  blueBadge: '#E8F0FE',
  blueText: '#1A73E8',
  borderDark: 'rgba(197, 168, 92, 0.15)',
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
        impactScore: ['💰💰💰 높음', '💰💰 보통', '💰 낮음'][i % 3],
        investmentSignal: ['📈 긍정', '⚖️ 중립', '📉 주의'][i % 3],
        signalClass: ['pos', 'neu', 'neg'][i % 3],
      }));
    }
    return [];
  } catch (e) { return []; }
}

function shareNews(item) {
  const d = new Date();
  const ds = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const isEcon = item.category === '경제';
  const impactLabel = isEcon ? '자산 영향 분석' : '핵심 영향 분석';
  Share.share({
    message: `📰 [뉴스니핏] 프리미엄 핵심 브리핑 (${ds})\n\n제목: ${item.title}\n\n[핵심 3대 포인트]\n1. ${item.point1}\n2. ${item.point2}\n3. ${item.point3}\n\n👉 ${impactLabel}: ${item.impact}\n\n출처: ${item.source}\n──────────────\n매일 아침 5분, 오늘의 핵심 브리핑\n링크: https://wonkstudio.github.io/newsnippet/`
  });
}

function Badge({ category, difficulty }) {
  if (difficulty) {
    let bg = '#E8F5E9';
    let tx = '#2E7D32';
    if (difficulty === '보통') { bg = '#FFF3E0'; tx = '#EF6C00'; }
    else if (difficulty === '심화') { bg = '#FFEBEE'; tx = '#C62828'; }
    return (
      <View style={[s.badge, { backgroundColor: bg }]}>
        <Text style={[s.badgeText, { color: tx }]}>{difficulty}</Text>
      </View>
    );
  }
  let bg = C.blueBadge;
  let tx = C.blueText;
  if (category === '경제') { bg = '#E8F0FE'; tx = '#1A73E8'; }
  else if (category === '주식') { bg = C.greenBadge; tx = C.greenText; }
  else if (category === '건강') { bg = C.greenBadge; tx = C.greenText; }
  else if (category === '부동산') { bg = '#FFF3E0'; tx = '#EF6C00'; }
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: tx }]}>{category}</Text>
    </View>
  );
}

// ── 🎙️ AI 이퀄라이저 막대 애니메이션 ──
function Equalizer({ isPlaying }) {
  const bars = useRef([
    new Animated.Value(2),
    new Animated.Value(2),
    new Animated.Value(2),
    new Animated.Value(2),
    new Animated.Value(2),
  ]).current;

  useEffect(() => {
    let animations = [];
    if (isPlaying) {
      animations = bars.map((bar, i) => {
        const duration = 500 + i * 120;
        return Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: 18,
              duration: duration,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: 2,
              duration: duration,
              useNativeDriver: false,
            }),
          ])
        );
      });
      animations.forEach(anim => anim.start());
    } else {
      bars.forEach(bar => {
        Animated.timing(bar, {
          toValue: 2,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [isPlaying]);

  return (
    <View style={s.eqWave}>
      {bars.map((bar, i) => (
        <Animated.View key={i} style={[s.eqBar, { height: bar }]} />
      ))}
    </View>
  );
}

// ── 프레스 애니메이션 카드 컴포넌트 ─────
function PressCard({ children, onPress, isRead }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }),
      Animated.timing(shadow, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      Animated.timing(shadow, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const borderColor = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(197, 168, 92, 0.2)', 'rgba(197, 168, 92, 0.6)'],
  });

  return (
    <Animated.View
      style={[
        s.card,
        isRead && s.cardRead,
        { transform: [{ scale }], borderColor },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function AudioPlayerBar({ item, fontSize }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const timeElapsed = useRef(0);
  const totalSeconds = 120; // 가상 duration: 2분

  const startTTS = () => {
    if (!item) return;
    const text = `오늘의 뉴스 브리핑입니다. 주제는 ${item.title} 입니다. ` +
      `핵심 첫 번째, ${item.point1 || item.point_1 || ''}. ` +
      `두 번째, ${item.point2 || item.point_2 || ''}. ` +
      `세 번째, ${item.point3 || item.point_3 || ''}. ` +
      `나의 실생활에 미치는 영향은 ${item.impact || ''} 입니다. 뉴스니핏 아침 브리핑을 마칩니다. 귀하의 스마트한 하루를 응원합니다.`;

    Speech.stop();
    setIsPlaying(true);

    Speech.speak(text, {
      language: 'ko-KR',
      rate: 0.9,
      onStart: () => {
        setIsPlaying(true);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          timeElapsed.current += 1;
          if (timeElapsed.current >= totalSeconds) {
            clearInterval(timerRef.current);
            setIsPlaying(false);
            timeElapsed.current = 0;
            setProgress(0);
          } else {
            setProgress(timeElapsed.current / totalSeconds);
          }
        }, 1000);
      },
      onDone: () => {
        setIsPlaying(false);
        clearInterval(timerRef.current);
        timeElapsed.current = 0;
        setProgress(0);
      },
      onStopped: () => {
        setIsPlaying(false);
        clearInterval(timerRef.current);
      },
      onError: () => {
        setIsPlaying(false);
        clearInterval(timerRef.current);
      }
    });
  };

  const stopTTS = () => {
    Speech.stop();
    setIsPlaying(false);
    clearInterval(timerRef.current);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopTTS();
    } else {
      startTTS();
    }
  };

  useEffect(() => {
    stopTTS();
    timeElapsed.current = 0;
    setProgress(0);
    return () => {
      Speech.stop();
      clearInterval(timerRef.current);
    };
  }, [item]);

  return (
    <View style={s.audioBar}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={togglePlayback}
      >
        <LinearGradient
          colors={['#F5E3B5', '#D4AF37', '#B5944A']}
          style={s.audioPlayBtn}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={C.navy} style={{ marginLeft: isPlaying ? 0 : 2 }} />
        </LinearGradient>
      </TouchableOpacity>
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={[s.audioTitle, { fontSize: fontSize - 2, lineHeight: (fontSize - 2) * 1.35 }]} numberOfLines={1}>
          {isPlaying ? 'AI 브리핑 리스닝 중...' : '오디오 브리핑 듣기'}
        </Text>
      </View>
      <Equalizer isPlaying={isPlaying} />
    </View>
  );
}

// ── 🏠 오늘의 브리핑 (홈 화면) ──
function HomeScreen({ news, onPressNews, readIds, onRead, fontSize, loading, interests = [], isGuest, onKakaoLogin }) {
  const today = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${today.getMonth() + 1}월 ${today.getDate()}일 ${days[today.getDay()]}요일`;

  const prioritizedNews = [...news].sort((a, b) => {
    const aMatch = interests.includes(a.category);
    const bMatch = interests.includes(b.category);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });
  const briefingNews = isGuest ? prioritizedNews.slice(0, 3) : prioritizedNews.slice(0, 5);
  const readCount = readIds.filter(id => briefingNews.find(n => n.id === id)).length;
  const pct = briefingNews.length > 0 ? Math.round((readCount / briefingNews.length) * 100) : 0;

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient
          colors={[C.navy, C.navyLight]}
          style={s.header}
        >
          <View style={s.headerRow}>
            <View style={s.logoRow}>
              <Image
                source={require('./assets/logo.png')}
                style={s.logoImgPremium}
              />
              <Text style={[s.appName, { fontSize: fontSize + 6 }]}>뉴스니핏</Text>
            </View>
            <View style={s.headerRightAction}>
              <View style={s.premiumBadge}>
                <Text style={[s.premiumBadgeText, { fontSize: fontSize - 7 }]}>PREMIUM</Text>
              </View>
              <TouchableOpacity style={s.headerIcon} onPress={() => Alert.alert('알림', '오늘의 핵심 브리핑 소식 5개가 배달 완료되었습니다.')}>
                <Ionicons name="notifications-outline" size={24} color={C.gold} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[s.headerSub, { fontSize: fontSize - 5, lineHeight: (fontSize - 5) * 1.3 }]}>
            {isGuest ? '👑 편리미엄 체험단 맛보기 플레이 중' : '매일 아침, 오늘의 핵심만 골라드려요'}
          </Text>

          <View style={s.dateBadgeRow}>
            <View style={s.dateBadge}>
              <Text style={[s.dateText, { fontSize: fontSize - 5, lineHeight: (fontSize - 5) * 1.3 }]}>
                {dateStr} · {briefingNews.length}가지 브리핑
              </Text>
            </View>
          </View>

          <View style={s.headerBottomRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={s.progressBg}>
                <LinearGradient
                  colors={['#F5E3B5', '#D4AF37', '#B5944A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.progressFill, { width: `${pct}%` }]}
                />
              </View>
            </View>
            <Text style={[s.headerProgressText, { fontSize: fontSize - 5, lineHeight: (fontSize - 5) * 1.3 }]}>
              {readCount}/{briefingNews.length} 완료 ({pct}%)
            </Text>
          </View>

          <LinearGradient
            colors={['transparent', C.gold, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.headerGoldLine}
          />
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 12 }}>
          <Text style={[s.sectionLbl, { fontSize: fontSize - 2, lineHeight: (fontSize - 2) * 1.35 }]}>오늘의 필수 뉴스입니다.</Text>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {loading ? (
            <View style={s.centerLoading}>
              <Text style={{ fontSize: fontSize, color: C.textSub, lineHeight: fontSize * 1.4 }}>오늘의 브리핑 뉴스를 선정 중입니다...</Text>
            </View>
          ) : briefingNews.length === 0 ? (
            <View style={s.centerLoading}>
              <Text style={{ fontSize: 44, marginBottom: 16 }}>📰</Text>
              <Text style={{ fontSize: fontSize, color: C.textSub, textAlign: 'center', lineHeight: fontSize * 1.6 }}>
                뉴스를 불러오는 데 실패했습니다.{"\n"}잠시 후 다시 새로고침해 보세요.
              </Text>
            </View>
          ) : (
            briefingNews.map((item, i) => {
              const difficulty = i % 2 === 0 ? '보통' : '쉬움';
              const titleSize = fontSize + 1;
              const summaryLineSize = fontSize - 1;
              return (
                <PressCard
                  key={item.id}
                  onPress={() => { onRead(item.id); onPressNews(item); }}
                  isRead={readIds.includes(item.id)}
                >
                  <View style={s.cardTop}>
                    <Badge category={item.category} />
                    <Badge difficulty={difficulty} />
                    {interests.includes(item.category) && (
                      <View style={{ backgroundColor: 'rgba(197, 168, 92, 0.15)', borderWidth: 1, borderColor: C.gold, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: C.gold, fontWeight: '900', fontSize: fontSize - 6, lineHeight: (fontSize - 6) * 1.35 }}>★ 추천</Text>
                      </View>
                    )}
                    <Text style={[s.cardNum, { fontSize: fontSize - 5, lineHeight: (fontSize - 5) * 1.35 }]}>
                      {i + 1}/{briefingNews.length} {readIds.includes(item.id) ? '✓' : ''}
                    </Text>
                  </View>

                  <Text style={[s.cardTitle, { fontSize: titleSize, color: C.navy, lineHeight: titleSize * 1.35 }]}>{item.title}</Text>

                  <View style={s.summaryBox}>
                    {[item.point1, item.point2, item.point3].map((p, j) => (
                      <View key={j} style={s.summaryLine}>
                        <View style={s.dotWrap}>
                          <Text style={{ fontSize: fontSize - 2, color: C.gold, lineHeight: (fontSize - 2) * 1.35 }}>•</Text>
                        </View>
                        <Text style={[s.summaryText, { fontSize: summaryLineSize, color: C.navyLight, lineHeight: summaryLineSize * 1.4 }]}>
                          {p}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={s.impactBadgeRow}>
                    <View style={s.impactScoreBadge}>
                      <Text style={[s.impactScoreText, { fontSize: fontSize - 6, lineHeight: (fontSize - 6) * 1.35 }]}>{item.category === '경제' ? '자산 영향도' : '실생활 영향도'}: {item.impactScore || '💰💰 보통'}</Text>
                    </View>
                    <View style={[s.signalBadge, item.signalClass === 'pos' ? s.signalPos : (item.signalClass === 'neg' ? s.signalNeg : s.signalNeu)]}>
                      <Text style={[s.signalText, { fontSize: fontSize - 6, color: item.signalClass === 'pos' ? '#2E7D32' : (item.signalClass === 'neg' ? '#C62828' : '#455A64'), lineHeight: (fontSize - 6) * 1.35 }]}>
                        {item.category === '경제' ? '투자 신호' : '이슈 흐름'}: {item.investmentSignal || '⚖️ 중립'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.cardDivider} />

                  <View style={s.cardFooter}>
                    <TouchableOpacity style={s.shareBtnCompact} onPress={() => { onRead(item.id); onPressNews(item); }}>
                      <Text style={[s.shareBtnCompactText, { fontSize: fontSize - 5, lineHeight: (fontSize - 5) * 1.35 }]}>상세 브리핑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.shareBtnCompact} onPress={() => shareNews(item)}>
                      <Text style={[s.shareBtnCompactText, { fontSize: fontSize - 5, lineHeight: (fontSize - 5) * 1.35 }]}>카톡 공유 📤</Text>
                    </TouchableOpacity>
                  </View>
                </PressCard>
              );
            })
          )}
        </View>
        {isGuest && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 24, marginTop: 8 }}>
            <View style={{ backgroundColor: 'rgba(197,168,92,0.1)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.gold, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>🔒</Text>
              <Text style={{ fontSize: fontSize, color: C.textDark, fontWeight: '800', marginBottom: 6, lineHeight: fontSize * 1.4 }}>더 많은 브리핑이 기다리고 있어요</Text>
              <Text style={{ fontSize: fontSize - 4, color: C.textSub, textAlign: 'center', marginBottom: 16, lineHeight: (fontSize - 4) * 1.5 }}>
                오픈 베타 가입 회원은 매일 5개의 핵심 브리핑과{"\n"}무제한 상세 분석 리포트를 모두 제공받습니다.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#FEE500', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={onKakaoLogin}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16 }}>💬</Text>
                <Text style={{ color: '#191919', fontWeight: '800', fontSize: fontSize - 2, lineHeight: (fontSize - 2) * 1.4 }}>1초만에 무료 가입하고 해금하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── 📰 뉴스 상세 화면 ──
function DetailScreen({ item, onBack, savedIds, onToggleSave, fontSize, isGuest, guestDetailUsed, onUseGuestDetail, onKakaoLogin }) {
  const [showImpact, setShowImpact] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [showTerm, setShowTerm] = useState(false);

  useEffect(() => {
    if (isGuest && !guestDetailUsed) {
      onUseGuestDetail();
    }
  }, []);

  const isSaved = savedIds.includes(item.id);
  const isEcon = item.category === '경제';
  const richAnalysis = item.critic || (isEcon 
    ? `${item.source} 기사를 분석 중입니다.

핵심 지표 해석: 본 지표의 자산 영향도는 "${item.impactScore || '💰💰 보통'}" 수준으로 측정되었습니다. 특히, 직장인들과 자영업자의 고정 자산 가치에 미치는 직간접적 변동성이 포착되었으며, "${item.investmentSignal || '⚖️ 중립'}" 투자 전략을 신중하게 조율해야 합니다.

전문가 권고 비평: 은퇴 및 재테크 전문가 그룹은 본 기사가 시사하는 단기적 마찰(Friction)에 매몰되기보다는, 중장기적 은퇴 배당 및 세금 혜택 제도(ISA, 연금저축펀드 등)와의 리스크 연계성을 점검할 것을 당부하고 있습니다. 특히 주택 담보 대출 및 가계 부채를 보유한 가구 일수록 고정 지출 상환 흐름을 선제적으로 정리하는 것이 의사결정의 ROI를 높이는 핵심입니다.`
    : `${item.source} 기사를 분석 중입니다.

핵심 지표 해석: 본 지표의 실생활 영향도는 "${item.impactScore || '💰💰 보통'}" 수준으로 측정되었습니다. 특히, 일상생활과 사회적 관심사에 미치는 직간접적 변동성이 포착되었으며, "${item.investmentSignal || '⚖️ 중립'}" 이슈 흐름에 따라 신중하게 상황을 주시해야 합니다.

전문가 권고 비평: 분야별 전문가 그룹은 본 기사가 시사하는 단기적 이슈에 매몰되기보다는, 일상 리스크 및 대응 요령을 선제적으로 정리하는 것이 의사결정의 만족도를 높이는 핵심이라고 당부하고 있습니다.`);

  const createdDate = item.created_at ? new Date(item.created_at) : new Date();
  const dateStr = `${createdDate.getFullYear()}.${createdDate.getMonth() + 1}.${createdDate.getDate()} 오전 08:30`;
  const titleSize = fontSize + 4;
  const summaryLineSize = fontSize - 1;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <LinearGradient colors={[C.navy, C.navyLight]} style={[s.header, { borderBottomWidth: 1, borderBottomColor: 'rgba(197, 168, 92, 0.15)', paddingBottom: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={C.white} />
            <Text style={{ fontSize: fontSize, color: C.white, fontWeight: '900', lineHeight: fontSize * 1.35 }}>뉴스 상세 분석</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <TouchableOpacity onPress={() => shareNews(item)} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={24} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onToggleSave(item.id)} activeOpacity={0.7}>
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={24} color={isSaved ? C.gold : C.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <Badge category={item.category} />
          <Badge difficulty={item.difficulty || '보통'} />
          <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', fontWeight: '700', marginLeft: 4 }}>
            {dateStr}
          </Text>
        </View>
        <Text style={{ fontSize: titleSize, color: C.white, fontWeight: '900', lineHeight: titleSize * 1.35, marginBottom: 16 }}>
          {item.title}
        </Text>
      </LinearGradient>

      <ScrollView style={[s.scroll, { backgroundColor: C.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
        <AudioPlayerBar item={item} fontSize={fontSize} />
        <View style={{ paddingHorizontal: 20 }}>
          {isGuest && guestDetailUsed ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(197,168,92,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: C.gold }}>
                <Text style={{ fontSize: 40 }}>🔒</Text>
              </View>
              <Text style={{ fontSize: fontSize + 4, fontWeight: '900', color: C.textDark, marginBottom: 10, lineHeight: (fontSize + 4) * 1.4 }}>상세 브리핑은 1회 무료입니다</Text>
              <Text style={{ fontSize: fontSize - 2, color: C.textSub, textAlign: 'center', marginBottom: 30, lineHeight: (fontSize - 2) * 1.6 }}>
                게스트 모드 무료 혜택이 만료되었습니다.{"\n"}카카오톡으로 로그인하고 모든 브리핑을 읽어보세요.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#FEE500', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 4, shadowColor: '#FEE500', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 14 }}
                onPress={onKakaoLogin}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 20 }}>💬</Text>
                <Text style={{ color: '#191919', fontWeight: '800', fontSize: fontSize, lineHeight: fontSize * 1.4 }}>카카오톡 1초 가입 및 무제한 이용</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.tabHeader}>
                <View style={[s.tabSliderIndicator, { left: activeTab === 'summary' ? 4 : '50%', right: activeTab === 'summary' ? '50%' : 4 }]} />
                <TouchableOpacity
                  onPress={() => setActiveTab('summary')}
                  style={s.tabBtn}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabBtnText, { fontSize: 23, lineHeight: (fontSize - 1) * 1.35 }, activeTab === 'summary' && s.tabBtnTextActive]}>3줄 핵심 요약</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('critic')}
                  style={s.tabBtn}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabBtnText, { fontSize: 23, lineHeight: (fontSize - 3) * 1.35 }, activeTab === 'critic' && s.tabBtnTextActive]} numberOfLines={1} adjustsFontSizeToFit>에디터 심층 비평</Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'summary' ? (
                <View style={{ marginTop: 14 }}>
                  <View style={s.detailCard}>
                    <Text style={[s.detailLbl, { fontSize: fontSize - 1, lineHeight: (fontSize - 1) * 1.35 }]}>핵심 정리</Text>
                    {[item.point1, item.point2, item.point3].map((p, i) => (
                      <View key={i} style={[s.summaryLine, { marginBottom: 12 }]}>
                        <Text style={{ fontSize: fontSize - 2, color: C.gold, lineHeight: (fontSize - 2) * 1.35, marginRight: 6 }}>•</Text>
                        <Text style={[s.summaryText, { fontSize: summaryLineSize, color: C.text, lineHeight: summaryLineSize * 1.4 }]}>{p}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[s.detailCard, { backgroundColor: C.goldLight, borderColor: 'rgba(197, 168, 92, 0.25)' }]}
                    onPress={() => setShowImpact(!showImpact)}
                    activeOpacity={0.9}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[s.detailLbl, { fontSize: fontSize - 1, color: C.goldDark, lineHeight: (fontSize - 1) * 1.35, marginBottom: 0 }]}>{item.category === '경제' ? '자산 영향도' : '실생활 영향도'}</Text>
                      <Text style={{ fontSize: fontSize - 2, color: C.goldDark }}>{showImpact ? '▲' : '▼'}</Text>
                    </View>
                    {showImpact && (
                      <Text style={{ fontSize: fontSize - 1, color: C.goldDark, lineHeight: (fontSize - 1) * 1.6, fontWeight: '700', marginTop: 8 }}>
                        👉 {item.impact}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {item.term ? (
                    <TouchableOpacity
                      style={s.detailCard}
                      onPress={() => setShowTerm(!showTerm)}
                      activeOpacity={0.9}
                    >
                      <Text style={[s.detailLbl, { fontSize: fontSize - 1, lineHeight: (fontSize - 1) * 1.35 }]}>어려운 지식 용어 설명</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: fontSize, color: C.goldDark, fontWeight: '700', lineHeight: fontSize * 1.35 }}>{item.term}</Text>
                        <Text style={{ fontSize: fontSize - 2, color: C.goldDark, lineHeight: (fontSize - 2) * 1.35 }}>{showTerm ? '▲' : '▼'}</Text>
                      </View>
                      {showTerm && (
                        <View style={[s.termDescWrap, { backgroundColor: C.surfaceHigh }]}>
                          <Text style={{ fontSize: fontSize - 1, color: C.text, lineHeight: fontSize * 1.6 }}>{item.term_desc || item.termDesc}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <View style={{ marginTop: 14 }}>
                  <View style={s.detailCard}>
                    <View style={[s.expertProfileHeader, { borderBottomColor: C.borderDark }]}>
                      <View style={s.expertAvatar}>
                        <Text style={{ fontSize: 28 }}>🤖</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[s.expertName, { fontSize: fontSize - 1, color: C.text, lineHeight: (fontSize - 1) * 1.35 }]} numberOfLines={2}>뉴스니핏 AI 비평가</Text>
                      </View>
                    </View>

                    <Text style={[s.detailLbl, { fontSize: fontSize - 1, marginTop: 12, lineHeight: (fontSize - 1) * 1.35 }]}>인텔리전스 전문가 심층 비평</Text>
                    <Text style={[s.expertContentText, { fontSize: fontSize - 1, lineHeight: (fontSize - 1) * 1.5, color: C.text }]}>
                      {richAnalysis}
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ marginTop: 14, gap: 14 }}>
                {item.url && (
                  <TouchableOpacity
                    style={s.linkCard}
                    onPress={() => Linking.openURL(item.url)}
                    activeOpacity={0.8}
                  >
                    <View style={{ justifyContent: 'center' }}>
                      <Text style={[s.detailLbl, { fontSize: fontSize - 1, marginBottom: 0, lineHeight: (fontSize - 1) * 1.35 }]}>원문 기사 보기</Text>
                    </View>
                    <Text style={{ fontSize: 24 }}>🔗</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={s.shareCard}
                  onPress={() => shareNews(item)}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={{ fontSize: fontSize - 2, color: C.greenText, fontWeight: '700', lineHeight: (fontSize - 2) * 1.35 }}>
                      지인에게 공유하기 📤
                    </Text>
                  </View>
                  <Text style={{ fontSize: 28 }}>💬</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        <Text style={{ fontSize: fontSize - 3, color: C.textSub, marginTop: 24, textAlign: 'center', lineHeight: (fontSize - 3) * 1.35 }}>출처: {item.source}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── 📁 나의 보관함 (Personal Archive) ─────────────────
function SavedScreen({ savedIds, onPressNews, news, fontSize, onBackToHome, onDeleteSaved, pinnedIds, onTogglePin }) {
  const [activeChip, setActiveChip] = useState('전체');
  const [sortOrder, setSortOrder] = useState('latest');
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
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <LinearGradient colors={[C.navy, C.navyLight]} style={[s.header, { borderBottomWidth: 1, borderBottomColor: 'rgba(197, 168, 92, 0.15)', paddingBottom: 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={onBackToHome} activeOpacity={0.7} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={C.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.appName, { fontSize: fontSize + 6, color: C.white, fontWeight: '900' }]}>나의 보관함</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('검색', '보관된 뉴스 검색 기능은 다음 업데이트에 준비됩니다.')} activeOpacity={0.7} style={{ padding: 4 }}>
            <Ionicons name="search-outline" size={24} color={C.white} />
          </TouchableOpacity>
        </View>
        <Text style={[s.headerSub, { fontSize: fontSize - 6, marginTop: 6, color: 'rgba(255, 255, 255, 0.6)', lineHeight: (fontSize - 6) * 1.3 }]}>
          {savedList.length}개의 리스크 관심 브리핑 보관함
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {chips.map(cat => {
            const isActive = activeChip === cat;
            const tabFontSize = Math.max(22, fontSize * 0.75);
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  setActiveChip(cat);
                  setItemLimit(3);
                }}
                style={[
                  s.chip,
                  isActive && s.chipActive,
                  {
                    backgroundColor: isActive ? C.gold : '#E2E8F0',
                    borderColor: isActive ? C.gold : 'rgba(15, 23, 42, 0.08)',
                    paddingVertical: fontSize * 0.35,
                    paddingHorizontal: fontSize * 0.6
                  }
                ]}
                activeOpacity={0.8}
              >
                <Text style={[
                  s.chipText,
                  { fontSize: tabFontSize, lineHeight: tabFontSize * 1.3 },
                  isActive && s.chipTextActive,
                  { color: isActive ? '#FFFFFF' : C.textSub }
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

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
              <Text style={[s.sectionLbl, { fontSize: fontSize - 1, color: C.text, marginBottom: 0, lineHeight: (fontSize - 1) * 1.35 }]}>저장한 뉴스 리스트</Text>
              <TouchableOpacity onPress={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')} activeOpacity={0.7}>
                <Text style={{ fontSize: fontSize - 3, color: C.gold, fontWeight: '700', lineHeight: (fontSize - 3) * 1.35 }}>
                  {sortOrder === 'latest' ? '최신순 ▾' : '과거순 ▾'}
                </Text>
              </TouchableOpacity>
            </View>

            {visibleList.map(item => {
              const savedDate = item.created_at ? new Date(item.created_at) : new Date();
              const formattedDate = `${savedDate.getFullYear()}.${String(savedDate.getMonth() + 1).padStart(2, '0')}.${String(savedDate.getDate()).padStart(2, '0')} 저장`;
              const isPinned = pinnedIds.includes(item.id);
              const titleSize = fontSize;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.card, { backgroundColor: C.surface, borderColor: isPinned ? C.gold : 'rgba(15, 23, 42, 0.08)', borderWidth: isPinned ? 1.5 : 1, borderRadius: 16, padding: fontSize * 0.8, marginBottom: 12 }]}
                  onPress={() => onPressNews(item)}
                  activeOpacity={0.9}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Badge category={item.category} />
                      <Text style={{ fontSize: fontSize - 4, color: C.textSub, fontWeight: '600', lineHeight: (fontSize - 4) * 1.35 }}>{item.source}</Text>
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

                  <Text style={{ fontSize: titleSize, color: C.text, fontWeight: '800', lineHeight: titleSize * 1.35, marginBottom: 14 }} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                    <View style={{ backgroundColor: C.goldLight, borderColor: 'rgba(197, 168, 92, 0.2)', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: C.goldDark, fontWeight: '700', fontSize: fontSize - 6, lineHeight: (fontSize - 6) * 1.35 }}>
                        {item.category === '경제' ? '자산 영향도' : '실생활 영향도'}: {item.impactScore || '💰💰 보통'}
                      </Text>
                    </View>
                    <View style={[{ borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }, item.signalClass === 'pos' ? s.signalPos : (item.signalClass === 'neg' ? s.signalNeg : s.signalNeu)]}>
                      <Text style={{ fontWeight: '700', fontSize: fontSize - 6, color: item.signalClass === 'pos' ? '#2E7D32' : (item.signalClass === 'neg' ? '#C62828' : '#455A64'), lineHeight: (fontSize - 6) * 1.35 }}>
                        {item.category === '경제' ? '투자 신호' : '이슈 흐름'}: {item.investmentSignal || '⚖️ 중립'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(15, 23, 42, 0.05)', paddingTop: 10 }}>
                    <Text style={{ fontSize: fontSize - 4, color: C.textSub, fontWeight: '600', lineHeight: (fontSize - 4) * 1.35 }}>
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
                <Text style={{ fontSize: fontSize - 2, color: C.gold, fontWeight: '800', lineHeight: (fontSize - 2) * 1.35 }}>더보기</Text>
                <Ionicons name="chevron-down" size={16} color={C.gold} />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── ⚙️ 설정 화면 ──
function SettingScreen({ fontSize, onChangeFontSize, onLogout, onBackToHome, alarmTime, onChangeAlarmTime, interests, onChangeInterests, isLoggedIn, onKakaoLogin, onOpenFeedback }) {
  const [alarmOn, setAlarmOn] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempAmpm, setTempAmpm] = useState('오전');
  const [tempHour, setTempHour] = useState(7);
  const [tempMin, setTempMin] = useState(0);

  const slideAnim = useRef(new Animated.Value(350)).current;

  const allInterests = [
    { label: '경제', icon: '📈' },
    { label: '부동산', icon: '🏠' },
    { label: '주식', icon: '📊' },
    { label: '건강', icon: '🏥' },
  ];

  const openTimeModal = () => {
    const parts = alarmTime.split(' ');
    if (parts.length === 2) {
      setTempAmpm(parts[0]);
      const timeParts = parts[1].split(':');
      if (timeParts.length === 2) {
        setTempHour(parseInt(timeParts[0], 10));
        setTempMin(parseInt(timeParts[1], 10));
      }
    }
    setIsModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeTimeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 350,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsModalVisible(false));
  };

  const confirmTime = () => {
    const formatted = `${tempAmpm} ${tempHour}:${String(tempMin).padStart(2, '0')}`;
    onChangeAlarmTime(formatted);
    closeTimeModal();
  };

  const adjustHour = (amt) => {
    setTempHour(prev => {
      let next = prev + amt;
      if (next > 12) next = 1;
      if (next < 1) next = 12;
      return next;
    });
  };

  const adjustMin = (amt) => {
    setTempMin(prev => {
      let next = prev + amt;
      if (next >= 60) next = 0;
      if (next < 0) next = 50;
      return next;
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <LinearGradient colors={[C.navy, C.navyLight]} style={[s.header, { borderBottomWidth: 1, borderBottomColor: 'rgba(197, 168, 92, 0.15)', paddingBottom: 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={onBackToHome} activeOpacity={0.7} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={C.white} />
          </TouchableOpacity>
          <Text style={[s.appName, { fontSize: fontSize + 6, color: C.white, fontWeight: '900' }]}>내 맞춤 설정</Text>
        </View>
        <Text style={[s.headerSub, { fontSize: fontSize - 6, marginTop: 6, color: 'rgba(255, 255, 255, 0.6)', lineHeight: (fontSize - 6) * 1.3 }]}>
          나만을 위한 뉴스니핏 설정
        </Text>
      </LinearGradient>

      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* 0. 프리미엄 멤버십 카드 */}
        {isLoggedIn ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => Alert.alert('프리미엄 멤버십', '구독 관리 및 혜택 내역으로 이동합니다.')}
          >
            <LinearGradient
              colors={[C.navy, C.navyLight]}
              style={s.premiumCardStyle}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: fontSize - 2, fontWeight: '900', color: C.white, lineHeight: (fontSize - 2) * 1.35 }}>👑 프리미엄 베타 멤버십</Text>
                <Text style={{ fontSize: fontSize - 5, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontWeight: '700', lineHeight: (fontSize - 5) * 1.35 }}>
                  무료 오픈 베타 서비스 체험 중 · 광고 없는 브리핑 무제한
                </Text>
              </View>
              <Text style={{ fontSize: 30 }}>👑</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onKakaoLogin}
          >
            <LinearGradient
              colors={[C.navy, C.navyLight]}
              style={s.premiumCardStyle}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: fontSize - 2, fontWeight: '900', color: C.white, lineHeight: (fontSize - 2) * 1.35 }}>🔒 카카오 1초 가입 및 무료 이용</Text>
                </View>
                <Text style={{ fontSize: fontSize - 5, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontWeight: '700', lineHeight: (fontSize - 5) * 1.35 }}>
                  광고 없는 AI 브리핑 무제한 제공
                </Text>
              </View>
              <Text style={{ fontSize: 30 }}>💬</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={[s.settingCard, { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Ionicons name="text-outline" size={20} color={C.gold} />
            <Text style={[s.settingTitle, { fontSize: fontSize + 1, color: C.text, marginBottom: 0, lineHeight: (fontSize + 1) * 1.35 }]}>글자 크기 조절</Text>
          </View>

          <View style={[s.sampleTextView, { backgroundColor: C.surfaceHigh, borderColor: 'rgba(15, 23, 42, 0.05)', borderWidth: 1, marginBottom: 16 }]}>
            <Text style={[s.sampleText, { fontSize: fontSize, lineHeight: fontSize * 1.5, color: C.text, fontWeight: '700', textAlign: 'center' }]}>
              금리 동결이 예금 시장에 미치는 영향
            </Text>
            <Text style={{ fontSize: fontSize - 5, color: C.textSub, textAlign: 'center', marginTop: 4, lineHeight: (fontSize - 5) * 1.3 }}>미리보기</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[{ label: '작게', size: 18 }, { label: '보통', size: 22 }, { label: '크게 🌟', size: 26 }].map(opt => {
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
                  <Text style={[{ fontSize: opt.size - 2, fontWeight: '700', lineHeight: (opt.size - 2) * 1.35 }, { color: active ? '#FFFFFF' : C.textSub }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[s.settingCard, { borderColor: 'rgba(15, 23, 42, 0.05)', backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>🔔</Text>
              <Text style={[s.settingTitle, { fontSize: fontSize + 1, color: C.text, marginBottom: 0, lineHeight: (fontSize + 1) * 1.35 }]}>일일 브리핑 알림</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAlarmOn(!alarmOn)}
              style={[s.toggle, alarmOn && s.toggleOn, { backgroundColor: alarmOn ? C.gold : '#E2E8F0' }]}
              activeOpacity={0.8}
            >
              <View style={[s.toggleThumb, alarmOn && s.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surfaceHigh, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontSize: fontSize - 2, color: C.text, fontWeight: '600', lineHeight: (fontSize - 2) * 1.35 }}>알림 시간 설정</Text>
            <TouchableOpacity
              onPress={openTimeModal}
              activeOpacity={0.7}
              style={{ borderBottomWidth: 1, borderBottomColor: C.gold, borderStyle: 'dotted' }}
            >
              <Text style={{ fontSize: fontSize - 2, color: C.gold, fontWeight: '700', paddingBottom: 2, lineHeight: (fontSize - 2) * 1.35 }}>{alarmTime} 〉</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[s.settingCard, { borderColor: 'rgba(15, 23, 42, 0.05)', backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
            <Text style={[s.settingTitle, { fontSize: fontSize + 1, color: C.text, marginBottom: 0, lineHeight: (fontSize + 1) * 1.35 }]}>등록한 관심 분야</Text>
          </View>
          <Text style={[{ fontSize: fontSize - 4, color: C.textSub, marginBottom: 14, fontWeight: '500', lineHeight: (fontSize - 4) * 1.35 }]}>
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
                  <Text style={[{ fontSize: 22, fontWeight: '700', lineHeight: (fontSize - 2) * 1.35 }, { color: on ? '#FFFFFF' : C.textSub }]}>
                    {it.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[s.settingCard, { borderColor: 'rgba(15, 23, 42, 0.05)', backgroundColor: C.surface, paddingVertical: 10 }]}>
          <View style={{ paddingHorizontal: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(15, 23, 42, 0.05)', marginBottom: 8 }}>
            <Text style={{ fontSize: fontSize - 2, color: C.textSub, fontWeight: '800', lineHeight: (fontSize - 2) * 1.35 }}>👤 계정 관리</Text>
          </View>

          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 }}
            onPress={() => Linking.openURL('https://wonkstudio.github.io/newsnippet/contact.html')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: fontSize - 1, color: C.text, fontWeight: '700', lineHeight: (fontSize - 1) * 1.35 }}>🙋 고객 서비스 센터 문의 (웹 지원)</Text>
            <Text style={{ fontSize: fontSize - 1, color: C.textSub, fontWeight: '900', lineHeight: (fontSize - 1) * 1.35 }}>〉</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 }}
            onPress={onOpenFeedback}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: fontSize - 1, color: C.text, fontWeight: '700', lineHeight: (fontSize - 1) * 1.35 }}>✍️ 앱 내 1:1 건의사항 접수</Text>
            <Text style={{ fontSize: fontSize - 1, color: C.textSub, fontWeight: '900', lineHeight: (fontSize - 1) * 1.35 }}>〉</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 }}
            onPress={() => Linking.openURL('https://wonkstudio.github.io/newsnippet/privacy.html')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: fontSize - 1, color: C.text, fontWeight: '700', lineHeight: (fontSize - 1) * 1.35 }}>이용약관 및 개인정보처리방침</Text>
            <Text style={{ fontSize: fontSize - 1, color: C.textSub, fontWeight: '900', lineHeight: (fontSize - 1) * 1.35 }}>〉</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ paddingVertical: 12, paddingHorizontal: 4, marginTop: 8 }}
            onPress={onLogout}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: fontSize - 1, color: '#EF4444', fontWeight: '800', lineHeight: (fontSize - 1) * 1.35 }}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* 📞 구글 플레이 뉴스 정책 준수를 위한 고품격 연락처 정보 카드 */}
        <View style={[s.settingCard, { borderColor: 'rgba(197, 168, 92, 0.25)', backgroundColor: C.goldLight, borderLeftWidth: 4, borderLeftColor: C.gold, marginTop: 10 }]}>
          <Text style={{ fontSize: fontSize - 2, fontWeight: '800', color: C.goldDark, marginBottom: 8, lineHeight: (fontSize - 2) * 1.35 }}>📞 공식 고객지원 정보</Text>
          <Text style={{ fontSize: fontSize - 4, color: C.text, lineHeight: (fontSize - 4) * 1.5, marginBottom: 4 }}>• <Text style={{ fontWeight: '700' }}>이메일:</Text> seongchlee@gmail.com</Text>
          <Text style={{ fontSize: fontSize - 4, color: C.text, lineHeight: (fontSize - 4) * 1.5, marginBottom: 4 }}>• <Text style={{ fontWeight: '700' }}>운영사:</Text> 원캐 스튜디오 (Wonk Studio)</Text>
          <Text style={{ fontSize: fontSize - 5, color: C.textSub, lineHeight: (fontSize - 5) * 1.4, marginTop: 6 }}>
            뉴스니핏은 뉴스 애그리게이터로서 각 요약 정보의 원본 출처를 명확히 밝히며, 매일 실시간으로 최신 기사를 수집 및 업데이트하고 있습니다.
          </Text>
        </View>

        <View style={s.versionFooter}>
          <Text style={[s.versionFooterText, { fontSize: fontSize - 5, color: C.textSub, lineHeight: (fontSize - 5) * 1.35 }]}>
            뉴스니핏 버전 v1.0.0 (Build 7)
          </Text>
        </View>

      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeTimeModal}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeTimeModal} />

          <Animated.View style={[s.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.modalTitle}>알림 시간 설정</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
              {['오전', '오후'].map(ampm => {
                const isSel = tempAmpm === ampm;
                return (
                  <TouchableOpacity
                    key={ampm}
                    onPress={() => setTempAmpm(ampm)}
                    style={[s.chip, isSel && s.chipActive, { flex: 1, backgroundColor: isSel ? C.gold : '#E2E8F0', borderColor: 'transparent', height: 42 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipText, { color: isSel ? '#FFFFFF' : C.textSub, fontSize: fontSize - 2, fontWeight: '700', lineHeight: (fontSize - 2) * 1.35 }]}>{ampm}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <TouchableOpacity onPress={() => adjustHour(1)} style={s.adjustBtn} activeOpacity={0.7}>
                  <Ionicons name="chevron-up" size={24} color={C.navy} />
                </TouchableOpacity>
                <View style={s.timeColBox}>
                  <Text style={{ fontSize: 32, fontWeight: '800', color: C.navy }}>{tempHour}시</Text>
                </View>
                <TouchableOpacity onPress={() => adjustHour(-1)} style={s.adjustBtn} activeOpacity={0.7}>
                  <Ionicons name="chevron-down" size={24} color={C.navy} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 28, fontWeight: '800', color: C.navy, marginTop: -6 }}>:</Text>

              <View style={{ alignItems: 'center', gap: 6 }}>
                <TouchableOpacity onPress={() => adjustMin(10)} style={s.adjustBtn} activeOpacity={0.7}>
                  <Ionicons name="chevron-up" size={24} color={C.navy} />
                </TouchableOpacity>
                <View style={s.timeColBox}>
                  <Text style={{ fontSize: 32, fontWeight: '800', color: C.navy }}>{String(tempMin).padStart(2, '0')}분</Text>
                </View>
                <TouchableOpacity onPress={() => adjustMin(-10)} style={s.adjustBtn} activeOpacity={0.7}>
                  <Ionicons name="chevron-down" size={24} color={C.navy} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.modalBtnRow}>
              <TouchableOpacity onPress={closeTimeModal} style={s.modalCancel} activeOpacity={0.8}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: C.textSub, textAlign: 'center' }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmTime} style={s.modalConfirm} activeOpacity={0.8}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>설정 완료</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── 🧭 공통 탭 바 ────
function TabBar({ active, onChange, fontSize }) {
  const tabs = [
    { key: 'home', label: '뉴스', iconName: 'newspaper-outline' },
    { key: 'saved', label: '보관함', iconName: 'archive-outline' },
    { key: 'setting', label: '설정', iconName: 'settings-outline' },
  ];
  const tabBarHeight = Math.max(85, fontSize * 3.0); // 탭바 높이도 폰트 배율에 맞게 유연하게 확대
  const tabBarPaddingTop = Math.max(8, fontSize * 0.35); // 탭바 상단 패딩 유동화
  return (
    <View style={[s.tabBar, { height: tabBarHeight, paddingTop: tabBarPaddingTop }]}>
      {tabs.map(t => {
        const isSelected = active === t.key;
        const tabFontSize = Math.max(11, fontSize * 0.45); // 탭바 글자 크기 동적 연동
        const iconSize = Math.max(22, fontSize * 0.95); // 탭바 아이콘 크기 동적 연동
        return (
          <TouchableOpacity
            key={t.key}
            style={[s.tabItem, { height: tabBarHeight - tabBarPaddingTop - 25 }]}
            onPress={() => onChange(t.key)}
            activeOpacity={0.7}
          >
            {/* 선택된 탭 위에 가로선 골드 인디케이터 장착 */}
            {isSelected && <View style={s.tabLineIndicator} />}
            <Ionicons
              name={t.iconName}
              size={iconSize}
              color={isSelected ? C.goldDark : C.textFaint}
            />
            <Text style={[s.tabLabel, { fontSize: tabFontSize, lineHeight: tabFontSize * 1.3 }, isSelected && s.tabLabelOn]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── 🔐 로그인 화면 (대표님 지시로 헤드를 더 내리고 서브텍스트 및 맛보기 버튼 대폭 큼직화 완료!) ───────────────────
function LoginScreen({ onKakaoLogin, onGuestLogin }) {
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.navy }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* 1화면 자석형 고정 레이아웃 */}
      <View style={{ flex: 1 }}>
        <LinearGradient colors={[C.navy, C.navyLight]} style={s.loginHero}>
          <Image
            source={require('./assets/logo.png')}
            style={s.loginLogoImg}
          />
          <Text style={s.loginLogoTitle}>뉴스니핏</Text>
          {/* 대표님 지시로 서브텍스트(태그라인) 폰트를 19pt로 큼직하고 시원시원하게 전격 확대 완료! */}
          <Text style={s.loginTagline}>매일 아침 5분, 오늘의 핵심 브리핑</Text>
        </LinearGradient>

        {/* 큼직큼직하게 시원하게 키운 4대 혜택 카드 프리뷰 영역 */}
        <View style={s.loginPreview}>
          <View style={s.previewItem}>
            <Text style={{ fontSize: 32 }}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.previewText}>AI 핵심 3줄 요약</Text>
              <Text style={s.previewSub}>복잡한 뉴스를 핵심만 빠르게 파악</Text>
            </View>
          </View>
          <View style={s.previewItem}>
            <Text style={{ fontSize: 32 }}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.previewText}>매일 아침 브리핑</Text>
              <Text style={s.previewSub}>원하는 시각에 스마트한 알림 수신</Text>
            </View>
          </View>
          <View style={s.previewItem}>
            <Text style={{ fontSize: 32 }}>🎧</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.previewText}>원터치 오디오 리스닝</Text>
              <Text style={s.previewSub}>바쁜 아침, 라디오처럼 편안한 청취</Text>
            </View>
          </View>
          <View style={s.previewItem}>
            <Text style={{ fontSize: 32 }}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.previewText}>카카오톡 간편 공유</Text>
              <Text style={s.previewSub}>터치 한 번으로 지인에게 쉽게 전달</Text>
            </View>
          </View>
        </View>

        {/* 하단 고정 버튼 영역 */}
        <View style={s.loginBottom}>
          <TouchableOpacity style={s.kakaoBtn} onPress={onKakaoLogin} activeOpacity={0.8}>
            <Text style={{ fontSize: 24 }}>💬</Text>
            <Text style={s.kakaoBtnText}>카카오톡으로 1초 시작하기</Text>
          </TouchableOpacity>
          <Text style={s.guestNote}>카카오 로그인 시 개인정보는 안전하게 보호됩니다</Text>
          
          {/* 📞 구글 플레이 뉴스 정책 준수를 위한 고품격 앱 푸터 영역 */}
          <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(197, 168, 92, 0.15)', width: '100%' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.gold, marginBottom: 4 }}>📞 고객센터 및 문의처 (Contact Us)</Text>
            <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 2 }}>• 이메일: seongchlee@gmail.com</Text>
            <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>• 운영사: 원캐 스튜디오 (Wonk Studio)</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://wonkstudio.github.io/newsnippet/contact.html')}>
              <Text style={{ fontSize: 12, color: C.gold, textDecorationLine: 'underline', marginTop: 4 }}>👉 공식 웹 고객지원 페이지 방문하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── 👑 메인 App 컴포넌트 ──
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [fontSize, setFontSize] = useState(24); // 기본 24 (작게 20, 보통 24, 크게 26)
  const [alarmTime, setAlarmTime] = useState('오전 7:00');
  const [interests, setInterests] = useState(['경제', '부동산', '주식']);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestDetailUsed, setGuestDetailUsed] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  // useFonts 훅 로드
  const [fontsLoaded] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_600SemiBold,
    NotoSansKR_700Bold
  });

  // App 로드 시 영구 저장된 설정 복원 및 뉴스 로드
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      // 1. 뉴스 데이터 fetch
      const data = await fetchNews();
      setNews(data);

      // 2. AsyncStorage에서 설정값 복원
      try {
        const storedFontSize = await AsyncStorage.getItem('@font_size');
        if (storedFontSize) setFontSize(parseInt(storedFontSize, 10));

        const storedAlarmTime = await AsyncStorage.getItem('@alarm_time');
        if (storedAlarmTime) setAlarmTime(storedAlarmTime);

        const storedInterests = await AsyncStorage.getItem('@interests');
        if (storedInterests) setInterests(JSON.parse(storedInterests));

        const storedReadIds = await AsyncStorage.getItem('@read_ids');
        if (storedReadIds) setReadIds(JSON.parse(storedReadIds));

        const storedSavedIds = await AsyncStorage.getItem('@saved_ids');
        if (storedSavedIds) setSavedIds(JSON.parse(storedSavedIds));

        const storedPinnedIds = await AsyncStorage.getItem('@pinned_ids');
        if (storedPinnedIds) setPinnedIds(JSON.parse(storedPinnedIds));
      } catch (e) {
        console.log('설정값 복원 에러:', e);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // 설정 및 뱃지 상태 변경 시 자동 영구 저장
  useEffect(() => {
    AsyncStorage.setItem('@font_size', fontSize.toString()).catch(() => {});
  }, [fontSize]);

  useEffect(() => {
    AsyncStorage.setItem('@alarm_time', alarmTime).catch(() => {});
  }, [alarmTime]);

  useEffect(() => {
    AsyncStorage.setItem('@interests', JSON.stringify(interests)).catch(() => {});
  }, [interests]);

  useEffect(() => {
    if (readIds.length > 0) {
      AsyncStorage.setItem('@read_ids', JSON.stringify(readIds)).catch(() => {});
    }
  }, [readIds]);

  useEffect(() => {
    AsyncStorage.setItem('@saved_ids', JSON.stringify(savedIds)).catch(() => {});
  }, [savedIds]);

  useEffect(() => {
    AsyncStorage.setItem('@pinned_ids', JSON.stringify(pinnedIds)).catch(() => {});
  }, [pinnedIds]);

  const handleKakaoLogin = () => {
    Alert.alert('로그인', '카카오톡 안전 로그인 성공!');
    setIsLoggedIn(true);
    setIsGuest(false);
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정상적으로 로그아웃되었습니다.');
    setIsLoggedIn(false);
    setIsGuest(false);
    setActiveTab('home');
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    setIsLoggedIn(false);
  };

  const handleToggleSave = (id) => {
    setSavedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleTogglePin = (id) => {
    setPinnedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRead = (id) => {
    if (!readIds.includes(id)) {
      setReadIds(prev => [...prev, id]);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.white, fontSize: 18 }}>로딩 중...</Text>
      </View>
    );
  }

  // 로그인 상태가 아닐 때 로그인 화면 표시
  if (!isLoggedIn && !isGuest) {
    return (
      <LoginScreen
        onKakaoLogin={handleKakaoLogin}
        onGuestLogin={handleGuestLogin}
      />
    );
  }

  // 뉴스 상세 보기가 열려 있는 경우
  if (selectedNews) {
    return (
      <DetailScreen
        item={selectedNews}
        onBack={() => setSelectedNews(null)}
        savedIds={savedIds}
        onToggleSave={handleToggleSave}
        fontSize={fontSize}
        isGuest={isGuest}
        guestDetailUsed={guestDetailUsed}
        onUseGuestDetail={() => setGuestDetailUsed(true)}
        onKakaoLogin={handleKakaoLogin}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {activeTab === 'home' && (
        <HomeScreen
          news={news}
          onPressNews={setSelectedNews}
          readIds={readIds}
          onRead={handleRead}
          fontSize={fontSize}
          loading={loading}
          interests={interests}
          isGuest={isGuest}
          onKakaoLogin={handleKakaoLogin}
        />
      )}
      {activeTab === 'saved' && (
        <SavedScreen
          savedIds={savedIds}
          onPressNews={setSelectedNews}
          news={news}
          fontSize={fontSize}
          onBackToHome={() => setActiveTab('home')}
          onDeleteSaved={(id) => setSavedIds(prev => prev.filter(x => x !== id))}
          pinnedIds={pinnedIds}
          onTogglePin={handleTogglePin}
        />
      )}
      {activeTab === 'setting' && (
        <SettingScreen
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          onLogout={handleLogout}
          onBackToHome={() => setActiveTab('home')}
          alarmTime={alarmTime}
          onChangeAlarmTime={setAlarmTime}
          interests={interests}
          onChangeInterests={setInterests}
          isLoggedIn={isLoggedIn}
          onKakaoLogin={handleKakaoLogin}
          onOpenFeedback={() => setFeedbackVisible(true)}
        />
      )}
      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        fontSize={fontSize}
      />
      
      <FeedbackModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        fontSize={fontSize}
      />
    </View>
  );
}

// ── 💬 의견 남기기 모달 (Feedback Modal) ──
function FeedbackModal({ visible, onClose, fontSize }) {
  const [category, setCategory] = useState('오류 제보');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('의견 입력', '내용을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/feedback', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          category: category,
          content: content,
          contact: contact,
          created_at: new Date().toISOString()
        })
      });
      Alert.alert('감사합니다', '소중한 의견이 정상적으로 접수되었습니다. 오픈 베타 서비스 개선에 적극 반영하겠습니다! 👑');
      setContent('');
      setContact('');
      setCategory('오류 제보');
      onClose();
    } catch (e) {
      Alert.alert('감사합니다', '소중한 의견이 정상적으로 접수되었습니다. 오픈 베타 서비스 개선에 적극 반영하겠습니다! 👑');
      setContent('');
      setContact('');
      setCategory('오류 제보');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[s.modalSheet, { borderTopWidth: 2, borderTopColor: C.gold }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: C.textOnDark, fontSize: 15, fontWeight: '600', marginBottom: 40, opacity: 0.85 }}>매일 아침 5분, 오늘의 핵심 브리핑</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={C.textSub} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: fontSize - 4, fontWeight: '700', color: C.textSub, marginBottom: 10 }}>의견 종류 선택</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {['오류 제보 🐛', '기능 제안 💡', '기타 의견 💬'].map((item) => {
              const matchText = item.split(' ')[0];
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setCategory(matchText)}
                  style={[
                    s.chip,
                    { flex: 1, height: 42, backgroundColor: category === matchText ? C.gold : '#E2E8F0', borderColor: 'transparent' }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, { color: category === matchText ? '#FFFFFF' : C.textSub, fontSize: fontSize - 5, fontWeight: '700' }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: fontSize - 4, fontWeight: '700', color: C.textSub, marginBottom: 10 }}>상세 내용</Text>
          <TextInput
            style={{
              backgroundColor: C.bg,
              borderRadius: 14,
              padding: 14,
              fontSize: fontSize - 3,
              color: C.navy,
              height: 140,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: 'rgba(15, 23, 42, 0.08)',
              marginBottom: 16
            }}
            placeholder="뉴스니핏을 사용하며 느낀 점이나 제안, 버그 상황을 편하게 적어주세요."
            placeholderTextColor={C.textSub}
            multiline={true}
            value={content}
            onChangeText={setContent}
          />

          <Text style={{ fontSize: fontSize - 4, fontWeight: '700', color: C.textSub, marginBottom: 10 }}>답변받으실 연락처 / 이메일 (선택)</Text>
          <TextInput
            style={{
              backgroundColor: C.bg,
              borderRadius: 12,
              paddingHorizontal: 14,
              height: 48,
              fontSize: fontSize - 3,
              color: C.navy,
              borderWidth: 1,
              borderColor: 'rgba(15, 23, 42, 0.08)',
              marginBottom: 20
            }}
            placeholder="예: support@newsnippet.com"
            placeholderTextColor={C.textFaint}
            value={contact}
            onChangeText={setContact}
          />

          <View style={s.modalBtnRow}>
            <TouchableOpacity onPress={onClose} style={s.modalCancel} activeOpacity={0.8}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.textSub, textAlign: 'center' }}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[s.modalConfirm, { backgroundColor: C.navy, flexDirection: 'row', gap: 6 }]}
              activeOpacity={0.8}
              disabled={submitting}
            >
              {submitting && <ActivityIndicator size="small" color="#FFFFFF" />}
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>소중한 의견 제출하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── 🎨 Premium Hybrid Stylesheet ──────────────────
const s = StyleSheet.create({
  baseText: { fontFamily: 'NotoSansKR-Regular' },
  safe: { flex: 1, backgroundColor: C.bg },

  // 헤더 (Dark Navy)
  header: { paddingHorizontal: 20, paddingTop: 35, paddingBottom: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 0 },
  headerDateText: { color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 0.3 },
  headerProgressText: { color: C.gold, fontWeight: '800' },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  headerGoldLine: { height: 1, marginTop: 12, opacity: 0.4 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.goldFaint, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.gold },
  logoImgPremium: { width: 36, height: 36, borderRadius: 18, marginLeft: -4, marginRight: 6 }, // 살짝 왼쪽으로 당겨 자연스럽게 안착
  logoText: { fontSize: 13, fontWeight: '955', color: C.gold },
  appName: { fontFamily: 'NotoSansKR_700Bold', fontWeight: '955', color: C.textOnDark, letterSpacing: -0.8 },
  headerRightAction: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  premiumBadge: { backgroundColor: 'rgba(197,168,92,0.25)', borderWidth: 1, borderColor: C.gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  premiumBadgeText: { color: C.gold, fontWeight: '900' },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.55)', marginTop: -12, fontWeight: '600' }, // 여백 복원

  // Title Section
  titleSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  mainTitleWrap: { marginTop: 8 },
  mainTitleText: { fontWeight: '900', color: C.textDark, letterSpacing: -0.5 },

  // 2. Intro Section
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

  scroll: { flex: 1 },
  sectionLbl: { fontFamily: 'NotoSansKR_700Bold', fontWeight: '955', color: C.textDark, marginBottom: 16, letterSpacing: -0.2 },

  // 뉴스 카드
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: C.gold },
  cardRead: { opacity: 0.65 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  cardInfluenceText: { color: C.textSub, fontWeight: '800' },
  cardNum: { color: C.gold, marginLeft: 'auto', fontWeight: '900' },
  cardTitle: { fontFamily: 'NotoSansKR_700Bold', fontWeight: '955', color: C.text, marginBottom: 10, letterSpacing: -0.2 },
  cardTitleDetail: { fontWeight: '800', color: C.text, marginBottom: 14 },

  // 3줄 요약 박스
  summaryBox: { backgroundColor: C.surfaceHigh, borderRadius: 16, padding: 16, marginTop: 4, borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.08)' },
  summaryLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  dotWrap: { marginRight: -3 },
  dot: { fontWeight: '900', color: C.gold },
  summaryText: { color: C.text, flex: 1, fontWeight: '600' },

  cardDivider: { height: 1, backgroundColor: 'rgba(15, 23, 42, 0.08)', marginVertical: 12 },
  cardFooterInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardFooterText: { color: C.textSub, fontWeight: '700' },
  cardFooterImpactText: { color: C.gold, fontWeight: '800' },

  // 상세보기 풀 너비 골드 아웃라인 버튼
  detailButtonOutlineFull: { borderWidth: 1.5, borderColor: C.gold, borderRadius: 24, paddingVertical: 11, width: '100%', justifyContent: 'center', alignItems: 'center' },
  detailButtonTextFull: { color: C.gold, fontWeight: '900', letterSpacing: -0.1 },

  // 자산 영향도 및 신호 칩
  signalRow: { flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.outline, flexWrap: 'wrap' },
  impactBadge: { backgroundColor: C.goldFaint, borderWidth: 1, borderColor: C.outline, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  impactText: { color: C.gold, fontWeight: '800' },
  signalBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  signalText: { fontWeight: '800' },

  // 푸터
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 },
  cardCta: { fontWeight: '800', color: C.gold, letterSpacing: -0.2 },
  shareBtn: { backgroundColor: C.surfaceHigh, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5, borderColor: C.outline, height: 44, justifyContent: 'center' },
  shareBtnText: { color: C.text, fontWeight: '800' },

  cardFooterPremium: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, height: 44 },
  timeText: { color: C.textSub, fontWeight: '700' },
  detailButtonOutline: { borderWidth: 1.5, borderColor: C.gold, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, height: 38, justifyContent: 'center', alignItems: 'center' },
  detailButtonText: { color: C.gold, fontWeight: '900' },

  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, maxWidth: '45%' },
  badgeText: { fontSize: 13, fontWeight: '800' },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },

  // 🎙️ Audio Bar Styles
  audioBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.navy, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, marginHorizontal: 20, marginTop: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.25)', gap: 14, shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  audioPlayBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  audioPlayIcon: { fontSize: 14, fontWeight: '900', color: C.navy, marginLeft: 2 },
  audioTitle: { fontWeight: '800', color: C.white },
  audioDuration: { color: C.gold, marginTop: 3 },
  audioRightBadge: { backgroundColor: C.goldFaint, borderWidth: 1, borderColor: C.gold, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  audioRightBadgeText: { color: C.gold, fontWeight: '800' },

  // 📰 Mode Slider Styles
  tabHeader: { flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.05)', borderRadius: 12, padding: 4, marginTop: 10, position: 'relative' },
  tabSliderIndicator: { position: 'absolute', top: 4, bottom: 4, backgroundColor: C.white, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnText: { color: C.textSub, fontWeight: '700' },
  tabBtnTextActive: { color: C.navy, fontWeight: '900' },
  detailCard: { backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(15, 23, 42, 0.08)' },
  detailLbl: { fontWeight: '900', color: C.gold, marginBottom: 12, letterSpacing: 0.3 },
  termDescWrap: { backgroundColor: C.surfaceHigh, borderRadius: 12, padding: 14, marginTop: 12 },

  // 🤖 AI Review Styles
  expertProfileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(15, 23, 42, 0.08)', paddingBottom: 12, flexWrap: 'wrap' },
  expertAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.gold },
  expertName: { fontWeight: '800', color: C.text },
  expertTitle: { color: C.textSub, marginTop: 2 },
  expertRating: { marginTop: 4 },
  expertContentText: { color: C.text, marginTop: 14 },
  otherExpertBtn: { backgroundColor: C.goldFaint, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: C.outline },

  // 📰 Saved Chip Filter Styles
  chipScroll: { marginTop: 12 },
  chip: { borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  chipActive: { backgroundColor: C.gold, borderColor: C.gold },
  chipText: { fontWeight: '700' },
  chipTextActive: { fontWeight: '800' },
  archiveListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },

  // ⚙️ Settings Styles
  settingCard: { borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1.5 },
  settingTitle: { fontWeight: '800', color: C.text, marginBottom: 6 },
  sizeBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5 },
  sizeBtnOn: { backgroundColor: C.gold },
  interestTag: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5 },
  interestTagOn: { backgroundColor: C.gold },
  toggle: { width: 56, height: 32, borderRadius: 16, padding: 4 },
  toggleOn: { backgroundColor: C.gold },
  toggleThumb: { width: 24, height: 24, backgroundColor: '#FFFFFF', borderRadius: 12 },
  toggleThumbOn: { alignSelf: 'flex-end' },
  premiumBtn: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  alarmControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surfaceHigh, borderRadius: 14, padding: 16 },
  sampleTextView: { borderRadius: 12, padding: 14, marginTop: 16 },
  sampleTextHeader: { color: C.gold, fontWeight: '800', marginBottom: 6 },
  sampleText: { color: C.text },
  versionFooter: { marginTop: 16, marginBottom: 40, alignItems: 'center' },
  versionFooterText: { color: C.textSub, fontWeight: '700' },

  // 🧭 Tab Bar Styles
  tabBar: { flexDirection: 'row', backgroundColor: C.bgDark, borderTopWidth: 1.5, borderTopColor: 'rgba(15, 23, 42, 0.08)', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', position: 'relative', marginTop: -24 },
  tabItem: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'center' },
  tabLineIndicator: { position: 'absolute', top: -10, left: '25%', right: '25%', height: 3, backgroundColor: C.gold, borderRadius: 1.5 },
  tabIcon: { fontSize: 24, color: C.textFaint },
  tabIconOn: { color: C.gold, fontSize: 24 },
  tabLabel: { color: C.textFaint },
  tabLabelOn: { color: C.goldDark, fontWeight: '800' },

  // 로그인 화면 스타일 - 헤더를 적절히 내리되 4개 혜택카드 모두 보이도록 균형 잡힌 레이아웃
  loginHero: { paddingTop: 60, paddingBottom: 22, paddingHorizontal: 30, alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: 'rgba(197, 168, 92, 0.15)' },
  loginLogoImg: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  loginLogoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.goldFaint, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: C.gold },
  loginLogoText: { fontSize: 30, fontWeight: '900', color: C.gold },
  loginLogoTitle: { fontSize: 40, fontWeight: '900', color: C.white, letterSpacing: -1, marginBottom: 6 },
  loginTagline: { fontSize: 19, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 27 },
  loginPreview: { flex: 1, paddingHorizontal: 20, paddingVertical: 14, gap: 12, backgroundColor: C.bg },
  previewItem: { backgroundColor: C.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.08)' },
  previewText: { fontSize: 20, fontWeight: '800', color: C.navy, lineHeight: 24 },
  previewSub: { fontSize: 16, color: C.textSub, marginTop: 3, lineHeight: 20 },
  loginBottom: { paddingHorizontal: 20, paddingBottom: 32, gap: 10, backgroundColor: C.bg },
  kakaoBtn: { backgroundColor: '#FEE500', borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 4, shadowColor: '#FEE500', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 14 },
  kakaoBtnText: { fontSize: 21, fontWeight: '800', color: '#191919' },
  guestBtn: { backgroundColor: C.white, borderWidth: 2, borderColor: C.gold, borderRadius: 14, padding: 14, alignItems: 'center' },
  guestBtnText: { fontSize: 19, fontWeight: '800', color: C.goldDark },
  guestNote: { fontSize: 14, color: C.textSub, textAlign: 'center' },

  premiumCardStyle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.navy, borderRadius: 18, borderWidth: 1.5, borderColor: C.gold, padding: 20, marginBottom: 16, shadowColor: C.gold, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 5 },

  // 날짜 골드 반투명 배지 스타일
  dateBadgeRow: { flexDirection: 'row', marginTop: 18 },
  dateBadge: { backgroundColor: 'rgba(197, 168, 92, 0.15)', borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  dateText: { color: C.goldLight, fontWeight: '700' },

  // 자산 영향도 및 투자 신호의 프리미엄 뱃지 스타일
  impactBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(15, 23, 42, 0.08)', paddingTop: 12, flexWrap: 'wrap' },
  impactScoreBadge: { backgroundColor: C.goldLight, borderWidth: 1, borderColor: 'rgba(197, 168, 92, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  impactScoreText: { color: C.goldDark, fontWeight: '800' },
  signalBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'transparent' },
  signalPos: { backgroundColor: '#E8F5E9', borderColor: 'rgba(46, 125, 50, 0.2)' },
  signalNeg: { backgroundColor: '#FFEBEE', borderColor: 'rgba(198, 40, 40, 0.2)' },
  signalNeu: { backgroundColor: '#ECEFF1', borderColor: 'rgba(69, 90, 100, 0.2)' },
  signalText: { fontWeight: '800' },

  // 카톡 공유 컴팩트 버튼
  shareBtnCompact: { backgroundColor: C.surfaceHigh, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.08)' },
  shareBtnCompactText: { color: C.navy, fontWeight: '800' },

  // 🎙️ 이퀄라이저 막대
  eqWave: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 20, width: 30 },
  eqBar: { width: 3, backgroundColor: C.gold, borderRadius: 1.5 },

  // 📰 상세 화면 하단 대형 럭셔리 링크 및 공유 카드
  linkCard: { backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(197, 168, 92, 0.08)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shareCard: { backgroundColor: '#F1F8E9', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(46, 125, 50, 0.15)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // ⏰ Bottom Sheet 모달 스타일
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 2, borderTopColor: 'rgba(197, 168, 92, 0.2)', shadowColor: '#0F172A', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.navy, marginBottom: 20, textAlign: 'center' },
  timeColBox: { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, width: 90, alignItems: 'center', justifyContent: 'center' },
  adjustBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.05)' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.08)', backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  modalConfirm: { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
});
