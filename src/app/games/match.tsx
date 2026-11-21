import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useRewards } from '@/components/rewards';
import { Button, Empty, GradientCard, Pill, Row, Screen, Txt, haptic } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, useDirection } from '@/lib/app-context';
import { gamePool } from '@/lib/db';
import { XP, makeMatch, type MatchCard } from '@/lib/game';
import { playSound } from '@/lib/sound';

type Board = { prompts: MatchCard[]; answers: MatchCard[] };

function Tile({
  card,
  selected,
  matched,
  wrong,
  onPress,
}: {
  card: MatchCard;
  selected: boolean;
  matched: boolean;
  wrong: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const d = useDirection();
  const shake = useSharedValue(0);

  useEffect(() => {
    if (wrong) {
      shake.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [wrong, shake]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const border = matched ? c.primary : wrong ? c.danger : selected ? c.warning : c.border;
  const bg = matched ? c.primarySoft : wrong ? c.dangerSoft : selected ? c.warningSoft : c.card;

  return (
    <Animated.View style={style}>
      <Pressable
        disabled={matched}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 96,
          borderRadius: Radius.medium,
          borderWidth: 2,
          borderColor: border,
          backgroundColor: bg,
          padding: Spacing.two,
          justifyContent: 'center',
          gap: 4,
          opacity: matched ? 0.55 : 1,
          transform: [{ scale: pressed || selected ? 0.97 : 1 }],
        })}>
        {card.imageUri ? (
          <Image source={{ uri: card.imageUri }} style={{ width: '100%', height: 64, borderRadius: 8 }} contentFit="cover" />
        ) : null}
        <Text
          numberOfLines={card.imageUri ? 1 : 4}
          style={{
            color: c.text,
            fontSize: 14,
            fontWeight: card.side === 'prompt' ? '700' : '500',
            textAlign: 'center',
            writingDirection: d.writingDirection,
          }}>
          {matched ? '✅ ' : ''}
          {card.text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function MatchGame() {
  const db = useSQLiteContext();
  const { s } = useApp();
  const { award } = useRewards();
  const d = useDirection();

  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  const [prompt, setPrompt] = useState<MatchCard | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [game, setGame] = useState(0);

  useEffect(() => {
    let alive = true;
    gamePool(db).then((pool) => {
      if (!alive) return;
      setBoard(makeMatch(pool, 4));
      setPrompt(null);
      setMatched(new Set());
      setWrong([]);
      setMistakes(0);
    });
    return () => {
      alive = false;
    };
  }, [db, game]);

  const playAgain = () => {
    setBoard(undefined);
    setGame((g) => g + 1);
  };

  const total = board?.prompts.length ?? 0;
  const done = board != null && matched.size === total;
  const perfect = done && mistakes === 0;
  const points = total * XP.gameCorrect + (perfect ? XP.gamePerfectBonus : 0);

  const pickPrompt = (card: MatchCard) => {
    playSound('tap');
    haptic();
    setWrong([]);
    setPrompt((p) => (p?.key === card.key ? null : card));
  };

  const pickAnswer = (card: MatchCard) => {
    if (!prompt) {
      haptic();
      return;
    }
    if (card.pairId === prompt.pairId) {
      playSound('correct');
      haptic('success');
      const nextMatched = new Set(matched).add(card.pairId);
      setMatched(nextMatched);
      if (nextMatched.size === total) {
        const perfectRun = mistakes === 0;
        playSound('complete');
        award(total * XP.gameCorrect + (perfectRun ? XP.gamePerfectBonus : 0), perfectRun ? 'game_perfect' : 'game');
      }
      setPrompt(null);
      setWrong([]);
    } else {
      playSound('wrong');
      haptic('error');
      setMistakes((n) => n + 1);
      setWrong([prompt.key, card.key]);
      setTimeout(() => setWrong([]), 600);
    }
  };

  if (board === undefined) return <Screen>{null}</Screen>;

  if (board === null) {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Stack.Screen options={{ title: s.matchTitle }} />
        <Empty icon="🔗" text={s.needMoreNotes} />
        <Button title={s.backHome} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: s.matchTitle }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Pill text={s.score(matched.size, total)} />
        <Txt variant="caption" muted>
          ❌ {mistakes}
        </Txt>
      </Row>
      <Txt variant="caption" muted center>
        {d.rtl ? s.matchPrompt : s.matchPromptLtr}
      </Txt>

      {/* Prompts sit on the reading-start side, answers on the other. */}
      <View style={{ flexDirection: d.row, gap: Spacing.three }}>
        <View style={{ flex: 1, gap: Spacing.three }}>
          {board.prompts.map((card) => (
            <Tile
              key={card.key}
              card={card}
              selected={prompt?.key === card.key}
              matched={matched.has(card.pairId)}
              wrong={wrong.includes(card.key)}
              onPress={() => pickPrompt(card)}
            />
          ))}
        </View>
        <View style={{ flex: 1, gap: Spacing.three }}>
          {board.answers.map((card) => (
            <Tile
              key={card.key}
              card={card}
              selected={false}
              matched={matched.has(card.pairId)}
              wrong={wrong.includes(card.key)}
              onPress={() => pickAnswer(card)}
            />
          ))}
        </View>
      </View>

      {done ? (
        <Animated.View entering={ZoomIn.springify()} style={{ gap: Spacing.three }}>
          <GradientCard style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 56 }}>{perfect ? '🎯' : '🔗'}</Text>
            <Txt variant="title" color="#fff" center>
              {perfect ? s.perfect : s.gameOver}
            </Txt>
            <Pill text={s.xpGained(points)} />
          </GradientCard>
          <Animated.View entering={FadeIn.delay(300)} style={{ gap: Spacing.three }}>
            <Button icon="🔄" title={s.playAgain} onPress={playAgain} />
            <Button variant="ghost" title={s.backHome} onPress={() => router.back()} />
          </Animated.View>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
