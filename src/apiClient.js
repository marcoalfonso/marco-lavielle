import axios from 'axios'

/**
 * Provide default params to axios.
 * @param {string} url        the only required param for both methods.
 * @param {string|null}       method, defaults to 'get'
 * @param {object|null}       headers, local default is not auth and json content type
 * @param {object|null}       data, required for 'post' method
 * @param {boolean|null}      withCredentials, overides axios default false
 * @param {function|null}     validateStatus, what http response status should be treated as successful
 * @param {number|null}       timeout
 * @return {object:Promise}   response
 * */

const api = apiParams => {
  const defaultHeaders = { 'Content-Type': 'application/json' }
  const defaultValidateStatus = status => status >= 200 && status <= 300

  const {
    url,
    method = 'get',
    baseURL = '',
    headers = defaultHeaders,
    params = {},
    data = {},
    withCredentials = false,
    validateStatus = defaultValidateStatus,
    timeout = 20000,
    responseType,
    processData,
    crossdomain
  } = apiParams

  return axios({
    url,
    baseURL,
    method,
    headers,
    params,
    data,
    withCredentials,
    validateStatus,
    timeout,
    responseType,
    processData,
    crossdomain
  })
    .then(response => {
      if (!response.error) {
        return response
      }
      return { error: true }
    })
    .catch(error => {
      if (error.response) {
        return {
          ...error.response,
          code: error.code,
          errorMessage: error.message,
          error: true
        }
      }
      return { errorMessage: error.message, code: error.code, error: true }
    })
}

export default api

