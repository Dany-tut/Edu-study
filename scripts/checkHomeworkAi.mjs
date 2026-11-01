import assert from 'node:assert/strict'
import { aiCommentHtml, homeworkAiIssue } from '../src/lib/homeworkAiState.ts'
assert.equal(aiCommentHtml('<img src=x onerror="alert(1)">\nтекст'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;<br>текст')
assert.equal(homeworkAiIssue('rate_limit').retry,true)
assert.equal(homeworkAiIssue('credentials').retry,false)
assert.equal(homeworkAiIssue('configuration').retry,false)
assert.equal(homeworkAiIssue('private-provider-stack').text.includes('private-provider-stack'),false)
console.log('Homework AI: escaped rich-editor content and safe, actionable error messages passed.')
