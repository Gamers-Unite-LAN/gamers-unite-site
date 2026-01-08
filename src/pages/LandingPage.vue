<template>
  <Countdown :landingPageData="data" />
  <Hero />
  <!--<Sponsors />-->
  <Games />
  <Reviews />
  <Team />
  <Community />
  <Contact :landingPageData="data"  />
  <FAQ />
</template>

<script setup lang="ts">
import Hero from "../components/LandingPage/Hero.vue";
import Games from "../components/LandingPage/Games.vue";
//import Sponsors from "../components/LandingPage/Sponsors.vue";
import Reviews from "../components/LandingPage/Reviews.vue";
import Team from "../components/LandingPage/Team.vue";
import Community from "../components/LandingPage/Community.vue";
import Contact from "../components/LandingPage/Contact.vue";
import FAQ from "../components/LandingPage/FAQ.vue";
import Countdown from "@/components/LandingPage/Countdown.vue";
import { LandingPageData } from "@/lib/types";
import { ref } from "vue";

const data = ref<LandingPageData>();

async function fetchData() {
  try {
    // A single API call to get all the data, giving it to components that need it
    const response = await fetch('https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLgZ3xHMomXgQmYwcZF2vtMzORybZr9LFjCw_6QrQFxveJ2s-tGbSF5rHJeBW3Lx_CDg_8N5b0B88HQqDTMqkSc17yInI1KF0D44ye__9O-ZqG5MAbT8Rc0rvez-l_mp9RyLicZ641MqVK4EeouqDHZls5rlDqGftOJ7oFeLcXhhzuk7AmosWJBgI42H3dh6V4p9JiNWYTpwSYHb2xrsJ4hWPqgpwjJvrNQc1x40DDa9pF4ldTogRCtJ7MmeBWHbyeBEwtmm-L36kdcIKM6hN9L7KWk_iQjSuqBO10O4&lib=MSgG92lFrQbuKDkzQZk6d7xZ3cC3nQnaI');
    const json: LandingPageData = await response.json();
    data.value = <LandingPageData>{
      ...json,
      date: new Date(json.date) // Convert date string to Date object
    };
  } catch (error) {
    console.error('Error fetching landing page data:', error);
  }
}

fetchData();
</script>