<script setup lang="ts">
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
const faqs = [
  ["Is there an age limit?", "Yes, attendees must be 16 or older."],
  ["What system should I bring?", "We currently play on PC. If enough people want consoles, we can look into that too."],
  ["Do I need to book a place?", "No. Entry is free and first-come, first-served, but capacity and hardware are limited."],
  ["Can I request a game?", "Yes. Submit your game request in the #game-requests Discord channel."],
  ["What about food and drink?", "We provide limited snacks. Bring your own if you prefer; groups often arrange a pizza delivery."],
];
</script>

<template>
  <section id="faq" class="bg-background py-24 sm:py-32"><div class="mx-auto max-w-3xl px-4 sm:px-6"><div class="mb-12 text-center"><p class="text-xs font-bold uppercase tracking-[.2em] text-primary">Need to know</p><h2 class="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Common questions</h2></div><Accordion type="single" collapsible class="rounded-3xl border border-border bg-card px-6 sm:px-8"><AccordionItem v-for="([question, answer], index) in faqs" :key="question" :value="`item-${index}`"><AccordionTrigger class="text-left text-base font-bold hover:text-primary">{{ question }}</AccordionTrigger><AccordionContent class="text-muted-foreground">{{ answer }}</AccordionContent></AccordionItem></Accordion><p class="mt-7 text-center text-sm text-muted-foreground">Still have questions? <a href="#contact" class="font-bold text-primary hover:underline">Contact us</a> or <a href="#community" class="font-bold text-primary hover:underline">join Discord</a>.</p></div></section>
</template>
