package expo.modules.pomodorostatus

fun main() {
  val anchor = 1000000L
  val initial = PhaseState("work", 600, 600, true, anchor, 600, 120, true)
  check(initial.advance(anchor + 3000).state.timeLeft == 597)
  check(initial.advance(anchor + 600000).state.let { it.phase == "break" && it.timeLeft == 120 && it.phaseStartedAt == anchor + 600000 })
  check(initial.advance(anchor + 720000).state.let { it.phase == "work" && it.timeLeft == 600 && it.phaseStartedAt == anchor + 720000 })
  check(initial.copy(autoSwitchBreak = false).advance(anchor + 9999999).state.let { it.phase == "break" && !it.isRunning && it.timeLeft == 120 })
  val paused = initial.copy(isRunning = false, phaseStartedAt = null, timeLeft = 567)
  check(paused.advance(anchor + 9999999).state == paused)
  check(initial.advance(anchor - 1000).state.timeLeft == 600)
  // Compare arithmetic cycle skipping with an independent boundary-by-boundary simulation.
  var cases = 0
  for (phase in listOf("work", "break")) for (work in listOf(60, 600, 1500)) for (rest in listOf(60, 120, 300)) {
    for (elapsed in listOf(0L, 59L, 60L, 599L, 600L, 719L, 720L, 1501L, 86400L, 604801L)) {
      val duration = if (phase == "work") work else rest
      val state = PhaseState(phase, duration, duration, true, anchor, work, rest, true)
      var expectedPhase = phase; var remaining = elapsed; var start = anchor; var boundary: Long? = null
      while (remaining >= if (expectedPhase == "work") work else rest) {
        val current = if (expectedPhase == "work") work else rest
        remaining -= current; start += current * 1000L; boundary = start
        expectedPhase = if (expectedPhase == "work") "break" else "work"
      }
      val result = state.advance(anchor + elapsed * 1000)
      check(result.state.phase == expectedPhase)
      check(result.state.timeLeft == (if (expectedPhase == "work") work else rest) - remaining.toInt())
      check(result.state.phaseStartedAt == start)
      check(result.lastBoundaryAt == boundary)
      cases++
    }
  }
  println("PASS native clock: $cases phase/duration/sleep combinations, pause, auto-switch-off, clock rollback")
}
