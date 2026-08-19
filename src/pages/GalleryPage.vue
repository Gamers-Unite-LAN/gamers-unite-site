<script setup lang="ts">
import { ref } from 'vue';
import EventColumn from '@/components/Gallery/EventTileColumn.vue';
import { vOnClickOutside } from '@vueuse/components'


const showOverview = ref(true);

function showEvent(eventId: string) {
    showOverview.value = false;
    loadEventImages(eventId);
}

function reset() {
    showOverview.value = true;
    eventImgs.value = [];
}

const eventImgs = ref<string[]>([]);
function loadEventImages(eventId: string) {
    // Placeholder for loading event images based on the eventId
    // This function can be expanded to fetch images from an API or a local source
    console.log(`Loading images for event: ${eventId}`);
    eventImgs.value = [
        `https://placecats.com/200/300?event=${eventId}`,
        `https://placecats.com/300/200?event=${eventId}`,
        `https://placecats.com/200/300?event=${eventId}`,
        `https://placecats.com/300/200?event=${eventId}`,
        `https://placecats.com/200/300?event=${eventId}`,
        `https://placecats.com/300/200?event=${eventId}`,
        `https://placecats.com/200/300?event=${eventId}`,
        `https://placecats.com/300/200?event=${eventId}`,
        `https://placecats.com/200/300?event=${eventId}`,
        `https://placecats.com/300/200?event=${eventId}`,
    ];
}

const largeImg = ref<string | null>(null);
function showLargeImage(img: string) {
    largeImg.value = img;
}
</script>

<template>
    <section class="container">
        <div class="grid place-items-center lg:max-w-screen-xl gap-8 mx-auto py-16 md:py-20">
            <div class="text-center space-y-8">
                <div class="max-w-screen-md mx-auto text-center text-5xl md:text-6xl font-bold">
                    <h1>Gallery</h1>
                </div>
                <div class="max-w-screen-md mx-auto text-center text-2xl md:text-2xl font-bold">
                    <h2> Check out our previous <span class="text-primary">LANs</span></h2>
                </div>
            </div>

            <div v-if="showOverview"
                class="mx-auto flex flex-col justify-evenly gap-6 px-4 sm:px-6 lg:flex-row lg:gap-0 lg:px-8">
                <EventColumn event="winter" @eventClicked="showEvent" />
                <EventColumn event="spring" @eventClicked="showEvent" />
                <EventColumn event="summer" @eventClicked="showEvent" />
                <EventColumn event="autumn" @eventClicked="showEvent" />
            </div>

            <div v-else
                class="mx-auto flex flex-col flex-wrap justify-evenly gap-20 px-4 sm:px-6 lg:flex-row lg:gap-20 lg:px-8">
                <div v-for="(img, index) in eventImgs" :key="index"
                    class="rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm lg:w-[23%]">
                    <img :src="img" alt="Event Image" @click="showLargeImage(img)" class="cursor-pointer" />
                </div>
            </div>

            <Transition enter-active-class="transition-all duration-500 ease-out"
                enter-from-class="opacity-0 translate-y-8" enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-300 ease-in" leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 translate-y-8">
                <button v-if="!showOverview" @click="reset"
                    class="fixed bottom-0 left-0 w-full btn bg-primary btn-lg px-8 py-4 text-xl font-bold">
                    Back to events
                </button>
            </Transition>

            <Transition enter-active-class="transition-all duration-500 ease-out"
                enter-from-class="opacity-0 translate-y-8" enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-300 ease-in" leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 translate-y-8">
                <div v-if="largeImg" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
                    v-on-click-outside="() => largeImg = null">
                    <div class="bg-white p-4 rounded-lg max-w-lg w-full relative">
                        <button @click="largeImg = null"
                            class="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                            &times;
                        </button>
                        <img :src="largeImg" alt="Large Event Image" class="w-full h-auto rounded-lg" />
                    </div>
                </div>
            </Transition>
        </div>
    </section>
</template>
