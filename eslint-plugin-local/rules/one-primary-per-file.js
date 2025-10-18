/**
 * Warn if there's more than one <Button variant="primary" ...> in a file.
 * Simple heuristic: JSX element named "Button" with prop variant === "primary".
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Allow only one primary Button per file' },
    schema: [],
    messages: {
      tooMany: 'More than one primary <Button> in this file.',
    },
  },
  create(context) {
    let count = 0;

    return {
      JSXOpeningElement(node) {
        // Element name is "Button"?
        const name = node.name && node.name.name;
        if (name !== 'Button') return;

        // Find prop variant="primary"
        const variantAttr = (node.attributes || []).find(
          (a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'variant'
        );
        if (!variantAttr || !variantAttr.value) return;

        // Handle literal or JSX expression with literal
        let val = null;
        if (variantAttr.value.type === 'Literal') val = variantAttr.value.value;
        if (variantAttr.value.type === 'JSXExpressionContainer' &&
            variantAttr.value.expression.type === 'Literal') {
          val = variantAttr.value.expression.value;
        }

        if (val === 'primary') {
          count += 1;
          if (count > 1) {
            context.report({ node, messageId: 'tooMany' });
          }
        }
      },
    };
  },
};
