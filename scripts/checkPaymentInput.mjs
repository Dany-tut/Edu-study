import assert from 'node:assert/strict'
import { paymentAmount, paymentLessons } from '../src/lib/paymentInput.ts'
for (const [input, expected] of [['1000', 1000], ['4 500', 4500], ['4\u00a0500', 4500], ['0001', 1], ['2147483647', 2147483647]]) assert.equal(paymentAmount(input), expected)
for (const input of ['-100', '+100', '100.50', '100,50', '1e3', 'Infinity', 'NaN', '0', '', '2147483648', '999999999999999999999']) assert.equal(paymentAmount(input), null, input)
for (const [input, expected] of [['0', 0], ['2', 2], [' 4 ', 4]]) assert.equal(paymentLessons(input), expected)
for (const input of ['-2', '2.5', '1e3', '', '2147483648']) assert.equal(paymentLessons(input), null, input)
console.log('PASS: whole-ruble validation preserves accepted values and rejects signs, decimals, exponents, invalid counts and int4 overflow')
