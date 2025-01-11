<script setup lang="ts">
import { Marquee } from "@selemondev/vue3-marquee";
import "@selemondev/vue3-marquee/dist/style.css";

import {
  Crown,
} from "lucide-vue-next";

interface sponsorsProps {
  icon: string;
  name: string;
}

const sponsors: sponsorsProps[] = [
  {
    icon: "crown",
    name: "Your company could be here!"
  }
];

const iconMap: Record<
  string,
  | typeof Crown
> = {
  crown: Crown,
};
</script>

<template>
  <section
    id="sponsors"
    class="max-w-[75%] mx-auto pb-24 sm:pb-32"
  >
    <h2 class="text-lg md:text-xl text-center mb-3">Our Sponsors</h2>

    <h3 class="text-md text-center mb-6">
      Check out the amazing sponsors that make this event possible
    </h3>

    <div class="mx-auto">
      <Marquee
        class="gap-[3rem]"
        :pauseOnHover="true"
        :fade="true"
        innerClassName="gap-[3rem]"
      >
        <div
          v-for="{ icon, name } in sponsors"
          :key="name"
        >
          <div class="flex items-center text-xl md:text-2xl font-medium">
            <component
              :is="iconMap[icon]"
              class="mr-2"
              stroke-width="3"
            />
            {{ name }}
          </div>
        </div>
      </Marquee>
    </div>
  </section>
</template>
