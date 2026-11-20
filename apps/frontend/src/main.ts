import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { useThemeStore } from './stores/theme';
import './style.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

// 初始化主题（尽早应用，避免闪烁）
const themeStore = useThemeStore();
themeStore.apply();

app.mount('#app');
