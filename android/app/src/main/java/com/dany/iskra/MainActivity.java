package com.dany.iskra;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Локальный плагин из папки приложения регистрируется вручную, до super.
        registerPlugin(NativeSpeechPlugin.class);
        registerPlugin(SystemChromePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
