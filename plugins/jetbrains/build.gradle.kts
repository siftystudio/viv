import org.jetbrains.changelog.Changelog
import org.jetbrains.intellij.platform.gradle.TestFrameworkType

plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "2.1.20"
    id("org.jetbrains.intellij.platform") version "2.13.1"
    id("org.jetbrains.grammarkit") version "2022.3.2.2"
    id("org.jetbrains.changelog") version "2.2.1"
}

group = providers.gradleProperty("pluginGroup").get()
version = providers.gradleProperty("pluginVersion").get()

kotlin {
    jvmToolchain(21)
}

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    testImplementation("org.opentest4j:opentest4j:1.3.0")
    testImplementation("junit:junit:4.13.2")

    intellijPlatform {
        intellijIdeaCommunity(providers.gradleProperty("platformVersion"))
        bundledPlugin("org.jetbrains.plugins.textmate")
        testFramework(TestFrameworkType.Platform)
    }
}

intellijPlatform {
    pluginConfiguration {
        name = providers.gradleProperty("pluginName")
        version = providers.gradleProperty("pluginVersion")

        ideaVersion {
            sinceBuild = providers.gradleProperty("pluginSinceBuild")
        }

        // Render the matching CHANGELOG.md section into plugin.xml's <change-notes>
        // at build time. Users see this in the IDE's "What's New" tab.
        changeNotes = provider {
            with(changelog) {
                renderItem(
                    (getOrNull(providers.gradleProperty("pluginVersion").get()) ?: getUnreleased())
                        .withHeader(false)
                        .withEmptySections(false),
                    Changelog.OutputType.HTML,
                )
            }
        }
    }

    signing {
        certificateChain = providers.environmentVariable("CERTIFICATE_CHAIN")
        privateKey = providers.environmentVariable("PRIVATE_KEY")
        password = providers.environmentVariable("PRIVATE_KEY_PASSWORD")
    }

    publishing {
        token = providers.environmentVariable("PUBLISH_TOKEN")
    }

    pluginVerification {
        ides {
            recommended()
        }
    }
}

changelog {
    version = providers.gradleProperty("pluginVersion")
    path = file("CHANGELOG.md").canonicalPath
    groups = emptyList()
}

sourceSets {
    main {
        java {
            srcDir(layout.buildDirectory.dir("generated/parser"))
            srcDir(layout.buildDirectory.dir("generated/lexer"))
        }
    }
}

tasks {
    wrapper {
        gradleVersion = "9.4.1"
    }

    generateParser {
        sourceFile.set(file("src/main/grammar/Viv.bnf"))
        targetRootOutputDir.set(layout.buildDirectory.dir("generated/parser"))
        pathToParser.set("studio/sifty/viv/parser/VivParser.java")
        pathToPsiRoot.set("studio/sifty/viv/psi")
        purgeOldFiles.set(true)
    }

    generateLexer {
        sourceFile.set(file("src/main/grammar/Viv.flex"))
        targetOutputDir.set(layout.buildDirectory.dir("generated/lexer/studio/sifty/viv"))
        purgeOldFiles.set(true)
    }

    compileJava {
        dependsOn(generateParser, generateLexer)
    }

    named("compileKotlin") {
        dependsOn(generateParser, generateLexer)
    }

    // Generate compiler_version.txt from gradle.properties so version is defined in one place
    val compilerVersion = providers.gradleProperty("compilerVersion")
    val generateVersionFile = register("generateCompilerVersionFile") {
        val outputFile = layout.buildDirectory.file("generated-resources/bridge/compiler_version.txt")
        outputs.file(outputFile)
        inputs.property("compilerVersion", compilerVersion)
        doLast {
            val file = outputFile.get().asFile
            file.parentFile.mkdirs()
            file.writeText(compilerVersion.get() + "\n")
        }
    }
    processResources {
        from(layout.buildDirectory.dir("generated-resources")) { duplicatesStrategy = DuplicatesStrategy.INCLUDE }
        dependsOn(generateVersionFile)
    }

    test {
        jvmArgs("-Xmx2g")
    }

    // The headless IDE launched by buildSearchableOptions can fail in CI or restricted
    // environments. Disable both it and its downstream consumer.
    named("buildSearchableOptions") {
        enabled = false
    }
    named("prepareJarSearchableOptions") {
        enabled = false
    }
}
