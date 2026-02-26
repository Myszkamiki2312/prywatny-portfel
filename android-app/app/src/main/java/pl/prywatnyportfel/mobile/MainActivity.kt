package pl.prywatnyportfel.mobile

import android.annotation.SuppressLint
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var backendStatusText: TextView
    private lateinit var changeBackendBtn: Button
    private lateinit var reloadBtn: Button

    private var fileChooserCallback: android.webkit.ValueCallback<Array<Uri>>? = null

    private val chooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = fileChooserCallback ?: return@registerForActivityResult
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            callback.onReceiveValue(uris)
            fileChooserCallback = null
        }

    private val prefs by lazy { getSharedPreferences(PREFS_NAME, MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        backendStatusText = findViewById(R.id.backendStatusText)
        changeBackendBtn = findViewById(R.id.changeBackendBtn)
        reloadBtn = findViewById(R.id.reloadBtn)

        configureWebView()

        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }

        reloadBtn.setOnClickListener {
            webView.reload()
        }

        changeBackendBtn.setOnClickListener {
            showBackendUrlDialog()
        }

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        finish()
                    }
                }
            }
        )

        webView.loadUrl(currentBackendUrl())
        pingBackendAsync()
    }

    override fun onResume() {
        super.onResume()
        pingBackendAsync()
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        webView.destroy()
        super.onDestroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.setSupportZoom(true)
        settings.builtInZoomControls = true
        settings.displayZoomControls = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                swipeRefresh.isRefreshing = false
                pingBackendAsync()
            }

            @Deprecated("Deprecated in Java")
            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                swipeRefresh.isRefreshing = false
                updateBackendStatus(online = false)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: android.webkit.ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback
                return try {
                    chooserLauncher.launch(fileChooserParams?.createIntent())
                    true
                } catch (_: Exception) {
                    fileChooserCallback = null
                    false
                }
            }
        }
    }

    private fun showBackendUrlDialog() {
        val input = EditText(this)
        input.setText(currentBackendUrl())
        input.hint = getString(R.string.backend_url_hint)

        AlertDialog.Builder(this)
            .setTitle(R.string.backend_url_title)
            .setView(input)
            .setPositiveButton(R.string.save) { _, _ ->
                val normalized = normalizeBackendUrl(input.text?.toString().orEmpty())
                if (normalized == null) {
                    Toast.makeText(this, getString(R.string.backend_url_invalid), Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                prefs.edit().putString(KEY_BACKEND_URL, normalized).apply()
                webView.loadUrl(normalized)
                pingBackendAsync()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun normalizeBackendUrl(raw: String): String? {
        val trimmed = raw.trim().trimEnd('/')
        if (!(trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
            return null
        }
        return trimmed
    }

    private fun currentBackendUrl(): String {
        return prefs.getString(KEY_BACKEND_URL, getString(R.string.default_backend_url))
            ?: getString(R.string.default_backend_url)
    }

    private fun pingBackendAsync() {
        Thread {
            val url = "${currentBackendUrl()}/api/health"
            val online = try {
                val conn = URL(url).openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 3000
                conn.readTimeout = 3000
                conn.instanceFollowRedirects = true
                conn.connect()
                val ok = conn.responseCode in 200..299
                conn.disconnect()
                ok
            } catch (_: Exception) {
                false
            }
            runOnUiThread {
                updateBackendStatus(online)
            }
        }.start()
    }

    private fun updateBackendStatus(online: Boolean) {
        val backendUrl = currentBackendUrl()
        backendStatusText.text = if (online) {
            getString(R.string.backend_online, backendUrl)
        } else {
            getString(R.string.backend_offline, backendUrl)
        }
        val color = if (online) {
            ContextCompat.getColor(this, R.color.status_online)
        } else {
            ContextCompat.getColor(this, R.color.status_offline)
        }
        backendStatusText.setTextColor(color)
    }

    companion object {
        private const val PREFS_NAME = "mobile_config"
        private const val KEY_BACKEND_URL = "backend_url"
    }
}
