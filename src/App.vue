<script setup lang="ts">
import Navbar from "./components/Shared/Navbar.vue";
import Footer from "./components/Shared/Footer.vue";
</script>

<template>
  <Navbar />
  <router-view />
  <Footer />
</template>
