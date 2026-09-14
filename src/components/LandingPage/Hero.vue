<template>
  <section class="relative overflow-hidden bg-dot-pattern bg-dots">
    <div class="pointer-events-none absolute -left-32 top-8 size-[30rem] rounded-full bg-primary/15 blur-3xl"></div>
    <div class="pointer-events-none absolute -right-24 bottom-0 size-[26rem] rounded-full bg-secondary/10 blur-3xl">
    </div>
    <div
      class="relative mx-auto grid min-h-[calc(90vh-5rem)] max-w-7xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <p
          class="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary">
          Wiltshire local LAN events</p>
        <h1
          class="max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Join your local <span class="bg-brand-gradient bg-clip-text text-transparent">gaming community</span>.</h1>
        <p class="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">Meet people who share your passion,
          play great games, and make lasting connections at Gamers Unite! LAN events.</p>
        <div class="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href="#contact"
            class="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-lg font-bold text-foreground shadow-brand transition hover:scale-105 hover:bg-secondary">Grab
            your seat</a>
          <a href="#community"
            class="inline-flex items-center gap-3 font-bold uppercase tracking-widest text-sm text-muted-foreground transition hover:text-primary">Join
            Discord <span class="h-px w-10 bg-primary/50"></span></a>
        </div>
      </div>
      <div class="relative animate-float transform-gpu [will-change:transform]">
        <div class="absolute -inset-4 translate-x-4 translate-y-4 rounded-[2rem]"></div>
        <div class="relative aspect-[4/3]">
          <Transition enter-active-class="absolute inset-0 transition-opacity duration-1000 ease-in-out motion-reduce:transition-none" enter-from-class="opacity-0" leave-active-class="absolute inset-0 transition-opacity duration-1000 ease-in-out motion-reduce:transition-none" leave-to-class="opacity-0">
            <img :key="slide.image" :src="slide.image" :alt="slide.alt"
              class="size-full rounded-[2rem] border-4 border-card object-cover shadow-2xl" />
          </Transition>
        </div>
        <Transition enter-active-class="transition-all duration-700 ease-out motion-reduce:transition-none" enter-from-class="translate-y-2 opacity-0" leave-active-class="absolute transition-all duration-500 ease-in motion-reduce:transition-none" leave-to-class="-translate-y-1 opacity-0">
          <div :key="slide.image"
            class="absolute -bottom-6 -right-2 max-w-[16rem] rounded-2xl border border-border bg-card p-5 shadow-xl sm:-right-7">
            <p class="text-xl font-bold text-primary">{{ slide.tagline }}</p>
            <p class="mt-1 text-sm leading-6 text-muted-foreground">{{ slide.description }}</p>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

const slides = [
  { image: "/event-images/carousel/GroupImage1.jpg", alt: "Gamers playing together at a Gamers Unite! LAN event", tagline: "Find your squad", description: "Meet local players who love same games." },
  { image: "/event-images/carousel/GroupImage2.jpg", alt: "Gamers enjoying a Gamers Unite! LAN event", tagline: "Play together", description: "Big matches hit different in same room." },
  { image: "/event-images/carousel/GroupImage3.jpg", alt: "Friends at a Gamers Unite! LAN event", tagline: "Real connections", description: "Turn off headsets. Turn up community." },
  { image: "/event-images/carousel/GroupImage5.jpg", alt: "Gaming setups at a Gamers Unite! LAN event", tagline: "Bring your setup", description: "Settle in for full day of games and good company." },
];
const currentImage = ref(0);
const slide = computed(() => slides[currentImage.value]);
let timer: ReturnType<typeof setInterval>;

onMounted(() => { timer = setInterval(() => { currentImage.value = (currentImage.value + 1) % slides.length; }, 5000); });
onUnmounted(() => clearInterval(timer));
</script>
