package expo.modules.pomodorostatus

fun main() {
  PhaseAlertPolicy.reset()
  check(PhaseAlertPolicy.delivery(true, true, false) == PhaseAlertDelivery.SOUND_ONLY)
  check(PhaseAlertPolicy.delivery(false, true, false) == PhaseAlertDelivery.NOTIFICATION)
  PhaseAlertPolicy.onForeground()
  check(PhaseAlertPolicy.delivery(false, true, false) == PhaseAlertDelivery.SOUND_ONLY)
  check(PhaseAlertPolicy.delivery(true, false, false) == PhaseAlertDelivery.NOTIFICATION)
  check(PhaseAlertPolicy.delivery(true, true, true) == PhaseAlertDelivery.NOTIFICATION)
  PhaseAlertPolicy.onBackground()
  // A foreground service does not mean the activity is visible.
  check(PhaseAlertPolicy.delivery(true, true, false) == PhaseAlertDelivery.NOTIFICATION)
  PhaseAlertPolicy.onForeground()
  check(PhaseAlertPolicy.delivery(true, true, false) == PhaseAlertDelivery.SOUND_ONLY)
  PhaseAlertPolicy.reset()
  check(PhaseAlertPolicy.delivery(false, false, true) == PhaseAlertDelivery.NOTIFICATION)
  println("PASS 8 native foreground/background/lock/resume notification delivery checks")
}
