/*
 * The reducer takes care of our data
 * Using actions, we can change our application state
 * To add a new action, add it to the switch statement in the homeReducer function
 *
 * Example:
 * case YOUR_ACTION_CONSTANT:
 *   return assign({}, state, {
 *       stateVariable: action.var
 *   });
 */

import {
  SENDING_REQUEST,
  SET_CLIENTS,
  SET_POSTS,
  SET_POST
} from '../constants/constants'

// The initial application state
const initialState = {
  loading: false,
  clients: null,
  posts: null,
  post : null
}

const appReducer = (state = initialState, action) => {
  switch (action.type) {
    case SENDING_REQUEST:
      return {
        ...state,
        loading: action.loading
      }

    case SET_CLIENTS:
      return {
        ...state,
        clients: action.clients
      }
    
    case SET_POSTS:
      return {
        ...state,
        posts: action.posts
      }

    case SET_POST:
      return {
        ...state,
        post: action.post
      }

    default:
      return state
  }
}

export default appReducer
