package app.lovable.b4f47cfe1b284d6ea4df806ad32c6fc9;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import android.Manifest;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdOptions;
import org.json.JSONArray;

/**
 * Loads native ads and exposes their assets to the Capacitor web layer.
 */
@CapacitorPlugin(
    name = "ImveloNativeAd",
    permissions = { @Permission(alias = "network", strings = { Manifest.permission.ACCESS_NETWORK_STATE, Manifest.permission.INTERNET }) }
)
public class ImveloNativeAd extends Plugin {

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

        AdLoader loader = new AdLoader.Builder(activity, adUnitId)
                .forNativeAd(nativeAd -> {
                    if (currentAd != null) {
                        currentAd.destroy();
                    }
                    currentAd = nativeAd;
                    nativeAd.setOnPaidEventListener(adValue -> {
                        JSObject paid = new JSObject();
                        paid.put("valueMicros", adValue.getValueMicros());
                        paid.put("currencyCode", adValue.getCurrencyCode());
                        paid.put("precision", Integer.toString(adValue.getPrecisionType()));
                        notifyListeners(EVENT_PAID, paid);
                    });

                    JSObject result = new JSObject();
                    result.put("headline", nativeAd.getHeadline());
                    result.put("body", nativeAd.getBody() != null ? nativeAd.getBody() : "");
                    result.put("callToAction", nativeAd.getCallToAction() != null ? nativeAd.getCallToAction() : "");
                    result.put("advertiser", nativeAd.getAdvertiser() != null ? nativeAd.getAdvertiser() : "");
                    result.put("store", nativeAd.getStore() != null ? nativeAd.getStore() : "");
                    result.put("price", nativeAd.getPrice() != null ? nativeAd.getPrice() : "");
                    result.put("starRating", nativeAd.getStarRating() != null ? nativeAd.getStarRating() : 0.0);

                    if (nativeAd.getIcon() != null && nativeAd.getIcon().getUri() != null) {
                        result.put("iconUrl", nativeAd.getIcon().getUri().toString());
                    } else {
                        result.put("iconUrl", "");
                    }

                    JSONArray imageUrls = new JSONArray();
                    if (nativeAd.getImages() != null) {
                        nativeAd.getImages().forEach(image -> {
                            if (image != null && image.getUri() != null) {
                                imageUrls.put(image.getUri().toString());
                            }
                        });
                    }
                    result.put("imageUrls", imageUrls);
                    call.resolve(result);
                })
                .withAdListener(new AdListener() {
                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError adError) {
                        JSObject err = new JSObject();
                        err.put("message", adError.getMessage());
                        err.put("code", adError.getCode());
                        notifyListeners(EVENT_FAILED, err);
                        call.reject("Native ad failed to load: " + adError.getMessage(), adError.toString());
                    }

                    @Override
                    public void onAdClicked() {
                        notifyListeners(EVENT_CLICKED, new JSObject());
                    }
                })
                .withNativeAdOptions(new NativeAdOptions.Builder()
                        .setReturnUrlsForImageAssets(true)
                        .build())
                .build();
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
    protected void handleOnDestroy() {
        destroyCurrentAd();
        super.handleOnDestroy();
    }
}
