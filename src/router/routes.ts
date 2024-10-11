import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('layouts/RouteHelper.vue'),
    path: '/',
  },
  {
    alias: ['/initial-congregation-selector'],
    children: [
      {
        component: () => import('pages/CongregationSelectorPage.vue'),
        path: '',
      },
    ],
    component: () => import('layouts/MainLayout.vue'),
    meta: { icon: 'mmm-groups', title: 'titles.profileSelection' },
    path: '/congregation-selector',
  },
  {
    children: [
      { component: () => import('pages/MediaCalendarPage.vue'), path: '' },
    ],
    component: () => import('layouts/MainLayout.vue'),
    meta: { icon: 'mmm-media', title: 'titles.meetingMedia' },
    path: '/media-calendar',
  },
  {
    children: [
      { component: () => import('pages/PresentWebsite.vue'), path: '' },
    ],
    component: () => import('layouts/MainLayout.vue'),
    meta: { icon: 'mmm-open-web', title: 'titles.presentWebsite' },
    path: '/present-website',
  },
  {
    children: [
      { component: () => import('pages/MediaPlayerPage.vue'), path: '' },
    ],
    component: () => import('layouts/MediaPlayerLayout.vue'),
    meta: { title: 'titles.mediaPlayer' },
    path: '/media-player',
  },
  {
    children: [{ component: () => import('pages/SetupWizard.vue'), path: '' }],
    component: () => import('layouts/MainLayout.vue'),
    meta: { icon: 'mmm-configuration', title: 'setup-wizard' },
    path: '/setup-wizard',
  },
  {
    children: [{ component: () => import('pages/SettingsPage.vue'), path: '' }],
    component: () => import('layouts/MainLayout.vue'),
    meta: { icon: 'mmm-settings', title: 'titles.settings' },
    path: '/settings',
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    component: () => import('pages/ErrorNotFound.vue'),
    path: '/:catchAll(.*)*',
  },
];

export default routes;
