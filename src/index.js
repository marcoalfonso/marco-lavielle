import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'

import RootContainer from './routes'
import configureStore from './store'

const store = configureStore()

const App = () =>
  <Provider store={store}>
    <BrowserRouter>
      <RootContainer />
    </BrowserRouter>
  </Provider>

ReactDOM.render(<App />, document.getElementById('app'))
module.hot.accept();
