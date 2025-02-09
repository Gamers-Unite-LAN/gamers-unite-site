<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { Star } from "lucide-vue-next";

interface ReviewProps {
  name: string;
  comment: string;
}

const reviewList: ReviewProps[] = [
  {
    name: "Tobyias46",
    comment:
      "What a great community to be a part of",
  },
  {
    name: "manicjack",
    comment:
      "I ended up making some new friends I wouldn't have met otherwise, which was such a highlight for me.",
  },
  {
    name: "kexz",
    comment:
      "it's not just about the games but being able to meet some brilliant people.",
  },
  {
    name: "celzior",
    comment:
      "I really enjoying the social time alongside the general discussions that seem to stem out of you all having weird, wacky and wonderful computer systems!"
  }
];
</script>

<template>
  <section
    id="reviews"
    class="container py-24 sm:py-32"
  >
    <div class="text-center mb-8">
      <h2 class="text-lg text-primary text-center mb-2 tracking-wider">
        Reviews
      </h2>

      <h2 class="text-3xl md:text-4xl text-center font-bold mb-4">
        Hear What Some Of Our Regulars Say
      </h2>
    </div>

    <Carousel
      :opts="{
        align: 'start',
      }"
      class="relative w-[80%] sm:w-[90%] lg:max-w-screen-xl mx-auto"
    >
      <CarouselContent>
        <CarouselItem
          v-for="review in reviewList"
          :key="review.name"
          class="md:basis-1/2 lg:basis-1/3"
        >
          <Card class="bg-muted/50 dark:bg-card">
            <CardContent class="pt-6 pb-0 h-32">
              "{{ review.comment }}"
            </CardContent>

            <CardHeader>
              <div class="flex flex-row items-center gap-4">
                <div class="flex flex-col">
                  <CardTitle class="text-lg">{{ review.name }}</CardTitle>
                </div>
              </div>
            </CardHeader>
          </Card>
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  </section>
</template>
