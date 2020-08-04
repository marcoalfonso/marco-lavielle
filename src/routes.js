import React from 'react'
import { withRouter, Switch, Route } from 'react-router-dom'

import Homepage from './pages/Homepage/Homepage'
import ArtPage from './pages/Art/Art'
import SoftwarePage from './pages/Software/Software'
import AboutPage from './pages/About/About'

export const Routes = () =>
  <Switch>
    <Route exact path={`/`} component={Homepage} />
    <Route exact path={`/art`} component={ArtPage} />
    <Route exact path={`/software`} component={SoftwarePage} />
    <Route exact path={`/about`} component={AboutPage} />
  </Switch>

const RootContainer = withRouter(Routes)

export default RootContainer
