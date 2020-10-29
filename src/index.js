import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { CookiesProvider } from 'react-cookie'

import RootContainer from './App.js'
import configureStore from './store'

const store = configureStore()

const App = () =>
  <Provider store={store}>
    <CookiesProvider>
      <BrowserRouter>
        <RootContainer />
      </BrowserRouter>
    </CookiesProvider>
  </Provider>

ReactDOM.render(<App />, document.getElementById('app'))
module.hot.accept();
