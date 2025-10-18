/**
 * Warn when a FlatList/SectionList/VirtualizedList is nested inside a ScrollView.
 * Heuristic: if we encounter a ScrollView opening, set a flag; if we see any
 * virtualized list while the flag is set, warn.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow nested VirtualizedLists inside a ScrollView' },
    schema: [],
    messages: {
      nested:
        'VirtualizedLists should not be nested inside ScrollViews. Use one VirtualizedList-based container.',
    },
  },
  create(context) {
    let scrollDepth = 0;

    function getName(node) {
      // Supports <ScrollView>, <RN.ScrollView>, etc.
      if (!node || node.type !== 'JSXOpeningElement') return null;
      const n = node.name;
      if (n.type === 'JSXIdentifier') return n.name;
      if (n.type === 'JSXMemberExpression') {
        // ReactNative.ScrollView => take property name
        return n.property && n.property.name;
      }
      return null;
    }

    const isScroll = (name) => name === 'ScrollView';
    const isVirtual = (name) =>
      name === 'FlatList' || name === 'SectionList' || name === 'VirtualizedList';

    return {
      JSXOpeningElement(node) {
        const name = getName(node);
        if (isScroll(name)) scrollDepth += 1;
        if (scrollDepth > 0 && isVirtual(name)) {
          context.report({ node, messageId: 'nested' });
        }
      },
      JSXClosingElement(node) {
        const n = node.name;
        const name = n.type === 'JSXIdentifier' ? n.name
                  : n.type === 'JSXMemberExpression' ? (n.property && n.property.name) : null;
        if (isScroll(name)) scrollDepth = Math.max(0, scrollDepth - 1);
      },
    };
  },
};
