// app/Owner/Users/index.tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';
import { useTheme, text, space, layout } from '@/src/theme';
import { Card, Button } from '@/src/components';

type User = {
  id: string;
  username: string;
  role: string;
  active: string;
  createdAt?: string;
};

export default function UserListScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };

  async function loadUsers() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/users`, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.data || []);
    
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'All Users',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
        }}
      />

      <ScrollView
        contentContainerStyle={{
          padding: layout.containerPadding,
          gap: space.sm,
        }}
      >
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <ActivityIndicator />
            <Text style={text('body', t.colors.textSecondary)}>Loading shops…</Text>
          </View>
        ) : error ? (
          <Text style={text('body', t.colors.danger.base)}>Error: {error}</Text>
        ) : users.length === 0 ? (
          <Text style={text('body', t.colors.textSecondary)}>No users found.</Text>
        ) : (
          users.map((user) => (
            <TouchableOpacity
              key={user.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/owner/users/${user.id}`)}
            >
              <Card>
                <Text style={text('h3', t.colors.textPrimary)}>{user.username}</Text>
                {user.role && (
                  <Text style={text('body', t.colors.textSecondary)}>
                    Phone: {user.role}
                  </Text>
                )}
                {user.active && (
                  <Text style={text('body', t.colors.textSecondary)}>Code: {user.active}</Text>
                )}
                {user.createdAt && (
                  <Text style={text('caption', t.colors.textSecondary)}>
                    Created: {new Date(user.createdAt).toDateString()}
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={{ padding: layout.containerPadding }}>
        <Button title="Refresh" variant="secondary" onPress={loadUsers} />
      </View>
    </SafeAreaView>
  );
}


