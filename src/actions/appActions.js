import api from 'apiClient'
import {
  SENDING_REQUEST,
  SET_CLIENTS,
  SET_POSTS,
  SET_POST,
  SET_USER,
  SET_CLIENT
} from 'constants/constants'
import { toast } from 'react-toastify'

export const sendingRequest = loading => ({ type: SENDING_REQUEST, loading })

export const getClients = () => dispatch => {
  return api({ 
    method: 'GET',
    url: `/api/clients`
  })
  .then(response => {
    dispatch(setClients(response.data))
  })
}

export const setClients = clients => ({ type: SET_CLIENTS, clients })

export const getPosts = () => dispatch => {
  return api({ 
    method: 'GET',
    url: `/api/posts`
  })
  .then(response => {
    dispatch(setPosts(response.data))
  })
}

export const setPosts = posts => ({ type: SET_POSTS, posts })

export const getPost = (id) => dispatch => {
  return api({ 
    method: 'GET',
    url: `/api/posts/${id}`
  })
  .then(response => {
    dispatch(setPost(response.data))
  })
}

export const setPost = post => ({ type: SET_POST, post: post })

export const getClient = (id) => dispatch => {
  return api({ 
    method: 'GET',
    url: `/api/clients/${id}`
  })
  .then(response => {
    dispatch(setClient(response.data))
  })
}

export const setClient = client => ({ type: SET_CLIENT, client: client })

export const signin = (formData, history) => dispatch => {
  return api({ 
    method: 'POST',
    url: `/login`,
    data: JSON.stringify(formData)
  })
  .then(response => {
    if (response.data.success) {
      dispatch(setUser(response.data.user))
    } else {
      toast.error('Username/Password combination incorrect')
    }
    return response
  })
}

export const setUser = user => ({ type: SET_USER, user: user })

export const editPost = (formData, action) => dispatch => {
  return api({ 
    method: 'POST',
    url: `/api/posts`,
    data: JSON.stringify(formData)
  })
  .then(response => {
    return response
  })
}

export const editClient = (formData, action) => dispatch => {
  return api({ 
    method: 'POST',
    url: `/api/clients`,
    data: JSON.stringify(formData)
  })
  .then(response => {
    return response
  })
}

export const deletePost = (id) => dispatch => {
  return api({ 
    method: 'DELETE',
    url: `/api/posts/${id}`
  })
  .then(response => {
    toast.success('Post deleted')
    dispatch(getPosts())
    return response
  })
}

export const deleteClient = (id) => dispatch => {
  return api({ 
    method: 'DELETE',
    url: `/api/clients/${id}`
  })
  .then(response => {
    toast.success('Client deleted')
    dispatch(getClients())
    return response
  })
}