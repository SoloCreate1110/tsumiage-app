const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const BUILDER_RELATIVE_PATH = path.join(
  "node_modules",
  "expo-notifications",
  "android",
  "src",
  "main",
  "java",
  "expo",
  "modules",
  "notifications",
  "notifications",
  "presentation",
  "builders",
  "ExpoNotificationBuilder.kt"
);
const PRESENTATION_DELEGATE_RELATIVE_PATH = path.join(
  "node_modules",
  "expo-notifications",
  "android",
  "src",
  "main",
  "java",
  "expo",
  "modules",
  "notifications",
  "service",
  "delegates",
  "ExpoPresentationDelegate.kt"
);

const PATCH_MARKER = "tsumiage notification chronometer patch";
const TAG_PATCH_MARKER = "tsumiage notification tag patch";
const NATIVE_POMODORO_MARKER = "tsumiage native pomodoro notifications";

function applyChronometerPatch(projectRoot) {
  const builderPath = path.join(projectRoot, BUILDER_RELATIVE_PATH);
  if (!fs.existsSync(builderPath)) {
    throw new Error(`expo-notifications builder was not found: ${builderPath}`);
  }

  const source = fs.readFileSync(builderPath, "utf8");
  if (source.includes(PATCH_MARKER)) {
    return;
  }

  const anchor = "    builder.setStyle(NotificationCompat.BigTextStyle().bigText(content.text))\n";
  const patch = `${anchor}
    // ${PATCH_MARKER}: allow JS notification data to opt into Android's native timer display.
    content.body?.let { body ->
      when (body.optString("androidChronometerMode", "")) {
        "countUp" -> {
          val startedAt = body.optDouble("startedAt", 0.0).toLong()
          if (startedAt > 0L) {
            builder.setWhen(startedAt)
            builder.setShowWhen(true)
            builder.setUsesChronometer(true)
          }
        }
        "countDown" -> {
          val phaseEndsAt = body.optDouble("phaseEndsAt", 0.0).toLong()
          if (phaseEndsAt > 0L) {
            builder.setWhen(phaseEndsAt)
            builder.setShowWhen(true)
            builder.setUsesChronometer(true)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
              builder.setChronometerCountDown(true)
            }
          }
        }
      }
    }
`;

  if (!source.includes(anchor)) {
    throw new Error("Could not find ExpoNotificationBuilder chronometer patch anchor.");
  }

  fs.writeFileSync(builderPath, source.replace(anchor, patch));
}

function applyPresentationTagPatch(projectRoot) {
  const delegatePath = path.join(projectRoot, PRESENTATION_DELEGATE_RELATIVE_PATH);
  if (!fs.existsSync(delegatePath)) {
    throw new Error(`expo-notifications presentation delegate was not found: ${delegatePath}`);
  }

  let source = fs.readFileSync(delegatePath, "utf8");
  if (!source.includes(TAG_PATCH_MARKER)) {
    const notifyAnchor = `      NotificationManagerCompat.from(context).notify(
        notification.notificationRequest.identifier,
        getNotifyId(notification.notificationRequest),
        androidNotification
      )
`;
    const notifyPatch = `      // ${TAG_PATCH_MARKER}: allow multiple scheduled requests to update one visible Android notification.
      val notificationTag = notification.notificationRequest.content.body?.optString(
        "androidNotificationTag",
        notification.notificationRequest.identifier
      ) ?: notification.notificationRequest.identifier
      NotificationManagerCompat.from(context).notify(
        notificationTag,
        getNotifyId(notification.notificationRequest),
        androidNotification
      )
`;

    if (!source.includes(notifyAnchor)) {
      throw new Error("Could not find ExpoPresentationDelegate notify patch anchor.");
    }
    source = source.replace(notifyAnchor, notifyPatch);
  }

  const dismissAnchor = `        val existingNotification = this.getAllPresentedNotifications().find { it.notificationRequest.identifier == identifier }
        NotificationManagerCompat.from(context).cancel(identifier, getNotifyId(existingNotification?.notificationRequest))
`;
  if (source.includes(dismissAnchor)) {
    const dismissPatch = `        val existingNotification = this.getAllPresentedNotifications().find {
          it.notificationRequest.identifier == identifier ||
            it.notificationRequest.content.body?.optString("androidNotificationTag", "") == identifier
        }
        val notificationTag = existingNotification?.notificationRequest?.content?.body?.optString(
          "androidNotificationTag",
          identifier
        ) ?: identifier
        NotificationManagerCompat.from(context).cancel(notificationTag, getNotifyId(existingNotification?.notificationRequest))
`;
    source = source.replace(dismissAnchor, dismissPatch);
  }

  fs.writeFileSync(delegatePath, source);
}

function javaPackagePath(packageName) {
  return packageName.split(".").join(path.sep);
}

function writeFileIfChanged(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) {
    return;
  }
  fs.writeFileSync(filePath, content);
}

function notificationHelperJava(packageName) {
  return `package ${packageName}.notifications;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

final class PomodoroNotificationHelper {
  static final String ACTION_ALARM = "${packageName}.notifications.POMODORO_ALARM";
  static final String MODULE_NAME = "TsumiagePomodoroNotifications";
  static final String COMPLETION_CHANNEL_ID = "pomodoro-timer-v3";
  static final String RUNNING_CHANNEL_ID = "pomodoro-running-v1";
  static final String PREFS_NAME = "tsumiage_pomodoro_native_state";

  private PomodoroNotificationHelper() {}

  static void ensureChannels(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager == null) {
      return;
    }

    NotificationChannel completion = new NotificationChannel(
      COMPLETION_CHANNEL_ID,
      "Pomodoro complete",
      NotificationManager.IMPORTANCE_HIGH
    );
    completion.setDescription("Pomodoro phase completion alerts");
    completion.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
    completion.enableVibration(true);
    completion.setVibrationPattern(new long[] { 0, 250, 250, 250 });
    completion.setLightColor(Color.rgb(255, 107, 53));
    Uri sound = Settings.System.DEFAULT_NOTIFICATION_URI;
    AudioAttributes attrs = new AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build();
    completion.setSound(sound, attrs);

    NotificationChannel running = new NotificationChannel(
      RUNNING_CHANNEL_ID,
      "Pomodoro running",
      NotificationManager.IMPORTANCE_DEFAULT
    );
    running.setDescription("Current Pomodoro countdown");
    running.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
    running.enableVibration(false);
    running.setSound(null, null);
    running.setLightColor(Color.rgb(255, 107, 53));

    manager.createNotificationChannel(completion);
    manager.createNotificationChannel(running);
  }

  static void showRunningNotification(Context context, PomodoroAlarmPayload payload, boolean playSound) {
    ensureChannels(context);
    if (!canPostNotifications(context)) {
      return;
    }

    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(payload.deepLinkUrl));
    intent.setPackage(context.getPackageName());
    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

    PendingIntent contentIntent = PendingIntent.getActivity(
      context,
      requestCode(payload.itemId, "open"),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
    );

    String title = payload.itemName + " ポモドーロ" + phaseLabel(payload.phase);
    String body = "タップして戻る";

    NotificationCompat.Builder builder = new NotificationCompat.Builder(
      context,
      playSound ? COMPLETION_CHANNEL_ID : RUNNING_CHANNEL_ID
    )
      .setSmallIcon(context.getApplicationInfo().icon)
      .setContentTitle(title)
      .setContentText(body)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setAutoCancel(false)
      .setOnlyAlertOnce(!playSound)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(playSound ? NotificationCompat.PRIORITY_HIGH : NotificationCompat.PRIORITY_DEFAULT)
      .setWhen(payload.phaseEndsAt)
      .setShowWhen(true)
      .setUsesChronometer(true);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      builder.setChronometerCountDown(true);
    }

    if (playSound) {
      builder.setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE);
    } else {
      builder.setSilent(true);
    }

    NotificationManagerCompat.from(context).notify(
      notificationTag(payload.itemId),
      notificationId(payload.itemId),
      builder.build()
    );
  }

  static void showTimeUpNotification(Context context, PomodoroAlarmPayload payload) {
    ensureChannels(context);
    if (!canPostNotifications(context)) {
      return;
    }

    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(payload.deepLinkUrl));
    intent.setPackage(context.getPackageName());
    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

    PendingIntent contentIntent = PendingIntent.getActivity(
      context,
      requestCode(payload.itemId, "open"),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
    );

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, COMPLETION_CHANNEL_ID)
      .setSmallIcon(context.getApplicationInfo().icon)
      .setContentTitle(payload.phase.equals("break") ? "休憩時間が終わりました" : payload.itemName + "の作業時間が終わりました")
      .setContentText("時間になりました。タップして次へ進んでください。")
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setAutoCancel(false)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE)
      .setWhen(System.currentTimeMillis())
      .setShowWhen(true);

    NotificationManagerCompat.from(context).notify(
      notificationTag(payload.itemId),
      notificationId(payload.itemId),
      builder.build()
    );
  }

  static void scheduleAlarm(Context context, PomodoroAlarmPayload payload) {
    Intent intent = new Intent(context, PomodoroAlarmReceiver.class);
    intent.setAction(ACTION_ALARM);
    payload.putExtras(intent);

    PendingIntent alarmIntent = PendingIntent.getBroadcast(
      context,
      requestCode(payload.itemId, "alarm"),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
    );

    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarmManager == null) {
      return;
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, payload.phaseEndsAt, alarmIntent);
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, payload.phaseEndsAt, alarmIntent);
    } else {
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, payload.phaseEndsAt, alarmIntent);
    }
  }

  static void cancel(Context context, String itemId) {
    Intent intent = new Intent(context, PomodoroAlarmReceiver.class);
    intent.setAction(ACTION_ALARM);
    PendingIntent alarmIntent = PendingIntent.getBroadcast(
      context,
      requestCode(itemId, "alarm"),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
    );
    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarmManager != null) {
      alarmManager.cancel(alarmIntent);
    }
    NotificationManagerCompat.from(context).cancel(notificationTag(itemId), notificationId(itemId));
    prefs(context).edit().remove(itemId).apply();
  }

  static void saveSnapshot(Context context, PomodoroAlarmPayload payload, boolean isRunning, int timeLeft) {
    JSONObject snapshot = new JSONObject();
    try {
      snapshot.put("itemId", payload.itemId);
      snapshot.put("phase", payload.phase);
      snapshot.put("timeLeft", timeLeft);
      snapshot.put("totalTime", payload.totalTime());
      snapshot.put("isRunning", isRunning);
      snapshot.put("sessionsCompleted", payload.sessionsCompleted);
      snapshot.put("phaseStartedAt", isRunning ? payload.phaseStartedAt : JSONObject.NULL);
      snapshot.put("workDurationSeconds", payload.workDurationSeconds);
      snapshot.put("breakDurationSeconds", payload.breakDurationSeconds);
      snapshot.put("phaseEndsAt", payload.phaseEndsAt);
      snapshot.put("completedByNativeNotification", true);
      snapshot.put("updatedAt", System.currentTimeMillis());
      prefs(context).edit().putString(payload.itemId, snapshot.toString()).apply();
    } catch (JSONException ignored) {
    }
  }

  static String readSnapshot(Context context, String itemId) {
    return prefs(context).getString(itemId, null);
  }

  static PomodoroAlarmPayload nextPayload(PomodoroAlarmPayload payload, long phaseStartedAt) {
    if (payload.phase.equals("work")) {
      return payload.copyForPhase("break", phaseStartedAt, phaseStartedAt + payload.breakDurationSeconds * 1000L);
    }
    return payload.copyForPhase("work", phaseStartedAt, phaseStartedAt + payload.workDurationSeconds * 1000L);
  }

  static String notificationTag(String itemId) {
    return "pomodoro:" + itemId + ":running";
  }

  static int notificationId(String itemId) {
    return Math.abs(notificationTag(itemId).hashCode());
  }

  static int requestCode(String itemId, String suffix) {
    return Math.abs((notificationTag(itemId) + ":" + suffix).hashCode());
  }

  static int immutableFlag() {
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
  }

  static boolean canPostNotifications(Context context) {
    return Build.VERSION.SDK_INT < 33 ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
  }

  static String phaseLabel(String phase) {
    return phase.equals("break") ? "休憩中" : "作業中";
  }

  private static SharedPreferences prefs(Context context) {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
  }
}
`;
}

function alarmPayloadJava(packageName) {
  return `package ${packageName}.notifications;

import android.content.Intent;

import com.facebook.react.bridge.ReadableMap;

final class PomodoroAlarmPayload {
  final String itemId;
  final String itemName;
  final String phase;
  final long phaseStartedAt;
  final long phaseEndsAt;
  final boolean autoSwitchBreak;
  final int workDurationSeconds;
  final int breakDurationSeconds;
  final int sessionsCompleted;
  final String deepLinkUrl;

  PomodoroAlarmPayload(
    String itemId,
    String itemName,
    String phase,
    long phaseStartedAt,
    long phaseEndsAt,
    boolean autoSwitchBreak,
    int workDurationSeconds,
    int breakDurationSeconds,
    int sessionsCompleted,
    String deepLinkUrl
  ) {
    this.itemId = itemId;
    this.itemName = itemName;
    this.phase = phase;
    this.phaseStartedAt = phaseStartedAt;
    this.phaseEndsAt = phaseEndsAt;
    this.autoSwitchBreak = autoSwitchBreak;
    this.workDurationSeconds = Math.max(1, workDurationSeconds);
    this.breakDurationSeconds = Math.max(1, breakDurationSeconds);
    this.sessionsCompleted = Math.max(0, sessionsCompleted);
    this.deepLinkUrl = deepLinkUrl;
  }

  static PomodoroAlarmPayload fromReadableMap(ReadableMap map) {
    String phase = map.getString("phase");
    int workDurationSeconds = map.hasKey("workDurationSeconds") ? map.getInt("workDurationSeconds") : 1500;
    int breakDurationSeconds = map.hasKey("breakDurationSeconds") ? map.getInt("breakDurationSeconds") : 300;
    long phaseEndsAt = (long) map.getDouble("phaseEndsAt");
    int totalTime = phase.equals("break") ? breakDurationSeconds : workDurationSeconds;
    long phaseStartedAt = map.hasKey("phaseStartedAt")
      ? (long) map.getDouble("phaseStartedAt")
      : phaseEndsAt - totalTime * 1000L;

    return new PomodoroAlarmPayload(
      map.getString("itemId"),
      map.getString("itemName"),
      phase,
      phaseStartedAt,
      phaseEndsAt,
      map.hasKey("autoSwitchBreak") && map.getBoolean("autoSwitchBreak"),
      workDurationSeconds,
      breakDurationSeconds,
      map.hasKey("sessionsCompleted") ? map.getInt("sessionsCompleted") : 0,
      map.hasKey("deepLinkUrl") ? map.getString("deepLinkUrl") : ""
    );
  }

  static PomodoroAlarmPayload fromIntent(Intent intent) {
    return new PomodoroAlarmPayload(
      intent.getStringExtra("itemId"),
      intent.getStringExtra("itemName"),
      intent.getStringExtra("phase"),
      intent.getLongExtra("phaseStartedAt", 0L),
      intent.getLongExtra("phaseEndsAt", 0L),
      intent.getBooleanExtra("autoSwitchBreak", true),
      intent.getIntExtra("workDurationSeconds", 1500),
      intent.getIntExtra("breakDurationSeconds", 300),
      intent.getIntExtra("sessionsCompleted", 0),
      intent.getStringExtra("deepLinkUrl")
    );
  }

  void putExtras(Intent intent) {
    intent.putExtra("itemId", itemId);
    intent.putExtra("itemName", itemName);
    intent.putExtra("phase", phase);
    intent.putExtra("phaseStartedAt", phaseStartedAt);
    intent.putExtra("phaseEndsAt", phaseEndsAt);
    intent.putExtra("autoSwitchBreak", autoSwitchBreak);
    intent.putExtra("workDurationSeconds", workDurationSeconds);
    intent.putExtra("breakDurationSeconds", breakDurationSeconds);
    intent.putExtra("sessionsCompleted", sessionsCompleted);
    intent.putExtra("deepLinkUrl", deepLinkUrl);
  }

  PomodoroAlarmPayload copyForPhase(String nextPhase, long nextPhaseStartedAt, long nextPhaseEndsAt) {
    int nextSessionsCompleted = phase.equals("break") && nextPhase.equals("work")
      ? sessionsCompleted + 1
      : sessionsCompleted;
    return new PomodoroAlarmPayload(
      itemId,
      itemName,
      nextPhase,
      nextPhaseStartedAt,
      nextPhaseEndsAt,
      autoSwitchBreak,
      workDurationSeconds,
      breakDurationSeconds,
      nextSessionsCompleted,
      deepLinkUrl
    );
  }

  int totalTime() {
    return phase.equals("break") ? breakDurationSeconds : workDurationSeconds;
  }
}
`;
}

function receiverJava(packageName) {
  return `package ${packageName}.notifications;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class PomodoroAlarmReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || !PomodoroNotificationHelper.ACTION_ALARM.equals(intent.getAction())) {
      return;
    }

    PomodoroAlarmPayload payload = PomodoroAlarmPayload.fromIntent(intent);
    if (payload.itemId == null || payload.phase == null || payload.phaseEndsAt <= 0L) {
      return;
    }

    if (!payload.autoSwitchBreak) {
      PomodoroAlarmPayload nextPayload = PomodoroNotificationHelper.nextPayload(payload, payload.phaseEndsAt);
      PomodoroNotificationHelper.saveSnapshot(context, nextPayload, false, nextPayload.totalTime());
      PomodoroNotificationHelper.showTimeUpNotification(context, payload);
      return;
    }

    long now = System.currentTimeMillis();
    long nextStartedAt = Math.max(now, payload.phaseEndsAt);
    PomodoroAlarmPayload nextPayload = PomodoroNotificationHelper.nextPayload(payload, nextStartedAt);
    PomodoroNotificationHelper.saveSnapshot(context, nextPayload, true, nextPayload.totalTime());
    PomodoroNotificationHelper.showRunningNotification(context, nextPayload, true);
    PomodoroNotificationHelper.scheduleAlarm(context, nextPayload);
  }
}
`;
}

function moduleJava(packageName) {
  return `package ${packageName}.notifications;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class PomodoroNotificationsModule extends ReactContextBaseJavaModule {
  public PomodoroNotificationsModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return PomodoroNotificationHelper.MODULE_NAME;
  }

  @ReactMethod
  public void schedulePomodoroAlarm(ReadableMap options, Promise promise) {
    try {
      PomodoroAlarmPayload payload = PomodoroAlarmPayload.fromReadableMap(options);
      PomodoroNotificationHelper.saveSnapshot(getReactApplicationContext(), payload, true, payload.totalTime());
      PomodoroNotificationHelper.showRunningNotification(getReactApplicationContext(), payload, false);
      PomodoroNotificationHelper.scheduleAlarm(getReactApplicationContext(), payload);
      promise.resolve(true);
    } catch (Exception exception) {
      promise.reject("POMODORO_NATIVE_SCHEDULE_FAILED", exception);
    }
  }

  @ReactMethod
  public void cancelPomodoroAlarm(String itemId, Promise promise) {
    try {
      PomodoroNotificationHelper.cancel(getReactApplicationContext(), itemId);
      promise.resolve(true);
    } catch (Exception exception) {
      promise.reject("POMODORO_NATIVE_CANCEL_FAILED", exception);
    }
  }

  @ReactMethod
  public void getPomodoroSnapshot(String itemId, Promise promise) {
    try {
      promise.resolve(PomodoroNotificationHelper.readSnapshot(getReactApplicationContext(), itemId));
    } catch (Exception exception) {
      promise.reject("POMODORO_NATIVE_SNAPSHOT_FAILED", exception);
    }
  }
}
`;
}

function packageJava(packageName) {
  return `package ${packageName}.notifications;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class PomodoroNotificationsPackage implements ReactPackage {
  @NonNull
  @Override
  public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new PomodoroNotificationsModule(reactContext));
    return modules;
  }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`;
}

function patchMainApplication(projectRoot, packageName) {
  const mainPath = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "java",
    ...packageName.split("."),
    "MainApplication.kt"
  );
  if (!fs.existsSync(mainPath)) {
    throw new Error(`MainApplication.kt was not found: ${mainPath}`);
  }

  let source = fs.readFileSync(mainPath, "utf8");
  const importLine = `import ${packageName}.notifications.PomodoroNotificationsPackage\n`;
  if (!source.includes(importLine)) {
    const packageLine = `package ${packageName}\n`;
    source = source.replace(packageLine, `${packageLine}\n${importLine}`);
  }

  if (!source.includes(NATIVE_POMODORO_MARKER)) {
    const match = source.match(/^(\s*)val packages = PackageList\(this\)\.packages\s*$/m);
    if (!match) {
      throw new Error("Could not find MainApplication package list anchor.");
    }
    const anchor = match[0];
    const addLine = `${match[1]}packages.add(PomodoroNotificationsPackage()) // ${NATIVE_POMODORO_MARKER}`;
    source = source.replace(anchor, `${anchor}\n${addLine}`);
  }

  fs.writeFileSync(mainPath, source);
}

function patchAndroidManifest(projectRoot, packageName) {
  const manifestPath = path.join(projectRoot, "android", "app", "src", "main", "AndroidManifest.xml");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`AndroidManifest.xml was not found: ${manifestPath}`);
  }

  let source = fs.readFileSync(manifestPath, "utf8");
  const receiver = `    <!-- ${NATIVE_POMODORO_MARKER} -->
    <receiver
      android:name=".notifications.PomodoroAlarmReceiver"
      android:exported="false" />
`;
  if (!source.includes(NATIVE_POMODORO_MARKER)) {
    source = source.replace("  </application>", `${receiver}  </application>`);
  }

  fs.writeFileSync(manifestPath, source);
}

function applyNativePomodoroPatch(projectRoot, packageName) {
  const baseDir = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "java",
    javaPackagePath(packageName),
    "notifications"
  );

  writeFileIfChanged(path.join(baseDir, "PomodoroAlarmPayload.java"), alarmPayloadJava(packageName));
  writeFileIfChanged(path.join(baseDir, "PomodoroAlarmReceiver.java"), receiverJava(packageName));
  writeFileIfChanged(path.join(baseDir, "PomodoroNotificationHelper.java"), notificationHelperJava(packageName));
  writeFileIfChanged(path.join(baseDir, "PomodoroNotificationsModule.java"), moduleJava(packageName));
  writeFileIfChanged(path.join(baseDir, "PomodoroNotificationsPackage.java"), packageJava(packageName));
  patchMainApplication(projectRoot, packageName);
  patchAndroidManifest(projectRoot, packageName);
}

module.exports = function withNotificationChronometer(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      applyChronometerPatch(config.modRequest.projectRoot);
      applyPresentationTagPatch(config.modRequest.projectRoot);
      applyNativePomodoroPatch(config.modRequest.projectRoot, config.android.package);
      return config;
    },
  ]);
};

module.exports._applyChronometerPatch = applyChronometerPatch;
module.exports._applyPresentationTagPatch = applyPresentationTagPatch;
module.exports._applyNativePomodoroPatch = applyNativePomodoroPatch;
