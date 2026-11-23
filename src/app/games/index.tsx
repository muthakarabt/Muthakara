import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { GAME_ICONS, GAME_ORDER } from '@/components/game-picker';
import { MatchBoard } from '@/components/match-board';
import { Quiz, type QuizOutcome } from '@/components/quiz';
import { useRewards } from '@/components/rewards';
import { Button, Card, Empty, GradientCard, Icon, IconBadge, Pill, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import { gamePool, type GameType, type PageWithSubject } from '@/lib/db';
import { XP, makeMatch, makeRound, shuffle, type MatchRound, type SingleRound } from '@/lib/game';
import { pickForDay, withName } from '@/lib/i18n';
import { playSound } from '@/lib/sound';
import { todayStr } from '@/lib/srs';

const ROUND_SIZE = 8;

type Step = { kind: 'single'; round: SingleRound } | { kind: 'match'; round: MatchRound };

/** Builds a short session of questions from the user's own text. */
function buildSession(pool: PageWithSubject[], game: GameType): { steps: Step[]; fellBack: boolean } {
  if (game === 'match') {
    const steps: Step[] = [];
    const cards = shuffle(pool);
    for (let i = 0; i < cards.length && steps.length < 3; i += 4) {
      const r = makeMatch(cards.slice(i, i + 4));
      if (r) steps.push({ kind: 'match', round: r });
    }
    if (steps.length) return { steps, fellBack: false };
    return { steps: buildSession(pool, 'cloze').steps, fellBack: true };
  }
  const steps: Step[] = [];
  for (const card of shuffle(pool)) {
    if (steps.length >= ROUND_SIZE) break;
    const r = makeRound(card, pool, game);
    if (r) steps.push({ kind: 'single', round: r });
  }
  return { steps, fellBack: false };
}

export default function Games() {
  const params = useLocalSearchParams<{ subject?: string; game?: string }>();
  const subjectId = params.subject ? Number(params.subject) : undefined;
  const db = useSQLiteContext();
  const { s, settings } = useApp();
  const { award } = useRewards();
  const c = useTheme();

  const [pool, setPool] = useState<PageWithSubject[] | null>(null);
  const [game, setGame] = useState<GameType | null>((params.game as GameType) ?? null);
  const [session, setSession] = useState<{ steps: Step[]; fellBack: boolean } | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [run, setRun] = useState(0);

  useEffect(() => {
    let alive = true;
    gamePool(db, subjectId).then((p) => {
      if (alive) setPool(p);
    });
    return () => {
      alive = false;
    };
  }, [db, subjectId]);

  // (Re)start a session whenever the game, the pool or the "again" counter changes.
  useEffect(() => {
    if (!pool || !game) return;
    const built = buildSession(pool, game);
    // Building is synchronous but cheap; schedule it so the state update happens outside the effect body.
    const t = setTimeout(() => {
      setSession(built);
      setIndex(0);
      setScore({ right: 0, total: 0 });
    }, 0);
    return () => clearTimeout(t);
  }, [pool, game, run]);

  const finishStep = useSingleFlight(async (right: number, total: number) => {
    const next = { right: score.right + right, total: score.total + total };
    setScore(next);
    if (right > 0) await award(right * XP.gameCorrect, 'game');
    if (session && index + 1 >= session.steps.length) {
      playSound('complete');
      if (next.total > 0 && next.right === next.total) await award(XP.gamePerfectBonus, 'game_perfect');
    }
    setIndex((i) => i + 1);
  });

  const title = game ? s.games[game] : s.gamesTitle;

  if (!pool) return <Screen title={title}>{null}</Screen>;

  if (pool.length === 0) {
    return (
      <Screen title={title}>
        <Empty icon="game-controller-outline" tone="sky" text={s.nothingToPlay} />
        <Button title={s.backHome} icon="home-outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  // Choose a game.
  if (!game) {
    return (
      <Screen title={s.gamesTitle}>
        <Txt muted>{s.gamesHint}</Txt>
        <View style={{ gap: Spacing.two }}>
          {GAME_ORDER.map((g) => (
            <Card key={g} onPress={() => setGame(g)}>
              <Row>
                <IconBadge icon={GAME_ICONS[g]} tone="sky" size={48} />
                <View style={{ flex: 1 }}>
                  <Txt variant="heading">{s.games[g]}</Txt>
                  <Txt variant="caption" muted>
                    {s.gameDescs[g]}
                  </Txt>
                </View>
              </Row>
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  if (!session) return <Screen title={title}>{null}</Screen>;

  const step = session.steps[index];

  if (!step) {
    const perfect = score.total > 0 && score.right === score.total;
    return (
      <Screen title={title} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Animated.View entering={ZoomIn.springify()}>
          <GradientCard style={{ alignItems: 'center' }}>
            <Icon name={perfect ? 'trophy' : 'ribbon-outline'} size={56} color="#FFD08A" />
            <Txt variant="title" color="#fff" center>
              {perfect ? s.perfect : s.gameOver}
            </Txt>
            <Txt variant="hero" color="#fff" center>
              {s.score(score.right, score.total)}
            </Txt>
            <Txt color="#ffffffdd" center>
              {withName(pickForDay(s.praise, todayStr(), score.right), settings.name)}
            </Txt>
          </GradientCard>
        </Animated.View>
        <Button icon="refresh" title={s.playAgain} onPress={() => setRun((r) => r + 1)} />
        <Button variant="ghost" icon="grid-outline" title={s.gamesTitle} onPress={() => setGame(null)} />
        <Button variant="ghost" icon="home-outline" title={s.backHome} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title={title} right={<Pill tone="sky" text={`${index + 1}/${session.steps.length}`} />}>
      <ProgressBar value={index / session.steps.length} color={c.sky} height={6} />
      {session.fellBack && index === 0 ? (
        <Card tone="warning">
          <Txt variant="caption">{s.needTwoForMatch}</Txt>
        </Card>
      ) : null}
      {step.kind === 'match' ? (
        <MatchBoard key={`${run}-${index}`} round={step.round} onFinish={finishStep} />
      ) : (
        <Quiz
          key={`${run}-${index}`}
          round={step.round}
          seconds={settings.answerSeconds}
          onFinish={(o: QuizOutcome) => finishStep(o.verdict === 'correct' ? 1 : 0, 1)}
        />
      )}
    </Screen>
  );
}
