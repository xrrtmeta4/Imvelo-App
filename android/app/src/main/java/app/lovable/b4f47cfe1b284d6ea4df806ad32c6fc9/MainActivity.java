package app.lovable.b4f47cfe1b284d6ea4df806ad32c6fc9;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImveloNativeAd.class);
        super.onCreate(savedInstanceState);
    }
}
