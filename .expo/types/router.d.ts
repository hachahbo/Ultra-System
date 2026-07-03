/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/[restaurantSlug]/` | `/[restaurantSlug]/about` | `/[restaurantSlug]/checkout` | `/[restaurantSlug]/menu` | `/[restaurantSlug]/reservation` | `/_sitemap` | `/dashboard/[restaurantSlug]/` | `/dashboard/[restaurantSlug]/menu` | `/dashboard/[restaurantSlug]/reservations` | `/dashboard/login`;
      DynamicRoutes: `/${Router.SingleRoutePart<T>}` | `/dashboard/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/[restaurantSlug]` | `/dashboard/[restaurantSlug]`;
    }
  }
}
