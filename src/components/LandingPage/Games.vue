<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface GamesProps {
  icon: string;
  title: string;
  description: string;
}

const featureList: GamesProps[] = [
{
    icon: "tf2",
    title: "Team Fortress 2",
    description:
      "A fast-paced, team-based shooter with unique character classes, each offering distinct weapons and abilities. Players must work together in modes like Capture the Flag and Control Points, making it a LAN party favorite for its chaotic, fun-filled gameplay and humor.",
  },
  {
    icon: "cs2",
    title: "Counter Strike 2",
    description:
      "The latest evolution of the iconic tactical shooter where teams of terrorists and counter-terrorists compete in objective-based gameplay. With precise gunplay and strategic coordination, it's a staple for competitive LAN matches.",
  },
  {
    icon: "halo",
    title: "Halo Combat Evolved / Custom Edition",
    description:
      "The classic sci-fi FPS that defined LAN gaming, featuring iconic weapons, vehicles, and maps. Players battle it out in modes like Slayer and Capture the Flag, creating unforgettable multiplayer memories.",
  },
  {
    icon: "tmnf",
    title: "Trackmania Nations Forever",
    description:
      "A high-speed, arcade-style racing game where players compete on gravity-defying tracks. It's perfect for LAN, allowing players to showcase precision driving skills and compete for the best lap times in fast-paced matches.",
  },
  {
    icon: "mc",
    title: "Minecraft Hunger Games",
    description:
      "A mini-game that inspired the 'Battle Royal' genre, where players scavenge for resources, craft weapons, and battle to be the last person standing. Perfect for LAN parties with its mix of strategy, creativity, and combat.",
  },
  {
    icon: "q3",
    title: "Quake 3 Arena",
    description:
      "An arena-style FPS emphasizing fast movement and precision shooting. Players compete in adrenaline-fueled deathmatches, utilizing a variety of futuristic weapons in iconic maps built for LAN chaos.",
  },
];
</script>

<template>
  <section
    id="games"
    class="container py-24 sm:py-32"
  >
    <h2 class="text-lg text-primary text-center mb-2 tracking-wider">
      Games
    </h2>

    <h2 class="text-3xl md:text-4xl text-center font-bold mb-4">
      What do we play?
    </h2>

    <h3 class="md:w-1/2 mx-auto text-xl text-center text-muted-foreground mb-8">
      While we all play a variety of games, when it comes to the events, there's only so much time to play so many games.
      We always welcome suggestions for new and old games to play and try to play the games that we all will enjoy. 
      Here are some of the games we currently play at events.
    </h3>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="{ icon, title, description } in featureList"
        :key="title"
      >
        <Card class="h-full bg-background border-0 shadow-none">
          <CardHeader class="flex justify-center items-center">
            <div
              class="bg-primary/20 p-2 rounded-full ring-8 ring-primary/10 mb-4"
            >
              <img
                :src="`game-logos/${icon}.png`"
                class="size-10 text-primary"
              />
            </div>

            <CardTitle class="text-center">
              {{ title }}
            </CardTitle>
          </CardHeader>

          <CardContent class="text-muted-foreground text-center">
            {{ description }}
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped></style>
