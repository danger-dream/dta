import { createApp } from 'vue'
import App from './App.vue'
import './styles.scss'
import IconifyIconOffline from './iconifyIconOffline.vue'

const app = createApp(App)
//app.use(ElementPlus, { size: 'default', zIndex: 2000, locale: zhCn })
app.component('Iconify', IconifyIconOffline)
app.mount('#app')
