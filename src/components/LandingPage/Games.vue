<script setup lang="ts">
const games = [
  { icon: "modern", title: "Modern", description: "Games that are popular and widely played in the community, from the latest releases to the current favorites." },
  { icon: "classic", title: "Classic", description: "Timeless games that have stood the test of time and continue to be enjoyed by the community." },
  { icon: "wildcard", title: "Wildcard", description: "Games that you think are great for a LAN but are bit on the unconventional side." }
];
</script>

<template>
  <section id="games" class="bg-background py-24 sm:py-32">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-14 max-w-2xl">
        <p class="text-xs font-bold uppercase tracking-[.2em] text-primary">What we play</p>
        <h2 class="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Games built for <span
            class="text-primary">togetherness</span></h2>
        <p class="mt-5 text-lg leading-8 text-muted-foreground">We play games that our community vote for. Before each
          event we select games that bring people together. These polls are split into three categories:</p>
      </div>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="game in games" :key="game.title"
          class="group rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/60">
          <div class="flex aspect-[16/8] items-center justify-center rounded-2xl bg-background"><img
              :src="`/game-poll-categories/${game.icon}.png`" :alt="`${game.title} logo`"
              class="max-h-24 max-w-[70%] object-contain transition duration-500 group-hover:scale-110" /></div>
          <h3 class="mt-6 text-xl font-bold text-foreground">{{ game.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ game.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
