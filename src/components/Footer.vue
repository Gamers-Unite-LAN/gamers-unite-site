<script setup lang="ts">
import Separator from "./ui/separator/Separator.vue";
</script>

<template>
  <footer id="footer" class="container py-24 pb-16 sm:py-32 sm:pb-24">
    <div class="p-10 bg-muted/50 dark:bg-card border rounded-2xl">
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-x-12 gap-y-8">
        <div class="col-span-full xl:col-span-1">

          <a href="/" class="flex font-bold items-center">
            <img class="w-[3rem] rounded-lg relative rouded-lg leading-none flex items-center" :src="'assets/Logo.png'"
              alt="GamersUnite Logo" />

            <h3 class="text-2xl">Gamers Unite!</h3>

          </a>
        </div>

        <div class="flex flex-col gap-2">
          <h3 class="font-bold text-lg">Help</h3>
          <div>
            <a href="#contact" class="opacity-60 hover:opacity-100">
              Contact Us
            </a>
          </div>

          <div>
            <a href="#faq" class="opacity-60 hover:opacity-100">
              FAQ
            </a>
          </div>

          <div>
            <a href="#contact" class="opacity-60 hover:opacity-100">
              Feedback
            </a>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <h3 class="font-bold text-lg">Socials</h3>

          <div class="flex flex-col md:flex-row gap-2 md:gap-10">
            <div class="flex flex-col gap-2">
              <div>
                <a href="https://discord.gg/2akPpZD73v" target="_blank" class="opacity-60 hover:opacity-100">
                  Discord
                </a>
              </div>

              <div>
                <a href="https://x.com/GamersUniteLAN" target="_blank" class="opacity-60 hover:opacity-100">
                  X
                </a>
              </div>

              <div>
                <a href="https://www.facebook.com/profile.php?id=61567250554322" target="_blank"
                  class="opacity-60 hover:opacity-100">
                  Facebook
                </a>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <div>
                <a href="https://www.instagram.com/gamersunitelan/" target="_blank"
                  class="opacity-60 hover:opacity-100">
                  Instagram
                </a>
              </div>

              <div>
                <a href="https://www.youtube.com/@GamersUnite923" target="_blank" class="opacity-60 hover:opacity-100">
                  Youtube
                </a>
              </div>

              <div>
                <a href="https://www.reddit.com/r/GamersUniteLAN/" target="_blank" class="opacity-60 hover:opacity-100">
                  Reddit
                </a>
              </div>
            </div>

          </div>

        </div>
      </div>

      <Separator class="my-6" />
      <section className="">
        <h3 class="">
          &copy; 2024 Developed by
          <a target="_blank" href="https://github.com/thenerdman"
            className="text-primary transition-all border-primary hover:border-b-2">
            Alex Wilson
          </a>
        </h3>
      </section>
    </div>
  </footer>
</template>
