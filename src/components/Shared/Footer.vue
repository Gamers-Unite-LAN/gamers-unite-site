<template>
  <footer class="bg-card py-16">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-12 border-b border-border pb-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <a href="/" class="flex items-center gap-3 font-extrabold"><img src="/assets/Logo.png" alt="Gamers Unite! LAN" class="size-11 rounded-xl" /><span class="text-xl">Gamers <span class="text-primary">Unite!</span></span></a>
          <p class="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">Local LAN events for gamers who want more than matchmaking. Bring your setup, meet your squad.</p>
        </div>
        <div class="space-y-3 text-sm"><h2 class="font-bold text-foreground">Explore</h2><a href="/#games" class="block text-muted-foreground hover:text-primary">Games</a><a href="/#contact" class="block text-muted-foreground hover:text-primary">Next LAN</a><RouterLink to="/core-principles" class="block text-muted-foreground hover:text-primary">Core principles</RouterLink><RouterLink to="/documents" class="block text-muted-foreground hover:text-primary">Documents</RouterLink></div>
        <div class="space-y-3 text-sm"><h2 class="font-bold text-foreground">Find us</h2><a href="https://discord.gg/2akPpZD73v" target="_blank" rel="noreferrer" class="block text-muted-foreground hover:text-primary">Discord</a><a href="https://x.com/GamersUniteLAN" target="_blank" rel="noreferrer" class="block text-muted-foreground hover:text-primary">X</a><a href="https://www.facebook.com/profile.php?id=61567250554322" target="_blank" rel="noreferrer" class="block text-muted-foreground hover:text-primary">Facebook</a><a href="/#contact" class="block text-muted-foreground hover:text-primary">Contact</a></div>
      </div>
      <p class="pt-8 text-xs text-muted-foreground">© 2024 Gamers Unite! LAN. Developed by <a href="https://github.com/thenerdman" target="_blank" rel="noreferrer" class="text-primary hover:underline">Alex Wilson</a>.</p>
    </div>
  </footer>
</template>
