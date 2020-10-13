import api from 'apiClient'
import {
  SENDING_REQUEST,
  SET_CLIENTS,
  SET_POSTS,
  SET_POST
} from 'constants/constants'

export const sendingRequest = loading => ({ type: SENDING_REQUEST, loading })

export const getClients = () => dispatch => {
  return api({ 
    method: 'get',
    url: `/api/clients`
  })
  .then(response => {
    dispatch(setClients(response.data))
  })
}

export const setClients = clients => ({ type: SET_CLIENTS, clients })

export const getPosts = () => dispatch => {
  return api({ 
    method: 'get',
    url: `/api/posts`
  })
  .then(response => {
    dispatch(setPosts(response.data))
  })
}

export const setPosts = posts => ({ type: SET_POSTS, posts })

export const getPost = (slug) => dispatch => {
  return api({ 
    method: 'get',
    url: `/api/posts/${slug}`
  })
  .then(response => {
    console.log("response", response)
    dispatch(setPost(response.data))
  })
}

export const setPost = post => ({ type: SET_POST, post: post })
