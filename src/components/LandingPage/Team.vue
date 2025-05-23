<script setup lang="ts">
import { useTemplateRef, onMounted, nextTick } from "vue";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

import XIcon from "@/icons/XIcon.vue";


interface TeamProps {
  imageUrl: string;
  firstName: string;
  lastName: string;
  positions: string[];
  socialNetworks: SocialNetworkProps[];
}

interface SocialNetworkProps {
  name: string;
  url: string;
}

const teamList: TeamProps[] = [
  {
    imageUrl: "team/bill.jpg",
    firstName: "Bill",
    lastName: "Crooks",
    positions: ["Bill hosted the first LAN back in 2024, after which he brought together the first GUL team, the rest is history!"],
    socialNetworks: []
  },
  {
    imageUrl: "team/alex.jpg",
    firstName: "Alex",
    lastName: "Wilson",
    positions: ["After attending the first LAN, Alex joined the team soon after. He helps out with the technical side of the events."],
    socialNetworks: []
  },
  {
    imageUrl: "team/jolyon.jpg",
    firstName: "Jolyon",
    lastName: "Buckle",
    positions: ["Jolyon brings warmth to our events by welcoming newcomers and returning faces alike."],
    socialNetworks: []
  },
];

const socialIcon = (socialName: string) => {
  switch (socialName) {
    case "X":
      return XIcon;
  }
};

// when a card has scrolled into view on mobile only, saturate the card image in view

const cardRefs = useTemplateRef('cards')

onMounted(async () => {
  if (window.innerWidth > 640) return; // Only run on mobile screens

  await nextTick();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("saturate-100");
        } else {
          entry.target.classList.remove("saturate-100");
        }
      });
    },
    { threshold: 0.85 } // Trigger when at least 50% of the card is visible
  );

  (cardRefs.value as [])?.forEach((card: any) => {
    if (!card) return;
    var cardImg = card.$el.querySelector("img");
    if(!cardImg) return;
    observer.observe(cardImg);
  });
});
</script>

<template>
  <section
    id="team"
    class="container lg:w-[75%] py-24 sm:py-32"
  >
    <div class="text-center mb-8">
      <h2 class="text-lg text-primary text-center mb-2 tracking-wider">Team</h2>

      <h2 class="text-3xl md:text-4xl text-center font-bold">
        Your hosts
      </h2>
    </div>

    <div
      class="flex gap-8 flex-col sm:flex-row items-center justify-center"
    >
      <Card
        v-for="{
          imageUrl,
          firstName,
          lastName,
          positions,
          socialNetworks,
        } in teamList"
        :key="imageUrl"
        ref="cards"
        class="bg-muted/60 dark:bg-card flex flex-col h-[30rem] w-[20rem] overflow-hidden group/hoverimg"
      >
        <CardHeader class="p-0 gap-0">
          <div class="h-full overflow-hidden">
            <img
              :src="imageUrl"
              alt=""
              class="w-full aspect-square object-cover saturate-0 transition-all duration-200 ease-linear size-full group-hover/hoverimg:saturate-100 group-hover/hoverimg:scale-[1.01] sm:saturate-0 is-visible:saturate-100"
            />
          </div>
          <CardTitle class="py-6 pb-4 px-6"
            >{{ firstName }}
            <span class="text-primary">{{ lastName }}</span>
          </CardTitle>
        </CardHeader>

        <CardContent
          v-for="(position, index) in positions"
          :key="index"
          :class="{
            'pb-0 text-muted-foreground ': true,
            'pb-4': index === positions.length - 1,
          }"
        >
          {{ position }}<span v-if="index < positions.length - 1">,</span>
        </CardContent>

        <CardFooter class="space-x-4 mt-auto">
          <a
            v-for="{ name, url } in socialNetworks"
            key="name"
            :href="url"
            target="_blank"
            class="hover:opacity-80 transition-all"
            :aria-label="`Visit our ${name} page`"
          >
            <component :is="socialIcon(name)" />
          </a>
        </CardFooter>
      </Card>
    </div>
  </section>
</template>
