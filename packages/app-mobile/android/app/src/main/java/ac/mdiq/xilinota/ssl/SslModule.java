package ac.mdiq.xilinota.ssl;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.network.NetworkingModule;

import java.util.concurrent.atomic.AtomicBoolean;

import static ac.mdiq.xilinota.ssl.SslUtils.TRUST_ALL_CERTS;
import static ac.mdiq.xilinota.ssl.SslUtils.getTrustySocketFactory;

public class SslModule extends ReactContextBaseJavaModule {

    private final AtomicBoolean current = new AtomicBoolean(false);

    @NonNull
    @Override
    public String getName() {
        return "SslModule";
    }

    @ReactMethod
    public void setIgnoreTlsErrors(boolean isIgnoreTlsErrors, Promise promise) {
        Log.d("Xilinota", "Set ignore TLS errors: " + isIgnoreTlsErrors);
        try {
            boolean prev = current.getAndSet(isIgnoreTlsErrors);
            if (isIgnoreTlsErrors) {
                NetworkingModule.setCustomClientBuilder(
                        builder -> {
                            builder.sslSocketFactory(getTrustySocketFactory(), TRUST_ALL_CERTS);
                            builder.hostnameVerifier((hostname, session) -> true);
                        });
            } else {
                NetworkingModule.setCustomClientBuilder(null);
            }
            promise.resolve(prev);
        } catch (Exception e) {
            Log.e("Xilinota", "Error disabling TLS validation", e);
            promise.reject(e);
        }
    }
}
