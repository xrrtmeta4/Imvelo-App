package app.lovable.b4f47cfe1b284d6ea4df806ad32c6fc9;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import android.app.Activity;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import android.Manifest;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdValue;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.OnPaidEventListener;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdLoader;
import com.google.android.gms.ads.nativead.NativeAdOptions;
import com.google.android.gms.ads.nativead.NativeAdCallback;
import com.google.android.gms.ads.nativead.NativeAdImage;
import org.json.JSONArray;
import org.json.JSONException;
import java.util.List;

/**
 * Registers this class as a native ad loader. The ad is loaded with the GMA
 * Next-Gen SDK so impressions, clicks and onPaidEvent (revenue) are recorded
 * correctly. Asset fields are returned to the JS layer so the web UI can render
 * them (Capacitor best practice: native ad assets displayed in JS).
 */
@CapacitorPlugin(
    name = "ImveloNativeAd",
    permissions = { @Permission(alias = "network", strings = { Manifest.permission.ACCESS_NETWORK_STATE, Manifest.permission.INTERNET }) }
)
public class ImveloNativeAd extends Plugin {

    static {
        // Ensure GMA is initialized before any load (no-op if already initialized).
    }

    private static final String DEFAULT_AD_UNIT = "ca-app-pub-2820576027993732/5824833394";
    private static final String KEY_AD_UNIT_ID = "adUnitId";
    private static final String EVENT_PAID = "onNativeAdPaid";
    private static final String EVENT_CLICKED = "onNativeAdClicked";
    private static final String EVENT_FAILED = "onNativeAdFailed";

    private @Nullable NativeAd currentAd;

    @Override
    public void load() {
        Activity activity = getActivity();
        if (activity != null) {
            MobileAds.initialize(activity.getApplicationContext(), new OnInitializationCompleteListener() {
                @Override
                public void onInitializationComplete(@NonNull InitializationStatus status) {}
            });
        }
    }

    @PluginMethod
    public void loadAd(@NonNull PluginCall call) {
        String adUnitId = call.getString(KEY_AD_UNIT_ID);
        if (adUnitId == null || adUnitId.isEmpty()) {
            adUnitId = DEFAULT_AD_UNIT;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }

        NativeAdLoader loader = new NativeAdLoader.Builder(activity, adUnitId)
                .withAdListener(new com.google.android.gms.ads.AdListener() {
                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError adError) {
                        super.onAdFailedToLoad(adError);
                        JSObject err = new JSObject();
                        err.put("message", adError.getMessage());
                        err.put("code", adError.getCode());
                        notifyListeners(EVENT_FAILED, err);
                        call.reject("Native ad failed to load: " + adError.getMessage(), adError.toString());
                    }

                    @Override
                    public void onPaidEvent(@NonNull AdValue adValue) {
                        super.onPaidEvent(adValue);
                        JSObject paid = new JSObject();
                        paid.put("valueMicros", adValue.getValueMicros());
                        paid.put("currencyCode", adValue.getCurrencyCode());
                        paid.put("precision", adValue.getPrecisionName());
                        notifyListeners(EVENT_PAID, paid);
                    }

                    @Override
                    public void onAdClicked() {
                        super.onAdClicked();
                        notifyListeners(EVENT_CLICKED, new JSObject());
                    }
                })
                .withNativeAdOptions(new NativeAdOptions.Builder()
                        .setReturnUrlsForImageAssets(true)
                        .build())
                .build();

        loader.setNativeAdCallback(new NativeAdCallback() {
            @Override
            public void onNativeAdLoaded(@NonNull NativeAd nativeAd) {
                super.onNativeAdLoaded(nativeAd);
                if (currentAd != null) {
                    currentAd.destroy();
                }
                currentAd = nativeAd;

                JSObject result = new JSObject();
                result.put("headline", nativeAd.getHeadline());
                result.put("body", nativeAd.getBody() != null ? nativeAd.getBody() : "");
                result.put("callToAction", nativeAd.getCallToAction() != null ? nativeAd.getCallToAction() : "");
                result.put("advertiser", nativeAd.getAdvertiserName() != null ? nativeAd.getAdvertiserName() : "");
                result.put("store", nativeAd.getStore() != null ? nativeAd.getStore() : "");
                result.put("price", nativeAd.getPrice() != null ? nativeAd.getPrice() : "");
                result.put("starRating", nativeAd.getStarRating() != null ? nativeAd.getStarRating().doubleValue() : 0.0);

                if (nativeAd.getIcon() != null) {
                    result.put("iconUrl", nativeAd.getIcon().getUri().toString());
                } else {
                    result.put("iconUrl", "");
                }

                List<NativeAdImage> images = nativeAd.getImages();
                if (images != null && !images.isEmpty()) {
                    JSONArray arr = new JSONArray();
                    for (int i = 0; i < images.size(); i++) {
                        NativeAdImage img = images.get(i);
                        if (img != null && img.getUri() != null) {
                            arr.put(img.getUri().toString());
                        }
                    }
                    result.put("imageUrls", arr);
                } else {
                    result.put("imageUrls", new JSONArray());
                }

                call.resolve(result);
            }

            @Override
            public void onNativeAdFailedToLoad(@NonNull LoadAdError adError) {
                super.onNativeAdFailedToLoad(adError);
                JSObject err = new JSObject();
                err.put("message", adError.getMessage());
                err.put("code", adError.getCode());
                notifyListeners(EVENT_FAILED, err);
                call.reject("Native ad failed to load: " + adError.getMessage(), adError.toString());
            }
        });

        loader.loadAd(new AdRequest.Builder().build());
    }

    @PluginMethod
    public void destroyAd(@NonNull PluginCall call) {
        destroyCurrentAd();
        call.resolve();
    }

    private void destroyCurrentAd() {
        if (currentAd != null) {
            currentAd.destroy();
            currentAd = null;
        }
    }

    @Override
    public void handleDestroy() {
        destroyCurrentAd();
        super.handleDestroy();
    }
}
