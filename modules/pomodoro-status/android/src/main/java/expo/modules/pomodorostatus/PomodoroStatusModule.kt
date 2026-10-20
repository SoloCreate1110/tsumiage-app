package expo.modules.pomodorostatus

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PomodoroStatusModule : Module() {
  private fun context(): Context = requireNotNull(appContext.reactContext) { "React context unavailable" }
  override fun definition() = ModuleDefinition {
    Name("PomodoroStatus")
    OnCreate {
      // JS may load after the initial activity resume event on a cold launch.
      appContext.reactContext?.let { context ->
        if (appContext.currentActivity != null &&
          PomodoroStatusService.phaseAlertDelivery(context) == PhaseAlertDelivery.SOUND_ONLY) {
          PomodoroStatusService.dismissPhaseNotifications(context)
        }
      }
    }
    OnActivityEntersForeground {
      PhaseAlertPolicy.onForeground()
      appContext.reactContext?.let { PomodoroStatusService.dismissPhaseNotifications(it) }
    }
    OnActivityEntersBackground { PhaseAlertPolicy.onBackground() }
    OnDestroy { PhaseAlertPolicy.reset() }
    AsyncFunction("update") { payload: String ->
      val context = context()
      val intent = Intent(context, PomodoroStatusService::class.java)
        .setAction(PomodoroStatusService.UPDATE).putExtra("payload", payload)
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
      Unit
    }
    AsyncFunction("stop") { itemId: String -> PomodoroStatusService.remove(context(), itemId) }
    AsyncFunction("stopAll") { PomodoroStatusService.remove(context(), null) }
    AsyncFunction("hasExactAlarmPermission") {
      val manager = context().getSystemService(Context.ALARM_SERVICE) as AlarmManager
      Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()
    }
    AsyncFunction("requestExactAlarmPermission") {
      if (Build.VERSION.SDK_INT >= 31) {
        val context = context()
        context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
          .setData(Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
  }
}
