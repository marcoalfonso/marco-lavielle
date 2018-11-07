import React from 'react'
import { withRouter, Switch, Route } from 'react-router-dom'

import ArtPage from './pages/ArtPage'
import SoftwarePage from './pages/SoftwarePage'

export const Routes = () =>
  <Switch>
    <Route exact path={`/art`} component={ArtPage} />
    <Route exact path={`/software`} component={SoftwarePage} />
  </Switch>

const RootContainer = withRouter(Routes)

export default RootContainer
