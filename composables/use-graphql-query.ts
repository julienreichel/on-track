  /**
  * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
  */

  // Define a generic type for the GraphQL query response
  interface GraphQLResponse {
    id: string;
    [key: string]: string|object|number|undefined; // Allow other properties
  }

  interface Model {
    [key: string]: string|object|number|undefined; // Allow other properties
  }

  interface Options {
    [key: string]: string|object|number|undefined; // Define specific options if needed
  }

  interface Params {
    filter?: string;
    limit?: number;
    nextToken?: string;
    sortDirection?: string;
    [key: string]: string|object|number|undefined; // Define specific options if needed
  }

  export default function (model:string, selectionSet:string[], listSelectionSet:string[]) {

  const defaultOptions = {
    //authMode: "userPool",
    selectionSet
  }
  const provider = useNuxtApp().$Amplify.GraphQL.client.models[model];

  /**
  * Call the GraphQL API
  * @param {string} request - The type of request to perform (e.g., 'create', 'update', 'delete', 'get', 'list').
  * @param {object} input - The model data to be sent with the request.
  * @param {object} options - Additional options for the request, such as authentication mode and selection set.
  * @returns {GraphQLResponse} - A promise that resolves to the response data, which always includes an `id` property.
  */
  const call = async (request: string, input:Model|Params, options:Options = {}):Promise<GraphQLResponse> => {
    options = {
      ...defaultOptions,
      ...options
    }
    const { data } = await provider[request](input, options);
    return data;
  }

  /**
   * Create a model
   *
   * @param {object} input the model data
   * @param {object} options the options
   * @returns {Promise<object>}
   */
  const create = async (input:Model, options:Options = {}) => {
    return call('create', input, options);
  }

  /**
   * Update a model
   *
   * @param {object} input the model data
   * @param {object} options the options
   * @returns {Promise<object>}
   */
  const update = async (input:Model, options:Options = {}) => {
    return call('update', input, options);
  }

  /**
   * Get a model
   *
   * @param {string} id the model id
   * @param {object} options the options
   * @returns {Promise<object>}
   */
  const get = async (id:string, options:Options = {}) => {
    return call('get', { id }, options);
  }

  /**
   * Delete a model
   *
   * @param {object} model the model
   * @param {object} options the options
   * @returns {Promise<object>}
   */
  const del = async (model:Model, options:Options = {}) => {
    if (!model.id) return;

    const { id } = model;
    const data = await call('delete', { id }, options);

    return data;
  }

  /**
   * List models
   *
   * @param {object} params options
   * @param {string} [params.filter] filter
   * @param {number} [params.limit] limit
   * @param {string} [params.nextToken] nextToken
   * @param {string} [params.sortDirection] sortDirection
   * @param {object} options the options
   * @returns {Promise<object>}
   */
  const list = async (params:Params = {}, options:Options = {}) => {
    options = {
      selectionSet: listSelectionSet,
      ...options
    }
    return call('list', params, options);
  }

  return {
    call,
    create,
    update,
    get,
    del,
    list
  }
}
