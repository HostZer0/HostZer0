package br.com.contad.escala;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.OutputStream;

/**
 * Abre a página escala.html (empacotada em assets) num WebView.
 * A ponte "AndroidApp" permite à página salvar arquivos (CSV/backup) e imprimir.
 */
public class MainActivity extends Activity {
    private static final String START_URL = "file:///android_asset/escala.html";
    private static final int REQ_SAVE = 1;
    private static final int REQ_OPEN = 2;

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingContent;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.parseColor("#0c1729"));

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setUserAgentString(s.getUserAgentString() + " ContadEscalaApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("file:///android_asset/")) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception e) {
                    toast("Não foi possível abrir o link.");
                }
                return true;
            }
        });

        // Um WebChromeClient é necessário para alert()/confirm() e para o <input type="file">.
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(i, REQ_OPEN);
                    return true;
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
            }
        });

        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        setContentView(web);

        if (state != null) web.restoreState(state);
        else web.loadUrl(START_URL);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        Uri uri = (result == RESULT_OK && data != null) ? data.getData() : null;
        if (request == REQ_OPEN) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(uri != null ? new Uri[]{uri} : null);
                fileCallback = null;
            }
        } else if (request == REQ_SAVE) {
            if (uri != null && pendingContent != null) writeTo(uri, pendingContent);
            pendingContent = null;
        } else {
            super.onActivityResult(request, result, data);
        }
    }

    private void writeTo(Uri uri, String content) {
        try {
            OutputStream os = getContentResolver().openOutputStream(uri);
            try {
                os.write(content.getBytes("UTF-8"));
            } finally {
                os.close();
            }
            toast("Arquivo salvo.");
        } catch (Exception e) {
            toast("Erro ao salvar: " + e.getMessage());
        }
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
    }

    /** Métodos chamados pelo JavaScript da página (rodam fora da thread de UI). */
    public class Bridge {
        @JavascriptInterface
        public void saveFile(final String name, final String mime, final String content) {
            runOnUiThread(new Runnable() {
                public void run() {
                    pendingContent = content;
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType(mime.split(";")[0].trim());
                    i.putExtra(Intent.EXTRA_TITLE, name);
                    try {
                        startActivityForResult(i, REQ_SAVE);
                    } catch (Exception e) {
                        pendingContent = null;
                        toast("Não foi possível salvar o arquivo.");
                    }
                }
            });
        }

        @JavascriptInterface
        public void print(final String title) {
            runOnUiThread(new Runnable() {
                public void run() {
                    PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                    PrintAttributes attrs = new PrintAttributes.Builder()
                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4.asLandscape())
                            .build();
                    pm.print(title, web.createPrintDocumentAdapter(title), attrs);
                }
            });
        }
    }
}
