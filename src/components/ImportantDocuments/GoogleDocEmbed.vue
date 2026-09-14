<template>
    <section>
        <iframe 
        class="w-[50rem] m:w-[50rem] h-screen" 
        allow="picture-in-picture full"
        :src="src"></iframe>
    </section>
  </template>
  
<script setup lang="ts">
defineProps<{
    src: string
}>();

// Stops errors from Google document embeds in browsers.
if (typeof window !== "undefined") (window as any).DOCS_timing = {};
</script>