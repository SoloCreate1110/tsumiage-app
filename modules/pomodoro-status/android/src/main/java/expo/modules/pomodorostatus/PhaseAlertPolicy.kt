package expo.modules.pomodorostatus

enum class PhaseAlertDelivery { SOUND_ONLY, NOTIFICATION }

// Native activity lifecycle remains available even when JavaScript is suspended.
object PhaseAlertPolicy {
  @Volatile private var activityForeground: Boolean? = null
  fun onForeground() { activityForeground = true }
  fun onBackground() { activityForeground = false }
  fun reset() { activityForeground = null }
  fun delivery(processForeground: Boolean, screenInteractive: Boolean, keyguardLocked: Boolean): PhaseAlertDelivery {
    val visible = (activityForeground ?: processForeground) && screenInteractive && !keyguardLocked
    return if (visible) PhaseAlertDelivery.SOUND_ONLY else PhaseAlertDelivery.NOTIFICATION
  }
}
