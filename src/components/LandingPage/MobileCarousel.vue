<template>
    <Carousel v-bind="carouselConfig">
        <Slide v-for="slide in slides" :key="slide.url">
            <div class="carousel__item">
                <img :src="slide.url" :style="{
                    position: 'relative',
                    top: slide.position.y + 'rem',
                    left: slide.position.x + 'px'
                }" alt="people playing games at a LAN event" />
            </div>
        </Slide>

        <template #addons>
            <Navigation />
            <Pagination />
        </template>
    </Carousel>
</template>

<script setup lang="ts">
import 'vue3-carousel/carousel.css'
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'

const carouselConfig = {
    itemsToShow: 1,
    wrapAround: true,
    autoplay: 3000,
    transition: 600
}

const slides = [
    {
        url: 'event-images/carousel/GroupImage1.jpg',
        position: {
            x: 0,
            y: 0
        }
    },
    {
        url: 'event-images/carousel/GroupImage2.jpg',
        position: {
            x: 0,
            y: 0
        }
    },
    {
        url: 'event-images/carousel/GroupImage3.jpg',
        position: {
            x: 0,
            y: 0
        }
    },
    {
        url: 'event-images/carousel/GroupImage5.jpg',
        position: {
            x: 0,
            y: 0
        }
    },
]
</script>

<style scoped>
.carousel__item {
    max-width: 100rem;
    max-height: 50rem;
}
</style>