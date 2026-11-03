import ts from 'typescript'

// These adapters consume legacy strings/SVGs and render approved Loop artwork.
const adapters = new Set(['LoopTextIcon', 'LoopInlineIcon', 'LoopActionLabel'])
const loneGlyph = /^[→←↑↓↺↻›‹✕✗✓⏱📊🧪🧬⚡📐🏛📝📚]+$/u
const subjectFlag = /^(?:\p{Regional_Indicator}{2})$/u
const actionArrow = /^(?:[←‹]\s*[^←→‹›]+|[^←→‹›]+\s[→›])$/u
const subjectOwner = /^(?:group|g|sc|subject|subjectDef|def|.*\.def)$/

export function checkLoopUiSource(source, filename = 'fixture.tsx') {
  const issues = []
  const report = (node, rule) => {
    const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1
    issues.push({ line, rule })
  }
  if (filename.endsWith('.css')) {
    source.split('\n').forEach((line, i) => {
      if (/content\s*:\s*['"][→←↑↓↺↻›‹✕✗✓⏱📊🧪🧬⚡📐🏛📝📚]+['"]/.test(line)) issues.push({ line: i + 1, rule: 'css-text-glyph' })
      if (/data:image\/svg/i.test(line)) issues.push({ line: i + 1, rule: 'css-svg-icon' })
    })
    return issues
  }
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const tag = node => ts.isJsxElement(node) ? node.openingElement.tagName.getText(tree) : ''
  function adapted(node) {
    for (let p = node.parent; p; p = p.parent) if (adapters.has(tag(p))) return true
    return false
  }
  function interactive(node) {
    for (let p = node.parent; p; p = p.parent) {
      if (['button', 'a'].includes(tag(p))) return true
      if (ts.isJsxElement(p) && p.openingElement.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.getText(tree) === 'onClick')) return true
      if (ts.isJsxElement(p) && /^[A-Z]/.test(tag(p))) return false
    }
    return false
  }
  function contentNotation(node, text) {
    if (!/^[→←↑↓]+$/.test(text)) return false
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isJsxElement(p) && p.openingElement.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.getText(tree) === 'data-loop-content')) return true
    }
    return false
  }
  const scopeValues = new WeakMap()
  function initializerOf(node) {
    for (let scope = node.parent; scope; scope = scope.parent) {
      if (!ts.isFunctionLike(scope) && !ts.isSourceFile(scope)) continue
      if (!scopeValues.has(scope)) {
        const values = new Map()
        function gather(n) {
          if (n !== scope && ts.isFunctionLike(n)) return
          if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) values.set(n.name.text, n.initializer)
          ts.forEachChild(n, gather)
        }
        gather(scope); scopeValues.set(scope, values)
      }
      const value = scopeValues.get(scope).get(node.text)
      if (value) return value
    }
  }
  function rendered(node, inAction, seen = new Set()) {
    if (!node || seen.has(node)) return
    seen.add(node)
    if (ts.isIdentifier(node)) return rendered(initializerOf(node), inAction, seen)
    if (ts.isParenthesizedExpression(node)) return rendered(node.expression, inAction, seen)
    if (ts.isStringLiteralLike(node)) {
      const text = node.text.trim().replace(/\uFE0F/g, '')
      if (!contentNotation(node, text) && (loneGlyph.test(text) || subjectFlag.test(text) || (inAction && actionArrow.test(text)))) report(node, 'text-ui-glyph')
    } else if (ts.isConditionalExpression(node)) {
      rendered(node.whenTrue, inAction, seen); rendered(node.whenFalse, inAction, seen)
    } else if (ts.isBinaryExpression(node) && ['??', '||', '&&'].includes(node.operatorToken.getText(tree))) {
      if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) rendered(node.left, inAction, seen)
      rendered(node.right, inAction, seen)
    } else if (ts.isCallExpression(node) && ['t', 'tc'].includes(node.expression.getText(tree))) {
      rendered(node.arguments[0], inAction, seen)
    } else if (ts.isPropertyAccessExpression(node) && node.name.text === 'icon') {
      const owner = node.expression.getText(tree).replaceAll('?', '')
      if (subjectOwner.test(owner) || owner.startsWith('getSubject(') || (/\/(?:SubjectColorPicker|SubjectPicker)\.tsx$/.test(filename) && /^(s|o|only|current)$/.test(owner))) report(node, 'subject-emoji')
    }
  }
  function visit(node) {
    if (!adapted(node)) {
      if (ts.isPropertyAssignment(node) && node.name.getText(tree) === 'backgroundImage' && /data:image\/svg/i.test(node.initializer.getText(tree))) report(node, 'css-svg-icon')
      if (ts.isPropertyAssignment(node) && node.name.getText(tree) === 'label' && ts.isTemplateExpression(node.initializer) && node.initializer.templateSpans.some(s => /\.icon\b/.test(s.expression.getText(tree)))) report(node, 'subject-label-emoji')
      if (ts.isJsxText(node)) {
        const text = node.getText(tree).trim().replace(/\uFE0F/g, '')
        if (!contentNotation(node, text) && (loneGlyph.test(text) || subjectFlag.test(text) || (interactive(node) && actionArrow.test(text)))) report(node, 'text-ui-glyph')
      }
      if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent)) rendered(node.expression, interactive(node))
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return issues
}
