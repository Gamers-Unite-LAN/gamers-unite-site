<template>
  <Hero />
  <Quicklook />
  <Games />
  <Reviews />
  <Team />
  <Community />
  <Contact />
  <FAQ />
  <HostThankYouEgg />
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useHead } from "@unhead/vue";
import Hero from "../components/LandingPage/Hero.vue";
import Games from "../components/LandingPage/Games.vue";
import Reviews from "../components/LandingPage/Reviews.vue";
import Team from "../components/LandingPage/Team.vue";
import Community from "../components/LandingPage/Community.vue";
import Contact from "../components/LandingPage/Contact.vue";
import FAQ from "../components/LandingPage/FAQ.vue";
import HostThankYouEgg from "@/components/LandingPage/HostThankYouEgg.vue";
import Quicklook from "@/components/LandingPage/Quicklook.vue";
import {
  formatEventDate,
  homepageState,
  loadHomepageStateFromApi,
} from "@/lib/homepageState";

const nextEventDateLabel = computed(() =>
  homepageState.nextEvent ? formatEventDate(homepageState.nextEvent.event.eventDate) : null,
);

useHead(() => {
  const description = nextEventDateLabel.value
    ? `Join Gamers Unite! LAN in Wiltshire. Our next event is on ${nextEventDateLabel.value}.`
    : "Join Gamers Unite! LAN in Wiltshire for local gaming events, community, and all-day meetups.";

  return {
    title: "Gamers Unite! LAN | Wiltshire Gaming Community",
    meta: [
      {
        name: "description",
        content: description,
      },
      {
        property: "og:description",
        content: description,
      },
      {
        name: "twitter:description",
        content: description,
      },
    ],
  };
});

onMounted(async () => {
  if (homepageState.nextEvent) return;

  try {
    await loadHomepageStateFromApi();
  } catch {
    // Keep the page content stable when the next-event API is unavailable.
  }
});
</script>