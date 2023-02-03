import {createApp} from 'vue'
import App from './App.vue'
import IconifyIconOffline from '../iconifyIconOffline.vue'

createApp(App).component('Iconify', IconifyIconOffline).mount('#app')
