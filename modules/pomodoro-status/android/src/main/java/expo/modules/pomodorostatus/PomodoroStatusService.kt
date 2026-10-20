package expo.modules.pomodorostatus

import android.app.*
import android.content.*
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.IBinder
import android.os.PowerManager
import org.json.JSONArray
import org.json.JSONObject

private const val STATUS_ID = 650001
private const val PHASE_ID = 650002
private const val STATUS_CHANNEL = "pomodoro-status"
private const val PHASE_CHANNEL = "pomodoro-phase-native"
private const val PREFS = "pomodoro-native-status"

private data class Session(val id: String, val name: String, val itemUrl: String,
  var state: PhaseState, var lastAlertAt: Long = 0) {
  fun json() = JSONObject().put("id", id).put("name", name).put("itemUrl", itemUrl)
    .put("phase", state.phase).put("timeLeft", state.timeLeft).put("totalTime", state.totalTime)
    .put("isRunning", state.isRunning).put("phaseStartedAt", state.phaseStartedAt ?: JSONObject.NULL)
    .put("workDuration", state.workDuration).put("breakDuration", state.breakDuration)
    .put("autoSwitchBreak", state.autoSwitchBreak).put("lastAlertAt", lastAlertAt)
  companion object {
    fun parse(json: JSONObject) = Session(json.getString("id"), json.getString("name"), json.getString("itemUrl"),
      PhaseState(json.getString("phase"), json.getInt("timeLeft"), json.getInt("totalTime"),
        json.getBoolean("isRunning"), if (json.isNull("phaseStartedAt")) null else json.getLong("phaseStartedAt"),
        json.getInt("workDuration"), json.getInt("breakDuration"), json.getBoolean("autoSwitchBreak")),
      json.optLong("lastAlertAt", 0))
  }
}

class PomodoroStatusService : Service() {
  private val sessions = linkedMapOf<String, Session>()
  private var foregroundSound: android.media.Ringtone? = null
  private val notifications get() = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  private val alarms get() = getSystemService(Context.ALARM_SERVICE) as AlarmManager
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onCreate() {
    super.onCreate()
    active = true
    sessions.putAll(load(this))
    if (Build.VERSION.SDK_INT >= 26) {
      notifications.createNotificationChannel(NotificationChannel(STATUS_CHANNEL, "タイマーの経過時間", NotificationManager.IMPORTANCE_LOW).apply {
        setSound(null, null); enableVibration(false)
      })
      notifications.createNotificationChannel(NotificationChannel(PHASE_CHANNEL, "ポモドーロの切替", NotificationManager.IMPORTANCE_HIGH).apply {
        setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
          AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build())
        enableVibration(true)
      })
    }
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      when (intent?.action) {
        STOP -> {
          val id = intent.getStringExtra("itemId")
          val removed = if (id == null) sessions.values.toList() else listOfNotNull(sessions[id])
          removed.forEach { cancelItem(it.id) }
          if (id == null) sessions.clear() else sessions.remove(id)
          advanceAll()
        }
        UPDATE -> {
          // Reconcile the previous anchor first: a JS phase update must not swallow its alarm.
          advanceAll()
          val incoming = Session.parse(JSONObject(requireNotNull(intent.getStringExtra("payload"))))
          incoming.lastAlertAt = sessions[incoming.id]?.lastAlertAt ?: 0
          sessions[incoming.id] = incoming
          advanceAll()
        }
        else -> advanceAll()
      }
      getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putString("primary", (sessions.values.firstOrNull { it.state.isRunning } ?: sessions.values.firstOrNull())?.id).apply()
      save(this, sessions)
      if (sessions.isEmpty()) {
        alarms.cancel(alarmIntent(this))
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        return START_NOT_STICKY
      }
      val primary = sessions.values.firstOrNull { it.state.isRunning } ?: sessions.values.first()
      notifications.cancel(primary.id, STATUS_ID)
      startForeground(STATUS_ID, status(primary))
      sessions.values.filter { it.id != primary.id }.forEach { notifications.notify(it.id, STATUS_ID, status(it)) }
      val next = sessions.values.filter { it.state.isRunning }.minByOrNull { it.state.phaseStartedAt!! + it.state.totalTime * 1000L }
      if (next != null && (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms())) {
        alarms.setAlarmClock(AlarmManager.AlarmClockInfo(next.state.phaseStartedAt!! + next.state.totalTime * 1000L, openItem(next)), alarmIntent(this))
      } else {
        alarms.cancel(alarmIntent(this))
      }
      if (next == null) {
        // A paused card is static; no background service or wake lock is needed.
        stopForeground(STOP_FOREGROUND_DETACH)
        stopSelf()
        return START_NOT_STICKY
      }
      return START_STICKY
    } finally {
      PomodoroAlarmReceiver.releaseWakeLock()
    }
  }
  private fun advanceAll() {
    val now = System.currentTimeMillis()
    sessions.values.forEach { session ->
      val result = session.state.advance(now)
      session.state = result.state
      val boundary = result.lastBoundaryAt
      if (boundary != null && boundary > session.lastAlertAt) {
        session.lastAlertAt = boundary
        if (phaseAlertDelivery(this) == PhaseAlertDelivery.SOUND_ONLY) {
          notifications.cancel(session.id, PHASE_ID)
          playForegroundPhaseSound()
          return@forEach
        }
        notifications.notify(session.id, PHASE_ID, builder(PHASE_CHANNEL)
          .setContentTitle("${session.name} の${if (session.state.phase == "break") "休憩開始" else "作業開始"}")
          .setContentText(if (session.state.phase == "break") "作業時間が終わりました。少し休憩しましょう。" else "休憩が終わりました。次の作業を始めましょう。")
          .setContentIntent(openItem(session)).setCategory(Notification.CATEGORY_ALARM)
          .setAutoCancel(true).setOnlyAlertOnce(false).setPriority(Notification.PRIORITY_HIGH).build())
      }
    }
  }
  private fun playForegroundPhaseSound() {
    // Keep the channel's chosen sound/mute setting, without posting a completion card.
    val channel = if (Build.VERSION.SDK_INT >= 26) notifications.getNotificationChannel(PHASE_CHANNEL) else null
    if (channel?.importance == NotificationManager.IMPORTANCE_NONE) return
    val uri = if (Build.VERSION.SDK_INT >= 26) channel?.sound
      else RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    if (uri == null) return
    try {
      foregroundSound?.stop()
      val tone = RingtoneManager.getRingtone(applicationContext, uri) ?: return
      tone.audioAttributes = channel?.audioAttributes
        ?: AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build()
      if (Build.VERSION.SDK_INT >= 28) tone.isLooping = false
      tone.play()
      foregroundSound = tone
      Handler(Looper.getMainLooper()).postDelayed({
        tone.stop()
        if (foregroundSound === tone) foregroundSound = null
      }, 10000)
    } catch (error: Exception) {
      android.util.Log.w("PomodoroStatus", "Unable to play completion sound", error)
    }
  }
  private fun builder(channel: String): Notification.Builder {
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, channel) else Notification.Builder(this)
    if (Build.VERSION.SDK_INT < 26 && channel == PHASE_CHANNEL) builder.setDefaults(Notification.DEFAULT_SOUND or Notification.DEFAULT_VIBRATE)
    return builder.setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setVisibility(Notification.VISIBILITY_PUBLIC)
      .addExtras(android.os.Bundle().apply { putString("tsumiage.kind", "pomodoro-native") })
  }
  private fun status(session: Session): Notification {
    val state = session.state
    val phase = if (state.phase == "work") "集中" else "休憩"
    val elapsed = state.totalTime - state.timeLeft
    val builder = builder(STATUS_CHANNEL).setContentTitle("${session.name} ・ $phase")
      .setContentText(if (state.isRunning) "経過時間 ・ 設定 ${format(state.totalTime)}" else "一時停止 ・ 経過 ${format(elapsed)} / ${format(state.totalTime)}")
      .setContentIntent(openItem(session)).setCategory(Notification.CATEGORY_SERVICE)
      .setOngoing(true).setOnlyAlertOnce(true).setSound(null).setPriority(Notification.PRIORITY_LOW)
      .setShowWhen(state.isRunning).setUsesChronometer(state.isRunning)
    if (state.isRunning) builder.setWhen(state.phaseStartedAt!!)
    if (Build.VERSION.SDK_INT >= 31) builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    return builder.build()
  }
  private fun openItem(session: Session): PendingIntent = PendingIntent.getActivity(this, session.id.hashCode(),
    Intent(Intent.ACTION_VIEW, Uri.parse(session.itemUrl)).setPackage(packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  private fun cancelItem(id: String) { notifications.cancel(id, STATUS_ID); notifications.cancel(id, PHASE_ID) }
  override fun onDestroy() { active = false; super.onDestroy() }
  companion object {
    const val UPDATE = "pomodoro.UPDATE"
    const val STOP = "pomodoro.STOP"
    const val ALARM = "pomodoro.ALARM"
    @Volatile var active = false
    fun phaseAlertDelivery(context: Context): PhaseAlertDelivery {
      val info = ActivityManager.RunningAppProcessInfo()
      ActivityManager.getMyMemoryState(info)
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      return PhaseAlertPolicy.delivery(info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND,
        power.isInteractive, keyguard.isKeyguardLocked)
    }
    fun dismissPhaseNotifications(context: Context) {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      load(context).keys.forEach { manager.cancel(it, PHASE_ID) }
    }
    private fun format(seconds: Int) = "%02d:%02d".format(seconds / 60, seconds % 60)
    private fun load(context: Context): LinkedHashMap<String, Session> {
      val result = linkedMapOf<String, Session>()
      try {
        val array = JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("sessions", "[]"))
        for (i in 0 until array.length()) { val session = Session.parse(array.getJSONObject(i)); result[session.id] = session }
      } catch (_: Exception) { /* Ignore invalid persisted state rather than starting an invalid timer. */ }
      return result
    }
    private fun save(context: Context, sessions: Map<String, Session>) {
      val array = JSONArray(); sessions.values.forEach { array.put(it.json()) }
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("sessions", array.toString()).apply()
    }
    fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(context, STATUS_ID,
      Intent(context, PomodoroAlarmReceiver::class.java).setAction(ALARM),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun remove(context: Context, id: String?) {
      if (active) {
        context.startService(Intent(context, PomodoroStatusService::class.java).setAction(STOP).apply { if (id != null) putExtra("itemId", id) })
      } else {
        val sessions = load(context)
        if (sessions.values.any { it.state.isRunning }) {
          val intent = Intent(context, PomodoroStatusService::class.java).setAction(STOP).apply { if (id != null) putExtra("itemId", id) }
          if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
          return
        }
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val ids = if (id == null) sessions.keys.toList() else listOf(id)
        val primary = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("primary", null)
        ids.forEach { sessions.remove(it); manager.cancel(it, STATUS_ID); manager.cancel(it, PHASE_ID) }
        if (primary in ids) manager.cancel(STATUS_ID)
        save(context, sessions)
        if (sessions.isEmpty()) {
          manager.cancel(STATUS_ID)
          (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(alarmIntent(context))
        }
      }
    }
  }
}

class PomodoroAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val manager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = manager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "${context.packageName}:pomodoro-transition").apply { acquire(10000) }
    try {
      val service = Intent(context, PomodoroStatusService::class.java).setAction(PomodoroStatusService.ALARM)
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service) else context.startService(service)
    } catch (error: Exception) { releaseWakeLock(); throw error }
  }
  companion object {
    private var wakeLock: PowerManager.WakeLock? = null
    fun releaseWakeLock() { if (wakeLock?.isHeld == true) wakeLock?.release(); wakeLock = null }
  }
}
