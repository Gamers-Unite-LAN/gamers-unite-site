<template>
  <section
    class="sticky top-20 z-40 border-b border-primary/30 bg-[#100d0e]/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-[#100d0e]/85"
    aria-label="Next event countdown">
    <div
      class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <div class="flex min-w-0 items-center gap-3">
        <div class="min-w-0">
          <p class="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#f8d479]">Next Event</p>
          <p v-if="event" class="truncate text-sm font-bold text-foreground">
            <time :datetime="event.event.eventDate">{{ event.event.name }} · {{ eventDateLabel }}</time>
          </p>
          <p v-else class="text-sm font-bold text-foreground">Next event to be announced</p>
        </div>
      </div>

      <div class="flex items-center gap-3 sm:gap-5">
        <div class="board" role="timer" :aria-label="accessibleCountdown">
          <span v-if="status === 'loading'"
            class="px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f8d479]">Loading</span>
          <span v-else-if="status === 'live'"
            class="px-3 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#f8d479]">Live now</span>
          <span v-else-if="status === 'complete'"
            class="px-3 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#f8d479]">Event complete</span>
          <span v-else-if="status === 'tba'"
            class="px-3 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#f8d479]">TBA</span>
          <template v-else>
            <span class="sr-only">{{ accessibleCountdown }}</span>
            <span v-for="unit in units" :key="unit.label" class="flex items-center gap-1" aria-hidden="true">
              <span class="digit-window">
                <Transition mode="out-in" name="digit">
                  <span :key="`${unit.label}-${unit.value}`" class="board-value">{{ unit.value }}</span>
                </Transition>
              </span>
              <span class="board-label">{{ unit.label }}</span>
            </span>
          </template>
        </div>
        <a href="#contact"
          class="shrink-0 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:text-[#f8d479] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d479]">
          Details
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { formatEventDate, homepageState } from "@/lib/homepageState";

const now = ref(0);
const isReady = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

const event = computed(() => homepageState.nextEvent);
const targetTime = computed(() => event.value ? new Date(event.value.nextDateTime).getTime() : NaN);
const endTime = computed(() => event.value ? new Date(event.value.endDateTime).getTime() : NaN);
const remainingSeconds = computed(() => Math.max(0, Math.ceil((targetTime.value - now.value) / 1000)));
const status = computed(() => {
  if (!isReady.value) return "loading";
  if (!event.value || !Number.isFinite(targetTime.value)) return "tba";
  if (now.value < targetTime.value) return "countdown";
  if (Number.isFinite(endTime.value) && now.value < endTime.value) return "live";
  return "complete";
});
const eventDateLabel = computed(() => event.value ? formatEventDate(event.value.event.eventDate) : "");
const units = computed(() => {
  const days = Math.floor(remainingSeconds.value / 86400);
  const hours = Math.floor((remainingSeconds.value % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds.value % 3600) / 60);
  const seconds = remainingSeconds.value % 60;

  return [
    { label: "Days", value: String(days).padStart(2, "0") },
    { label: "Hours", value: String(hours).padStart(2, "0") },
    { label: "Min", value: String(minutes).padStart(2, "0") },
    { label: "Sec", value: String(seconds).padStart(2, "0") },
  ];
});
const accessibleCountdown = computed(() => {
  if (status.value === "countdown") return `${remainingSeconds.value} seconds until ${event.value?.event.name}`;
  if (status.value === "live") return `${event.value?.event.name} is live now`;
  if (status.value === "complete") return `${event.value?.event.name} has finished`;
  return "The next event date will be announced soon";
});

function updateNow() {
  now.value = Date.now();
}

onMounted(() => {
  updateNow();
  isReady.value = true;
  timer = setInterval(updateNow, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>


<style scoped>
.board {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.65rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid rgba(248, 212, 121, 0.35);
  border-radius: 0.45rem;
  background: #070606;
  box-shadow: inset 0 0 1.1rem rgba(248, 212, 121, 0.08), 0 0.35rem 1rem rgba(0, 0, 0, 0.28);
}

.digit-window {
  position: relative;
  display: grid;
  min-width: 2.45rem;
  place-items: center;
  overflow: hidden;
  border-radius: 0.22rem;
  background: #17120a;
  padding: 0.28rem 0.24rem;
}

.board-value {
  color: #f8d479;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-shadow: 0 0 0.65rem rgba(248, 212, 121, 0.72);
}

.board-label {
  color: rgba(248, 212, 121, 0.68);
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.digit-enter-active {
  animation: digit-flicker 280ms steps(2, end);
}

.digit-leave-active {
  position: absolute;
  animation: digit-flicker-out 120ms steps(2, end);
}

@keyframes digit-flicker {
  0% {
    opacity: 0;
    filter: blur(3px);
    transform: translateY(-0.3rem);
  }

  42% {
    opacity: 0.45;
    filter: blur(0.8px);
  }

  70% {
    opacity: 0.8;
    filter: none;
    transform: translateY(0.05rem);
  }

  100% {
    opacity: 1;
  }
}

@keyframes digit-flicker-out {
  0% {
    opacity: 1;
    filter: none;
  }

  100% {
    opacity: 0;
    filter: blur(2px);
    transform: translateY(0.25rem);
  }
}

@media (max-width: 639px) {
  .board {
    gap: 0.25rem;
    width: 100%;
    justify-content: space-between;
  }

  .digit-window {
    min-width: 2.2rem;
  }

  .board-label {
    font-size: 0.48rem;
  }
}

@media (prefers-reduced-motion: reduce) {

  .digit-enter-active,
  .digit-leave-active {
    animation: none;
  }
}
</style>
