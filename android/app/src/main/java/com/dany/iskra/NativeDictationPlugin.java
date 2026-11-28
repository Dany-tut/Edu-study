package com.dany.iskra;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

/**
 * Ответ голосом в приложении — системным распознаванием Android
 * (SpeechRecognizer). Бесплатно. Договор тот же, что у
 * NativeDictationPlugin.swift: события dictationText {id, text} и
 * dictationLevel {id, level}, stop() → {text, sec}.
 *
 * ЗАПИСИ ДЛЯ УЧИТЕЛЯ ЗДЕСЬ НЕТ: распознаватель Android держит микрофон сам и
 * звук наружу не отдаёт, а второй владелец микрофона его бы заглушил. Учитель
 * получает текст; запись — только с айфона и ПК.
 *
 * Распознаватель закрывает сессию на паузе в речи — поднимаем заново, пока не
 * сказали stop(), и копим сказанное по всем сессиям (как listenLong в asr.ts).
 */
@CapacitorPlugin(
    name = "NativeDictation",
    permissions = { @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class NativeDictationPlugin extends Plugin {

    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private String lang = "ru-RU";
    private int id = 0;
    private boolean active = false;
    private String finals = "";
    private String partial = "";
    private long startedAt = 0;
    private int quickFails = 0;
    private long sessionAt = 0;
    private PluginCall stopCall;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject out = new JSObject();
        out.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(out);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "onMicPermission");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void onMicPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) begin(call);
        else call.reject("Нет доступа к микрофону", "denied");
    }

    private void begin(PluginCall call) {
        lang = call.getString("lang", "ru-RU");
        id = call.getInt("id", 0);
        main.post(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("Распознавание речи на телефоне недоступно", "unavailable");
                return;
            }
            destroy();
            finals = "";
            partial = "";
            quickFails = 0;
            active = true;
            startedAt = System.currentTimeMillis();
            open();
            call.resolve();
        });
    }

    private String text() {
        return (finals + " " + partial).replaceAll("\\s+", " ").trim();
    }

    private void open() {
        recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}
            @Override public void onEvent(int eventType, Bundle params) {}

            @Override public void onRmsChanged(float rmsdB) {
                JSObject d = new JSObject();
                d.put("id", id);
                d.put("level", Math.max(0, Math.min(1, (rmsdB + 2) / 12)));
                notifyListeners("dictationLevel", d);
            }

            @Override public void onPartialResults(Bundle results) {
                ArrayList<String> r = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (r != null && !r.isEmpty()) {
                    partial = r.get(0);
                    emit();
                }
            }

            @Override public void onResults(Bundle results) {
                ArrayList<String> r = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                String said = r != null && !r.isEmpty() ? r.get(0) : partial;
                finals = (finals + " " + said).trim();
                partial = "";
                emit();
                next(false);
            }

            @Override public void onError(int error) {
                // Нет речи / таймаут — штатная пауза, слушаем дальше. Запрет
                // микрофона и занятый распознаватель перезапуском не лечатся.
                boolean fatal = error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS
                    || error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY;
                if (!partial.isEmpty()) { finals = (finals + " " + partial).trim(); partial = ""; }
                next(fatal);
            }
        });
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 4000L);
        sessionAt = System.currentTimeMillis();
        recognizer.startListening(intent);
    }

    private void emit() {
        JSObject d = new JSObject();
        d.put("id", id);
        d.put("text", text());
        notifyListeners("dictationText", d);
    }

    /** Сессия закрылась: дослушали (stop) — отдаём текст; иначе поднимаем заново. */
    private void next(boolean fatal) {
        quickFails = System.currentTimeMillis() - sessionAt < 1500 ? quickFails + 1 : 0;
        if (stopCall != null || !active || fatal || quickFails >= 3) {
            finish();
            return;
        }
        main.post(() -> {
            if (recognizer != null) recognizer.destroy();
            if (active && stopCall == null) open();
        });
    }

    private void finish() {
        active = false;
        PluginCall call = stopCall;
        stopCall = null;
        main.post(this::destroy);
        if (call != null) {
            JSObject out = new JSObject();
            out.put("text", text());
            out.put("sec", Math.max(1, Math.round((System.currentTimeMillis() - startedAt) / 1000f)));
            call.resolve(out);
        } else {
            // Распознаватель сдался сам — сообщаем, JS закончит вставку.
            JSObject d = new JSObject();
            d.put("id", id);
            d.put("text", text());
            notifyListeners("dictationEnd", d);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (!active || recognizer == null) {
            JSObject out = new JSObject();
            out.put("text", text());
            out.put("sec", 1);
            call.resolve(out);
            return;
        }
        stopCall = call;
        main.post(() -> {
            if (recognizer != null) recognizer.stopListening();
            // Распознаватель не ответил — не держим ученика дольше полутора секунд.
            main.postDelayed(() -> { if (stopCall == call) finish(); }, 1500);
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        active = false;
        stopCall = null;
        main.post(() -> { destroy(); call.resolve(); });
    }

    private void destroy() {
        if (recognizer != null) {
            try { recognizer.cancel(); } catch (Exception ignored) {}
            recognizer.destroy();
            recognizer = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        destroy();
    }
}
