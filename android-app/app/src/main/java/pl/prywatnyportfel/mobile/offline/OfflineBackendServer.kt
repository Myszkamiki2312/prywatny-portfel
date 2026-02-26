package pl.prywatnyportfel.mobile.offline

import android.content.Context
import io.ktor.http.ContentType
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.application.ApplicationCall
import io.ktor.server.engine.ApplicationEngine
import io.ktor.server.engine.embeddedServer
import io.ktor.server.cio.CIO
import io.ktor.server.request.httpMethod
import io.ktor.server.request.receiveText
import io.ktor.server.response.respondBytes
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.method
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import java.io.FileNotFoundException

class OfflineBackendServer(
    private val context: Context,
    private val repository: OfflineRepository,
    private val port: Int = DEFAULT_PORT
) {
    private var server: ApplicationEngine? = null

    val baseUrl: String
        get() = "http://127.0.0.1:$port"

    fun start() {
        if (server != null) {
            return
        }
        server = embeddedServer(
            factory = CIO,
            host = "127.0.0.1",
            port = port
        ) {
            routing {
                route("/api/{apiPath...}") {
                    method(HttpMethod.Get) { processApiRequest(call) }
                    method(HttpMethod.Post) { processApiRequest(call) }
                    method(HttpMethod.Put) { processApiRequest(call) }
                    method(HttpMethod.Delete) { processApiRequest(call) }
                    method(HttpMethod.Options) { processApiRequest(call) }
                }

                get("/") {
                    call.serveAsset("index.html")
                }

                get("/{path...}") {
                    val parts = call.parameters.getAll("path") ?: emptyList()
                    val rawPath = parts.joinToString("/")
                    val normalizedPath = if (rawPath.isBlank()) "index.html" else rawPath
                    if (normalizedPath.contains("..") || normalizedPath.startsWith("api/")) {
                        call.respondText("Not found", status = HttpStatusCode.NotFound)
                        return@get
                    }
                    try {
                        call.serveAsset(normalizedPath)
                    } catch (_: FileNotFoundException) {
                        call.respondText("Not found", status = HttpStatusCode.NotFound)
                    }
                }
            }
        }.start(wait = false)
    }

    fun stop() {
        server?.stop(gracePeriodMillis = 500, timeoutMillis = 1200)
        server = null
    }

    private suspend fun io.ktor.server.application.ApplicationCall.serveAsset(path: String) {
        val assetPath = "www/$path"
        val bytes = context.assets.open(assetPath).use { it.readBytes() }
        respondBytes(bytes = bytes, contentType = contentTypeFor(path), status = HttpStatusCode.OK)
    }

    private suspend fun processApiRequest(call: ApplicationCall) {
        val pathSegments = call.parameters.getAll("apiPath") ?: emptyList()
        val apiPath = "/" + pathSegments.joinToString("/")
        val method = call.request.httpMethod.value
        val body = if (call.request.httpMethod in listOf(HttpMethod.Post, HttpMethod.Put, HttpMethod.Delete)) {
            call.receiveText()
        } else {
            ""
        }
        val result = repository.dispatch(method, apiPath, call.request.queryParameters, body)
        val status = HttpStatusCode.fromValue(result.status)
        call.respondText(
            text = result.body,
            contentType = ContentType.Application.Json,
            status = status
        )
    }

    private fun contentTypeFor(path: String): ContentType {
        return when {
            path.endsWith(".html", ignoreCase = true) -> ContentType.Text.Html
            path.endsWith(".js", ignoreCase = true) -> ContentType.Application.JavaScript
            path.endsWith(".css", ignoreCase = true) -> ContentType.Text.CSS
            path.endsWith(".json", ignoreCase = true) -> ContentType.Application.Json
            path.endsWith(".svg", ignoreCase = true) -> ContentType.Image.SVG
            path.endsWith(".png", ignoreCase = true) -> ContentType.Image.PNG
            path.endsWith(".jpg", ignoreCase = true) || path.endsWith(".jpeg", ignoreCase = true) -> ContentType.Image.JPEG
            else -> ContentType.Application.OctetStream
        }
    }

    companion object {
        const val DEFAULT_PORT = 18765
    }
}
