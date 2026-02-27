plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
}

val defaultVersionName = "1.2.3"
val defaultVersionCode = 10203
val appVersionName = providers.gradleProperty("appVersionName")
    .orElse(providers.environmentVariable("APP_VERSION_NAME"))
    .orElse(defaultVersionName)
    .get()
val appVersionCode = providers.gradleProperty("appVersionCode")
    .orElse(providers.environmentVariable("APP_VERSION_CODE"))
    .map { raw -> raw.toIntOrNull() ?: defaultVersionCode }
    .orElse(defaultVersionCode)
    .get()

android {
    namespace = "pl.prywatnyportfel.mobile"
    compileSdk = 34

    defaultConfig {
        applicationId = "pl.prywatnyportfel.mobile"
        minSdk = 26
        targetSdk = 34
        versionCode = appVersionCode
        versionName = appVersionName

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    sourceSets {
        getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/offlineAssets"))
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("io.ktor:ktor-server-core:2.3.12")
    implementation("io.ktor:ktor-server-cio:2.3.12")
    implementation("io.ktor:ktor-server-content-negotiation:2.3.12")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.12")
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
}

val webSourceRoot = rootDir.parentFile
val syncWebAssets by tasks.registering(Copy::class) {
    from(webSourceRoot) {
        include("index.html")
        include("styles.css")
        include("app.js")
        include("frontend/**")
    }
    into(layout.buildDirectory.dir("generated/offlineAssets/www"))
}

tasks.named("preBuild") {
    dependsOn(syncWebAssets)
}
