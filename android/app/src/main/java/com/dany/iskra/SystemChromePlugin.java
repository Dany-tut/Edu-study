package com.dany.iskra;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Системные полосы Android по теме ПРИЛОЖЕНИЯ, а не системы — аналог моста
 * NativeGlass.setAppearance на iOS.
 *
 * Тема кабинета своя (themeStore, data-theme). Без этого плагина:
 *  - иконки статус-бара и полосы навигации брались по теме системы — светлые
 *    иконки на светлом экране или наоборот;
 *  - на WebView без «safe area fix» Capacitor отодвигает страницу паддингом,
 *    и под полосами виден фон окна — чёрная полоса под светлым экраном.
 * Плагин красит этот фон в фон приложения и выставляет иконки под тему.
 */
@CapacitorPlugin(name = "SystemChrome")
public class SystemChromePlugin extends Plugin {

    /** Фоны приложения — те же, что --color-bg в index.css. */
    private static final int BG_LIGHT = Color.parseColor("#F5F5F6");
    private static final int BG_DARK = Color.parseColor("#111113");

    /** Последняя тема от JS; null — ещё не приходила (тогда ничего не трогаем). */
    private Boolean dark = null;

    private final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        // Возврат в приложение: система перекрашивает иконки полос по новой
        // конфигурации ПОСЛЕ onResume — фокус окна приходит последним, на нём и
        // возвращаем тему приложения.
        getActivity().getWindow().getDecorView().getViewTreeObserver()
            .addOnWindowFocusChangeListener(hasFocus -> { if (hasFocus) reapplyLater(); });
    }

    @PluginMethod
    public void setAppearance(PluginCall call) {
        dark = call.getBoolean("dark", false);
        getActivity().runOnUiThread(() -> {
            apply();
            call.resolve();
        });
    }

    @Override
    public void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        // Смена системной темы: встроенный плагин SystemBars выставит иконки по
        // системе. Возвращаем тему приложения после него.
        reapplyLater();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        reapplyLater();
    }

    /**
     * Повторяем тему приложения после системных перекрасок: сразу, следующим
     * кадром и с запасом — система и встроенный SystemBars могут выставить
     * иконки по своей теме уже после нас (найдено тестовой сборкой: светлое
     * приложение, смена системы тёмная→светлая в фоне → белые иконки).
     */
    private void reapplyLater() {
        if (dark == null) return;
        main.removeCallbacks(applyTask);
        main.post(applyTask);
        main.postDelayed(applyTask, 150);
        main.postDelayed(applyTask, 400);
    }

    private final Runnable applyTask = this::apply;

    private void apply() {
        if (dark == null || getActivity() == null) return;
        int bg = dark ? BG_DARK : BG_LIGHT;
        Window window = getActivity().getWindow();
        View decor = window.getDecorView();
        decor.setBackgroundColor(bg);
        if (getBridge() != null && getBridge().getWebView() != null) {
            View parent = (View) getBridge().getWebView().getParent();
            if (parent != null) parent.setBackgroundColor(bg);
            getBridge().getWebView().setBackgroundColor(bg);
        }
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
        // «Светлые полосы» = тёмные иконки на светлом фоне.
        controller.setAppearanceLightStatusBars(!dark);
        controller.setAppearanceLightNavigationBars(!dark);
    }
}
