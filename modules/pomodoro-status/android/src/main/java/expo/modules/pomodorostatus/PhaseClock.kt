package expo.modules.pomodorostatus

data class PhaseState(
  val phase: String,
  val timeLeft: Int,
  val totalTime: Int,
  val isRunning: Boolean,
  val phaseStartedAt: Long?,
  val workDuration: Int,
  val breakDuration: Int,
  val autoSwitchBreak: Boolean
) {
  init {
    require(phase == "work" || phase == "break")
    require(workDuration in 60..86400 && breakDuration in 60..86400)
    require(totalTime == if (phase == "work") workDuration else breakDuration)
    require(timeLeft in 0..totalTime)
    require(!isRunning || phaseStartedAt != null)
  }
  fun advance(now: Long): PhaseResult {
    if (!isRunning || phaseStartedAt == null) return PhaseResult(this, null)
    var state = this
    var start = phaseStartedAt
    var elapsed = ((now - start).coerceAtLeast(0) / 1000)
    var boundary: Long? = null
    // Skip entire cycles arithmetically, so restoration after a long absence is bounded.
    if (autoSwitchBreak) {
      val cycle = (workDuration + breakDuration).toLong()
      val cycles = elapsed / cycle
      if (cycles > 0) {
        start += cycles * cycle * 1000
        elapsed -= cycles * cycle
        boundary = start
      }
    }
    while (elapsed >= state.totalTime) {
      elapsed -= state.totalTime
      start += state.totalTime * 1000L
      boundary = start
      if (state.phase == "work") {
        state = state.copy(phase = "break", totalTime = breakDuration, timeLeft = breakDuration,
          isRunning = autoSwitchBreak, phaseStartedAt = if (autoSwitchBreak) start else null)
        if (!autoSwitchBreak) return PhaseResult(state, boundary)
      } else {
        state = state.copy(phase = "work", totalTime = workDuration, timeLeft = workDuration, phaseStartedAt = start)
      }
    }
    return PhaseResult(state.copy(timeLeft = state.totalTime - elapsed.toInt(), phaseStartedAt = start), boundary)
  }
}
data class PhaseResult(val state: PhaseState, val lastBoundaryAt: Long?)
