import { type ReactElement, type ReactNode, Children, isValidElement, useMemo } from 'react';

import { createMatcher } from './internal/create-matcher.js';
import { useJsonMemo } from './internal/use-json-memo.js';
import { type RouteProps, Route } from './route.js';
import { RouteMatchContext } from './route-match-context.js';
import { useLocation } from './use-location.js';

type RoutesProps = {
  readonly children?: ReactNode;
};

const isRoute = (child: unknown): child is ReactElement<RouteProps, typeof Route> => {
  return isValidElement(child) && child.type === Route;
};

const Routes = ({ children }: RoutesProps = {}): JSX.Element | null => {
  const { path, state, search, hash } = useLocation();
  const routes = Children.toArray(children).filter(isRoute);
  const patterns = routes.flatMap<[pattern: string, index: number]>((child, i) => {
    return isRoute(child)
      ? Array.isArray(child.props.path)
        ? child.props.path.map((childPath): [string, number] => [childPath, i])
        : [[child.props.path ?? '/*', i]]
      : [];
  });
  const stablePatterns = useJsonMemo(patterns);
  const matchers = useMemo(
    () => stablePatterns.map(([pattern, index]) => createMatcher(pattern, index)),
    [stablePatterns],
  );
  const [routeMatch, routeIndex] = useMemo(() => {
    for (const matcher of matchers) {
      const [match, index] = matcher(path);

      if (match) {
        return [{ ...match, hash, search, state }, index];
      }
    }

    return [null, null];
  }, [matchers, state, path, search, hash]);

  return routeIndex != null ? (
    <RouteMatchContext.Provider value={routeMatch}>{routes[routeIndex]?.props.children}</RouteMatchContext.Provider>
  ) : null;
};

export { type RoutesProps, Routes };
