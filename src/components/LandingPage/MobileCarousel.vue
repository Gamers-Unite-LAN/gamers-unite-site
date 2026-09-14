<template>
  <Carousel v-bind="carouselConfig" class="max-w-[100rem] overflow-hidden rounded-[2rem]">
    <Slide v-for="slide in slides" :key="slide"><img :src="slide" class="max-h-[50rem] w-full object-cover" alt="People playing games at a LAN event" /></Slide>
    <template #addons><Navigation /><Pagination /></template>
  </Carousel>
</template>
<script setup lang="ts">
import { Carousel, Slide, Pagination, Navigation } from "vue3-carousel";
const carouselConfig = { itemsToShow: 1, wrapAround: true, autoplay: 3000, transition: 600 };
const slides = ["/event-images/carousel/GroupImage1.jpg", "/event-images/carousel/GroupImage2.jpg", "/event-images/carousel/GroupImage3.jpg", "/event-images/carousel/GroupImage5.jpg"];
</script>
