import { Stack, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { BounceIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { useRewards } from '@/components/rewards';
import { Button, Card, Empty, GradientCard, Pill, ProgressBar, Row, Screen, Txt, haptic } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, useDirection } from '@/lib/app-context';
import { gamePool } from '@/lib/db';
import { XP, makeClozeRounds, type ClozeRound } from '@/lib/game';
import { pickForDay, withName } from '@/lib/i18n';
import { playSound } from '@/lib/sound';
import { todayStr } from '@/lib/srs';

const ROUNDS = 6;

export default function ClozeGame() {
  const db = useSQLiteContext();
  const { s, settings } = useApp();
  const { award } = useRewards();
  const c = useTheme();
  const d = useDirection();

  const [rounds, setRounds] = useState<ClozeRound[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [awarded, setAwarded] = useState(false);

  const start = useCallback(async () => {
    const pool = await gamePool(db);
    setRounds(makeClozeRounds(pool, ROUNDS));
    setIndex(0);
    setPicked(null);
    setScore(0);
    setAwarded(false);
  }, [db]);

  useEffect(() => {
    start();
  }, [start]);

  const round = rounds?.[index];
  const finished = rounds !== null && rounds.length > 0 && index >= rounds.length;
  const perfect = finished && score === rounds.length;

  useEffect(() => {
    if (!finished || awarded) return;
    setAwarded(true);
    playSound('complete');
    award(score * XP.gameCorrect + (perfect ? XP.gamePerfectBonus : 0), perfect ? 'game_perfect' : 'game');
  }, [finished, awarded, score, perfect, award]);

  const choose = (option: string) => {
    if (!round || picked) return;
    setPicked(option);
    if (option === round.answer) {
      setScore((n) => n + 1);
      playSound('correct');
      haptic('success');
    } else {
      playSound('wrong');
      haptic('error');
    }
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  if (!rounds) return <Screen>{null}</Screen>;

  if (rounds.length === 0) {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Stack.Screen options={{ title: s.clozeTitle }} />
        <Empty icon="🧩" text={s.needMoreNotes} />
        <Button title={s.backHome} onPress={() => router.back()} />
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Stack.Screen options={{ title: s.clozeTitle }} />
        <Animated.View entering={ZoomIn.springify()}>
          <GradientCard style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 64 }}>{perfect ? '🎯' : '🧩'}</Text>
            <Txt variant="title" color="#fff" center>
              {perfect ? s.perfect : withName(pickForDay(s.praise, todayStr(), score), settings.name, settings.language)}
            </Txt>
            <Txt variant="hero" color="#fff" center>
              {s.score(score, rounds.length)}
            </Txt>
            <Pill text={s.xpGained(score * XP.gameCorrect + (perfect ? XP.gamePerfectBonus : 0))} />
          </GradientCard>
        </Animated.View>
        <Button icon="🔄" title={s.playAgain} onPress={start} />
        <Button variant="ghost" title={s.backHome} onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!round) return <Screen>{null}</Screen>;
  const correct = picked === round.answer;

  return (
    <Screen>
      <Stack.Screen options={{ title: s.clozeTitle }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Pill text={s.of(index + 1, rounds.length)} />
        <Txt variant="heading">⭐ {score}</Txt>
      </Row>
      <ProgressBar value={index / rounds.length} />

      <Animated.View key={index} entering={FadeInDown.duration(350)} style={{ gap: Spacing.four }}>
        <Card tone="primary" style={{ minHeight: 150, justifyContent: 'center' }}>
          <Txt variant="caption" muted>
            {round.subject} · {s.clozePrompt}
          </Txt>
          <Text
            style={{
              color: c.text,
              fontSize: 20,
              lineHeight: 34,
              textAlign: d.textAlign,
              writingDirection: d.writingDirection,
            }}>
            {round.before}
            <Text
              style={{
                color: picked ? (correct ? c.primary : c.danger) : c.warning,
                fontWeight: '800',
                backgroundColor: picked ? undefined : c.warningSoft,
              }}>
              {picked ? round.answer : ' ＿＿＿＿ '}
            </Text>
            {round.after}
          </Text>
        </Card>

        <View style={{ gap: Spacing.three }}>
          {round.options.map((opt) => {
            const isAnswer = opt === round.answer;
            const isPicked = opt === picked;
            const bg = !picked
              ? c.card
              : isAnswer
                ? c.primarySoft
                : isPicked
                  ? c.dangerSoft
                  : c.card;
            const border = !picked ? c.border : isAnswer ? c.primary : isPicked ? c.danger : c.border;
            return (
              <Pressable
                key={opt}
                disabled={!!picked}
                onPress={() => choose(opt)}
                style={({ pressed }) => ({
                  padding: Spacing.four,
                  borderRadius: Radius.medium,
                  borderWidth: 1.5,
                  borderColor: border,
                  backgroundColor: bg,
                  opacity: picked && !isAnswer && !isPicked ? 0.5 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
                  {picked && isAnswer ? '✅ ' : picked && isPicked ? '❌ ' : ''}
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {picked ? (
          <Animated.View entering={BounceIn} style={{ gap: Spacing.three }}>
            <Txt variant="title" center color={correct ? c.primary : c.danger}>
              {correct ? `🎉 ${s.correct}` : `💡 ${s.theAnswer(round.answer)}`}
            </Txt>
            <Button title={s.next} onPress={next} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </Screen>
  );
}
