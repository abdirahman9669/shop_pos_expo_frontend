import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native'; // ← added TouchableOpacity
import { Link } from 'expo-router';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* ⬇️ New: quick link to Create Product screen */}
      <ThemedView style={styles.stepContainer}>
        <Link href="/create-product" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ Create Product
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>
      {/* ⬇️ New: quick link to Create Product screen */}

      <ThemedView style={styles.stepContainer}>
        <Link href="/select-products" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ Select Products
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Link href="/sale-new" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ new sale
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Link href="/purchase-new" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ Purchase
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Link href="/account-types" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ Account Type 
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>

            <ThemedView style={styles.stepContainer}>
        <Link href="/customers/receivables" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ customers AR list  payments
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Link href="/purchases" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ Purchases
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Link href="/sales" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ sales
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Link href="/payments" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ payments
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Link href="/suppliers" asChild>
          <TouchableOpacity style={{ backgroundColor: 'black', padding: 12, borderRadius: 12 }}>
            <ThemedText style={{ color: 'white', fontWeight: '800', textAlign: 'center' }}>
              ➕ suppliers
            </ThemedText>
          </TouchableOpacity>
        </Link>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes. Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction title="Share" icon="square.and.arrow.up" onPress={() => alert('Share pressed')} />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction title="Delete" icon="trash" destructive onPress={() => alert('Delete pressed')} />
            </Link.Menu>
          </Link.Menu>
        </Link>
        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepContainer: { gap: 8, marginBottom: 8 },
  reactLogo: { height: 178, width: 290, bottom: 0, left: 0, position: 'absolute' },
});

/*
npx expo start -c

*/