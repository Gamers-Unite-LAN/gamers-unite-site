<script setup lang="ts">
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQProps {
  question: string;
  answer: string;
  value: string;
}

const FAQList: FAQProps[] = [
  {
    question: "Is there an age limit?",
    answer: "Yes, attendees must be 16 or older.",
    value: "item-1",
  },
  {
    question: "What type of system should I bring?",
    answer:
      "We currently play on PC, however if enough people want to play on consoles we can look into this too!",
    value: "item-2",
  },
  {
    question:
      "Do I need to book a place?",
    answer:
      "No, it's a free, first-come, first-served event. We are currently limited by seat capacity and hardware avaliabilty. If we're full, you may be turned away.",
    value: "item-3",
  },
  {
    question: "Can I request a game?",
    answer: "Yes! Submit your game request on our Discord server in the #game-requests channel.",
    value: "item-4",
  },
  {
    question:
      "What about food and drink?",
    answer: "While we provide limited snacks, it helps if you bring your own. We also tend to all pool together and get a pizza delivered however there is no obligation to join in on this.",
    value: "item-5",
  },
];
</script>

<template>
  <section
    id="faq"
    class="container md:w-[700px] py-24 sm:py-32"
  >
    <div class="text-center mb-8">
      <h2 class="text-lg text-primary text-center mb-2 tracking-wider">FAQS</h2>

      <h2 class="text-3xl md:text-4xl text-center font-bold">
        Common Questions
      </h2>
    </div>

    <Accordion
      type="single"
      collapsible
      class="AccordionRoot"
    >
      <AccordionItem
        v-for="{ question, answer, value } in FAQList"
        :key="value"
        :value="value"
      >
        <AccordionTrigger class="text-left"> {{ question }} </AccordionTrigger>

        <AccordionContent>{{ answer }}</AccordionContent>
      </AccordionItem>
    </Accordion>

    <h3 class="font-medium mt-4">
      Still have questions?
      <a
        href="#contact"
        class="text-muted-foreground underline"
      >
      Contact us
      </a>
      or
      <a
        href="#community"
        class="text-muted-foreground underline"
      >
      Join our discord
      </a>
    </h3>
  </section>
</template>
