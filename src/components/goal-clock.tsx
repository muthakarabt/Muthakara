import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';

import { Card, Icon, ProgressBar, Row, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import { addStudySeconds, studySecondsToday } from '@/lib/db';

function formatClock(totalSeconds: number): string {
  const sec = Math.abs(Math.round(totalSeconds));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** Tracks time on screen and saves it to the study log in small chunks. */
export function useStudyClock(db: ReturnType<typeof useSQLiteContext>) {
  const [base, setBase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const unsaved = useRef(0);

  useEffect(() => {
    studySecondsToday(db).then(setBase);
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
      unsaved.current += 1;
      if (unsaved.current >= 15) {
        addStudySeconds(db, unsaved.current);
        unsaved.current = 0;
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      if (unsaved.current > 0) addStudySeconds(db, unsaved.current);
      unsaved.current = 0;
    };
  }, [db]);

  return base + elapsed;
}

export function GoalClock({ seconds, goal }: { seconds: number; goal: number }) {
  const { s } = useApp();
  const c = useTheme();
  const remaining = goal - seconds;
  return (
    <Card style={{ paddingVertical: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="caption" muted>
          {remaining > 0 ? s.timeLeft : s.overtime}
        </Txt>
        <Row gap={6}>
          <Icon name="time-outline" size={18} color={c.primary} />
          <Txt variant="heading">{formatClock(remaining > 0 ? remaining : seconds - goal)}</Txt>
        </Row>
      </Row>
      <ProgressBar value={seconds / goal} height={6} />
    </Card>
  );
}
