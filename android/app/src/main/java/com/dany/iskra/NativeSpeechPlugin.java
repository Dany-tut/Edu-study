package com.dany.iskra;

import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Озвучка в приложении — системным синтезом Android, тот же договор, что у
 * NativeSpeechPlugin.swift: сюда приходит по одной реплике, speak() закрывается,
 * когда она дочитана ({done: true}) или оборвана ({done: false}).
 *
 * События: speechStart — реплика зазвучала, speechWord — голос дошёл до слова
 * (позиция в UTF-16, как charIndex у boundary в браузере).
 */
@CapacitorPlugin(name = "NativeSpeech")
public class NativeSpeechPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean ready = false;
    private boolean failed = false;
    /** Реплики, пришедшие до готовности движка: читаем последнюю. */
    private PluginCall waiting;
    /** Ключ реплики → вызов и номер, который дал JS. */
    private final Map<String, Pending> pending = new HashMap<>();
    private int seq = 0;

    private static class Pending {
        final PluginCall call;
        final int id;
        Pending(PluginCall call, int id) { this.call = call; this.id = id; }
    }

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            if (status != TextToSpeech.SUCCESS) {
                failed = true;
                if (waiting != null) { waiting.reject("Синтез речи недоступен"); waiting = null; }
                return;
            }
            // Задание на слух звучит как речь, а не как звонок: громкость медиа.
            tts.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build());
            tts.setOnUtteranceProgressListener(new Listener());
            ready = true;
            if (waiting != null) { PluginCall c = waiting; waiting = null; say(c); }
        });
    }

    @Override
    protected void handleOnDestroy() {
        cancelAll();
        if (tts != null) tts.shutdown();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        if (failed) { call.reject("Синтез речи недоступен"); return; }
        if (!ready) {
            if (waiting != null) waiting.resolve(done(false));
            waiting = call;
            return;
        }
        say(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (waiting != null) { waiting.resolve(done(false)); waiting = null; }
        cancelAll();
        call.resolve();
    }

    private void say(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "en-US");
        Float rate = call.getFloat("rate", 1f);
        String name = call.getString("voice");
        Integer id = call.getInt("id", 0);

        cancelAll();
        Voice voice = pickVoice(lang, name);
        if (voice != null) tts.setVoice(voice);
        else tts.setLanguage(Locale.forLanguageTag(lang.replace('_', '-')));
        // Rate 1 в Web Speech — обычный темп, у TextToSpeech обычный — тоже 1.
        tts.setSpeechRate(Math.max(0.1f, Math.min(4f, rate == null ? 1f : rate)));

        String key = "u" + (++seq);
        synchronized (pending) { pending.put(key, new Pending(call, id == null ? 0 : id)); }
        Bundle params = new Bundle();
        if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, key) != TextToSpeech.SUCCESS) {
            close(key, false);
        }
    }

    /** Оборвать речь. Обещания закрываем сами и сразу, как в iOS-плагине. */
    private void cancelAll() {
        List<Pending> cut;
        synchronized (pending) {
            cut = new ArrayList<>(pending.values());
            pending.clear();
        }
        if (tts != null && ready) tts.stop();
        for (Pending p : cut) p.call.resolve(done(false));
    }

    private void close(String key, boolean ok) {
        Pending p;
        synchronized (pending) { p = pending.remove(key); }
        if (p != null) p.call.resolve(done(ok));
    }

    private Pending find(String key) {
        synchronized (pending) { return pending.get(key); }
    }

    private static JSObject done(boolean ok) {
        JSObject r = new JSObject();
        r.put("done", ok);
        return r;
    }

    /**
     * Голос под локаль: выбранный по имени, если он есть, иначе лучший по
     * качеству из установленных (без сети впереди), точная локаль впереди диалекта.
     */
    private Voice pickVoice(String locale, String name) {
        Set<Voice> voices;
        try { voices = tts.getVoices(); } catch (Exception e) { return null; }
        if (voices == null || voices.isEmpty()) return null;
        Locale want = Locale.forLanguageTag(locale.replace('_', '-'));
        String lang = want.getLanguage();
        Voice best = null;
        int bestRank = Integer.MIN_VALUE;
        for (Voice v : voices) {
            Locale vl = v.getLocale();
            if (vl == null || !lang.equalsIgnoreCase(vl.getLanguage())) continue;
            Set<String> features = v.getFeatures();
            if (features != null && features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
            if (name != null && !name.isEmpty() && name.equals(v.getName())) return v;
            int rank = v.getQuality() * 4;
            if (!v.isNetworkConnectionRequired()) rank += 2;
            if (want.getCountry().equalsIgnoreCase(vl.getCountry())) rank += 1;
            if (rank > bestRank) { bestRank = rank; best = v; }
        }
        return best;
    }

    private class Listener extends UtteranceProgressListener {
        @Override
        public void onStart(String key) {
            Pending p = find(key);
            if (p == null) return;
            JSObject d = new JSObject();
            d.put("id", p.id);
            notifyListeners("speechStart", d);
        }

        @Override
        public void onRangeStart(String key, int start, int end, int frame) {
            Pending p = find(key);
            if (p == null) return;
            JSObject d = new JSObject();
            d.put("id", p.id);
            d.put("char", start);
            notifyListeners("speechWord", d);
        }

        @Override
        public void onDone(String key) { close(key, true); }

        @Override
        public void onStop(String key, boolean interrupted) { close(key, false); }

        @Override
        @SuppressWarnings("deprecation")
        public void onError(String key) { close(key, false); }

        @Override
        public void onError(String key, int errorCode) { close(key, false); }
    }
}
