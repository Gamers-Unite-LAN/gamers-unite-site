<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
</script>

<template>
  <section class="container">
    <div
      class="grid place-items-center lg:max-w-screen-xl gap-8 mx-auto py-20 md:py-32"
    >
      <div class="text-center space-y-8">
        
        <div
          class="max-w-screen-md mx-auto text-center text-5xl md:text-6xl font-bold"
        >
          <h1>
            Join your local community at
            <span
              class="text-transparent bg-gradient-to-r from-[#972c89] to-primary bg-clip-text"
              >Gamers Unite
            </span>
            LAN events
          </h1>
        </div>

        <p class="max-w-screen-sm mx-auto text-xl text-muted-foreground">
          Meet with people who share your passion and connect with new 
          friends. Join us for exciting LAN events and make lasting 
          connections.
        </p>
      </div>

      <div class="relative group mt-14">
        <!-- gradient shadow -->
        <div
          class="absolute -top-6 right-12 w-[90%] h-12 lg:h-[80%] glowing-shadow blur-3xl rounded-full"
        ></div>

        <img
          class="w-full md:w-[1200px] mx-auto rounded-lg relative rouded-lg leading-none flex items-center glowing-border"
          :src="'event-images/SetupShot.jpg'"
          alt="people playing games at a LAN event"
        />

        <!-- gradient effect img -->
        <div
          class="absolute bottom-0 left-0 w-full h-20 md:h-28 bg-gradient-to-b from-background/0 via-background/50 to-background rounded-lg"
        ></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.img-shadow-animation {
  animation-name: img-shadow-animation;
  animation-iteration-count: infinite;
  animation-duration: 2s;
  animation-timing-function: linear;
  animation-direction: alternate;
}

.img-border-animation {
  animation-name: img-border-animation;
  animation-iteration-count: infinite;
  animation-duration: 2s;
  animation-timing-function: linear;
  animation-direction: alternate;
}

@keyframes img-shadow-animation {
  from {
    opacity: 0.5;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0px);
  }
}

.glowing-shadow {
  background-color: rgba(var(--primary-rgb), 0.5);
  animation: img-shadow-animation 2s infinite alternate;
}

@keyframes img-border-animation {
  from {
    border-top-color: rgba(var(--primary-rgb), 0.1);
  }

  to {
    border-top-color: rgba(var(--primary-rgb), 0.6);
  }
}
.glowing-border {
  border-top-width: 4px;
  animation: img-border-animation 2s infinite alternate;
}
</style>
