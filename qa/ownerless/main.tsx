import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../../src/lib/supabase';
import { useGroups, useAllStudentsSnapshot, reloadAllStudents } from '../../src/lib/useGroups';
import { useHomework, useHardSubmissions } from '../../src/lib/useHomework';
import './style.css';
function Stand() {
    const groups = useGroups(), students = useAllStudentsSnapshot(), homework = useHomework(), hard = useHardSubmissions();
    const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [actor, setActor] = useState('Нет сессии'), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [passwordSha256, setPasswordSha256] = useState('');
    useEffect(() => { void crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)).then(b => setPasswordSha256([...new Uint8Array(b)].map(n => n.toString(16).padStart(2, '0')).join(''))); }, [password]);
    const run = async (f: () => Promise<unknown>) => { setBusy(true); setNotice(''); try {
        await f();
        setNotice('Готово');
    }
    catch (e) {
        setNotice(String(e));
    }
    finally {
        setBusy(false);
    } };
    useEffect(() => { const { data } = supabase.auth.onAuthStateChange((_evt, session) => setActor(session?.user?.user_metadata?.name ?? 'Нет сессии')); return () => data.subscription.unsubscribe(); }, []);
    const lists = { groups: { loading: groups.loading, value: groups.groups }, students, homework: { loading: homework.loading, value: homework.homework }, hard: { loading: hard.loading, value: hard.submissions } };
    useEffect(() => { (window as any).__ownerlessQA = { actor, lists, notice, busy, passwordLength: password.length, passwordSha256, qaEmail: email }; document.documentElement.dataset.ready = Object.values(lists).every(x => !x.loading) && !busy ? 'true' : 'false'; });
    const login = () => run(async () => { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error)
        throw error; });
    const logout = () => run(async () => { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error)
        throw error; setEmail(''); setPassword(''); });
    return <main><header><h1>Искра · проверка PR29</h1><p>Отдельный QA-стенд настоящих загрузчиков · локальный сервер</p><strong data-testid="actor">{actor}</strong></header>
 <section aria-label="Сессия"><label>Email<input aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="none" autoCorrect="off"/></label><label>Пароль<input aria-label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)}/></label><div className="actions"><button onClick={login}>Войти</button><button onClick={logout}>Выйти локально</button></div><output role="status">{busy ? 'Загрузка…' : notice}</output></section>
 <div className="grid">{Object.entries(lists).map(([key, snap]) => <section key={key} data-testid={key}><h2>{({ groups: 'Группы', students: 'Ученики', homework: 'Домашние задания', hard: 'Сложные сдачи' } as any)[key]}</h2><button aria-label={'Обновить ' + key} onClick={() => run(({ groups: groups.reload, students: reloadAllStudents, homework: homework.reload, hard: hard.reload } as any)[key])}>Обновить {key}</button><p data-loading={snap.loading}>{snap.loading ? 'Загрузка…' : `Записей: ${snap.value.length}`}</p><ul>{snap.value.map((row: any) => <li key={row.id} data-row-id={row.id}>{row.name ?? row.title ?? row.lessonTitle} <small>{row.studentName ?? ''}</small></li>)}</ul></section>)}</div></main>;
}
createRoot(document.getElementById('root')!).render(<Stand />);
