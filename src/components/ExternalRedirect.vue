<template>
    <section class="container">
        <div class="grid place-items-center lg:max-w-screen-xl gap-8 mx-auto py-20 md:py-32">
            <div class="text-center space-y-8">

                <div class="max-w-screen-md mx-auto text-center text-5xl md:text-6xl font-bold">
                    <h1>
                        Redirecting to the {{ props.gameName }}
                        <span class="text-transparent bg-gradient-to-r from-[#972c89] to-primary bg-clip-text">
                            {{ !props.isCommunity ? 'official' : 'community' }} server
                        </span>
                    </h1>
                </div>

                <p class="max-w-screen-sm mx-auto text-xl text-muted-foreground">
                    Your browser may ask you to confirm the redirect. If you are not redirected, please click the link
                    below:
                </p>

                <div class="text-center">
                    <a :href="props.url" class="text-primary text-lg font-medium hover:underline">
                        Connect to the {{ props.serverDescription }}
                    </a>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { onMounted } from "vue";

const props = defineProps<{
    url: string,
    serverDescription: string,
    gameName: string,
    isCommunity: boolean
}>();

onMounted(() => {
    window.location.href = props.url;
});
</script>