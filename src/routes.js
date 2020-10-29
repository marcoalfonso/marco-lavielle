import React from 'react'
import { withRouter, Switch, Route } from 'react-router-dom'
import PrivateRoute from 'PrivateRoute'

import Homepage from './pages/Homepage/Homepage'
import ArtPage from './pages/Art/Art'
import SoftwarePage from './pages/Software/Software'
import AboutPage from './pages/About/About'
import JournalPage from './pages/Journal/Journal'
import PostPage from './pages/Post/Post'
import SigninPage from './pages/Signin/Signin'
import Dashboard from './pages/Dashboard/Dashboard'
import EditPost from './pages/Dashboard/EditPost/EditPost'
import EditClient from './pages/Dashboard/EditClient/EditClient'

export const RoutesContainer = () => (
  <Switch>
    <Route exact path={`/`} component={Homepage} />
    <Route exact path={`/art`} component={ArtPage} />
    <Route exact path={`/software`} component={SoftwarePage} />
    <Route exact path={`/journal`} component={JournalPage} />
    <Route exact path={`/journal/:post`} component={PostPage} />
    <Route exact path={`/about`} component={AboutPage} />
    <Route exact path={`/signin`} component={SigninPage} />
    <PrivateRoute exact path="/admin/dashboard" component={Dashboard} />
    <PrivateRoute exact path="/admin/post" component={EditPost} />
    <PrivateRoute exact path="/admin/post/:id" component={EditPost} />
    <PrivateRoute exact path="/admin/client" component={EditClient} />
    <PrivateRoute exact path="/admin/client/:id" component={EditClient} />
  </Switch>
)

const RootContainer = withRouter(RoutesContainer)

export default RootContainer
