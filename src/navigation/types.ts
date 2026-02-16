/**
 * Param types for tab and stack screens.
 * Use these when typing route.params in screen components.
 */
export type TabParamList = {
  Route: { openDestination?: boolean; destinationName?: string } | undefined;
  Safety: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends TabParamList {}
  }
}

export type MapRouteParams = NonNullable<TabParamList['Route']>;
