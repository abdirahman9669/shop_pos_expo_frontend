// src/ux/listGuards.ts
export function assertNoNestedVirtualizedList(parentIsScrollView: boolean) {
  if (__DEV__ && parentIsScrollView) {
    // eslint-disable-next-line no-console
    console.error('[UX] VirtualizedList/FlatList must not be nested in a ScrollView with same orientation.');
  }
}
