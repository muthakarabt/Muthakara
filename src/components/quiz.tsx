import { useEffect, useEffectEvent, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Button, Card, Icon, Input, ProgressBar, Row, Txt, haptic, type IconName } from '@/components/ui';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, useDirection } from '@/lib/app-context';
import { orderScore, type SingleRound } from '@/lib/game';
import { pickRandom } from '@/lib/i18n';
import { playSound } from '@/lib/sound';
import { detectLanguage, judge, type Verdict } from '@/lib/text';

export type QuizOutcome = {
  /** Best result reached. */
  verdict: Verdict;
  /** Right on the first try. */
  firstTry: boolean;
};

/** Maps a test result to a spaced-repetition grade. */
export function gradeFor(o: QuizOutcome): 'good' | 'hard' | 'again' {
  if (o.verdict === 'correct' && o.firstTry) return 'good';
  if (o.verdict === 'wrong') return 'again';
  return 'hard';
}

type Feedback = { verdict: Verdict; final: boolean; timeUp?: boolean; text: string };

function formatClock(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * One timed question with two chances. Right → "correct", nearly right →
 * "close" with a second try, wrong → "try again" with a second try; after the
 * second miss the answer is shown.
 */
export function Quiz({
  round,
  seconds,
  onFinish,
  successText,
}: {
  round: SingleRound;
  seconds: number;
  onFinish: (o: QuizOutcome) => void;
  /** Shown on the "next" button after a right answer. */
  successText?: string;
}) {
  const { s } = useApp();
  const c = useTheme();
  const [attempt, setAttempt] = useState(1);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [left, setLeft] = useState(seconds);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);

  // answers
  const [typed, setTyped] = useState('');
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [placed, setPlaced] = useState<number[]>([]); // positions in round.shuffled

  const done = outcome !== null;

  const grade = (verdict: Verdict, timeUp = false) => {
    if (done) return;
    if (verdict === 'correct') {
      haptic('success');
      playSound('correct');
      setFeedback({ verdict, final: true, text: pickRandom(s.correct) });
      setOutcome({ verdict, firstTry: attempt === 1 });
      return;
    }
    if (attempt === 1) {
      haptic('error');
      playSound(verdict === 'close' ? 'close' : 'wrong');
      setFeedback({ verdict, final: false, timeUp, text: verdict === 'close' ? s.close : s.wrong });
      setAttempt(2);
      setLeft(seconds);
      return;
    }
    haptic('error');
    playSound(verdict === 'close' ? 'close' : 'wrong');
    setFeedback({ verdict, final: true, timeUp, text: verdict === 'close' ? s.close : s.wrongFinal });
    setOutcome({ verdict, firstTry: false });
  };

  const onTimeUp = useEffectEvent(() => grade('wrong', true));

  useEffect(() => {
    if (done) return;
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = seconds - Math.floor((Date.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        onTimeUp();
      }
    }, 250);
    return () => clearInterval(id);
  }, [attempt, done, seconds]);

  const lang = detectLanguage(
    round.type === 'order'
      ? round.answer.join(' ')
      : round.type === 'choice' || round.type === 'truefalse'
        ? `${round.prompt} ${round.answer}`
        : `${round.before} ${round.answer} ${round.after}`,
  );
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const question = 'prompt' in round ? round.prompt : undefined;
  const qDir = question && detectLanguage(question) === 'en' ? 'ltr' : 'rtl';
  const wholeAnswer = round.type === 'type' && !round.before && !round.after;
  const trueFalseOptions = [s.trueLabel, s.falseLabel];
  const options =
    round.type === 'cloze' || round.type === 'choice'
      ? round.options
      : round.type === 'truefalse'
        ? trueFalseOptions
        : null;
  const rightOption =
    round.type === 'truefalse' ? (round.isTrue ? s.trueLabel : s.falseLabel) : round.type === 'order' ? '' : round.answer;

  // ---------- checking ----------
  const checkCloze = (option: string) => {
    if (done || !options) return;
    setPicked(option);
    if (option === rightOption) grade('correct');
    else {
      setWrongPicks((w) => [...w, option]);
      grade('wrong');
    }
  };
  const checkTyped = () => {
    if (done || round.type !== 'type' || !typed.trim()) return;
    grade(judge(typed, round.answer));
  };
  const checkOrder = () => {
    if (done || round.type !== 'order') return;
    const attemptWords = placed.map((p) => round.answer[round.shuffled[p]]);
    const score = orderScore(round.answer, attemptWords);
    grade(score === 1 ? 'correct' : score >= 0.5 ? 'close' : 'wrong');
  };

  const prompt =
    round.type === 'cloze'
      ? s.clozePrompt
      : round.type === 'choice'
        ? s.choicePrompt
        : round.type === 'truefalse'
          ? s.trueFalsePrompt
          : round.type === 'type'
            ? wholeAnswer
              ? s.answerPrompt
              : s.typePrompt
            : s.orderPrompt;
  const blank = (filled?: string, ok?: boolean) => (
    <Text
      style={{
        color: ok ? c.primary : c.accent,
        fontFamily: Font.bold,
        backgroundColor: ok ? c.primarySoft : c.accentSoft,
      }}>
      {filled ? ` ${filled} ` : ' ________ '}
    </Text>
  );

  return (
    <View style={{ gap: Spacing.four }}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={Spacing.two}>
            <Icon name="timer-outline" size={18} color={left <= 10 && !done ? c.danger : c.textSecondary} />
            <Txt variant="heading" color={left <= 10 && !done ? c.danger : undefined}>
              {formatClock(left)}
            </Txt>
          </Row>
          <Txt variant="caption" muted>
            {prompt}
          </Txt>
        </Row>
        <ProgressBar value={left / seconds} height={6} color={left <= 10 ? c.danger : c.primary} />
      </Card>

      {question ? (
        <Card tone="accent">
          <Row align="flex-start">
            <Icon name="help-circle-outline" size={24} color={c.accent} />
            <Txt variant="heading" dir={qDir} style={{ flex: 1 }}>
              {question}
            </Txt>
          </Row>
        </Card>
      ) : null}

      {round.type === 'choice' || wholeAnswer ? null : (
        <Card>
          {round.type === 'order' ? (
            <OrderBoard round={round} placed={placed} setPlaced={setPlaced} locked={done} dir={dir} />
          ) : round.type === 'truefalse' ? (
            <Txt variant="reading" dir={dir}>
              {round.shown}
            </Txt>
          ) : (
            <Txt variant="reading" dir={dir}>
              {round.before}
              {done || (round.type === 'cloze' && picked === round.answer)
                ? blank(round.answer, feedback?.verdict === 'correct')
                : blank()}
              {round.after}
            </Txt>
          )}
        </Card>
      )}

      {options ? (
        <View style={{ gap: Spacing.two, flexDirection: round.type === 'truefalse' ? 'row' : 'column' }}>
          {options.map((o) => {
            const isWrong = wrongPicks.includes(o);
            const isRight = done && o === rightOption;
            return (
              <Pressable
                key={o}
                accessibilityRole="button"
                disabled={done || isWrong}
                onPress={() => checkCloze(o)}
                style={({ pressed }) => ({
                  flex: round.type === 'truefalse' ? 1 : undefined,
                  padding: Spacing.four,
                  borderRadius: Radius.medium,
                  borderWidth: 1.5,
                  borderColor: isRight ? c.primary : isWrong ? c.danger : c.border,
                  backgroundColor: isRight ? c.primarySoft : isWrong ? c.dangerSoft : c.cardSolid,
                  opacity: pressed ? 0.8 : isWrong ? 0.7 : 1,
                })}>
                <Text
                  style={{
                    textAlign: 'center',
                    fontFamily: Font.semibold,
                    fontSize: 17,
                    color: isRight ? c.primary : isWrong ? c.danger : c.text,
                    writingDirection: dir,
                  }}>
                  {o}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {round.type === 'type' && !done ? (
        <View style={{ gap: Spacing.three }}>
          <Input
            value={typed}
            onChangeText={setTyped}
            placeholder={s.typePlaceholder}
            dir={dir}
            autoFocus
            onSubmitEditing={checkTyped}
            returnKeyType="done"
          />
          <Button title={s.check} icon="checkmark" onPress={checkTyped} disabled={!typed.trim()} />
        </View>
      ) : null}

      {round.type === 'order' && !done ? (
        <Button
          title={s.check}
          icon="checkmark"
          onPress={checkOrder}
          disabled={placed.length !== round.answer.length}
        />
      ) : null}

      {feedback ? <FeedbackBanner key={`${attempt}-${feedback.final}`} feedback={feedback} /> : null}

      {done && feedback ? (
        <Animated.View entering={FadeInDown.delay(150)} style={{ gap: Spacing.three }}>
          {feedback.verdict !== 'correct' ? (
            <Card tone="primary">
              <Txt variant="caption" muted>
                {s.theAnswer}
              </Txt>
              <Txt variant="heading" dir={dir}>
                {round.type === 'order' ? round.answer.join(' ') : round.answer}
              </Txt>
            </Card>
          ) : null}
          <Button
            title={feedback.verdict === 'correct' && successText ? successText : s.next}
            icon={feedback.verdict === 'correct' ? 'checkmark-done' : 'arrow-forward'}
            onPress={() => outcome && onFinish(outcome)}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  const { s } = useApp();
  const d = useDirection();
  const c = useTheme();
  const look: Record<Verdict, { icon: IconName; bg: string; fg: string }> = {
    correct: { icon: 'checkmark-circle', bg: c.primarySoft, fg: c.primary },
    close: { icon: 'ellipse-outline', bg: c.warningSoft, fg: c.warning },
    wrong: { icon: 'refresh-circle', bg: c.dangerSoft, fg: c.danger },
  };
  const l = look[feedback.verdict];
  return (
    <Animated.View
      entering={feedback.verdict === 'correct' ? ZoomIn.springify() : FadeIn}
      style={{
        flexDirection: d.row,
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.four,
        borderRadius: Radius.medium,
        backgroundColor: l.bg,
      }}>
      <Icon name={l.icon} size={28} color={l.fg} />
      <View style={{ flex: 1 }}>
        {feedback.timeUp ? (
          <Txt variant="caption" color={l.fg}>
            {s.timeUp}
          </Txt>
        ) : null}
        <Txt variant="heading" color={l.fg}>
          {feedback.text}
        </Txt>
      </View>
    </Animated.View>
  );
}

/** Tap words in the bank to build the sentence; tap a placed word to send it back. */
function OrderBoard({
  round,
  placed,
  setPlaced,
  locked,
  dir,
}: {
  round: Extract<SingleRound, { type: 'order' }>;
  placed: number[];
  setPlaced: (fn: (p: number[]) => number[]) => void;
  locked: boolean;
  dir: 'rtl' | 'ltr';
}) {
  const c = useTheme();
  const { s } = useApp();
  const d = useDirection();
  // Words flow in the passage's own direction, whatever the app language is.
  const flow = d.alignFor(dir) === 'right' ? 'row-reverse' : 'row';
  const chip = (word: string, onPress: () => void, tone: 'placed' | 'bank') => (
    <Pressable
      accessibilityRole="button"
      disabled={locked}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: tone === 'placed' ? c.primarySoft : c.cardSolid,
        borderWidth: 1,
        borderColor: tone === 'placed' ? c.primary : c.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ fontFamily: Font.medium, fontSize: 17, color: c.text, writingDirection: dir }}>{word}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: Spacing.four }}>
      <View
        style={{
          minHeight: 56,
          flexDirection: flow,
          flexWrap: 'wrap',
          gap: Spacing.two,
          padding: Spacing.two,
          borderRadius: Radius.medium,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: c.primary,
        }}>
        {placed.map((p) => (
          <View key={`p${p}`}>{chip(round.answer[round.shuffled[p]], () => setPlaced((x) => x.filter((v) => v !== p)), 'placed')}</View>
        ))}
      </View>
      <View style={{ flexDirection: flow, flexWrap: 'wrap', gap: Spacing.two }}>
        {round.shuffled.map((_, p) =>
          placed.includes(p) ? null : (
            <View key={`b${p}`}>{chip(round.answer[round.shuffled[p]], () => setPlaced((x) => [...x, p]), 'bank')}</View>
          ),
        )}
      </View>
      {placed.length > 0 && !locked ? (
        <Button small variant="ghost" icon="backspace-outline" title={s.clear} onPress={() => setPlaced(() => [])} />
      ) : null}
    </View>
  );
}
