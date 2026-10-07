import api from 'apiClient'
import {
  SENDING_REQUEST,
  SET_CLIENTS,
  SET_POSTS,
  SET_POST,
  SET_USER,
  SET_CLIENT,
  SET_DEVICE
} from 'constants/constants'
import notify from 'components/notify/notify'

// api() resolves even when a request fails (marking the response with
// `error`); requests whose failure the caller must see go through this, which
// turns a failure into a rejection carrying the response
const orFail = response => {
  if (response && response.error) {
    const err = new Error(response.errorMessage || 'Request failed')
    err.response = response
    throw err
  }
  return response
}

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

export const getPostBySlug = (slug) => dispatch => {
  return api({ 
    method: 'GET',
    url: `/api/posts/slug/${slug}`
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
  .then(orFail)
  .then(response => {
    if (response.data.success) dispatch(setUser(response.data.user))
    return response
  })
}

export const setUser = user => ({ type: SET_USER, user: user })

export const createPost = (formData) => dispatch => {
  return api({
    method: 'POST',
    url: `/api/posts`,
    data: JSON.stringify(formData)
  })
  .then(orFail)
  .then(response => {
    notify('Post saved')
    return response
  })
}

export const editPost = (formData) => dispatch => {
  return api({
    method: 'PUT',
    url: `/api/posts`,
    data: JSON.stringify(formData)
  })
  .then(orFail)
  .then(response => {
    notify('Post saved')
    return response
  })
}

export const createClient = (formData) => dispatch => {
  return api({
    method: 'POST',
    url: `/api/clients`,
    data: JSON.stringify(formData)
  })
  .then(orFail)
  .then(response => {
    notify('Client saved')
    return response
  })
}

export const editClient = (formData) => dispatch => {
  return api({
    method: 'PUT',
    url: `/api/clients`,
    data: JSON.stringify(formData)
  })
  .then(orFail)
  .then(response => {
    notify('Client saved')
    return response
  })
}

export const deletePost = (id) => dispatch => {
  return api({ 
    method: 'DELETE',
    url: `/api/posts/${id}`
  })
  .then(orFail)
  .then(response => {
    notify('Post deleted')
    dispatch(getPosts())
    return response
  })
}

export const deleteClient = (id) => dispatch => {
  return api({ 
    method: 'DELETE',
    url: `/api/clients/${id}`
  })
  .then(orFail)
  .then(response => {
    notify('Client deleted')
    dispatch(getClients())
    return response
  })
}

export const setDevice = device => ({ type: SET_DEVICE, device: device })