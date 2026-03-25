import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import Game from "./components/Game.vue";
import NotFound from "./components/NotFound.vue";

const routes: Array<RouteRecordRaw> = [
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

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
