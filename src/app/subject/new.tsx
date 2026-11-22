import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { GamePicker } from '@/components/game-picker';
import { Button, Input, Screen, Section, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { createSubject, type GameType } from '@/lib/db';

export default function NewSubject() {
  const db = useSQLiteContext();
  const { s } = useApp();
  const [title, setTitle] = useState('');
  const [game, setGame] = useState<GameType>('mix');

  const create = async () => {
    if (!title.trim()) return;
    const id = await createSubject(db, title.trim(), game);
    router.replace(`/subject/${id}`);
  };

  return (
    <Screen
      title={s.newSubject}
      footer={<Button title={s.create} icon="add-circle-outline" onPress={create} disabled={!title.trim()} />}>
      <Input
        label={s.subjectTitle}
        placeholder={s.subjectPlaceholder}
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={create}
      />
      <Section title={s.testStyle}>
        <Txt variant="caption" muted>
          {s.testStyleHint}
        </Txt>
        <GamePicker value={game} onChange={setGame} />
      </Section>
    </Screen>
  );
}
