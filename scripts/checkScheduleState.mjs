import assert from 'node:assert/strict'
import { getScheduleState, pickScheduleFocus } from '../src/lib/scheduleState.ts'

const slot = { date: '2026-11-01', time: '15:00', endTime: '16:00' }
const at = (clock, extra = {}) => getScheduleState({ ...slot, ...extra }, new Date(`2026-11-01T${clock}+03:00`), 'Europe/Moscow')
assert.equal(at('14:59:59').phase, 'upcoming')
assert.equal(at('14:59:59').secondsUntil, 1)
assert.equal(at('15:00:00').phase, 'scheduled_now')
assert.equal(at('15:01:00').isCurrent, true)
assert.equal(at('15:59:59').hasEnded, false)
assert.equal(at('16:00:00').phase, 'elapsed')
assert.equal(at('14:59:59', { status: 'live' }).phase, 'live')
assert.equal(at('16:10:00', { status: 'live' }).phase, 'live')
assert.equal(at('15:01:00', { status: 'completed' }).phase, 'completed')
assert.equal(at('15:01:00', { status: 'cancelled' }).isCurrent, false)
assert.equal(at('15:01:00', { status: 'cancelled' }).hasEnded, false)
assert.equal(at('21:00:00', { endTime: undefined }).phase, 'scheduled_now')
assert.equal(at('21:00:00', { endTime: '15:00' }).phase, 'scheduled_now')
assert.equal(getScheduleState({ ...slot, endTime: undefined }, new Date('2026-11-02T00:00:00+03:00'), 'Europe/Moscow').phase, 'elapsed')
assert.equal(at('15:00:00', { materialOnly: true }).phase, 'available')
assert.equal(at('14:59:59', { materialOnly: true }).phase, 'upcoming')
assert.equal(at('15:00:00', { time: '' }).phase, 'today')
assert.equal(at('15:00:00', { time: 'wrong' }).phase, 'unknown')

const overnight = { date: '2026-11-01', time: '23:30', endTime: '00:30' }
assert.equal(getScheduleState(overnight, new Date('2026-11-02T00:15:00+03:00'), 'Europe/Moscow').phase, 'scheduled_now')
assert.equal(getScheduleState(overnight, new Date('2026-11-02T00:30:00+03:00'), 'Europe/Moscow').phase, 'elapsed')
const instant = new Date('2026-11-01T14:00:00+03:00')
assert.equal(getScheduleState(slot, instant, 'Europe/Moscow').secondsUntil, 3600)
assert.equal(getScheduleState({ ...slot, time: '19:00', endTime: '20:00' }, instant, 'Asia/Bangkok').secondsUntil, 3600)
const absolute = { date: '2026-11-01', time: '01:30', endTime: '01:30', startsAt: '2026-11-01T05:30:00Z', endsAt: '2026-11-01T06:30:00Z' }
assert.equal(getScheduleState(absolute, new Date('2026-11-01T06:00:00Z'), 'America/New_York').phase, 'scheduled_now')
assert.equal(getScheduleState(absolute, new Date('2026-11-01T06:30:00Z'), 'America/New_York').phase, 'elapsed')

const future = at('14:00:00')
const live = at('15:01:00', { status: 'live' })
const current = at('15:01:00')
const cancelled = at('15:01:00', { status: 'cancelled' })
assert.equal(pickScheduleFocus([future, current, live]), 2)
assert.equal(pickScheduleFocus([future, cancelled, current]), 2)
assert.equal(pickScheduleFocus([cancelled, at('16:01:00')]), -1)
assert.equal(pickScheduleFocus([]), -1)
console.log('PASS: exact boundaries, teacher overrides, unknown ends, overnight, timezones, DST, materials and focus selection')
