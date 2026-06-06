import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import { Screen } from '../../navigation/AppNavigator';
import { BottomBar } from './SubscriptionScreen';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 420);

interface CommunityFeedScreenProps {
  navigate: (screen: Screen) => void;
  userName: string;
}

const DEFAULT_FEED_POSTS = [
  { id: '1', user_name: 'Arjun S.', hostel_name: 'BH-3, Room 204', rating: 5, comment: 'Rajma was absolutely perfect today! Just like home. Dal was a bit salty though 😅', likes_yum: 12, likes_good: 8, created_at: '2026-05-28T19:45:00Z' },
  { id: '2', user_name: 'Priya M.', hostel_name: 'GH-1, Room 108', rating: 4, comment: 'Roti was soft and fresh! Delivery was on time too. Overall great experience 🙌', likes_yum: 9, likes_good: 15, created_at: '2026-05-28T19:38:00Z' },
  { id: '3', user_name: 'Rohit K.', hostel_name: 'BH-5, Room 312', rating: 3, comment: 'Dal was okay but I wish there was more sabji. Add-ons are a great feature btw!', likes_yum: 3, likes_good: 6, created_at: '2026-05-28T19:30:00Z' },
  { id: '4', user_name: 'Sneha P.', hostel_name: 'GH-2, Room 205', rating: 5, comment: 'Best tiffin service ever! Chole today was restaurant-level quality. 10/10 🤩', likes_yum: 22, likes_good: 18, created_at: '2026-05-28T19:25:00Z' },
  { id: '5', user_name: 'Aditya V.', hostel_name: 'BH-2, Room 112', rating: 4, comment: 'Value for money is unbeatable. ₹90 for this quality? Steal of the century.', likes_yum: 7, likes_good: 19, created_at: '2026-05-28T19:20:00Z' },
];

// ── Right Slider Panel ──────────────────────────────────────────────────────
const RightSliderPanel: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  emoji: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, emoji, children }) => {
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: PANEL_WIDTH, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sliding Panel */}
      <Animated.View style={[styles.sliderPanel, { transform: [{ translateX: slideAnim }] }]}>
        {/* Panel Header */}
        <LinearGradient
          colors={['#F97316', '#EF4444']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.sliderHeader}
        >
          <TouchableOpacity onPress={onClose} style={styles.sliderCloseBtn}>
            <Text style={styles.sliderCloseText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.sliderEmoji}>{emoji}</Text>
            <Text style={styles.sliderTitle}>{title}</Text>
          </View>
        </LinearGradient>

        {/* Panel Content */}
        <ScrollView style={styles.sliderBody} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// ── Main Screen ─────────────────────────────────────────────────────────────
export const CommunityFeedScreen: React.FC<CommunityFeedScreenProps> = ({ navigate, userName }) => {
  const [feedPosts, setFeedPosts] = useState<any[]>(DEFAULT_FEED_POSTS);
  const [poll, setPoll] = useState<any>({
    id: 'demo-poll',
    question: "What should be Saturday's Special?",
    option_a: 'Chole Bhature 🍛',
    option_b: 'Paneer Tikka 🧀',
    votes_a: 24,
    votes_b: 18,
  });
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState('');
  const [voted, setVoted] = useState<'a' | 'b' | null>(null);
  const [posted, setPosted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Slider state
  const [showRatePanel, setShowRatePanel] = useState(false);
  const [showVotePanel, setShowVotePanel] = useState(false);

  const isWeekend = new Date().getDay() === 6 || new Date().getDay() === 0;
  const showResults = voted !== null || isWeekend;
  const totalVotes = (poll.votes_a || 0) + (poll.votes_b || 0);
  const pctA = totalVotes > 0 ? Math.round(((poll.votes_a || 0) / totalVotes) * 100) : 50;
  const pctB = totalVotes > 0 ? Math.round(((poll.votes_b || 0) / totalVotes) * 100) : 50;

  useEffect(() => {
    fetchFeed();
    fetchMyRating();
    fetchActivePoll();

    socket.connect();
    const handleNewFeedPost = (data: any) => {
      setFeedPosts(prev => {
        if (prev.some(p => p.id === data.id || p._id === data.id)) return prev;
        return [data, ...prev];
      });
    };
    socket.on('new_feed_post', handleNewFeedPost);

    const handlePollUpdated = (data: any) => {
      setPoll((prev: any) => {
        const currentId = prev?.id || prev?._id;
        const incomingId = data.id || data._id;
        if (prev && String(currentId) === String(incomingId)) {
          return { ...prev, votes_a: data.votes_a, votes_b: data.votes_b, totalVotes: data.totalVotes };
        }
        return prev;
      });
    };
    socket.on('poll_updated', handlePollUpdated);

    const handleNewPollCreated = (data: any) => {
      setPoll(data);
      setVoted(null);
    };
    socket.on('new_poll_created', handleNewPollCreated);

    return () => {
      socket.off('new_feed_post', handleNewFeedPost);
      socket.off('poll_updated', handlePollUpdated);
      socket.off('new_poll_created', handleNewPollCreated);
    };
  }, []);

  const fetchFeed = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/meal/feed');
      if (response.data?.success && response.data?.data) {
        const apiReviews = response.data.data;
        if (apiReviews.length === 0) {
          setFeedPosts(DEFAULT_FEED_POSTS);
        } else {
          const merged = [...apiReviews];
          DEFAULT_FEED_POSTS.forEach(d => {
            if (!merged.some(m => m.comment === d.comment)) merged.push(d);
          });
          setFeedPosts(merged);
        }
      }
    } catch (e) {
      console.error('Error fetching feed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyRating = async () => {
    try {
      const response = await api.get('/meal/my-rating');
      if (response.data?.success && response.data?.hasRated && response.data?.data) {
        setPosted(true);
        setMyRating(response.data.data.rating || 0);
        setMyReview(response.data.data.comment || '');
      }
    } catch (e) { console.error('Error fetching my rating:', e); }
  };

  const fetchActivePoll = async () => {
    try {
      const response = await api.get('/polls/active');
      if (response.data?.success) {
        setPoll(response.data.data);
        if (response.data.data.hasVoted) {
          setVoted(response.data.data.votedOption || 'a');
        }
      }
    } catch (e) { console.error('Error fetching poll:', e); }
  };

  const handleVote = async (option: 'a' | 'b') => {
    if (voted !== null) return;
    setVoted(option);
    const updatedPoll = { ...poll };
    if (option === 'a') updatedPoll.votes_a++;
    else updatedPoll.votes_b++;
    setPoll(updatedPoll);
    try {
      const response = await api.post('/polls/vote', { option });
      if (response.data?.success) setPoll(response.data.data);
    } catch (e) {
      console.error('Error recording vote:', e);
      setVoted(null);
      fetchActivePoll();
    }
  };

  const handlePostReview = async () => {
    if (myRating === 0) return;
    setIsSubmitting(true);
    try {
      const response = await api.post('/meal/rate', { rating: myRating, comment: myReview, mealName: "Today's Meal" });
      if (response.data?.success) {
        setPosted(true);
        setShowRatePanel(false);
        fetchFeed();
      } else throw new Error('Rating response failed');
    } catch (err) {
      const newPost = {
        id: Date.now().toString(), user_name: userName, hostel_name: 'BH-4, Room 102',
        rating: myRating, comment: myReview, likes_yum: 0, likes_good: 0, created_at: new Date().toISOString(),
      };
      setFeedPosts(prev => [newPost, ...prev]);
      setPosted(true);
      setShowRatePanel(false);
    } finally {
      setIsSubmitting(false);
    }

    if (isSupabaseConfigured) {
      try {
        await supabase!.from('community_feed').insert({ user_name: userName, hostel_name: 'BH-4, Room 102', rating: myRating, comment: myReview, likes_yum: 0, likes_good: 0 });
      } catch (e) { console.error('Supabase error:', e); }
    }
  };

  const handleReact = async (postIndex: number, type: 'yum' | 'good') => {
    const updated = [...feedPosts];
    const post = updated[postIndex];
    if (type === 'yum') post.likes_yum = (post.likes_yum || 0) + 1;
    else post.likes_good = (post.likes_good || 0) + 1;
    setFeedPosts(updated);
  };

  const formatTime = (isoString: string) => {
    try { return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return '7:30 PM'; }
  };

  const ratingLabel = ['', 'Bahut bura 😞', 'Theek tha 😐', 'Acha tha 😊', 'Bahut acha! 😄', 'Lajawaab! 🤩'][myRating] || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#F97316', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => navigate('home')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🍱 Hostel Feed</Text>
        <Text style={styles.headerSub}>What your neighbors are saying today</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Live badge */}
        <View style={styles.liveBadgeRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>Connected to Campus Kitchen Server (Real-time)</Text>
        </View>

        {/* ── Action Cards Row ── */}
        <View style={styles.actionRow}>
          {/* Rate Today's Meal Card */}
          <TouchableOpacity
            style={[styles.actionCard, posted && styles.actionCardDone]}
            onPress={() => !posted && setShowRatePanel(true)}
            activeOpacity={posted ? 1 : 0.75}
          >
            <Text style={styles.actionCardEmoji}>{posted ? '✅' : '⭐'}</Text>
            <Text style={styles.actionCardTitle}>{posted ? 'Rated!' : "Rate Today's Meal"}</Text>
            <Text style={styles.actionCardSub}>
              {posted ? `You gave ${myRating}★` : 'Share your experience'}
            </Text>
            {!posted && <Text style={styles.actionCardArrow}>Tap to rate →</Text>}
          </TouchableOpacity>

          {/* Vote This Week Card */}
          <TouchableOpacity
            style={[styles.actionCard, (voted || isWeekend) && styles.actionCardDone]}
            onPress={() => setShowVotePanel(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.actionCardEmoji}>🗳️</Text>
            <Text style={styles.actionCardTitle}>{isWeekend ? "Weekly Vote Results" : "Vote Next Week"}</Text>
            <Text style={styles.actionCardSub}>
              {isWeekend ? `Voting Closed • View Results (${totalVotes} votes)` : voted ? `You voted! (${totalVotes} total)` : 'Pick your favourite dish'}
            </Text>
            {!(voted || isWeekend) && <Text style={styles.actionCardArrow}>Tap to vote →</Text>}
            {(voted || isWeekend) && <Text style={styles.actionCardArrow}>Tap to view results →</Text>}
          </TouchableOpacity>
        </View>

        {/* Feed Posts */}
        <Text style={styles.feedTitle}>📝 Today's Reviews</Text>
        {feedPosts.map((post, idx) => (
          <View key={post.id || idx} style={[styles.feedCard, Shadows.subtle]}>
            <View style={styles.feedHeader}>
              <View style={styles.feedAvatar}>
                <Text style={styles.feedAvatarText}>{(post.user_name || 'S').charAt(0)}</Text>
              </View>
              <View style={styles.feedMeta}>
                <Text style={styles.feedName}>{post.user_name || 'Student'}</Text>
                <Text style={styles.feedHostel}>{post.hostel_name || 'Hostel'} • {formatTime(post.created_at)}</Text>
              </View>
              <View style={styles.feedRating}>
                {'★★★★★'.split('').map((s, i) => (
                  <Text key={i} style={{ color: i < post.rating ? '#F59E0B' : Colors.border, fontSize: 14 }}>{s}</Text>
                ))}
              </View>
            </View>
            {post.comment ? <Text style={styles.feedReview}>{post.comment}</Text> : null}
            <View style={styles.reactionsRow}>
              <TouchableOpacity style={styles.reactBtn} onPress={() => handleReact(idx, 'yum')}>
                <Text style={styles.reactEmoji}>😋</Text>
                <Text style={styles.reactCount}>{post.likes_yum || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reactBtn} onPress={() => handleReact(idx, 'good')}>
                <Text style={styles.reactEmoji}>👍</Text>
                <Text style={styles.reactCount}>{post.likes_good || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomBar active="home" navigate={navigate} />

      {/* ── Rate Today's Meal — Right Slider ── */}
      <RightSliderPanel
        visible={showRatePanel}
        onClose={() => setShowRatePanel(false)}
        title="Rate Today's Meal"
        emoji="⭐"
      >
        {posted ? (
          <View style={styles.postedCard}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🎉</Text>
            <Text style={styles.postedTitle}>Thanks for rating!</Text>
            <Text style={styles.postedSub}>Your feedback helps improve the kitchen. See you tomorrow!</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.panelSectionLabel}>Aaj ka khana kaisa tha?</Text>

            {/* Star rating */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setMyRating(star)} activeOpacity={0.7}>
                  <Text style={[styles.star, star <= myRating && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            {myRating > 0 && (
              <Text style={styles.ratingLabelText}>{ratingLabel}</Text>
            )}

            {/* Review Input */}
            <Text style={[styles.panelSectionLabel, { marginTop: 20 }]}>Koi comment? (optional)</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Aapka feedback share karo..."
              placeholderTextColor={Colors.textMuted}
              value={myReview}
              onChangeText={setMyReview}
              multiline
              numberOfLines={4}
            />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, myRating === 0 && styles.submitBtnDisabled]}
              onPress={handlePostReview}
              disabled={myRating === 0 || isSubmitting}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Submitting...' : '⭐ Post Rating'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </RightSliderPanel>

      {/* ── Vote This Week — Right Slider ── */}
      <RightSliderPanel
        visible={showVotePanel}
        onClose={() => setShowVotePanel(false)}
        title={isWeekend ? "Weekly Vote Results" : "Vote Next Week's Menu"}
        emoji="🗳️"
      >
        <Text style={styles.panelSectionLabel}>{poll.question}</Text>
        <Text style={styles.pollSubLabel}>
          {isWeekend ? "Voting is closed. Here are the final results!" : "Aapka vote agle hafte ka menu decide karega!"}
        </Text>

        {/* Option A */}
        <TouchableOpacity
          style={[styles.voteOptionCard, voted === 'a' && styles.voteOptionCardActive]}
          onPress={() => handleVote('a')}
          disabled={voted !== null || isWeekend}
          activeOpacity={0.75}
        >
          <View style={styles.voteOptionTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.voteOptionLabel, voted === 'a' && { color: Colors.primary }]}>
                {poll.option_a}
              </Text>
              {totalVotes > 0 && poll.votes_a > poll.votes_b && (
                <View style={styles.leaderBadge}><Text style={styles.leaderBadgeText}>{isWeekend ? "🏆 Winner" : "🏆 Leading"}</Text></View>
              )}
            </View>
            <Text style={styles.votePct}>{showResults ? `${pctA}%` : ''}</Text>
          </View>
          <View style={styles.voteBarBg}>
            <Animated.View style={[styles.voteBarFill, { width: `${showResults ? pctA : 0}%` as any }]} />
          </View>
          {voted === 'a' && <Text style={styles.votedTick}>✓ Aapka vote</Text>}
        </TouchableOpacity>

        {/* VS divider */}
        <View style={styles.vsDivider}>
          <View style={styles.vsDividerLine} />
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.vsDividerLine} />
        </View>

        {/* Option B */}
        <TouchableOpacity
          style={[styles.voteOptionCard, voted === 'b' && styles.voteOptionCardActive]}
          onPress={() => handleVote('b')}
          disabled={voted !== null || isWeekend}
          activeOpacity={0.75}
        >
          <View style={styles.voteOptionTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.voteOptionLabel, voted === 'b' && { color: Colors.primary }]}>
                {poll.option_b}
              </Text>
              {totalVotes > 0 && poll.votes_b > poll.votes_a && (
                <View style={styles.leaderBadge}><Text style={styles.leaderBadgeText}>{isWeekend ? "🏆 Winner" : "🏆 Leading"}</Text></View>
              )}
            </View>
            <Text style={styles.votePct}>{showResults ? `${pctB}%` : ''}</Text>
          </View>
          <View style={styles.voteBarBg}>
            <Animated.View style={[styles.voteBarFill, { width: `${showResults ? pctB : 0}%` as any }]} />
          </View>
          {voted === 'b' && <Text style={styles.votedTick}>✓ Aapka vote</Text>}
        </TouchableOpacity>

        <Text style={styles.totalVotesText}>🗳️ {totalVotes} students ne vote kiya</Text>

        {isWeekend ? (
          <View style={[styles.voteDoneCard, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
            <Text style={[styles.voteDoneText, { color: '#15803D', fontWeight: 'bold' }]}>
              🏆 Final Winner: {poll.votes_a > poll.votes_b ? poll.option_a : poll.votes_b > poll.votes_a ? poll.option_b : "Tie (Both will be featured!)"}
            </Text>
            <Text style={{ fontFamily: Typography.fontFamily.regular, fontSize: 11, color: '#166534', marginTop: 4, textAlign: 'center' }}>
              Voting closed on Saturday 12:00 AM. A new poll will open on Monday!
            </Text>
          </View>
        ) : voted ? (
          <View style={styles.voteDoneCard}>
            <Text style={styles.voteDoneText}>✅ Aapka vote record ho gaya! Result Saturday ko aayega.</Text>
          </View>
        ) : null}
      </RightSliderPanel>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { paddingTop: 55, paddingBottom: 24, paddingHorizontal: Spacing.lg },
  backBtn: { marginBottom: 8 },
  backText: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  headerTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize['2xl'], color: Colors.textOnPrimary },
  headerSub: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md },

  // Live badge
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', borderRadius: Radius.md, padding: 10, marginBottom: Spacing.md },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 8 },
  liveBadgeText: { color: '#10B981', fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.xs },

  // Action cards row
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Shadows.card,
  },
  actionCardDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  actionCardEmoji: { fontSize: 28, marginBottom: 8 },
  actionCardTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 13, color: '#1E293B', marginBottom: 4 },
  actionCardSub: { fontFamily: Typography.fontFamily.regular, fontSize: 11, color: '#64748B', lineHeight: 16 },
  actionCardArrow: { marginTop: 10, fontSize: 11, color: Colors.primary, fontFamily: Typography.fontFamily.semiBold },

  // Feed
  feedTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.md, color: Colors.textPrimary, marginBottom: Spacing.sm },
  feedCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.sm },
  feedAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  feedAvatarText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.md, color: Colors.textOnPrimary },
  feedMeta: { flex: 1 },
  feedName: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  feedHostel: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  feedRating: { flexDirection: 'row' },
  feedReview: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  reactionsRow: { flexDirection: 'row', gap: 12 },
  reactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  reactEmoji: { fontSize: 16 },
  reactCount: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.xs, color: Colors.textSecondary },

  // ── Slider Panel ──
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sliderPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  sliderCloseBtn: { padding: 6 },
  sliderCloseText: { fontSize: 22, color: '#fff', fontFamily: Typography.fontFamily.bold },
  sliderEmoji: { fontSize: 22 },
  sliderTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 18, color: '#fff', marginTop: 2 },
  sliderBody: { flex: 1 },

  // Rate Panel internals
  panelSectionLabel: { fontFamily: Typography.fontFamily.bold, fontSize: 14, color: '#475569', marginBottom: 10 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  star: { fontSize: 42, color: '#CBD5E1' },
  starActive: { color: '#F59E0B' },
  ratingLabelText: { fontFamily: Typography.fontFamily.semiBold, fontSize: 14, color: Colors.primary, marginBottom: 4 },
  reviewInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.base,
    color: Colors.textPrimary, backgroundColor: Colors.surface,
    height: 100, textAlignVertical: 'top', marginBottom: 20,
  },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontFamily: Typography.fontFamily.bold, fontSize: 15, color: '#fff' },

  postedCard: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  postedTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 20, color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  postedSub: { fontFamily: Typography.fontFamily.regular, fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },

  // Vote Panel internals
  pollSubLabel: { fontFamily: Typography.fontFamily.regular, fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 20 },
  voteOptionCard: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    padding: 16, backgroundColor: Colors.surface, marginBottom: 4,
  },
  voteOptionCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,69,0,0.04)' },
  voteOptionTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  voteOptionLabel: { fontFamily: Typography.fontFamily.semiBold, fontSize: 15, color: '#1E293B', marginBottom: 4 },
  votePct: { fontFamily: Typography.fontFamily.bold, fontSize: 18, color: Colors.primary, minWidth: 46, textAlign: 'right' },
  voteBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  voteBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  votedTick: { marginTop: 8, fontFamily: Typography.fontFamily.semiBold, fontSize: 12, color: Colors.primary },

  vsDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 8 },
  vsDividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  vsText: { fontFamily: Typography.fontFamily.bold, fontSize: 13, color: '#94A3B8' },

  totalVotesText: { fontFamily: Typography.fontFamily.medium, fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 16 },

  voteDoneCard: { marginTop: 16, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#86EFAC' },
  voteDoneText: { fontFamily: Typography.fontFamily.medium, fontSize: 13, color: '#166534', lineHeight: 20 },

  leaderBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  leaderBadgeText: { fontSize: 10, color: '#065F46', fontFamily: Typography.fontFamily.bold },
});
