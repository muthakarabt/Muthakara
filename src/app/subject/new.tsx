import { Stack, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { Button, Input, Screen } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { createSubject } from '@/lib/db';

export default function NewSubject() {
  const db = useSQLiteContext();
  const { s } = useApp();
  const [title, setTitle] = useState('');

  const create = async () => {
    if (!title.trim()) return;
    const id = await createSubject(db, title);
    router.dismiss();
    router.push(`/subject/${id}`);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: s.newSubject }} />
      <Input
        label={s.subjectTitle}
        placeholder={s.subjectPlaceholder}
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={create}
      />
      <Button title={s.create} icon="✨" onPress={create} disabled={!title.trim()} />
    </Screen>
  );
}
