<script setup lang="ts">
const reviews = [
  { name: "Tobyias46", comment: "What a great community to be a part of." },
  { name: "manicjack", comment: "I ended up making new friends I wouldn't have met otherwise, which was such a highlight for me." },
  { name: "kexz", comment: "It's not just about games, but being able to meet some brilliant people." },
  { name: "celzior", comment: "I really enjoy social time alongside general discussions about weird, wacky and wonderful computer systems!" },
];
</script>

<template>
  <section id="reviews" class="bg-card py-24 sm:py-32">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div class="mb-14 text-center"><p class="text-xs font-bold uppercase tracking-[.2em] text-primary">From community</p><h2 class="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Found at <span class="text-primary">Gamers Unite!</span></h2></div>
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4"><article v-for="review in reviews" :key="review.name" class="flex min-h-64 flex-col rounded-[2rem] border border-border bg-background p-8 transition hover:-translate-y-2 hover:border-primary/50"><p class="text-lg leading-8 text-foreground">“{{ review.comment }}”</p><div class="mt-auto border-t border-border pt-6"><p class="font-bold">{{ review.name }}</p><p class="mt-1 text-[10px] font-bold uppercase tracking-[.18em] text-primary">Gamers Unite member</p></div></article></div>
    </div>
  </section>
</template>
