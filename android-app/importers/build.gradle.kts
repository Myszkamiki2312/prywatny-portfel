// Pure JVM module: broker CSV import, with no Android dependency.
//
// Kept out of :app for the same reason :tax is. The import must produce exactly the operations
// backend/importers.py produces from the same file — a phone that maps a column differently writes
// wrong operations into the portfolio and nothing later can tell. Pinning that needs a test that
// runs anywhere: a plain JDK, no Android SDK, no emulator.
//
// :app depends on this module and only adapts JSON to and from it.
plugins {
    kotlin("jvm")
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    testImplementation(kotlin("test"))
    // Reads tests/fixtures/importer-spec.json, the contract shared with the Python implementation.
    testImplementation("org.json:json:20240303")
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("failed")
        showStandardStreams = false
    }
}
