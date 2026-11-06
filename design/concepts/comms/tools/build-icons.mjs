// Собирает нужные Loop-иконки из design/ios-concepts/loop-kit/svg в icons.js.
// Цвета остаются как в наборе; kit.css перекрашивает их токенами --loop-ink / --loop-detail.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../../../ios-concepts/loop-kit/svg');
const names = `Bell BellOff Send Clock Calendar CalendarClock CalendarX CalendarDays CalendarCheck BookOpen ClipboardList
ClipboardCheck AlertTriangle CircleAlert Check CheckCheck CheckCircle2 Moon Sun Users User UserPlus Sparkles Pencil PenLine
Banknote Wallet CreditCard Link2 Copy MessageCircle Settings ChevronRight ChevronLeft ChevronDown ArrowRight Eye Phone
Repeat TrendingUp TrendingDown Trophy Target Lightbulb X Plus Timer ListChecks Filter ScrollText Share2 Zap Home Inbox
Undo2 MoreHorizontal RefreshCw Lock ShieldCheck Percent GraduationCap Flame Star BarChart3 ExternalLink Info
FileText Mail GripVertical LayoutDashboard LayoutGrid Monitor LayoutList Rows3 SlidersHorizontal Search Pause Play ArrowRightLeft`.split(/\s+/);
const out = {};
const missing = [];
for (const n of names) {
  try { out[n] = readFileSync(join(src, n + '.svg'), 'utf8').trim().replace(/ width="32" height="32"/, ''); }
  catch { missing.push(n); }
}
writeFileSync(join(here, '../icons.js'),
  '// Сгенерировано tools/build-icons.mjs из loop-kit — не править руками.\nwindow.LOOP = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(out).length, 'icons; missing:', missing.join(' ') || '—');
