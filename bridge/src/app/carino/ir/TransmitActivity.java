package app.carino.ir;

import android.app.Activity;
import android.content.Intent;
import android.hardware.ConsumerIrManager;
import android.net.Uri;
import android.os.Bundle;

/** Receives a mark/space pattern from the Cariño page and fires the phone LED. */
public class TransmitActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            transmit(getIntent());
        } catch (RuntimeException ignored) {
        }
        finish();
        overridePendingTransition(0, 0);
    }

    private void transmit(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        int frequency = 38000;
        String pattern = null;
        if (data != null) {
            String rawFrequency = data.getQueryParameter("frequency");
            if (rawFrequency != null) frequency = Integer.parseInt(rawFrequency);
            pattern = data.getQueryParameter("pattern");
        }
        if (intent != null && intent.hasExtra("frequency")) {
            frequency = intent.getIntExtra("frequency", frequency);
        }
        if (pattern == null && intent != null) pattern = intent.getStringExtra("pattern");
        if (pattern == null || pattern.length() == 0) return;
        if (frequency < 20000 || frequency > 60000) frequency = 38000;

        String[] parts = pattern.split(",");
        int[] timings = new int[parts.length];
        int count = 0;
        for (int i = 0; i < parts.length; i++) {
            String piece = parts[i].trim();
            if (piece.length() == 0) continue;
            int value = Integer.parseInt(piece);
            if (value <= 0 || value > 200000) return;
            timings[count++] = value;
        }
        if (count < 4) return;
        if (count < timings.length) {
            int[] trimmed = new int[count];
            System.arraycopy(timings, 0, trimmed, 0, count);
            timings = trimmed;
        }

        ConsumerIrManager ir = (ConsumerIrManager) getSystemService(CONSUMER_IR_SERVICE);
        if (ir != null && ir.hasIrEmitter()) ir.transmit(frequency, timings);
    }
}
