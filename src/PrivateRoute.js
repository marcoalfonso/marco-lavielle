import React from 'react'
import { Route, Redirect } from 'react-router-dom'
import { useCookies } from 'react-cookie'

// a route only for the signed-in admin; anyone else goes to the homepage
const PrivateRoute = ({ component: Component, ...rest }) => {
  const [cookies] = useCookies(['loggedIn'])
  return (
    <Route
      {...rest}
      render={(props) =>
        cookies.loggedIn ? <Component {...props} /> : <Redirect to={{ pathname: '/', state: { from: props.location } }} />
      }
    />
  )
}

export default PrivateRoute
