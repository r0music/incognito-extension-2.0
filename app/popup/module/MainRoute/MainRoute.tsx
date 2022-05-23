import React, { Suspense } from "react";
import { Route, Switch } from "react-router-dom";
import { IRouteProps } from "..";

const context = require.context("@popup/module", true, /\.route.tsx?/);

const MainRoute = () => {
  const [routes, setRoutes] = React.useState<Array<IRouteProps>>([]);
  const handleGetRoutes = () => {
    const allRoutes: IRouteProps[] = [];
    context.keys().map((path: string) => allRoutes.push(context(`${path}`).default));
    setRoutes([...allRoutes]);
  };

  React.useEffect(() => {
    handleGetRoutes();
  }, []);

  return (
    <Suspense fallback="loading">
      <Switch>
        {routes.map((route) => (
          <Route {...route} />
        ))}
      </Switch>
    </Suspense>
  );
};

export default React.memo(MainRoute);
