// Pure JVM module: the tax and option calculations, with no Android dependency.
//
// Kept out of :app on purpose. These calculations must match backend/parity_tools.py exactly, and
// pinning them needs a test that runs anywhere — a plain JDK, with no Android SDK and no emulator.
// :app depends on this module and only adapts JSON to and from it.
plugins {
    kotlin("jvm")
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    testImplementation(kotlin("test"))
    // Reads tests/fixtures/tax-spec.json, the contract shared with the Python implementation.
    testImplementation("org.json:json:20240303")
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("failed")
        showStandardStreams = false
    }
}
