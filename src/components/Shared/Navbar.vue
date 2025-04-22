<script lang="ts" setup>
import { ref } from "vue";

import { useColorMode } from "@vueuse/core";
const mode = useColorMode();
mode.value = "dark";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { Menu } from "lucide-vue-next";
import { RouteLocationAsPathGeneric } from "vue-router";

interface RouteProps {
  href: string;
  header?:string;
  label: string;
}

const routeList: RouteProps[] = [
  {
    href: "/core-principles",
    label: "Core Principles",
  },  
  {
    href: "/documents",
    label: "Documents",
  },
  { 
    href: "/",
    header: "games",
    label: "Games",
  },
  {
    href: "/",
    header: "reviews",
    label: "Reviews",
  },
  {
    href: "/",
    header: "team",
    label: "Team",
  },
  {
    href: "/",
    header: "contact",
    label: "Contact And Next Event",
  },
  {
    href: "/",
    header: "faq",
    label: "FAQ",
  },
];

function getUrl(href: string, header?: string) {
  const to: RouteLocationAsPathGeneric = {
    path: href,
    hash: header ? `#${header.replace(/^#/, '')}` : '',
  }
  return to;
}

function handleClick(header?: string) {
  if (header) {
    setTimeout(() => {
      const targetElement = document.querySelector(`#${header}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  } else {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }
}

function handleMobileClick(header?: string) {
  isOpen.value = false;
  handleClick(header)
}

const isOpen = ref<boolean>(false);
</script>

<template>
  <header
    :class="{
      'shadow-dark': mode === 'dark',
      'w-[90%] md:w-[70%] lg:w-[75%] lg:max-w-screen-xl top-5 mx-auto sticky border z-40 rounded-2xl flex justify-between items-center p-2 bg-card shadow-md': true,
    }"
  >
    <a
      href="/"
      class="font-bold text-lg flex items-center"
    >
      <img
          class="w-[3rem] mx-auto rounded-lg relative leading-none flex items-center"
          :src="'assets/Logo.png'"
          alt="GamersUnite Logo"
        />
      Gamers Unite! LAN
    </a>
    <!-- Mobile -->
    <div class="flex items-center lg:hidden">
      <Sheet v-model:open="isOpen">
        <SheetTrigger as-child>
          <Menu
            @click="isOpen = true"
            class="cursor-pointer"
          />
        </SheetTrigger>

        <SheetContent
          side="left"
          class="flex flex-col justify-between rounded-tr-2xl rounded-br-2xl bg-card"
        >
          <div>
            <SheetHeader class="mb-4 ml-4">
              <SheetTitle class="flex items-center">
                <a
                  href="/"
                  class="flex items-center"
                >
                  <img
                      class="w-[3rem] mx-auto rounded-lg relative leading-none flex items-center"
                      :src="'assets/Logo.png'"
                      alt="GamersUnite Logo"
                    />
                  Gamers Unite!
                </a>
              </SheetTitle>
            </SheetHeader>

            <div class="flex flex-col gap-2">
              <Button
                v-for="{ href, header, label } in routeList"
                :key="label"
                as-child
                variant="ghost"
                class="justify-start text-base"
              >
              <RouterLink :to="getUrl(href, header)" 
              @click="handleMobileClick(header)">
                {{ label }}
              </RouterLink>
              </Button>
            </div>
          </div>

          <SheetFooter class="flex-col sm:flex-col justify-start items-start">
            <Separator class="mb-2" />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>

    <!-- Desktop -->
    <NavigationMenu class="hidden lg:block">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Button
              v-for="{ href, header, label } in routeList"
              :key="label"
              as-child
              variant="ghost"
              class="justify-start text-base"
            >
              <RouterLink :to="getUrl(href, header)"  
              @click="handleClick(header)">
                {{ label }}
              </RouterLink>
            </Button>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </header>
</template>

<style scoped>
.shadow-light {
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.085);
}

.shadow-dark {
  box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.141);
}
</style>
