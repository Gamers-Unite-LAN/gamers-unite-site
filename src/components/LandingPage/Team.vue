<script setup lang="ts">
const team = [
  { image: "/team/bill.jpg", name: "Bill Crooks", role: "Founder", description: "Bill hosted the first LAN in 2024, then brought together the first GUL team. Rest is history." },
  { image: "/team/alex.jpg", name: "Alex Wilson", role: "Technical support", description: "After attending the first LAN, Alex joined soon after and helps make event tech work." },
  { image: "/team/jolyon.jpg", name: "Jolyon Buckle", role: "Community host", description: "Jolyon brings warmth to events by welcoming newcomers and returning faces alike." },
];
</script>

<template>
  <section id="team" class="relative overflow-hidden bg-background py-24 sm:py-32"><div class="pointer-events-none absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"></div>
    <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="mx-auto mb-14 max-w-2xl text-center"><p class="text-xs font-bold uppercase tracking-[.2em] text-primary">Our hosts</p><h2 class="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">People behind <span class="text-primary">passion</span></h2><p class="mt-5 text-lg leading-8 text-muted-foreground">Wiltshire gamers building community we always wanted to join.</p></div>
      <div class="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3"><article v-for="member in team" :key="member.name" class="group rounded-3xl border border-border bg-card p-6 transition hover:border-primary/60"><img :src="member.image" :alt="member.name" class="aspect-square w-full rounded-2xl object-cover grayscale transition duration-500 group-hover:grayscale-0" /><h3 class="mt-6 text-xl font-bold">{{ member.name }}</h3><p class="mt-1 text-xs font-bold uppercase tracking-widest text-primary">{{ member.role }}</p><p class="mt-4 text-sm leading-6 text-muted-foreground">{{ member.description }}</p></article></div>
    </div>
  </section>
</template>
