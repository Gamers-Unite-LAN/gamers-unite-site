<script setup lang="ts">
const quicklookItems = [
  { icon: "coffee", title: "Zero Toxicity", description: "An inclusive space where gamers can relax, meet new people, and play in a respectful, welcoming environment." },
  { icon: "boxes", title: "Beyond The Game", description: "Social lounges, shared meal breaks, and guided events ensure you spend as much time talking as you do fragging." },
  { icon: "map", title: "Locally Sourced", description: "Built by Wiltshire gamers for Wiltshire gamers. Supporting local hobbyists and building a lasting community legacy." }
];
</script>

<template>
  <section id="quicklook" class="bg-card py-24 sm:py-32">
    <div class="flex mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div v-for="item in quicklookItems" :key="item.title">
        <div>
          <div v-if="item.icon == 'coffee'"
            class="w-16 h-16 bg-[#BF0D54]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#BF0D54] text-3xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 2v2m4-2v2m2 4a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1M6 2v2">
              </path>
            </svg>
          </div>
          <div v-else-if="item.icon == 'boxes'"
            class="w-16 h-16 bg-[#D247BF]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#D247BF] text-3xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
              <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                <rect width="7" height="7" x="3" y="14" rx="1"></rect>
              </g>
            </svg>
          </div>
          <div v-else-if="item.icon == 'map'"
            class="w-16 h-16 bg-[#BF0D54]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#BF0D54] text-3xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
              <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <path
                  d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0">
                </path>
                <circle cx="12" cy="8" r="2"></circle>
                <path
                  d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712">
                </path>
              </g>
            </svg>
          </div>
        </div>
        <h2 class="mt-4 text-center text-2xl font-extrabold tracking-tight sm:text-3xl">{{ item.title }}</h2>

        <p class="mt-2 text-center text-[#A8A29E] leading-relaxed">{{ item.description }}</p>
      </div>
    </div>
  </section>
</template>
