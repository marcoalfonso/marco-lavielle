import React from 'react'
import { withRouter, Switch, Route } from 'react-router-dom'

import ArtPage from './pages/ArtPage'

export const Routes = () =>
  <Switch>
    <Route exact path={`/art`} component={ArtPage} />
  </Switch>

const RootContainer = withRouter(Routes)

export default RootContainer
