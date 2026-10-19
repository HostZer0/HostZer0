#!/usr/bin/env bash
# Gera o APK instalável da Escala de Trabalho sem Android Studio/SDK.
# Ferramentas baixadas do Maven Central para android/.tools:
#   - apktool-lib (traz o aapt2 para Linux e o framework Android para linkar recursos)
#   - dalvik-dx (converte .class em classes.dex)
#   - robolectric android-all (classes do Android 14, só para compilar)
#   - apksig (assinatura v2; Android 7.0+)
# Requisitos: bash, curl, unzip, zip, python3, JDK 17+.
#
# Assinatura: usa android/keystore/escala.p12 (criado na primeira execução).
# Guarde esse arquivo: atualizações do app precisam da MESMA chave, senão o
# Android exige desinstalar a versão anterior (o que apaga os dados salvos).
# Senha via ESCALA_KEYSTORE_PASS (padrão abaixo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
TOOLS="$ROOT/.tools"
BUILD="$ROOT/build"
DIST="$ROOT/dist"
KEYSTORE="$ROOT/keystore/escala.p12"
KS_PASS="${ESCALA_KEYSTORE_PASS:-contad-escala}"
KS_ALIAS="escala"
APK_NAME="EscalaCONTAD.apk"

MAVEN="https://repo1.maven.org/maven2"
APKTOOL_JAR="$TOOLS/apktool-lib-3.0.3.jar"
DX_JAR="$TOOLS/dalvik-dx-16.0.1.jar"
ANDROID_JAR="$TOOLS/android-all-14-robolectric-10818077.jar"
APKSIG_JAR="$TOOLS/apksig-2.3.0.jar"

fetch() { # fetch <caminho no Maven> <destino>
  [ -s "$2" ] && return
  echo "Baixando $(basename "$2")..."
  curl -fsSL --retry 3 -o "$2.part" "$MAVEN/$1" && mv "$2.part" "$2"
}

mkdir -p "$TOOLS"
fetch org/apktool/apktool-lib/3.0.3/apktool-lib-3.0.3.jar "$APKTOOL_JAR"
fetch com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar "$DX_JAR"
fetch org/robolectric/android-all/14-robolectric-10818077/android-all-14-robolectric-10818077.jar "$ANDROID_JAR"
fetch com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar "$APKSIG_JAR"

AAPT2="$TOOLS/prebuilt/linux/aapt2"
FRAMEWORK="$TOOLS/prebuilt/android-framework.jar"
if [ ! -x "$AAPT2" ] || [ ! -s "$FRAMEWORK" ]; then
  unzip -o -q "$APKTOOL_JAR" 'prebuilt/linux/aapt2' 'prebuilt/android-framework.jar' -d "$TOOLS"
  chmod +x "$AAPT2"
fi

rm -rf "$BUILD"
mkdir -p "$BUILD/assets" "$BUILD/classes" "$BUILD/signer" "$DIST"

echo "1/5 Recursos e manifesto (aapt2)"
cp "$ROOT/../escala.html" "$BUILD/assets/escala.html"
"$AAPT2" compile --dir "$ROOT/res" -o "$BUILD/res.zip"
"$AAPT2" link -o "$BUILD/unsigned.apk" -I "$FRAMEWORK" \
  --manifest "$ROOT/AndroidManifest.xml" -A "$BUILD/assets" "$BUILD/res.zip"

echo "2/5 Compilando Java"
javac -nowarn -Xlint:none --release 8 -cp "$ANDROID_JAR" -d "$BUILD/classes" \
  $(find "$ROOT/src" -name '*.java') 2>&1 | grep -v '^warning\|^Note:\|^1 warning' || true
[ -n "$(find "$BUILD/classes" -name '*.class')" ] || { echo "Falha ao compilar." >&2; exit 1; }

echo "3/5 Gerando classes.dex"
java -cp "$DX_JAR" com.android.dx.command.Main --dex --min-sdk-version=24 \
  --output="$BUILD/classes.dex" "$BUILD/classes"
(cd "$BUILD" && zip -q unsigned.apk classes.dex)
python3 "$ROOT/zipalign.py" "$BUILD/unsigned.apk" "$BUILD/aligned.apk"

echo "4/5 Chave de assinatura"
if [ ! -s "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -noprompt -storetype PKCS12 -keystore "$KEYSTORE" \
    -storepass "$KS_PASS" -keypass "$KS_PASS" -alias "$KS_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=CONTAD Escala, O=CONTAD, C=BR" 2>/dev/null
  echo "   chave criada em $KEYSTORE"
fi

echo "5/5 Assinando (v2)"
javac -nowarn -cp "$APKSIG_JAR" -d "$BUILD/signer" "$ROOT/signer/Sign.java"
# o apksig 2.3.0 acessa uma classe interna do JDK ao carregar; liberada com --add-exports
java --add-exports java.base/sun.security.x509=ALL-UNNAMED \
  -cp "$APKSIG_JAR:$BUILD/signer" Sign "$KEYSTORE" "$KS_PASS" "$KS_ALIAS" \
  "$BUILD/aligned.apk" "$DIST/$APK_NAME"

echo "Pronto: $DIST/$APK_NAME ($(du -h "$DIST/$APK_NAME" | cut -f1))"
