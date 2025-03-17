<template>
  <section class="container">
    <div class="grid place-items-center lg:max-w-screen-xl gap-8 mx-auto py-16 md:py-20">
      <div class="text-center space-y-8">
        <div class="max-w-screen-md mx-auto text-center text-5xl md:text-6xl font-bold">
          <h1> Important <span class="text-primary">Documents</span></h1>
        </div>
        <p class="max-w-screen-sm mx-auto text-xl text-muted-foreground"> 
          To make our community thrive, we have some imporant documentation we've written to help us make sure we are all on the same page. 
        </p>
      </div>

      <div class="document-tabs">
        <div class="flex flex-wrap justify-center gap-4">
          <router-link to="/documents/expense-policy" active-class="selected-tab" class="tab">Expense Policy</router-link>
          <router-link to="/documents/safeguarding-policy" active-class="selected-tab" class="tab">Safeguarding Policy</router-link>
        </div>
      </div>

      <router-view v-slot="{ Component }">
        <Transition name="fade">
          <component :is="Component" />
        </Transition>
      </router-view>
    </div>
  </section>
</template>

<style scoped>
.document-tabs {
  @apply flex flex-wrap text-sm font-medium text-center border-b border-gray-700 text-gray-400;
}


.tab {
  @apply 
    inline-block p-4 rounded-t-lg hover:bg-gray-800 hover:text-gray-300;
}

.selected-tab {
  @apply 
    inline-block p-4 text-primary bg-gray-900 rounded-t-lg;
}
</style>