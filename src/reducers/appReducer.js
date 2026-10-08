import { deviceFor } from 'device'
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
  SET_POST,
  SET_USER,
  SET_CLIENT,
  SET_DEVICE
} from '../constants/constants'

// The initial application state
const initialState = {
  loading: false,
  clients: null,
  client: null,
  posts: null,
  post : null,
  user: null,
  device: deviceFor(),
  paintings: [
    { 
      link: '../images/paintings/clovelly_beach.jpg',
      status: 'Sold',
    },
    {
      link: '../images/paintings/abstract_2.jpg',
      status: 'Sold',
    },
    { 
      link: '../images/paintings/girl.jpg',
      status: 'Sold',
    },
    { 
      link: '../images/paintings/swimmer.jpg',
      status: 'Sold',
    },
    { 
      link: '../images/paintings/abstract_1.jpg',
      status: 'Sold',
    },
    { 
      link: '../images/paintings/straya.jpg',
      status: 'Sold',
    },
    { 
      link: '../images/paintings/abstract_3.jpg',
      status: 'Sold',
    },
    {
      link: '../images/paintings/red_figure.jpg',
      status: 'Sold',
      // shown smaller on desktop: unframed, it fills its photo edge to edge
      scale: 0.8,
    },
    {
      link: '../images/paintings/winking_portrait.jpg',
      status: 'Sold',
    },
    {
      link: '../images/paintings/orange_portrait.jpg',
      status: 'Sold',
    },
    {
      link: '../images/paintings/green_bouquet.jpg',
      status: 'Sold',
    },
    {
      link: '../images/paintings/blue_forms.jpg',
      status: 'Sold',
    },
    {
      link: '../images/paintings/silver_portrait.jpg',
      status: 'Sold',
    },
    {
      link: '../images/paintings/red_leaves.jpg',
      status: 'Sold',
    },
    {
      link: '../images/paintings/hydrangea.jpg',
      status: 'Sold',
    },
  ]
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

    case SET_CLIENT:
      return {
        ...state,
        client: action.client
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

    case SET_USER:
      return {
        ...state,
        user: action.user
      }
    
    case SET_DEVICE:
      return {
        ...state,
        device: action.device
      }

    default:
      return state
  }
}

export default appReducer
