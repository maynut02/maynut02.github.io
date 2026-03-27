import { createApp } from "vue";

import App from "./App.vue";
import "./style.css";

document.documentElement.classList.remove("light");
document.documentElement.classList.add("dark");

createApp(App).mount("#app");
