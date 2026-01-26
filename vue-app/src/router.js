import { createRouter, createWebHistory } from "vue-router";
import Game from "./components/Game.vue";
import NotFound from "./components/NotFound.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: Game,
  },
  {
    path: "/:pathMatch(.*)*",
    name: "404",
    component: NotFound,
  },
];

const router = new createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
