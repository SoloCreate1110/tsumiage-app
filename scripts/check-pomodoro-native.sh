#!/bin/sh
# Local compilation only; does not invoke EAS or produce an APK.
set -eu
: "${KOTLINC:?Set KOTLINC to the Kotlin compiler executable}"
: "${JAVA_HOME:?Set JAVA_HOME to a JDK 17 or newer}"
: "${ANDROID_JAR:?Set ANDROID_JAR to an Android API 36 android.jar}"
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
verify_dir=$(mktemp -d "${TMPDIR:-/tmp}/tsumiage-native-check.XXXXXX")
trap 'rm -rf "$verify_dir"' EXIT
source_dir="$project_dir/modules/pomodoro-status/android/src/main/java/expo/modules/pomodorostatus"
"$KOTLINC" "$source_dir/PhaseClock.kt" "$project_dir/modules/pomodoro-status/tests/PhaseClockTest.kt" \
  -include-runtime -d "$verify_dir/clock-test.jar"
"$JAVA_HOME/bin/java" -jar "$verify_dir/clock-test.jar"
"$KOTLINC" "$source_dir/PhaseAlertPolicy.kt" "$project_dir/modules/pomodoro-status/tests/PhaseAlertPolicyTest.kt" \
  -include-runtime -d "$verify_dir/alert-test.jar"
"$JAVA_HOME/bin/java" -jar "$verify_dir/alert-test.jar"
"$KOTLINC" "$source_dir/PhaseClock.kt" "$source_dir/PhaseAlertPolicy.kt" "$source_dir/PomodoroStatusService.kt" \
  -classpath "$ANDROID_JAR" -d "$verify_dir/service.jar"
printf '%s\n' 'PASS Android API compilation (service and receiver); Expo bridge and APK assembly require Gradle validation.'
