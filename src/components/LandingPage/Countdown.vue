<template>
    <section class="container" v-if="landingPageData">
        <div class="grid place-items-center max-w-screen-xl h-screen gap-8 mx-auto py-20 md:py-32">
            <div class="text-center space-y-8">

                <div class="max-w-screen-md mx-auto text-center text-5xl md:text-6xl font-bold">
                    <h1>
                        Next
                        <span class="text-transparent bg-gradient-to-r from-[#972c89] to-primary bg-clip-text">LAN
                        </span>
                        in:
                    </h1>
                </div>

                <div class="flex gap-4 mb-12">
                    <div class="bg-zinc-800/90 p-4 rounded-lg w-24 text-center glowing-border">
                        <div class="text-3xl font-bold text-purple-400" ref="days">00</div>
                        <div class="text-sm text-zinc-400">Days</div>
                    </div>
                    <div class="bg-zinc-800/90 p-4 rounded-lg w-24 text-center glowing-border">
                        <div class="text-3xl font-bold text-purple-400" ref="hours">00</div>
                        <div class="text-sm text-zinc-400">Hours</div>
                    </div>
                    <div class="bg-zinc-800/90 p-4 rounded-lg w-24 text-center glowing-border">
                        <div class="text-3xl font-bold text-purple-400" ref="minutes">00</div>
                        <div class="text-sm text-zinc-400">Minutes</div>
                    </div>
                    <div class="bg-zinc-800/90 p-4 rounded-lg w-24 text-center glowing-border">
                        <div class="text-3xl font-bold text-purple-400" ref="seconds">00</div>
                        <div class="text-sm text-zinc-400">Seconds</div>
                    </div>
                </div>

                <div>
                    <p class="max-w-screen-sm mx-auto text-xl text-muted-foreground">
                        Met us at: {{ landingPageData.directions }}
                    </p>
                </div>

                <div>
                    <div class="flex align-baseline justify-center">
                        <Button as-child>
                            <a
                                href="https://discord.gg/2akPpZD73v"
                                target="_blank"
                            >
                                Join us on Discord
                            </a>
                        </Button>
                        <p class="max-w-screen-sm mx-auto text-xl pt-1">
                            or scroll down to learn more
                        </p>
                    </div>
                    <p class="max-w-screen-sm mx-auto text-[32px] bounce">
                        ⬇️
                    </p>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { LandingPageData } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { templateRef } from '@vueuse/core';

const { landingPageData } = defineProps<{
    landingPageData?: LandingPageData;
}>();

const daysRef = templateRef('days');
const hoursRef = templateRef('hours');
const minutesRef = templateRef('minutes');
const secondsRef = templateRef('seconds');

// Countdown to next event
async function updateCountdown() {
  const now = new Date();
  const nextEvent = landingPageData?.date;

  if (!nextEvent) return;

  const diff = nextEvent.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  daysRef.value.textContent = days.toString().padStart(2, '0');
  hoursRef.value.textContent = hours.toString().padStart(2, '0');
  minutesRef.value.textContent = minutes.toString().padStart(2, '0');
  secondsRef.value.textContent = seconds.toString().padStart(2, '0');
}
// Initialize countdown
(async function initCountdown() {
    await updateCountdown();
    setInterval(updateCountdown, 1000);
})();
</script>

<style scoped>
.img-border-animation {
    animation-name: img-border-animation;
    animation-iteration-count: infinite;
    animation-duration: 2s;
    animation-timing-function: linear;
    animation-direction: alternate;
}


@keyframes img-border-animation {
    from {
        border-color: rgba(var(--primary-rgb), 0.1);
    }

    to {
        border-color: rgba(var(--primary-rgb), 0.6);
    }
}

.glowing-border {
    border-width: 4px;
    animation: img-border-animation 2s infinite alternate;
}

.bounce {
  animation: bounce 3s ease infinite;
}
@keyframes bounce {
	0%, 100% {transform: translateY(0);}
	10%, 30%, 50%, 70%, 90% {transform: translateY(-5px);}
	20%, 40%, 60%, 80% {transform: translateY(5px);}
}
</style>
