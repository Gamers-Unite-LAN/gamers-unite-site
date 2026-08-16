<script setup lang="ts">
import { ref } from "vue";
import { Menu, X } from "lucide-vue-next";

const isOpen = ref(false);
const links = [
  { href: "/#games", label: "Games" },
  { href: "/#reviews", label: "Community" },
  { href: "/#team", label: "Team" },
  { href: "/#contact", label: "Next meetup" },
  { href: "/core-principles", label: "Principles" },
  { href: "/documents", label: "Documents" },
];

function closeMenu() { isOpen.value = false; }
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-primary/20 bg-card/95 backdrop-blur">
    <nav class="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
      <RouterLink to="/" class="flex items-center gap-3 font-extrabold tracking-tight text-foreground" @click="closeMenu">
        <img src="/assets/Logo.png" alt="Gamers Unite! LAN" class="size-10 rounded-xl object-contain" />
        <span class="text-lg sm:text-xl">Gamers <span class="text-primary">Unite!</span></span>
      </RouterLink>

      <div class="hidden items-center gap-7 text-xs font-bold uppercase tracking-widest text-muted-foreground lg:flex">
        <RouterLink v-for="link in links" :key="link.label" :to="link.href" class="transition-colors hover:text-primary">{{ link.label }}</RouterLink>
        <a href="/#community" class="rounded-lg bg-primary px-5 py-3 text-foreground shadow-brand transition hover:bg-secondary">Join Discord</a>
      </div>

      <button class="rounded-lg p-2 text-foreground lg:hidden" type="button" :aria-expanded="isOpen" aria-label="Toggle navigation" @click="isOpen = !isOpen">
        <X v-if="isOpen" class="size-6" /><Menu v-else class="size-6" />
      </button>
    </nav>
    <div v-if="isOpen" class="border-t border-border bg-card px-4 py-4 lg:hidden">
      <div class="mx-auto flex max-w-7xl flex-col gap-1">
        <RouterLink v-for="link in links" :key="link.label" :to="link.href" class="rounded-lg px-4 py-3 font-semibold text-muted-foreground hover:bg-primary/10 hover:text-primary" @click="closeMenu">{{ link.label }}</RouterLink>
        <a href="/#community" class="mt-2 rounded-lg bg-primary px-4 py-3 text-center font-bold text-foreground" @click="closeMenu">Join Discord</a>
      </div>
    </div>
  </header>
</template>
